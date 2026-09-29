// api/_lib/traducir.ts
// Núcleo de la traducción, independiente del runtime (Vercel Function o middleware
// de Vite en dev). La API key vive SOLO acá, nunca en el bundle del cliente.
//
// Modelo pinneado: gemini-3.5-flash (GA 19/05/2026, structured outputs, free tier).
// gemini-2.5-flash devuelve 404 para keys nuevas; gemini-3.6-flash dio 503 por
// sobrecarga. La config usa thinkingConfig (NO temperature) para la familia 3.x.
import { GoogleGenAI } from "@google/genai";
import { tramiteResponseSchema } from "./schema.js";
import { promptArchivos, promptTexto } from "./prompt.js";
import { normalizeTramite } from "./normalize.js";
import type { ApiErrorBody, ApiErrorCode, TraducirRequest, TramiteTraducido } from "../../src/types/tramite.ts";

const MODEL_ID = "gemini-3.5-flash";

const GENERATION_CONFIG = {
  responseMimeType: "application/json",
  responseSchema: tramiteResponseSchema,
  thinkingConfig: { thinkingLevel: "low" as const },
} as const;

const MAX_TEXTO = 30_000;
const MAX_ARCHIVOS = 5;
// Vercel limita el body a 4.5 MB: dejamos margen para el JSON.
const MAX_BASE64_TOTAL = 4_200_000;
const MIME_OK = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/;

export interface ApiResult {
  status: number;
  body: TramiteTraducido | ApiErrorBody;
}

const fail = (status: number, code: ApiErrorCode, message: string): ApiResult => ({
  status,
  body: { error: { code, message } },
});

function validate(body: unknown): TraducirRequest | ApiResult {
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

function classify(err: unknown): ApiResult {
  const msg = String((err as { message?: unknown })?.message ?? err ?? "");
  const m = msg.toLowerCase();
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

const isTransient = (err: unknown) =>
  /503|429|500|502|unavailable|resource_exhausted|overloaded|high demand|try again|temporarily/i.test(
    String((err as { message?: unknown })?.message ?? err ?? ""),
  );

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 900): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isTransient(err)) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt + Math.random() * 250));
    }
  }
}

export async function traducir(body: unknown, apiKey: string | undefined): Promise<ApiResult> {
  if (!apiKey || apiKey === "your_api_key_here")
    return fail(500, "config", "Falta configurar GEMINI_API_KEY en el servidor.");

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
    const client = new GoogleGenAI({ apiKey });
    const response = await withRetry(() =>
      client.models.generateContent({
        model: MODEL_ID,
        contents: [{ role: "user", parts }],
        config: GENERATION_CONFIG as never,
      }),
    );
    if (!response.text) return fail(502, "unreadable", "No pude leer nada en ese documento.");
    const data = normalizeTramite(JSON.parse(response.text) as Record<string, unknown>);
    if (!data.resumen && !data.checklist.length)
      return fail(422, "unreadable", "No encontré un trámite para explicar. Probá con una foto más nítida o pegando el texto.");
    return { status: 200, body: data };
  } catch (err) {
    console.error("[traducir]", err);
    return classify(err);
  }
}
