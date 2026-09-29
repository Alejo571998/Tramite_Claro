// src/lib/telemetry.ts — feedback (👍/👎) y reporte de errores del cliente.
// Solo metadatos: nunca el contenido de los documentos.

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => undefined);

export interface FeedbackInput {
  rating: "up" | "down";
  motivo?: string;
  comentario?: string;
  titulo?: string;
  organismo?: string;
  fuente?: string;
}

export const sendFeedback = (f: FeedbackInput) => post("/api/feedback", f);

let sent = 0;
function report(message: string, stack?: string) {
  // tope por sesión: un bucle de errores no debe inundar el endpoint
  if (sent++ >= 10 || import.meta.env.DEV) return;
  void post("/api/log", {
    message,
    stack,
    path: location.hash.replace(/\/tramite\/[^/]+/, "/tramite/:id"),
    ua: navigator.userAgent,
    release: __APP_RELEASE__,
  });
}

export function installErrorReporting() {
  window.addEventListener("error", (e) => report(e.message || "error", (e.error as Error | undefined)?.stack));
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as Error | undefined;
    // los aborts de fetch son intencionales (cancelar)
    if (r?.name === "AbortError") return;
    report(r?.message ?? String(e.reason), r?.stack);
  });
}
