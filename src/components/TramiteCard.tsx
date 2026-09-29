// src/components/TramiteCard.tsx — tarjeta de historial con progreso
import type { ReactNode } from "react";
import type { TramiteGuardado } from "../lib/tramitesStore";
import { href } from "../lib/router";
import { UrgencyBadge } from "./UrgencyBadge";

const fecha = (ts: number) => {
  const d = Math.floor((Date.now() - ts) / 86_400_000);
  if (d <= 0) return "Hoy";
  if (d === 1) return "Ayer";
  if (d < 7) return `Hace ${d} días`;
  return new Date(ts).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
};

export function TramiteCard({ t, actions }: { t: TramiteGuardado; actions?: ReactNode }) {
  const total = t.data.checklist.length;
  const done = t.done.length;
  const complete = total > 0 && done >= total;
  return (
    <article className={`tramite-card${complete ? " is-complete" : ""}`}>
      <a className="tramite-card__link" href={href({ name: "tramite", id: t.id })}>
        <div className="tramite-card__top">
          <span className="tramite-card__org">{t.data.organismo}</span>
          {complete ? <span className="pill pill--done">Resuelto</span> : <UrgencyBadge urgencia={t.data.urgencia} compact />}
        </div>
        <h3 className="tramite-card__title">{t.data.titulo || t.data.organismo}</h3>
        <div className="tramite-card__progress">
          <div className="bar" aria-hidden="true">
            <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          <span>
            {done}/{total} pasos · {fecha(t.updatedAt)}
            {t.fuente === "ejemplo" ? " · ejemplo" : ""}
          </span>
        </div>
      </a>
      {actions}
    </article>
  );
}
