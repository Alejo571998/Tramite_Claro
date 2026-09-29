// src/taku/chat/provider.ts — contrato del chat de Taku.
// La UI (TakuChat) solo conoce esta interfaz. Por defecto usa el chat real
// (POST /api/taku con Gemini) y, si falla, degrada al proveedor local.
import type { TakuChatContext } from "../types";
import { localProvider } from "./localProvider";
import { createRemoteProvider } from "./remoteProvider";

export interface ChatMessage {
  id: string;
  role: "user" | "taku";
  text: string;
  ts: number;
}

export interface ChatReply {
  text: string;
  /** Respuestas rápidas sugeridas para seguir la charla. */
  suggestions?: string[];
}

export interface TakuChatProvider {
  readonly id: string;
  /** true si responde con un modelo real (se muestra distinto en la UI). */
  readonly live: boolean;
  send(messages: ChatMessage[], context: TakuChatContext, signal?: AbortSignal): Promise<ChatReply>;
  starters(context: TakuChatContext): string[];
}

/** Por defecto Taku usa el chat real (api/taku.ts). VITE_TAKU_CHAT_MODE=local lo fuerza sin red. */
export function createChatProvider(): TakuChatProvider {
  if (import.meta.env.VITE_TAKU_CHAT_MODE === "local") return localProvider;
  return createRemoteProvider(import.meta.env.VITE_TAKU_CHAT_ENDPOINT || "/api/taku", localProvider);
}
