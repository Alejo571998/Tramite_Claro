import { describe, expect, it } from "vitest";
import { isoDate, normalizeTramite } from "../../api/_lib/normalize";

describe("normalizeTramite", () => {
  it("acepta la forma canónica", () => {
    const t = normalizeTramite({
      titulo: "Libreta AUH",
      resumen: "Tenés que presentar la libreta.",
      organismo: "ANSES",
      urgencia: "alta",
      checklist: [{ paso: "Descargá el formulario", detalle: "" }],
      alertas: [{ texto: "Perdés el 20%", severidad: "critico" }],
      plazo: "Hasta el 31 de diciembre",
      fecha_limite: "2026-12-31",
      glosario: [{ termino: "AUH", significado: "Asignación Universal por Hijo" }],
    });
    expect(t.titulo).toBe("Libreta AUH");
    expect(t.fecha_limite).toBe("2026-12-31");
    expect(t.alertas[0].severidad).toBe("critico");
    expect(t.glosario).toHaveLength(1);
  });

  it("tolera claves y valores en variantes (tildes, inglés, plurales)", () => {
    const t = normalizeTramite({
      Summary: "Algo",
      Organismo: "ARCA",
      Urgencia: "Alta",
      Pasos: [{ title: "Entrá al portal", description: "Con Clave Fiscal" }, { paso: "" }],
      Alerts: [{ text: "Ojo", severity: "Warning" }],
    });
    expect(t.resumen).toBe("Algo");
    expect(t.urgencia).toBe("alta");
    expect(t.checklist).toEqual([{ paso: "Entrá al portal", detalle: "Con Clave Fiscal" }]);
    expect(t.alertas[0].severidad).toBe("importante");
    expect(t.titulo).toBe("ARCA"); // sin título, cae al organismo
    expect(t.glosario).toEqual([]);
  });

  it("urgencia desconocida → baja; organismo vacío → No identificado", () => {
    const t = normalizeTramite({ resumen: "x", urgencia: "???" });
    expect(t.urgencia).toBe("baja");
    expect(t.organismo).toBe("No identificado");
  });

  it("normaliza tildes en valores (crítico → critico)", () => {
    const t = normalizeTramite({ resumen: "x", urgencia: "Média", alertas: [{ texto: "a", severidad: "Crítico" }] });
    expect(t.urgencia).toBe("media");
    expect(t.alertas[0].severidad).toBe("critico");
  });
});

describe("isoDate", () => {
  it("valida fechas reales", () => {
    expect(isoDate("2026-12-31")).toBe("2026-12-31");
    expect(isoDate("2026-02-30")).toBe("");
    expect(isoDate("31/12/2026")).toBe("");
    expect(isoDate("")).toBe("");
    expect(isoDate(undefined)).toBe("");
  });
});
