// src/lib/api.ts — cliente de los endpoints /api/* (la key vive en el servidor)
import type { ApiErrorBody, ApiErrorCode, TraducirRequest, TramiteTraducido } from "../types/tramite";

export type ErrorCode = ApiErrorCode | "network" | "aborted";

export class TraducirError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export async function postJSON<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    if (signal?.aborted) throw new TraducirError("aborted", "Cancelado.");
    throw new TraducirError("network", "No hay conexión. Revisá tu internet y probá de nuevo.");
  }
  const json = (await res.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!res.ok || !json || (typeof json === "object" && "error" in json)) {
    const err = json && typeof json === "object" && "error" in json ? json.error : null;
    if (res.status === 413) throw new TraducirError("too_large", err?.message ?? "El archivo es demasiado pesado.");
    throw new TraducirError(err?.code ?? "unknown", err?.message ?? `Error ${res.status} del servidor.`);
  }
  return json as T;
}

export const traducir = (req: TraducirRequest, signal?: AbortSignal) => postJSON<TramiteTraducido>("/api/traducir", req, signal);

export type TipoNota = "consulta" | "prorroga" | "reclamo" | "descargo";
export interface Borrador {
  asunto: string;
  cuerpo: string;
  notas: string[];
}

export const redactarNota = (tipo: TipoNota, tramite: TramiteTraducido, extra: string, signal?: AbortSignal) =>
  postJSON<Borrador>("/api/redactar", { tipo, tramite, extra }, signal);
