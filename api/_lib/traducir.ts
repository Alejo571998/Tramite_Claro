// api/_lib/traducir.ts — núcleo de POST /api/traducir, independiente del runtime
// (Vercel Function o middleware de Vite en dev). La API key vive SOLO acá.
import { tramiteResponseSchema } from "./schema.js";
import { promptArchivos, promptTexto } from "./prompt.js";
import { normalizeTramite } from "./normalize.js";
import { errMessage, generateJSON } from "./gemini.js";
import { apiKey, fail, guarded, type ApiResult } from "./http.js";
import type { TraducirRequest, TramiteTraducido } from "../../src/types/tramite.ts";

const MAX_TEXTO = 30_000;
const MAX_ARCHIVOS = 5;
// Vercel limita el body a 4.5 MB: dejamos margen para el JSON.
const MAX_BASE64_TOTAL = 4_200_000;
const MIME_OK = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/;

export function validate(body: unknown): TraducirRequest | ApiResult<never> {
  const b = body as Partial<TraducirRequest> | null;
  if (!b || typeof b !== "object") return fail(400, "bad_input", "Pedido vacío.");
  if (b.tipo === "texto") {
    const texto = typeof b.texto === "string" ? b.texto.trim() : "";
    if (texto.length < 15) return fail(400, "bad_input", "El texto es muy corto para entender el trámite.");
    if (texto.length > MAX_TEXTO) return fail(413, "too_large", "El texto es demasiado largo. Probá pegando solo la parte importante.");
    return { tipo: "texto", texto };
  }
  if (b.tipo === "archivos") {
    const archivos = Array.isArray(b.archivos) ? b.archivos : [];
    if (!archivos.length) return fail(400, "bad_input", "No llegó ningún archivo.");
    if (archivos.length > MAX_ARCHIVOS) return fail(413, "too_large", `Podés mandar hasta ${MAX_ARCHIVOS} páginas por vez.`);
    let total = 0;
    for (const a of archivos) {
      if (!a || typeof a.data !== "string" || !MIME_OK.test(String(a.mimeType)))
        return fail(400, "bad_input", "Formato no soportado. Usá JPG, PNG o PDF.");
      total += a.data.length;
    }
    if (total > MAX_BASE64_TOTAL) return fail(413, "too_large", "Los archivos pesan demasiado. Probá con menos páginas o un PDF más liviano.");
    return { tipo: "archivos", fuente: b.fuente === "pdf" ? "pdf" : "foto", archivos };
  }
  return fail(400, "bad_input", "Tipo de pedido desconocido.");
}

export function classify(err: unknown): ApiResult<never> {
  const m = errMessage(err).toLowerCase();
  if (/429|resource_exhausted|quota/.test(m))
    return fail(429, "quota", "Hay mucha gente usando Trámite Claro ahora. Esperá unos segundos y probá de nuevo.");
  if (/503|500|502|unavailable|overloaded|high demand|temporarily/.test(m))
    return fail(503, "busy", "El servicio de lectura está saturado. Probá de nuevo en un ratito.");
  if (/api key|permission|401|403|404|not_found/.test(m))
    return fail(500, "config", "El servicio no está bien configurado. Avisale a quien administra la app.");
  if (/json|unexpected token/.test(m))
    return fail(502, "unreadable", "No pude armar una respuesta clara con ese documento. Probá con otra foto o pegando el texto.");
  return fail(500, "unknown", "Algo salió mal al leer el trámite.");
}

async function core(body: unknown): Promise<ApiResult<TramiteTraducido>> {
  const key = apiKey();
  if (!key) return fail(500, "config", "Falta configurar GEMINI_API_KEY en el servidor.");

  const req = validate(body);
  if ("status" in req) return req;

  const parts =
    req.tipo === "texto"
      ? [{ text: promptTexto(req.texto) }]
      : [
          { text: promptArchivos(req.fuente, req.archivos.length) },
          ...req.archivos.map((a) => ({ inlineData: { mimeType: a.mimeType, data: a.data } })),
        ];

  try {
    const text = await generateJSON(key, parts, tramiteResponseSchema);
    const data = normalizeTramite(JSON.parse(text) as Record<string, unknown>);
    if (!data.resumen && !data.checklist.length)
      return fail(422, "unreadable", "No encontré un trámite para explicar. Probá con una foto más nítida o pegando el texto.");
    return { status: 200, body: data };
  } catch (err) {
    console.error("[traducir]", err);
    return classify(err);
  }
}

/** Límites por IP: generosos para una persona, cortos para un script. */
export const traducir = guarded(
  [
    { name: "traducir-min", max: 6, windowSec: 60 },
    { name: "traducir-dia", max: 60, windowSec: 86_400 },
  ],
  core,
);
