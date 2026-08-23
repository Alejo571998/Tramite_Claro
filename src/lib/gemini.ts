// src/lib/gemini.ts
// Cliente Gemini — PINNEADO AHORA: gemini-3.5-flash (22/08/2026).
// Motivo: gemini-2.5-flash devuelve 404 para keys nuevas ("ya no está disponible
// para nuevos usuarios, use gemini-3.6-flash") y gemini-3.6-flash dio 503 de
// sobrecarga en esta misma sesión. gemini-3.5-flash es GA 19/05/2026, Free Tier
// Free of charge, Structured outputs Supported y pasó la prueba end-to-end.
// El switch cambia el BLOQUE COMPLETO de config (temperature vs thinkingConfig).
// Verificación: ai.google.dev/gemini-api/docs/models + pricing + deprecations.

import { GoogleGenAI } from "@google/genai";
import { tramiteResponseSchema } from "./schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import type { TramiteTraducido } from "../types/tramite";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

if (!apiKey) {
  console.warn(
    "[Trámite Claro] VITE_GEMINI_API_KEY no seteada. Definila en .env.local para habilitar la llamada real a Gemini.",
  );
}

const client = new GoogleGenAI({ apiKey: apiKey ?? "" });

// ── Modelo pinneado ────────────────────────────────────────────────
const MODEL_ID = "gemini-3.5-flash";

// Fallback si 3.5 da 503: probar 3.6-flash (mismo bloque de config):
// const MODEL_ID = "gemini-3.6-flash";

// ── Config pinneada para gemini-3.5/3.6-flash (NO usa temperature) ─
const GENERATION_CONFIG = {
  responseMimeType: "application/json",
  responseSchema: tramiteResponseSchema,
  thinkingConfig: { thinkingLevel: "low" as const },
} as const;

/*
// ── Config legacy para gemini-2.5-flash (usa temperature, YA NO disponible
// para keys nuevas — 404 NOT_FOUND al 22/08/2026). Mantener solo como
// referencia, no descomentar sin cambiar MODEL_ID a gemini-2.5-flash.
const GENERATION_CONFIG = {
  responseMimeType: "application/json",
  responseSchema: tramiteResponseSchema,
  temperature: 0.3,
} as const;
*/

function normalizeTramite(raw: Record<string, unknown>): TramiteTraducido {
  // Normalización case-insensitive + sin tildes para demo (23/8): cubre variantes
  // razonables que el modelo pueda devolver pese al responseSchema.
  const normKey = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const rawNorm = new Map<string, unknown>();
  for (const [k, v] of Object.entries(raw)) rawNorm.set(normKey(k), v);

  const get = (keys: string[]): unknown => {
    for (const k of keys) {
      const nk = normKey(k);
      if (rawNorm.has(nk)) return rawNorm.get(nk);
    }
    return undefined;
  };

  const checklistRaw =
    (get(["checklist", "lista de verificacion", "lista_de_verificacion", "listaDeVerificacion", "pasos", "steps"]) as unknown[]) ?? [];
  const alertasRaw = (get(["alertas", "alerts", "avisos", "advertencias"]) as unknown[]) ?? [];

  const normVal = (v: unknown) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const mapUrgencia = (v: unknown): TramiteTraducido["urgencia"] => {
    const s = normVal(v);
    // variantes: alta/alto/altas/altos/high, media/medio/medias/medios/medium, baja/bajo/bajas/bajo/low
    if (/^(alta|alto|altas|altos|high|urgente|critica)$/.test(s) || s.includes("alta") || s.includes("alto") || s === "high") return "alta";
    if (/^(media|medio|medias|medios|medium|moderada|moderado)$/.test(s) || s.includes("media") || s.includes("medio") || s === "medium") return "media";
    // default conservador
    if (/^(baja|bajo|bajas|bajos|low|tranquilo|leve)$/.test(s) || s.includes("baja") || s.includes("bajo") || s === "low") return "baja";
    // heurística por contenido
    if (s.includes("alta") || s.includes("alto")) return "alta";
    if (s.includes("media") || s.includes("medio")) return "media";
    return "baja";
  };

  const mapSeveridad = (v: unknown): TramiteTraducido["alertas"][number]["severidad"] => {
    const s = normVal(v);
    // critico: critico/crítico/critica/critica/críticos/critical/danger/error/grave
    if (/critic/.test(s) || s.includes("critic") || s === "grave" || s === "danger" || s === "error" || s === "critical") return "critico";
    // importante: importante/importantes/important/warning/medio/alta
    if (/import/.test(s) || s.includes("import") || s === "important" || s === "warning" || s === "aviso") return "importante";
    // resto -> info (info/informativo/leve/baja)
    return "info";
  };

  const getField = (obj: Record<string, unknown>, keys: string[]): string => {
    const m = new Map<string, unknown>();
    for (const [k, val] of Object.entries(obj)) m.set(normKey(k), val);
    for (const k of keys) {
      const v = m.get(normKey(k));
      if (v !== undefined && String(v).trim() !== "") return String(v);
    }
    return "";
  };

  return {
    resumen: String(get(["resumen", "summary", "descripcion"]) ?? ""),
    organismo: String(get(["organismo", "organism", "entidad"]) ?? "No identificado"),
    urgencia: mapUrgencia(get(["urgencia", "urgency", "prioridad"])),
    checklist: (Array.isArray(checklistRaw) ? checklistRaw : []).map((item: unknown) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return {
        paso: getField(o, ["paso", "titulo", "title", "step", "nombre", "task"]),
        detalle: getField(o, ["detalle", "description", "detail", "descripcion", "info", "nota"]),
      };
    }),
    alertas: (Array.isArray(alertasRaw) ? alertasRaw : []).map((item: unknown) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return {
        texto: getField(o, ["texto", "text", "mensaje", "message", "descripcion", "aviso"]),
        severidad: mapSeveridad(getField(o, ["severidad", "severity", "nivel", "prioridad", "importancia"])),
      };
    }),
    plazo: String(get(["plazo", "deadline", "vigencia", "vencimiento", "fecha"]) ?? ""),
  };
}

