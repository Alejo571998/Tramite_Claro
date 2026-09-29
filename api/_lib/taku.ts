// api/_lib/taku.ts — núcleo de POST /api/taku: el chat real de Taku.
// Contrato (ver src/taku/chat/remoteProvider.ts):
//   { messages: {role:"user"|"taku", text}[], context: TakuChatContext } → { text, suggestions? }
import { generateJSON, errMessage } from "./gemini.js";
import { apiKey, fail, guarded, type ApiResult } from "./http.js";
import { classify } from "./traducir.js";
import { hoyAR } from "./prompt.js";
import type { TramiteTraducido } from "../../src/types/tramite.ts";

const MAX_MESSAGES = 12;
const MAX_TEXT = 1000;

export interface TakuReply {
  text: string;
  suggestions: string[];
}

interface ChatBody {
  messages?: { role?: string; text?: unknown }[];
  context?: {
    tramite?: TramiteTraducido | null;
    progreso?: { done: number; total: number };
    nombre?: string;
    oficial?: { nombre: string; url: string } | null;
  };
}

const schema = {
  type: "object",
  properties: {
    text: { type: "string", description: "Respuesta de Taku, breve (máx. ~90 palabras), sin markdown salvo viñetas con •." },
    suggestions: {
      type: "array",
      description: "2 o 3 preguntas cortas (máx. 6 palabras) que la persona podría hacer a continuación.",
      items: { type: "string" },
    },
  },
  required: ["text", "suggestions"],
} as const;

export function systemPrompt(ctx: ChatBody["context"] = {}): string {
  const t = ctx.tramite;
  const tramite = t
    ? JSON.stringify({
        titulo: t.titulo,
        organismo: t.organismo,
        resumen: t.resumen,
        urgencia: t.urgencia,
        plazo: t.plazo,
        fecha_limite: t.fecha_limite,
        pasos: t.checklist?.map((c, i) => `${i + 1}. ${c.paso}${c.detalle ? ` — ${c.detalle}` : ""}`),
        alertas: t.alertas?.map((a) => a.texto),
        glosario: t.glosario,
      }).slice(0, 12_000)
    : null;
  const oficial = ctx.oficial?.url ? `${ctx.oficial.nombre}: ${ctx.oficial.url}` : null;

  return `Sos Taku, la mascota y asistente de Trámite Claro: una hojita verde con traje que ayuda a la gente a entender y resolver trámites argentinos.

Cómo hablás:
- Español rioplatense, cálido y respetuoso, con voseo. Frases cortas. Máximo ~90 palabras. Sin markdown salvo viñetas con "•".
- Explicás como alguien que sabe del tema tomando un café, no como un formulario.

Reglas:
- Basate en el trámite abierto (abajo) cuando lo haya. No inventes requisitos, montos, plazos, direcciones, teléfonos ni links.
- ${oficial ? `El ÚNICO link que podés dar es el oficial verificado: ${oficial}.` : "No des links: decile que busque la web oficial del organismo."}
- Si no sabés algo, decilo y sugerí confirmarlo en la web oficial o en la oficina del organismo.
- No das asesoramiento legal ni contable definitivo. Si hay juicios, deudas grandes, embargos o sanciones, recomendá consultar a un profesional o a un consultorio jurídico gratuito.
- Nunca pidas contraseñas, Clave Fiscal, claves bancarias ni números de tarjeta. Si la persona los escribe, pedile que no los comparta.
- Si preguntan algo que no tiene que ver con trámites, respondé amable en una frase y ofrecé volver al tema.

Hoy es ${hoyAR()}.${ctx.nombre ? ` La persona se llama ${ctx.nombre}.` : ""}
${ctx.progreso && t ? `Lleva ${ctx.progreso.done} de ${ctx.progreso.total} pasos hechos.` : ""}
Trámite abierto: ${tramite ?? "ninguno (todavía no subió un documento)."}`;
}

/** Convierte el historial de la UI al formato de Gemini: empieza con el usuario y alterna roles. */
export function toContents(messages: ChatBody["messages"] = []) {
  const clean = messages
    .filter((m) => (m.role === "user" || m.role === "taku") && typeof m.text === "string" && m.text.trim())
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role === "user" ? ("user" as const) : ("model" as const), text: String(m.text).slice(0, MAX_TEXT) }));
  while (clean.length && clean[0].role !== "user") clean.shift();
  const merged: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const m of clean) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.parts[0].text += `\n${m.text}`;
    else merged.push({ role: m.role, parts: [{ text: m.text }] });
  }
  return merged;
}

async function core(body: unknown): Promise<ApiResult<TakuReply>> {
  const key = apiKey();
  if (!key) return fail(500, "config", "Falta configurar GEMINI_API_KEY en el servidor.");
  const b = (body ?? {}) as ChatBody;
  const contents = toContents(b.messages);
  if (!contents.length || contents[contents.length - 1].role !== "user") return fail(400, "bad_input", "No llegó ninguna pregunta.");

  try {
    const raw = await generateJSON(key, contents, schema, { system: systemPrompt(b.context), retries: 1 });
    const json = JSON.parse(raw) as Partial<TakuReply>;
    const text = String(json.text ?? "").trim();
    if (!text) throw new Error("json vacío");
    const suggestions = (Array.isArray(json.suggestions) ? json.suggestions : [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 3);
    return { status: 200, body: { text, suggestions } };
  } catch (err) {
    console.error("[taku]", errMessage(err));
    return classify(err);
  }
}

export const taku = guarded(
  [
    { name: "taku-min", max: 15, windowSec: 60 },
    { name: "taku-dia", max: 200, windowSec: 86_400 },
  ],
  core,
);
