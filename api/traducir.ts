// api/traducir.ts — Vercel Function: POST /api/traducir
// Lee GEMINI_API_KEY (o, por compatibilidad con el deploy actual, VITE_GEMINI_API_KEY).
import { traducir } from "./_lib/traducir.js";

interface Req {
  method?: string;
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { code: "bad_input", message: "Usá POST." } });
  }
  const body = typeof req.body === "string" ? safeParse(req.body) : req.body;
  const out = await traducir(body, process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY);
  return res.status(out.status).json(out.body);
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
