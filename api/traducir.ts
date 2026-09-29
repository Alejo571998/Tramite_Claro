// api/traducir.ts — Vercel Function: POST /api/traducir
import { traducir } from "./_lib/traducir.js";
import { vercelHandler } from "./_lib/http.js";

export default vercelHandler(traducir);
