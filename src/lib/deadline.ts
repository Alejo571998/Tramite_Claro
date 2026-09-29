// src/lib/deadline.ts — días que faltan, link a Google Calendar y archivo .ics.
// Las fechas son "de calendario" (YYYY-MM-DD), sin hora: se comparan en hora local.

const MS_DAY = 86_400_000;

function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

/** Días enteros desde hoy hasta la fecha (0 = hoy, negativo = vencido). null si no es válida. */
export function daysLeft(iso: string | undefined, today = new Date()): number | null {
  const d = iso ? parseISODate(iso) : null;
  if (!d) return null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - t.getTime()) / MS_DAY);
}

export function daysLeftLabel(n: number): string {
  if (n < -1) return `Venció hace ${-n} días`;
  if (n === -1) return "Venció ayer";
  if (n === 0) return "Vence hoy";
  if (n === 1) return "Vence mañana";
  return `Faltan ${n} días`;
}

export function formatFecha(iso: string): string {
  const d = parseISODate(iso);
  return d ? d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : iso;
}

const compact = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

interface EventInput {
  titulo: string;
  fecha: string; // YYYY-MM-DD
  detalle: string;
}

/** Evento de día completo en Google Calendar. */
export function googleCalendarUrl({ titulo, fecha, detalle }: EventInput): string | null {
  const d = parseISODate(fecha);
  if (!d) return null;
  const end = new Date(d.getTime() + MS_DAY);
  const q = new URLSearchParams({ action: "TEMPLATE", text: `Vence: ${titulo}`, dates: `${compact(d)}/${compact(end)}`, details: detalle });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Archivo .ics (Apple, Outlook, Android) con aviso 3 días y 1 día antes. */
export function icsContent({ titulo, fecha, detalle }: EventInput, uid = `${Date.now()}@tramiteclaro`): string | null {
  const d = parseISODate(fecha);
  if (!d) return null;
  const end = new Date(d.getTime() + MS_DAY);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tramite Claro//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(d)}`,
    `DTEND;VALUE=DATE:${compact(end)}`,
    `SUMMARY:${icsEscape(`Vence: ${titulo}`)}`,
    `DESCRIPTION:${icsEscape(detalle)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`Faltan 3 días: ${titulo}`)}`,
    "TRIGGER:-P3D",
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`Mañana vence: ${titulo}`)}`,
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(ev: EventInput) {
  const content = icsContent(ev);
  if (!content) return;
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `vence-${ev.fecha}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
