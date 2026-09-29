// api/redactar.ts — Vercel Function: POST /api/redactar
import { redactar } from "./_lib/redactar.js";
import { vercelHandler } from "./_lib/http.js";

export default vercelHandler(redactar);
