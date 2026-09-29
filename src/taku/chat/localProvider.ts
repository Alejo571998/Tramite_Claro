// src/taku/chat/localProvider.ts — Taku sin red: responde con lo que ya sabe del
// trámite abierto (resumen, pasos, plazo, alertas, glosario). No inventa nada.
import type { ChatReply, TakuChatProvider } from "./provider";
import type { TakuChatContext } from "../types";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

const GENERAL: ChatReply = {
  text:
    "Funciono así: 1) me mandás una foto (pueden ser varias hojas), un PDF o me contás con tus palabras qué te llegó; 2) lo leo y te lo explico simple; 3) te armo una lista de pasos que podés ir tildando. Tus trámites quedan guardados en «Mis trámites» para retomarlos.",
  suggestions: ["¿Es seguro?", "¿Qué trámites entendés?"],
};

function answer(q: string, ctx: TakuChatContext): ChatReply {
  const t = ctx.tramite;

  if (has(q, "hola", "buenas", "que tal")) return { text: `¡Hola${ctx.nombre ? `, ${ctx.nombre}` : ""}! ¿En qué te doy una mano?` };
  if (has(q, "gracias", "genial", "joya", "buenisimo")) return { text: "¡De nada! Para eso estoy. Cualquier otra duda, acá me encontrás." };
  if (has(q, "segur", "privad", "datos", "guardan"))
    return {
      text: "El documento viaja cifrado solo para leerlo y Trámite Claro no lo guarda. Lo que sí queda es el resultado, en este dispositivo, para que puedas retomar tus pasos. Igual, evitá mandar fotos de tarjetas o claves.",
    };
  if (has(q, "como funciona", "como se usa", "que haces", "ayuda")) return GENERAL;
  if (has(q, "que tramites", "entendes", "sirve para"))
    return {
      text: "Cartas e intimaciones de ARCA/AFIP, trámites de ANSES, municipalidad, RENAPER, registros, bancos, obras sociales, multas… Si es un papel con lenguaje difícil, probemos.",
    };

  if (!t)
    return {
      text: "Todavía no tengo un trámite abierto para mirar. Mandame una foto, un PDF o contame qué te llegó, y después te respondo sobre eso.",
      suggestions: ["¿Cómo funciona?"],
    };

  const pasos = t.checklist;
  const done = ctx.progreso?.done ?? 0;

  if (has(q, "primero", "empiezo", "arranco", "siguiente", "proximo", "que hago", "que tengo que hacer")) {
    const p = pasos[Math.min(done, pasos.length - 1)];
    if (!p) return { text: "No encontré pasos concretos en este trámite." };
    return {
      text: `${done > 0 ? `Llevás ${done} de ${pasos.length}. Lo que sigue` : "Lo primero"} es: «${p.paso}».${p.detalle ? ` ${p.detalle}` : ""}`,
      suggestions: ["¿Hasta cuándo tengo?", "¿Qué necesito llevar?"],
    };
  }
  if (has(q, "plazo", "cuando", "fecha", "vence", "hasta"))
    return {
      text: t.plazo
        ? `El plazo que figura es: ${t.plazo}. Si podés, no lo dejes para el último día.`
        : "El documento no menciona un plazo concreto. Igual, conviene no dejarlo pasar: si te llegó una notificación, fijate si tiene fecha.",
      suggestions: ["¿Es urgente?"],
    };
  if (has(q, "urgent", "apuro", "grave"))
    return {
      text:
        t.urgencia === "alta"
          ? "Sí, es urgente. Te recomiendo arrancar hoy con el primer paso."
          : t.urgencia === "media"
            ? "Es medio: no es para hoy mismo, pero tampoco lo dejes colgado."
            : "Tranqui, no es urgente. Hacelo cuando puedas.",
    };
  if (has(q, "llevar", "necesito", "document", "papeles", "requisit")) {
    const docs = pasos.filter((p) =>
      /dni|certificad|constancia|formulario|comprobante|contrato|plano|libreta|partida|recibo|clave|cuit/i.test(`${p.paso} ${p.detalle}`),
    );
    const lista = (docs.length ? docs : pasos).slice(0, 5).map((p) => `• ${p.paso}`).join("\n");
    return { text: `Esto es lo que aparece en el trámite:\n${lista}`, suggestions: ["¿Qué hago primero?"] };
  }
  if (has(q, "ojo", "riesgo", "cuidado", "pierdo", "multa", "sancion", "alerta")) {
    if (!t.alertas.length) return { text: "No vi riesgos específicos en este trámite. Igual, seguí los pasos en orden." };
    return { text: `Prestá atención a esto:\n${t.alertas.map((a) => `• ${a.texto}`).join("\n")}` };
  }
  if (has(q, "significa", "que es", "quiere decir", "palabra")) {
    const term = t.glosario?.find((g) => q.includes(norm(g.termino)));
    if (term) return { text: `«${term.termino}»: ${term.significado}` };
    if (t.glosario?.length)
      return {
        text: "Estas son las palabras difíciles que encontré. Tocá una:",
        suggestions: t.glosario.slice(0, 4).map((g) => `¿Qué significa ${g.termino}?`),
      };
    return { text: "No encontré palabras técnicas raras en este trámite." };
  }
  if (has(q, "donde", "organismo", "quien", "oficina"))
    return {
      text:
        t.organismo && t.organismo !== "No identificado"
          ? `Esto es de ${t.organismo}. Para direcciones y turnos, usá siempre la web oficial del organismo.`
          : "No pude identificar el organismo. Fijate el membrete o el logo del papel.",
    };
  if (has(q, "resum", "explica", "no entiendo", "de que se trata")) return { text: t.resumen, suggestions: ["¿Qué hago primero?"] };

  return {
    text: "Esa todavía no la sé responder bien: por ahora contesto sobre el trámite que tenés abierto (pasos, plazo, qué llevar, palabras raras). ¡Pronto voy a poder charlar de todo!",
    suggestions: ["¿Qué hago primero?", "¿Hasta cuándo tengo?", "¿Qué necesito llevar?"],
  };
}

export const localProvider: TakuChatProvider = {
  id: "local",
  live: false,
  starters(ctx) {
    if (!ctx.tramite) return ["¿Cómo funciona?", "¿Es seguro?", "¿Qué trámites entendés?"];
    const s = ["¿Qué hago primero?", "¿Hasta cuándo tengo?", "¿Qué necesito llevar?"];
    if (ctx.tramite.alertas.length) s.push("¿Qué riesgos hay?");
    if (ctx.tramite.glosario?.length) s.push(`¿Qué significa ${ctx.tramite.glosario[0].termino}?`);
    return s;
  },
  async send(messages, ctx) {
    const last = [...messages].reverse().find((m) => m.role === "user");
    // pausa corta para que se vea el "escribiendo…" y no se sienta robótico
    await new Promise((r) => setTimeout(r, 450 + Math.random() * 400));
    return answer(norm(last?.text ?? ""), ctx);
  },
};
