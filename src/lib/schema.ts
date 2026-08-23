// src/lib/schema.ts
// Response schema para structured output — usar siempre combinado con
// responseMimeType: "application/json" (ver spec §5).

export const tramiteResponseSchema = {
  type: "object",
  properties: {
    resumen: {
      type: "string",
      description:
        "Resumen en 2-3 frases, en español rioplatense coloquial, sin jerga burocrática. Como si se lo explicaras a un amigo.",
    },
    organismo: {
      type: "string",
      description:
        "Organismo detectado (ARCA/AFIP, ANSES, municipalidad, RENAPER, otro). Si no se detecta, 'No identificado'.",
    },
    urgencia: {
      type: "string",
      enum: ["baja", "media", "alta"],
      description:
        "Nivel de urgencia. Debe ser EXACTAMENTE uno de: baja, media, alta (en minúscula, sin tilde, singular, femenino).",
    },
    checklist: {
      type: "array",
      description: "Pasos y documentos necesarios, en el orden en que hay que hacerlos.",
      items: {
        type: "object",
        properties: {
          paso: {
            type: "string",
            description: "Descripción corta y accionable del paso o documento.",
          },
          detalle: {
            type: "string",
            description:
              "Aclaración breve si hace falta (dónde conseguirlo, requisito, etc). Puede ser string vacío.",
          },
        },
        required: ["paso", "detalle"],
      },
    },
    alertas: {
      type: "array",
      description:
        "Cosas que comúnmente hacen perder el trámite o el turno. Array vacío si no aplica.",
      items: {
        type: "object",
        properties: {
          texto: { type: "string", description: "La alerta en sí, corta y directa." },
          severidad: { type: "string", enum: ["info", "importante", "critico"], description: "Debe ser EXACTAMENTE uno de: info, importante, critico (en minúscula, sin tilde)." },
        },
        required: ["texto", "severidad"],
      },
    },
    plazo: {
      type: "string",
      description:
        "Plazo o vigencia detectada en el texto, si existe. String vacío si no se menciona ninguno.",
    },
  },
  required: ["resumen", "organismo", "urgencia", "checklist", "alertas", "plazo"],
} as const;
