// src/components/AlertCard.tsx — alerta con severidad
import { Icon } from "./Icon";
import type { SeveridadAlerta } from "../types/tramite";

const LABEL: Record<SeveridadAlerta, string> = { critico: "Ojo, es crítico", importante: "Importante", info: "Para tener en cuenta" };

export function AlertCard({ texto, severidad }: { texto: string; severidad: SeveridadAlerta }) {
  return (
    <div className={`alert alert--${severidad}`}>
      <span className="alert__icon">
        <Icon name={severidad === "info" ? "info" : "alert"} size={16} />
      </span>
      <div>
        <div className="alert__label">{LABEL[severidad] ?? LABEL.info}</div>
        <p className="alert__text">{texto}</p>
      </div>
    </div>
  );
}
