import { describe, expect, it } from "vitest";
import { ORGANISMOS, findOrganismo } from "../../src/lib/organismos";

describe("findOrganismo", () => {
  it("reconoce por nombre, sin importar tildes ni mayúsculas", () => {
    expect(findOrganismo("ARCA")?.id).toBe("arca");
    expect(findOrganismo("AFIP / ARCA")?.id).toBe("arca");
    expect(findOrganismo("Anses")?.id).toBe("anses");
    expect(findOrganismo("RENAPER - Registro Nacional de las Personas")?.id).toBe("renaper");
    expect(findOrganismo("Dirección Nacional de Migraciones")?.id).toBe("migraciones");
  });
  it("usa el título como respaldo", () => {
    expect(findOrganismo("No identificado", "Asignación Universal por Hijo")?.id).toBe("anses");
    expect(findOrganismo("", "Renovación del DNI")?.id).toBe("renaper");
  });
  it("no inventa: municipios u organismos desconocidos → null", () => {
    expect(findOrganismo("Municipalidad de Rosario")).toBeNull();
    expect(findOrganismo("No identificado")).toBeNull();
    expect(findOrganismo("Obra social OSDE")).toBeNull();
  });
  it("no matchea palabras parciales", () => {
    expect(findOrganismo("Marcas registradas")).toBeNull(); // "arca" dentro de otra palabra
  });
  it("todas las URLs son oficiales y https", () => {
    for (const o of ORGANISMOS) expect(o.url).toMatch(/^https:\/\/(www\.)?[a-z.]+\.(gob|gov|org)\.ar(\/|$)/);
  });
});
