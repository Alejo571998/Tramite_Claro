// api/_lib/http.ts — piezas comunes de los endpoints: resultado tipado, límite de
// uso, chequeo de origen y adaptador para Vercel Functions.
import { checkLimit, type LimitRule } from "./rateLimit.js";
import type { ApiErrorBody, ApiErrorCode } from "../../src/types/tramite.ts";

export interface ApiResult<T = unknown> {
  status: number;
  body: T | ApiErrorBody;
  headers?: Record<string, string>;
}

export interface RequestInfo {
  ip: string;
  origin?: string;
  host?: string;
}

export type Core<T = unknown> = (body: unknown, req: RequestInfo) => Promise<ApiResult<T>>;

export const fail = (status: number, code: ApiErrorCode, message: string, headers?: Record<string, string>): ApiResult<never> => ({
  status,
  body: { error: { code, message } },
  headers,
});

export const apiKey = () => {
  const k = process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY;
  return k && k !== "your_api_key_here" ? k : undefined;
};

/** Envuelve un núcleo con: chequeo de origen (evita que otras webs usen la API desde el navegador) y límite por IP. */
export function guarded<T>(rules: LimitRule[], core: Core<T>): Core<T> {
  return async (body, req) => {
    if (req.origin && req.host) {
      let originHost = "";
      try {
        originHost = new URL(req.origin).host;
      } catch {
        /* origen inválido */
      }
      if (originHost !== req.host) return fail(403, "bad_input", "Origen no permitido.");
    }
    const limit = await checkLimit(req.ip || "anon", rules);
    if (!limit.ok) {
      const mins = Math.ceil(limit.retryAfter / 60);
      return fail(
        429,
        "rate_limited",
        limit.retryAfter < 90
          ? "Vas muy rápido. Esperá un minutito y probá de nuevo."
          : `Llegaste al máximo de consultas por ahora. Probá de nuevo en ${mins} minutos.`,
        { "Retry-After": String(limit.retryAfter) },
      );
    }
    return core(body, req);
  };
}

// ── Adaptador Vercel (Node runtime, firma clásica req/res) ─────────────
interface VReq {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}
interface VRes {
  status(code: number): VRes;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

const header = (h: VReq["headers"], name: string) => {
  const v = h[name];
  return Array.isArray(v) ? v[0] : v;
};

export function requestInfo(headers: VReq["headers"], remote?: string): RequestInfo {
  const fwd = header(headers, "x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: header(headers, "x-real-ip") || fwd || remote || "anon",
    origin: header(headers, "origin"),
    host: header(headers, "x-forwarded-host") || header(headers, "host"),
  };
}

export function vercelHandler(core: Core) {
  return async (req: VReq, res: VRes) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: { code: "bad_input", message: "Usá POST." } });
    }
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = null;
      }
    }
    const out = await core(body, requestInfo(req.headers, req.socket?.remoteAddress));
    for (const [k, v] of Object.entries(out.headers ?? {})) res.setHeader(k, v);
    return res.status(out.status).json(out.body);
  };
}
