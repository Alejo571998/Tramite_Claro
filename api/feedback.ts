// api/feedback.ts — Vercel Function: POST /api/feedback
import { feedback } from "./_lib/telemetry.js";
import { vercelHandler } from "./_lib/http.js";

export default vercelHandler(feedback);
