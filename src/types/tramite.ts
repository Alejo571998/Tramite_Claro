// src/types/tramite.ts
// Tipos TS que matchean el responseSchema de src/lib/schema.ts

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

export interface TramiteTraducido {
  resumen: string;
  organismo: string;
  urgencia: Urgencia;
  checklist: ChecklistItem[];
  alertas: Alerta[];
  plazo: string;
}
