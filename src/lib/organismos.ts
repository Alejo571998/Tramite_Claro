// src/lib/organismos.ts — directorio curado de organismos con su web oficial.
// El modelo solo devuelve el nombre; el link lo pone la app desde acá, así nunca
// se muestra una URL inventada. Revisar vigencia periódicamente
// (última revisión: 2026-09). Agregar organismos = agregar una entrada.

export interface Organismo {
  id: string;
  nombre: string;
  descripcion: string;
  url: string;
  /** Palabras (sin tildes, minúscula) que identifican al organismo en el texto. */
  alias: string[];
}

export const ORGANISMOS: Organismo[] = [
  {
    id: "arca",
    nombre: "ARCA (ex AFIP)",
    descripcion: "Impuestos, Monotributo, CUIT y Clave Fiscal.",
    url: "https://www.arca.gob.ar",
    alias: ["arca", "afip", "monotributo", "clave fiscal", "agencia de recaudacion y control aduanero"],
  },
  {
    id: "anses",
    nombre: "ANSES",
    descripcion: "Asignaciones, jubilaciones, AUH y prestaciones.",
    url: "https://www.anses.gob.ar",
    alias: ["anses", "asignacion universal", "auh", "seguridad social"],
  },
  {
    id: "renaper",
    nombre: "RENAPER",
    descripcion: "DNI y pasaporte.",
    url: "https://www.argentina.gob.ar/interior/renaper",
    alias: ["renaper", "registro nacional de las personas", "dni", "pasaporte"],
  },
  {
    id: "miargentina",
    nombre: "Mi Argentina",
    descripcion: "Turnos y documentos digitales del Estado nacional.",
    url: "https://www.argentina.gob.ar/miargentina",
    alias: ["mi argentina"],
  },
  {
    id: "pami",
    nombre: "PAMI",
    descripcion: "Obra social de jubilados y pensionados.",
    url: "https://www.pami.org.ar",
    alias: ["pami", "instituto nacional de servicios sociales para jubilados"],
  },
  {
    id: "dnrpa",
    nombre: "Registro Automotor (DNRPA)",
    descripcion: "Transferencias, patentes y títulos de vehículos.",
    url: "https://www.dnrpa.gov.ar",
    alias: ["dnrpa", "registro automotor", "registro de la propiedad automotor"],
  },
  {
    id: "migraciones",
    nombre: "Migraciones",
    descripcion: "Residencias y trámites migratorios.",
    url: "https://www.argentina.gob.ar/interior/migraciones",
    alias: ["migraciones", "direccion nacional de migraciones"],
  },
  {
    id: "sssalud",
    nombre: "Superintendencia de Servicios de Salud",
    descripcion: "Reclamos a obras sociales y prepagas.",
    url: "https://www.argentina.gob.ar/sssalud",
    alias: ["superintendencia de servicios de salud", "sssalud"],
  },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Busca el organismo por el nombre que devolvió el modelo (y, de respaldo, por el título). */
export function findOrganismo(organismo: string | undefined, titulo = ""): Organismo | null {
  const test = (hay: string) => {
    const h = ` ${norm(hay).replace(/[^a-z0-9]+/g, " ")} `;
    return ORGANISMOS.find((o) => o.alias.some((a) => h.includes(` ${a} `))) ?? null;
  };
  return (organismo ? test(organismo) : null) ?? (titulo ? test(titulo) : null);
}
