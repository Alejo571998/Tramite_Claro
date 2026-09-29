// api/_lib/normalize.ts
// Normalización tolerante de la respuesta del modelo: cubre variantes razonables
// de claves y valores (tildes, plurales, inglés) pese al responseSchema.
import type { TramiteTraducido, Urgencia, SeveridadAlerta } from "../../src/types/tramite.ts";

const normKey = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const normVal = (v: unknown) =>
  String(v ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

function picker(obj: Record<string, unknown>) {
  const m = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) m.set(normKey(k), v);
  return (keys: string[]): unknown => {
    for (const k of keys) {
      const v = m.get(normKey(k));
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return undefined;
  };
}

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());
const arr = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : { texto: x })) : [];

function mapUrgencia(v: unknown): Urgencia {
  const s = normVal(v);
  if (/(alta|alto|high|urgente|critic)/.test(s)) return "alta";
  if (/(media|medio|medium|moderad)/.test(s)) return "media";
  return "baja";
}

function mapSeveridad(v: unknown): SeveridadAlerta {
  const s = normVal(v);
  if (/(critic|grave|danger|error)/.test(s)) return "critico";
  if (/(import|warning|aviso|alta)/.test(s)) return "importante";
  return "info";
}

/** Acepta solo fechas reales YYYY-MM-DD; cualquier otra cosa → "". */
export function isoDate(v: unknown): string {
  const s = str(v).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const d = new Date(`${s}T12:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : "";
}

export function normalizeTramite(raw: Record<string, unknown>): TramiteTraducido {
  const get = picker(raw);
  const checklist = arr(get(["checklist", "lista de verificacion", "pasos", "steps"]))
    .map((o) => {
      const g = picker(o);
      return {
        paso: str(g(["paso", "titulo", "title", "step", "nombre", "task", "texto"])),
        detalle: str(g(["detalle", "description", "detail", "descripcion", "info", "nota"])),
      };
    })
    .filter((c) => c.paso);
  const alertas = arr(get(["alertas", "alerts", "avisos", "advertencias"]))
    .map((o) => {
      const g = picker(o);
      return {
        texto: str(g(["texto", "text", "mensaje", "message", "descripcion", "aviso"])),
        severidad: mapSeveridad(g(["severidad", "severity", "nivel", "prioridad", "importancia"])),
      };
    })
    .filter((a) => a.texto);
  const glosario = arr(get(["glosario", "glossary", "terminos"]))
    .map((o) => {
      const g = picker(o);
      return {
        termino: str(g(["termino", "term", "palabra"])),
        significado: str(g(["significado", "definicion", "meaning", "definition"])),
      };
    })
    .filter((t) => t.termino && t.significado)
    .slice(0, 6);

  const organismo = str(get(["organismo", "organism", "entidad"])) || "No identificado";
  return {
    titulo: str(get(["titulo", "title", "nombre"])) || organismo,
    resumen: str(get(["resumen", "summary", "descripcion"])),
    organismo,
    urgencia: mapUrgencia(get(["urgencia", "urgency", "prioridad"])),
    checklist,
    alertas,
    plazo: str(get(["plazo", "deadline", "vigencia", "vencimiento"])),
    fecha_limite: isoDate(get(["fecha_limite", "fechalimite", "fecha", "due_date"])),
    glosario,
  };
}
