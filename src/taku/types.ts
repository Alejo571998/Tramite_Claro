// src/taku/types.ts — vocabulario de Taku
import type { TramiteTraducido, Urgencia } from "../types/tramite";
import type { ErrorCode } from "../lib/api";

/** Estados visuales. Son animaciones sobre la imagen original: el arte no se modifica. */
export type TakuMood =
  | "idle" // respira / flota suave
  | "greet" // saluda (balanceo)
  | "thinking" // lee el documento (balanceo lento + puntitos)
  | "happy" // saltito
  | "celebrate" // salto grande + confeti
  | "concerned" // se sacude y baja un poco
  | "alert" // llamado de atención (rebote + "!")
  | "shy"; // se esconde (login: no mira la contraseña)

/** Eventos de producto a los que Taku reacciona. Las pantallas emiten, Taku decide. */
export type TakuEvent =
  | { type: "welcome"; nombre?: string; firstVisit: boolean }
  | { type: "input:files"; fuente: "foto" | "pdf"; count: number }
  | { type: "input:example" }
  | { type: "analyze:success"; urgencia: Urgencia; plazo: string; pasos: number }
  | { type: "analyze:error"; code: ErrorCode }
  | { type: "checklist:progress"; done: number; total: number }
  | { type: "checklist:complete"; titulo: string }
  | { type: "history:open"; count: number }
  | { type: "result:revisit"; done: number; total: number };

export interface TakuBubbleAction {
  label: string;
  /** Pregunta que se manda al chat al tocar la acción. */
  ask?: string;
}

export interface TakuReaction {
  mood: TakuMood;
  /** Cuánto dura el estado antes de volver a idle. */
  ms: number;
  message?: string;
  actions?: TakuBubbleAction[];
  /** Mayor prioridad pisa al globo actual. */
  priority?: number;
}

export interface TakuChatContext {
  tramite?: TramiteTraducido | null;
  progreso?: { done: number; total: number };
  nombre?: string;
}
