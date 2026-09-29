// src/taku/script.ts — el "guion" de Taku: qué siente y qué dice ante cada evento.
// Centralizado para poder ajustar tono y frecuencia sin tocar pantallas.
import type { TakuEvent, TakuReaction } from "./types";

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export function reactionFor(e: TakuEvent): TakuReaction | null {
  switch (e.type) {
    case "welcome":
      return e.firstVisit
        ? {
            mood: "greet",
            ms: 2600,
            message: `¡Hola${e.nombre ? `, ${e.nombre}` : ""}! Soy Taku. Mandame una foto, un PDF o contame qué te llegó, y te lo explico en criollo con los pasos a seguir.`,
            actions: [{ label: "¿Cómo funciona?", ask: "¿Cómo funciona?" }],
          }
        : { mood: "greet", ms: 2000, message: e.nombre ? `¡Qué bueno verte de nuevo, ${e.nombre}!` : undefined };

    case "input:files":
      return {
        mood: "happy",
        ms: 1400,
        message:
          e.fuente === "pdf"
            ? "¡PDF recibido! Cuando quieras, tocá «Explicámelo»."
            : e.count > 1
              ? `Tengo ${e.count} páginas. Si falta alguna, sumala antes de seguir.`
              : "¡Buena foto! Fijate que se lean bien las letras. Si tiene más hojas, podés sumarlas.",
      };

    case "input:example":
      return { mood: "happy", ms: 1400, priority: 1, message: "Este es un ejemplo real. Así te dejo cualquier trámite: tocá los pasos para ir marcándolos." };

    case "analyze:success":
      if (e.urgencia === "alta")
        return {
          mood: "alert",
          ms: 2400,
          priority: 2,
          message: e.plazo
            ? `Ojo: esto tiene plazo (${e.plazo}). Arrancá por el primer paso, yo te acompaño.`
            : "Ojo: esto es urgente. Arrancá por el primer paso, yo te acompaño.",
          actions: [{ label: "¿Qué hago primero?", ask: "¿Qué hago primero?" }],
        };
      return {
        mood: "happy",
        ms: 1800,
        priority: 2,
        message: pick([
          `¡Listo! Son ${e.pasos} pasos. Marcalos a medida que los hacés y te guardo el progreso.`,
          `Ya está. Te lo dejé en ${e.pasos} pasos, sin vueltas.`,
        ]),
        actions: [{ label: "Tengo una duda", ask: "¿Qué necesito llevar?" }],
      };

    case "analyze:error":
      return {
        mood: "concerned",
        ms: 2200,
        priority: 3,
        message:
          e.code === "rate_limited"
            ? "Pará un cachito, que vamos muy rápido. En un ratito seguimos."
            : e.code === "network"
            ? "Parece que se cortó internet. Cuando vuelva, probamos de nuevo."
            : e.code === "unreadable"
              ? "No llegué a leerlo bien. ¿Probamos con una foto con más luz, o pegando el texto?"
              : e.code === "aborted"
                ? undefined
                : "Uy, algo falló de mi lado. No es tu culpa: probemos otra vez en un ratito.",
      };

    case "checklist:progress":
      if (e.done === 1 && e.total > 1) return { mood: "happy", ms: 1300, message: "¡Primer paso hecho! Ya arrancaste, que es lo más difícil." };
      if (e.total >= 4 && e.done === Math.ceil(e.total / 2)) return { mood: "happy", ms: 1300, message: "¡Vas por la mitad! Seguí así." };
      if (e.done === e.total - 1 && e.total > 2) return { mood: "happy", ms: 1300, message: "¡Te falta uno solo!" };
      return { mood: "happy", ms: 900 };

    case "checklist:complete":
      return { mood: "celebrate", ms: 3200, priority: 2, message: `¡Terminaste «${e.titulo}»! Trámite resuelto. 🎉` };

    case "history:open":
      return e.count === 0 ? { mood: "idle", ms: 0, message: "Todavía no hay trámites guardados. ¡Probemos con el primero!" } : null;

    case "deadline:soon":
      return {
        mood: "alert",
        ms: 2200,
        priority: 2,
        message:
          e.dias <= 0
            ? `¡Ojo! «${e.titulo}» vence hoy. Si podés, resolvelo ya.`
            : `Te recuerdo: a «${e.titulo}» le ${e.dias === 1 ? "queda 1 día" : `quedan ${e.dias} días`}.`,
      };

    case "input:quality": {
      const que = e.issues.includes("oscura") ? "salió bastante oscura" : e.issues.includes("borrosa") ? "salió medio borrosa" : "tiene poca resolución";
      return {
        mood: "concerned",
        ms: 1800,
        priority: 1,
        message: `La página ${e.pagina} ${que}. Si podés, sacala de nuevo con más luz y de frente. Si se lee bien, seguí igual.`,
      };
    }

    case "share:received":
      return { mood: "happy", ms: 1600, priority: 2, message: `¡Me llegó${e.count > 1 ? `n ${e.count} archivos` : " tu archivo"}! Revisalo y tocá «Explicámelo».` };

    case "result:revisit":
      return e.done > 0 && e.done < e.total
        ? { mood: "greet", ms: 1600, message: `Seguimos donde quedaste: llevás ${e.done} de ${e.total} pasos.` }
        : null;
  }
}
