// src/lib/api.ts — cliente de POST /api/traducir (la key vive en el servidor)
import type { ApiErrorBody, ApiErrorCode, TraducirRequest, TramiteTraducido } from "../types/tramite";

export type ErrorCode = ApiErrorCode | "network" | "aborted";

export class TraducirError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export async function traducir(req: TraducirRequest, signal?: AbortSignal): Promise<TramiteTraducido> {
  let res: Response;
  try {
    res = await fetch("/api/traducir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal,
    });
  } catch {
    if (signal?.aborted) throw new TraducirError("aborted", "Cancelaste la lectura.");
    throw new TraducirError("network", "No hay conexión. Revisá tu internet y probá de nuevo.");
  }
  const json = (await res.json().catch(() => null)) as TramiteTraducido | ApiErrorBody | null;
  if (!res.ok || !json || "error" in json) {
    const err = json && "error" in json ? json.error : null;
    if (res.status === 413) throw new TraducirError("too_large", err?.message ?? "El archivo es demasiado pesado.");
    throw new TraducirError(err?.code ?? "unknown", err?.message ?? `Error ${res.status} del servidor.`);
  }
  return json;
}
