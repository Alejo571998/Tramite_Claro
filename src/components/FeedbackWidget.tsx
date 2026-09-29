// src/components/FeedbackWidget.tsx — "¿Te sirvió?" 👍/👎 con motivo opcional.
// Se recuerda por trámite para no volver a preguntar.
import { useState } from "react";
import { Icon } from "./Icon";
import { sendFeedback } from "../lib/telemetry";
import { readJSON, writeJSON } from "../lib/storage";
import type { FuenteTramite, TramiteTraducido } from "../types/tramite";

const MOTIVOS = ["Algo está mal", "No se entiende", "Le falta información", "Leyó mal el documento"];

export function FeedbackWidget({ id, data, fuente, onRated }: { id: string; data: TramiteTraducido; fuente: FuenteTramite; onRated?: (r: "up" | "down") => void }) {
  const key = `tc:fb:${id}`;
  const [state, setState] = useState<"ask" | "why" | "done">(() => (readJSON(key, false) ? "done" : "ask"));
  const [motivo, setMotivo] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const base = { titulo: data.titulo, organismo: data.organismo, fuente };

  const finish = () => {
    writeJSON(key, true);
    setState("done");
  };

  if (state === "done")
    return (
      <p className="feedback feedback--done" role="status">
        <Icon name="check" size={15} /> ¡Gracias! Tu opinión nos ayuda a que Taku explique mejor.
      </p>
    );

  if (state === "ask")
    return (
      <div className="feedback">
        <span>¿Te sirvió esta explicación?</span>
        <div className="feedback__btns">
          <button
            type="button"
            className="btn btn--soft btn--sm"
            onClick={() => {
              void sendFeedback({ rating: "up", ...base });
              onRated?.("up");
              finish();
            }}
          >
            <Icon name="thumbs-up" size={16} /> Sí
          </button>
          <button
            type="button"
            className="btn btn--soft btn--sm"
            onClick={() => {
              onRated?.("down");
              setState("why");
            }}
          >
            <Icon name="thumbs-down" size={16} /> No mucho
          </button>
        </div>
      </div>
    );

  return (
    <form
      className="feedback feedback--why"
      onSubmit={(e) => {
        e.preventDefault();
        void sendFeedback({ rating: "down", motivo: motivo ?? undefined, comentario: comentario.trim() || undefined, ...base });
        finish();
      }}
    >
      <span>¿Qué falló?</span>
      <div className="feedback__chips">
        {MOTIVOS.map((m) => (
          <button key={m} type="button" className={`chip${motivo === m ? " is-on" : ""}`} aria-pressed={motivo === m} onClick={() => setMotivo(m)}>
            {m}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor={`fb-${id}`}>
        Comentario opcional
      </label>
      <input id={`fb-${id}`} className="feedback__input" value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={500} placeholder="Contanos más (opcional, sin datos personales)" />
      <button type="submit" className="btn btn--primary btn--sm">
        Enviar
      </button>
    </form>
  );
}
