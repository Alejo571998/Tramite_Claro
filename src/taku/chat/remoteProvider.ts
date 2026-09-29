// src/taku/chat/remoteProvider.ts — adaptador para un backend de chat real.
// Contrato HTTP: POST endpoint  { messages: ChatMessage[], context: TakuChatContext }
//             → 200 { text: string, suggestions?: string[] }
// Si el backend falla, degrada al proveedor local para no dejar al usuario colgado.
import type { ChatReply, TakuChatProvider } from "./provider";

export function createRemoteProvider(endpoint: string, fallback: TakuChatProvider): TakuChatProvider {
  return {
    id: "remote",
    live: true,
    starters: (ctx) => fallback.starters(ctx),
    async send(messages, context, signal) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, context }),
          signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as ChatReply;
        if (!json?.text) throw new Error("respuesta vacía");
        return json;
      } catch (e) {
        if (signal?.aborted) throw e;
        return fallback.send(messages, context, signal);
      }
    },
  };
}
