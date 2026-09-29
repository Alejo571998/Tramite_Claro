// api/taku.ts — Vercel Function: POST /api/taku
import { taku } from "./_lib/taku.js";
import { vercelHandler } from "./_lib/http.js";

export default vercelHandler(taku);
