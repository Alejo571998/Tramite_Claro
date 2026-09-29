// api/_lib/rateLimit.ts — límite de uso por IP (ventana fija).
// Con Upstash Redis configurado (UPSTASH_REDIS_REST_URL/TOKEN, o KV_REST_API_URL/TOKEN
// que crea la integración de Vercel) el límite es global. Sin Redis, cae a memoria
// por instancia: más débil, pero frena el abuso básico sin configurar nada.

export interface LimitRule {
  /** Nombre de la regla, ej: "traducir-min". */
  name: string;
  max: number;
  windowSec: number;
}

export type LimitResult = { ok: true } | { ok: false; retryAfter: number };

function redisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

/** Ejecuta comandos Redis vía la API REST de Upstash. Devuelve null si no hay Redis o falla. */
export async function redis(commands: (string | number)[][]): Promise<unknown[] | null> {
  const env = redisEnv();
  if (!env) return null;
  try {
    const res = await fetch(`${env.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
    });
    if (!res.ok) throw new Error(`redis ${res.status}`);
    const json = (await res.json()) as { result?: unknown; error?: string }[];
    return json.map((r) => r.result);
  } catch (e) {
    console.error("[rateLimit] redis no disponible, uso memoria:", e);
    return null;
  }
}

const memory = new Map<string, { count: number; expires: number }>();

function memoryHit(key: string, windowSec: number, now: number): number {
  if (memory.size > 5000) for (const [k, v] of memory) if (v.expires <= now) memory.delete(k);
  const cur = memory.get(key);
  if (!cur || cur.expires <= now) {
    memory.set(key, { count: 1, expires: now + windowSec * 1000 });
    return 1;
  }
  cur.count++;
  return cur.count;
}

export async function checkLimit(id: string, rules: LimitRule[], now = Date.now()): Promise<LimitResult> {
  const keys = rules.map((r) => `rl:${r.name}:${id}:${Math.floor(now / 1000 / r.windowSec)}`);
  const remote = await redis(keys.flatMap((k, i) => [["INCR", k], ["EXPIRE", k, rules[i].windowSec]]));
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    const count = remote ? Number(remote[i * 2]) : memoryHit(keys[i], r.windowSec, now);
    if (count > r.max) {
      const windowEnd = (Math.floor(now / 1000 / r.windowSec) + 1) * r.windowSec * 1000;
      return { ok: false, retryAfter: Math.max(1, Math.ceil((windowEnd - now) / 1000)) };
    }
  }
  return { ok: true };
}

/** Solo para tests. */
export function _resetMemory() {
  memory.clear();
}
