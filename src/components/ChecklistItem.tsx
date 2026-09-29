// src/components/ChecklistItem.tsx — paso del checklist: hecho / actual / pendiente
import { Icon } from "./Icon";

interface Props {
  index: number;
  paso: string;
  detalle: string;
  done: boolean;
  isActual: boolean;
  onToggle: () => void;
}

export function ChecklistItem({ index, paso, detalle, done, isActual, onToggle }: Props) {
  const state = done ? "done" : isActual ? "actual" : "pending";
  return (
    <li className={`step step--${state}`}>
      <button type="button" className="step__btn" role="checkbox" aria-checked={done} onClick={onToggle}>
        <span className="step__box" aria-hidden="true">
          {done ? <Icon name="check" size={14} /> : <span>{index + 1}</span>}
        </span>
        <span className="step__body">
          {isActual && <span className="step__tag">Ahora</span>}
          <span className="step__title">{paso}</span>
          {detalle && <span className="step__detail">{detalle}</span>}
        </span>
      </button>
    </li>
  );
}
