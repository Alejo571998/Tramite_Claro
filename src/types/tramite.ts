// src/types/tramite.ts
// Tipos compartidos cliente/servidor — matchean api/_lib/schema.ts

export type Urgencia = "baja" | "media" | "alta";
export type SeveridadAlerta = "info" | "importante" | "critico";

export interface ChecklistItem {
  paso: string;
  detalle: string;
}

export interface Alerta {
  texto: string;
  severidad: SeveridadAlerta;
}

export interface TerminoGlosario {
  termino: string;
  significado: string;
}

export interface TramiteTraducido {
  /** Nombre corto. Opcional: las respuestas viejas / de ejemplo pueden no traerlo. */
  titulo?: string;
  resumen: string;
  organismo: string;
  urgencia: Urgencia;
  checklist: ChecklistItem[];
  alertas: Alerta[];
  plazo: string;
  /** Fecha límite concreta en formato YYYY-MM-DD, si el documento la permite calcular. */
  fecha_limite?: string;
  glosario?: TerminoGlosario[];
}

export type FuenteTramite = "foto" | "pdf" | "texto" | "ejemplo";

/** Lo que el cliente manda a POST /api/traducir */
export type TraducirRequest =
  | { tipo: "texto"; texto: string }
  | { tipo: "archivos"; fuente: "foto" | "pdf"; archivos: { mimeType: string; data: string }[] };

export type ApiErrorCode = "quota" | "busy" | "too_large" | "bad_input" | "config" | "unreadable" | "rate_limited" | "unknown";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}
