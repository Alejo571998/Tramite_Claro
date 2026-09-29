import { describe, expect, it } from "vitest";
import { parse, href } from "../../src/lib/router";
import { grayMetrics, qualityIssues } from "../../src/lib/files";
import { mergeTramites } from "../../src/lib/cloudSync";
import { localProvider } from "../../src/taku/chat/localProvider";
import type { TramiteGuardado } from "../../src/lib/tramitesStore";
import type { TramiteTraducido } from "../../src/types/tramite";

describe("router", () => {
  it("parsea y arma rutas", () => {
    expect(parse("#/tramite/abc-123")).toEqual({ name: "tramite", id: "abc-123" });
    expect(parse("#/mis-tramites")).toEqual({ name: "mis-tramites" });
    expect(parse("#/?compartido=1")).toEqual({ name: "inicio" });
    expect(parse("")).toEqual({ name: "inicio" });
    expect(href({ name: "tramite", id: "a b" })).toBe("#/tramite/a%20b");
  });
});

describe("calidad de foto", () => {
  const w = 40;
  const h = 40;
  it("detecta imagen oscura y plana (borrosa)", () => {
    const flat = new Array(w * h).fill(20);
    const m = grayMetrics(flat, w, h);
    expect(m.brightness).toBe(20);
    expect(m.sharpness).toBe(0);
    expect(qualityIssues({ ...m, width: 2000, height: 1500 })).toEqual(["oscura", "borrosa"]);
  });
  it("un patrón con bordes nítidos pasa", () => {
    const px = Array.from({ length: w * h }, (_, i) => ((Math.floor(i / w) >> 2) + ((i % w) >> 2)) % 2 ? 250 : 120);
    const m = grayMetrics(px, w, h);
    expect(m.sharpness).toBeGreaterThan(90);
    expect(qualityIssues({ ...m, width: 2000, height: 1500 })).toEqual([]);
  });
  it("marca poca resolución", () => {
    expect(qualityIssues({ brightness: 150, sharpness: 500, width: 400, height: 300 })).toEqual(["chica"]);
  });
});

describe("sincronización: mergeTramites", () => {
  const mk = (id: string, updatedAt: number, createdAt = updatedAt): TramiteGuardado => ({
    id,
    createdAt,
    updatedAt,
    fuente: "texto",
    done: [],
    data: { resumen: id, organismo: "X", urgencia: "baja", checklist: [], alertas: [], plazo: "" },
  });
  it("gana el más reciente y sube solo lo que cambió localmente", () => {
    const { merged, toPush } = mergeTramites([mk("a", 5), mk("b", 1), mk("c", 3)], [mk("a", 4), mk("b", 2), mk("d", 9)]);
    expect(merged.map((t) => t.id).sort()).toEqual(["a", "b", "c", "d"]);
    expect(merged.find((t) => t.id === "b")!.updatedAt).toBe(2);
    expect(toPush.map((t) => t.id).sort()).toEqual(["a", "c"]);
  });
});

describe("Taku local (sin red)", () => {
  const tramite: TramiteTraducido = {
    titulo: "Libreta AUH",
    resumen: "Presentá la libreta.",
    organismo: "ANSES",
    urgencia: "alta",
    checklist: [
      { paso: "Descargá el formulario", detalle: "PS 1.47" },
      { paso: "Hacé firmar la escuela", detalle: "" },
    ],
    alertas: [{ texto: "Perdés el 20%", severidad: "critico" }],
    plazo: "Hasta el 31 de diciembre",
    glosario: [{ termino: "Libreta AUH", significado: "Formulario de salud y escuela." }],
  };
  const ask = (text: string, progreso = { done: 0, total: 2 }) =>
    localProvider.send([{ id: "1", role: "user", text, ts: 0 }], { tramite, progreso, oficial: { nombre: "ANSES", url: "https://www.anses.gob.ar" } });

  it("responde el siguiente paso según el progreso", async () => {
    expect((await ask("¿Qué hago primero?")).text).toContain("Descargá el formulario");
    expect((await ask("¿Qué hago primero?", { done: 1, total: 2 })).text).toContain("Hacé firmar la escuela");
  });
  it("plazo, riesgos, glosario y link oficial", async () => {
    expect((await ask("¿Hasta cuándo tengo?")).text).toContain("31 de diciembre");
    expect((await ask("¿Qué riesgos hay?")).text).toContain("20%");
    expect((await ask("¿Qué significa libreta auh?")).text).toContain("Formulario de salud");
    expect((await ask("¿Dónde lo hago?")).text).toContain("https://www.anses.gob.ar");
  });
});
