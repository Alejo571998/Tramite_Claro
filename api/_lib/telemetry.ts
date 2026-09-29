// api/_lib/telemetry.ts — feedback de usuarios y errores del cliente.
// Todo queda en los logs de Vercel (Runtime Logs). Si hay Upstash Redis, además se
// guarda en las listas "tc:feedback" y "tc:errors" (últimos 1000) para revisarlos.
// No se guarda el contenido de los documentos: solo metadatos.
import { redis } from "./rateLimit.js";
import { fail, guarded, type ApiResult } from "./http.js";

const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);

async function store(list: string, entry: Record<string, unknown>) {
  await redis([
    ["LPUSH", list, JSON.stringify(entry)],
    ["LTRIM", list, 0, 999],
  ]);
}

export const feedback = guarded([{ name: "feedback-min", max: 20, windowSec: 60 }], async (body): Promise<ApiResult<{ ok: true }>> => {
  const b = (body ?? {}) as Record<string, unknown>;
  if (b.rating !== "up" && b.rating !== "down") return fail(400, "bad_input", "Falta la valoración.");
  const entry = {
    ts: new Date().toISOString(),
    rating: b.rating,
    motivo: s(b.motivo, 60),
    comentario: s(b.comentario, 500),
    titulo: s(b.titulo, 120),
    organismo: s(b.organismo, 120),
    fuente: s(b.fuente, 20),
  };
  console.info("[feedback]", JSON.stringify(entry));
  await store("tc:feedback", entry);
  return { status: 200, body: { ok: true } };
});

export const logError = guarded([{ name: "log-min", max: 30, windowSec: 60 }], async (body): Promise<ApiResult<{ ok: true }>> => {
  const b = (body ?? {}) as Record<string, unknown>;
  const entry = {
    ts: new Date().toISOString(),
    message: s(b.message, 500) ?? "sin mensaje",
    stack: s(b.stack, 2000),
    path: s(b.path, 200),
    ua: s(b.ua, 200),
    release: s(b.release, 40),
  };
  console.error("[client-error]", JSON.stringify(entry));
  await store("tc:errors", entry);
  return { status: 200, body: { ok: true } };
});
