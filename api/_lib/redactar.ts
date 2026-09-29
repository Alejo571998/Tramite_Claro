// api/_lib/redactar.ts — núcleo de POST /api/redactar: borradores de notas para el organismo.
import { generateJSON, errMessage } from "./gemini.js";
import { apiKey, fail, guarded, type ApiResult } from "./http.js";
import { classify } from "./traducir.js";
import { hoyAR } from "./prompt.js";
import type { TramiteTraducido } from "../../src/types/tramite.ts";

export type TipoNota = "consulta" | "prorroga" | "reclamo" | "descargo";

export interface Borrador {
  asunto: string;
  cuerpo: string;
  notas: string[];
}

const OBJETIVO: Record<TipoNota, string> = {
  consulta: "pedir información o una aclaración sobre el trámite",
  prorroga: "pedir una prórroga (más tiempo) para cumplir con lo que se pide, explicando brevemente el motivo",
  reclamo: "presentar un reclamo porque la persona considera que lo que se le pide o se le cobra no corresponde",
  descargo: "presentar un descargo: explicar su situación y por qué no debería aplicarse la sanción o intimación",
};

const schema = {
  type: "object",
  properties: {
    asunto: { type: "string", description: "Asunto corto de la nota o del mail." },
    cuerpo: { type: "string", description: "Texto completo de la nota, listo para copiar." },
    notas: { type: "array", items: { type: "string" }, description: "2 a 4 consejos cortos: dónde presentarla, qué adjuntar, guardar constancia." },
  },
  required: ["asunto", "cuerpo", "notas"],
} as const;

export function promptNota(tipo: TipoNota, t: TramiteTraducido, extra: string): string {
  return `Redactá un borrador de nota para ${OBJETIVO[tipo]} ante ${t.organismo || "el organismo"}.

Reglas:
- Español formal y claro, trato de "usted" hacia el organismo, sin jerga innecesaria. Máximo 250 palabras.
- Estructura: lugar y fecha, destinatario, identificación de la persona, referencia al trámite, pedido concreto, cierre y firma.
- NO inventes datos personales, números de expediente, montos ni fechas: usá marcadores entre corchetes, ej: [Nombre y apellido], [DNI], [CUIT], [Domicilio], [Número de expediente o notificación], [Fecha].
- No cites leyes ni artículos específicos salvo que aparezcan en el trámite.
- Las notas son consejos prácticos (dónde presentarla, pedir constancia de recepción, adjuntar copias). No prometas resultados.
Hoy es ${hoyAR()}.

Trámite:
${JSON.stringify({ titulo: t.titulo, organismo: t.organismo, resumen: t.resumen, plazo: t.plazo, pasos: t.checklist?.map((c) => c.paso), alertas: t.alertas?.map((a) => a.texto) }).slice(0, 10_000)}
${extra ? `\nLo que la persona quiere decir (con sus palabras): ${extra}` : ""}`;
}

async function core(body: unknown): Promise<ApiResult<Borrador>> {
  const key = apiKey();
  if (!key) return fail(500, "config", "Falta configurar GEMINI_API_KEY en el servidor.");
  const b = (body ?? {}) as { tipo?: string; tramite?: TramiteTraducido; extra?: unknown };
  if (!b.tipo || !(b.tipo in OBJETIVO)) return fail(400, "bad_input", "Tipo de nota desconocido.");
  if (!b.tramite || typeof b.tramite !== "object" || !b.tramite.resumen) return fail(400, "bad_input", "Falta el trámite.");
  const extra = typeof b.extra === "string" ? b.extra.trim().slice(0, 600) : "";

  try {
    const raw = await generateJSON(key, [{ text: promptNota(b.tipo as TipoNota, b.tramite, extra) }], schema, { retries: 1 });
    const j = JSON.parse(raw) as Partial<Borrador>;
    if (!j.cuerpo) throw new Error("json sin cuerpo");
    return {
      status: 200,
      body: {
        asunto: String(j.asunto ?? "").trim(),
        cuerpo: String(j.cuerpo).trim(),
        notas: (Array.isArray(j.notas) ? j.notas : []).map(String).slice(0, 4),
      },
    };
  } catch (err) {
    console.error("[redactar]", errMessage(err));
    return classify(err);
  }
}

export const redactar = guarded(
  [
    { name: "redactar-min", max: 5, windowSec: 60 },
    { name: "redactar-dia", max: 30, windowSec: 86_400 },
  ],
  core,
);
