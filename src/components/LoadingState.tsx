// src/components/LoadingState.tsx — Taku "lee" el documento y narra las etapas.
// Es el momento de más ansiedad (5-20 s): mostramos avance real percibido y
// damos una salida (cancelar).
import { useEffect, useState } from "react";
import { TakuAvatar } from "../taku/TakuAvatar";
import { useTakuOnStage } from "../taku/TakuContext";

const ETAPAS = {
  foto: ["Mirando la foto…", "Leyendo la letra chica…", "Buscando plazos y requisitos…", "Armando tus pasos…"],
  pdf: ["Abriendo el PDF…", "Leyendo la letra chica…", "Buscando plazos y requisitos…", "Armando tus pasos…"],
  texto: ["Leyendo lo que me mandaste…", "Traduciendo del burocrático…", "Buscando plazos y requisitos…", "Armando tus pasos…"],
};

export function LoadingState({ fuente, onCancel }: { fuente: "foto" | "pdf" | "texto"; onCancel?: () => void }) {
  useTakuOnStage(true);
  const etapas = ETAPAS[fuente];
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setI((n) => Math.min(n + 1, etapas.length - 1)), 2600);
    return () => window.clearInterval(t);
  }, [etapas.length]);

  return (
    <div className="card loading" aria-busy="true">
      <div className="loading__taku">
        <TakuAvatar mood="thinking" size={132} eager />
        <span className="loading__scan" aria-hidden="true" />
      </div>
      <div className="loading__body">
        <p className="loading__title" aria-live="polite">
          {etapas[i]}
        </p>
        <ol className="loading__steps">
          {etapas.map((e, n) => (
            <li key={e} className={n < i ? "is-done" : n === i ? "is-now" : ""}>
              {e.replace("…", "")}
            </li>
          ))}
        </ol>
        <p className="loading__hint">{fuente === "texto" ? "Suele tardar unos segundos." : "Las fotos y PDFs tardan un poquito más."}</p>
        {onCancel && (
          <button type="button" className="btn btn--link" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
