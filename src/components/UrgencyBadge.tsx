// src/components/UrgencyBadge.tsx
import type { Urgencia } from "../types/tramite";

const COPY: Record<Urgencia, { label: string; help: string }> = {
  alta: { label: "Urgente", help: "Arrancá hoy: hay plazos o riesgos cerca." },
  media: { label: "Sin apuro, pero no lo cuelgues", help: "Tenés margen, pero conviene avanzar esta semana." },
  baja: { label: "Tranqui", help: "No hay apuro. Hacelo cuando puedas." },
};

export function UrgencyBadge({ urgencia, compact }: { urgencia: Urgencia; compact?: boolean }) {
  const c = COPY[urgencia] ?? COPY.baja;
  return (
    <span className={`pill pill--${urgencia}`} title={c.help}>
      <span className="pill__dot" aria-hidden="true" />
      {compact ? { alta: "Urgente", media: "Media", baja: "Tranqui" }[urgencia] : c.label}
    </span>
  );
}

// eslint-disable-next-line react/only-export-components
export const urgencyHelp = (u: Urgencia) => (COPY[u] ?? COPY.baja).help;
