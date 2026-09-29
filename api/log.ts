// api/log.ts — Vercel Function: POST /api/log
import { logError } from "./_lib/telemetry.js";
import { vercelHandler } from "./_lib/http.js";

export default vercelHandler(logError);
