// api/_lib/gemini.ts — llamada a Gemini con reintentos y modelo de respaldo.
// Modelo principal: gemini-3.5-flash (GA 19/05/2026, structured outputs, free tier).
// Respaldo: gemini-3.6-flash, solo si el principal está saturado (503/429).
// La familia 3.x usa thinkingConfig (NO temperature).
import { GoogleGenAI } from "@google/genai";

export const MODELS = ["gemini-3.5-flash", "gemini-3.6-flash"] as const;

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
export interface Content {
  role: "user" | "model";
  parts: Part[];
}

export const isTransient = (err: unknown) =>
  /503|429|500|502|unavailable|resource_exhausted|overloaded|high demand|try again|temporarily/i.test(errMessage(err));

export const errMessage = (err: unknown) => String((err as { message?: unknown })?.message ?? err ?? "");

async function withRetry<T>(fn: () => Promise<T>, retries: number, baseDelayMs = 900): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isTransient(err)) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt + Math.random() * 250));
    }
  }
}

/**
 * Pide JSON estructurado. `input` puede ser una lista de partes (un solo mensaje del
 * usuario) o una conversación completa. Devuelve el texto crudo del modelo.
 */
export async function generateJSON(
  apiKey: string,
  input: Part[] | Content[],
  responseSchema: unknown,
  opts: { retries?: number; system?: string } = {},
): Promise<string> {
  const client = new GoogleGenAI({ apiKey });
  const contents: Content[] = input.length && "role" in input[0] ? (input as Content[]) : [{ role: "user", parts: input as Part[] }];
  const config = {
    responseMimeType: "application/json",
    responseSchema,
    thinkingConfig: { thinkingLevel: "low" },
    ...(opts.system ? { systemInstruction: opts.system } : {}),
  };
  const call = (model: string) =>
    client.models.generateContent({ model, contents, config: config as never }).then((r) => {
      if (!r.text) throw new Error("respuesta vacía del modelo (json)");
      return r.text;
    });

  try {
    return await withRetry(() => call(MODELS[0]), opts.retries ?? 2);
  } catch (primaryErr) {
    if (!isTransient(primaryErr)) throw primaryErr;
    try {
      return await withRetry(() => call(MODELS[1]), 1);
    } catch {
      throw primaryErr; // informamos el error original (saturado), no el del respaldo
    }
  }
}