function parseResponse(text: string | undefined): TramiteTraducido {
  if (!text) throw new Error("Respuesta vacía de Gemini");
  const raw = JSON.parse(text) as Record<string, unknown>;
  // Si ya viene con la forma correcta, devolver directo; si no, normalizar
  if ("checklist" in raw && "resumen" in raw) {
    try {
      // intentar normalizar igual para corregir tildes/plurales en valores
      return normalizeTramite(raw);
    } catch {
      return raw as unknown as TramiteTraducido;
    }
  }
  return normalizeTramite(raw);
}

function isTransientError(err: unknown): boolean {
  const msg = String((err as Record<string, unknown>)?.["message"] ?? err ?? "").toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("unavailable") ||
    msg.includes("resource_exhausted") ||
    msg.includes("overloaded") ||
    msg.includes("high demand") ||
    msg.includes("try again") ||
    msg.includes("temporarily")
  );
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 1000): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isTransientError(err)) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 250;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export async function traducirTramite(textoTramite: string): Promise<TramiteTraducido> {
  if (!apiKey) throw new Error("Falta VITE_GEMINI_API_KEY");

  const response = await withRetry(() =>
    client.models.generateContent({
      model: MODEL_ID,
      contents: [{ role: "user", parts: [{ text: buildUserPrompt(`${SYSTEM_PROMPT}\n\n${textoTramite}`) }] }],
      config: GENERATION_CONFIG as never,
    }),
  );

  return parseResponse(response.text);
}

// ── Visión (foto) ──────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime imagen en el cliente a ~1600px lado mayor vía canvas antes de
 * mandar base64 inline (límite 20MB, pero queremos ahorrar cuota y latency).
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, file.type || "image/jpeg", quality),
  );
  if (!blob) return file;
  return new File([blob], file.name, { type: blob.type || file.type });
}

export async function traducirTramiteDesdeImagen(file: File): Promise<TramiteTraducido> {
  if (!apiKey) throw new Error("Falta VITE_GEMINI_API_KEY");

  const compressed = await compressImage(file);
  const base64Data = await fileToBase64(compressed);

  const response = await withRetry(() =>
    client.models.generateContent({
      model: MODEL_ID,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\nEsta imagen es una foto de un trámite en papel. Primero leé el texto visible (puede estar inclinado, con sombras, o parcialmente cortado) y después aplicá las mismas reglas de traducción.`,
            },
            { inlineData: { mimeType: compressed.type, data: base64Data } },
          ],
        },
      ],
      config: GENERATION_CONFIG as never,
    }),
  );

  return parseResponse(response.text);
}
