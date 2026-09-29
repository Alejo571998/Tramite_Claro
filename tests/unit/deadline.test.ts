import { describe, expect, it } from "vitest";
import { daysLeft, daysLeftLabel, googleCalendarUrl, icsContent } from "../../src/lib/deadline";

const today = new Date(2026, 8, 29); // 29/09/2026

describe("daysLeft", () => {
  it("cuenta días de calendario", () => {
    expect(daysLeft("2026-09-29", today)).toBe(0);
    expect(daysLeft("2026-10-02", today)).toBe(3);
    expect(daysLeft("2026-09-27", today)).toBe(-2);
    expect(daysLeft("2026-12-31", today)).toBe(93);
  });
  it("devuelve null si no hay fecha válida", () => {
    expect(daysLeft(undefined, today)).toBeNull();
    expect(daysLeft("", today)).toBeNull();
    expect(daysLeft("2026-13-01", today)).toBeNull();
  });
  it("etiquetas humanas", () => {
    expect(daysLeftLabel(0)).toBe("Vence hoy");
    expect(daysLeftLabel(1)).toBe("Vence mañana");
    expect(daysLeftLabel(5)).toBe("Faltan 5 días");
    expect(daysLeftLabel(-1)).toBe("Venció ayer");
    expect(daysLeftLabel(-4)).toBe("Venció hace 4 días");
  });
});

describe("calendario", () => {
  const ev = { titulo: "Libreta AUH", fecha: "2026-12-31", detalle: "Presentar, con coma; y salto\nde línea" };
  it("link de Google Calendar de día completo", () => {
    const url = new URL(googleCalendarUrl(ev)!);
    expect(url.hostname).toBe("calendar.google.com");
    expect(url.searchParams.get("dates")).toBe("20261231/20270101");
    expect(url.searchParams.get("text")).toBe("Vence: Libreta AUH");
  });
  it(".ics válido con alarmas y texto escapado", () => {
    const ics = icsContent(ev, "test@tc")!;
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231");
    expect(ics).toContain("DTEND;VALUE=DATE:20270101");
    expect(ics).toContain("TRIGGER:-P3D");
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).toContain("Presentar\\, con coma\\; y salto\\nde línea");
  });
  it("fecha inválida → null", () => {
    expect(googleCalendarUrl({ ...ev, fecha: "mañana" })).toBeNull();
    expect(icsContent({ ...ev, fecha: "" })).toBeNull();
  });
});
