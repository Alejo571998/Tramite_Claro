// src/components/DeadlineFact.tsx — plazo + cuenta regresiva + "Agendar" (Google Calendar / .ics)
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { daysLeft, daysLeftLabel, downloadIcs, formatFecha, googleCalendarUrl } from "../lib/deadline";
import type { TramiteTraducido } from "../types/tramite";

export function DeadlineFact({ data }: { data: TramiteTraducido }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fecha = data.fecha_limite || "";
  const n = daysLeft(fecha);
  const titulo = data.titulo || data.organismo;
  const detalle = `${data.resumen}\n\nPrimer paso: ${data.checklist[0]?.paso ?? "-"}\n\nExplicado con Trámite Claro · ${location.origin}`;
  const gcal = n !== null ? googleCalendarUrl({ titulo, fecha, detalle }) : null;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const tone = n === null ? "" : n < 0 ? " fact--vencido" : n <= 7 ? " fact--pronto" : "";

  return (
    <div className={`fact${data.plazo || n !== null ? " fact--deadline" : ""}${tone}`}>
      <span className="fact__icon">
        <Icon name="clock" size={18} />
      </span>
      <div className="fact__main">
        <span className="fact__label">Plazo</span>
        <strong className="fact__value">{data.plazo || (n !== null ? formatFecha(fecha) : "No menciona un plazo")}</strong>
        {n !== null && (
          <span className="countdown" title={formatFecha(fecha)}>
            {daysLeftLabel(n)}
          </span>
        )}
        {n !== null && n >= 0 && (
          <div className="agendar" ref={ref}>
            <button type="button" className="btn btn--soft btn--sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu">
              <Icon name="calendar" size={15} /> Agendar recordatorio
            </button>
            {open && (
              <div className="menu menu--left" role="menu">
                {gcal && (
                  <a className="menu__item" role="menuitem" href={gcal} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                    <Icon name="calendar" size={16} /> Google Calendar
                  </a>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className="menu__item"
                  onClick={() => {
                    downloadIcs({ titulo, fecha, detalle });
                    setOpen(false);
                  }}
                >
                  <Icon name="download" size={16} /> Calendario del celular (.ics)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
