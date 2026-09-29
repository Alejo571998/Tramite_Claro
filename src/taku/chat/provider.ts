// src/taku/chat/provider.ts — contrato del chat de Taku.
// La UI (TakuChat) solo conoce esta interfaz. Hoy usa el proveedor local;
// para conectar un chatbot real: VITE_TAKU_CHAT_MODE=remote y un endpoint que
// reciba { messages, context } y devuelva { text, suggestions? }.
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

export function createChatProvider(): TakuChatProvider {
  const mode = import.meta.env.VITE_TAKU_CHAT_MODE;
  if (mode === "remote") return createRemoteProvider(import.meta.env.VITE_TAKU_CHAT_ENDPOINT || "/api/taku", localProvider);
  return localProvider;
}
