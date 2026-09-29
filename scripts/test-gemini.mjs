import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/VITE_GEMINI_API_KEY=(.+)/);
const apiKey = match ? match[1].trim() : "";
if (!apiKey) {
  console.error("No key");
  process.exit(1);
}
const client = new GoogleGenAI({ apiKey });

const tramiteResponseSchema = {
  type: "object",
  properties: {
    resumen: { type: "string" },
    organismo: { type: "string" },
    urgencia: { type: "string", enum: ["baja", "media", "alta"] },
    checklist: {
      type: "array",
      items: { type: "object", properties: { paso: { type: "string" }, detalle: { type: "string" } }, required: ["paso", "detalle"] },
    },
    alertas: {
      type: "array",
      items: { type: "object", properties: { texto: { type: "string" }, severidad: { type: "string", enum: ["info", "importante", "critico"] } }, required: ["texto", "severidad"] },
    },
    plazo: { type: "string" },
  },
  required: ["resumen", "organismo", "urgencia", "checklist", "alertas", "plazo"],
};

const SYSTEM_PROMPT = `Sos un asistente que traduce trámites burocráticos argentinos (ARCA/AFIP, ANSES, municipalidades, RENAPER, registros civiles, etc.) a lenguaje simple y accionable para gente común, sin conocimiento legal ni administrativo previo.

Reglas:
- Escribí en español rioplatense, tono cercano pero respetuoso — como alguien que sabe del tema y te lo explica tomando un café, no como un formulario ni como un influencer.
- Nunca inventes requisitos, plazos, montos ni datos que no estén en el texto original o que no sean de conocimiento general y estable sobre ese organismo. Si no estás seguro de algo, omitilo en vez de arriesgar un dato falso — es mejor un checklist incompleto que uno con errores.
- El checklist tiene que estar en orden lógico de ejecución: qué hacer primero, qué depende de qué.
- Las alertas son solo para riesgos reales y específicos mencionados o implícitos en el texto (ej: "si no presentás esto antes de tal fecha, perdés el beneficio"), nunca relleno genérico tipo "llevá tu DNI" a menos que el texto indique que eso específicamente se suele olvidar.
- Si el texto pegado no parece ser un trámite argentino real, respondé igual con tu mejor interpretación pero marcá organismo como "No identificado" y sé conservador con el checklist en vez de inventar pasos.
- El campo "plazo" queda vacío ("") si el texto no menciona ningún plazo o vigencia concreta. No lo completes con suposiciones.
- Campos con valores cerrados: "urgencia" debe ser EXACTAMENTE "baja", "media" o "alta" (sin tilde, minúscula, singular). "severidad" debe ser EXACTAMENTE "info", "importante" o "critico" (sin tilde, minúscula). No uses variantes con tilde, plural o mayúscula.
- Las claves del JSON deben ser EXACTAMENTE: resumen, organismo, urgencia, checklist, alertas, plazo. No las traduzcas ni cambies.`;

function buildUserPrompt(t) { return `Texto del trámite a traducir:\n\n${t}`; }

const EJEMPLOS = [
  { id: "monotributo", texto: `RECATEGORIZACIÓN DEL RÉGIMEN SIMPLIFICADO PARA PEQUEÑOS CONTRIBUYENTES (MONOTRIBUTO)\n\nLa recategorización en el Régimen Simplificado (RS) es obligatoria y debe realizarse dos veces al año, en los meses de febrero y agosto, evaluando la actividad económica de los últimos 12 meses.\n\nCorresponde recategorizarse cuando, durante los últimos 12 meses, se hayan modificado los valores de alguno de los siguientes parámetros respecto de la categoría actual: ingresos brutos devengados, superficie afectada a la actividad, energía eléctrica consumida y alquileres devengados.` },
  { id: "auh", texto: `ASIGNACIÓN UNIVERSAL POR HIJO PARA PROTECCIÓN SOCIAL (AUH)\n\nLa Asignación Universal por Hijo (AUH) es una prestación mensual destinada a hijos e hijas de personas desocupadas, monotributistas sociales, o que se desempeñen en la economía informal con ingresos iguales o inferiores al Salario Mínimo, Vital y Móvil.\n\nRequisitos para el/la titular:\n- Ser argentino/a nativo/a o naturalizado/a, o extranjero/a con residencia legal mínima de 2 años en el país.` },
  { id: "habilitacion", texto: `HABILITACIÓN DE COMERCIO — TRÁMITE MUNICIPAL\n\nToda actividad comercial, industrial o de servicios que se desarrolle dentro del ejido municipal requiere de la correspondiente habilitación previa al inicio de actividades.` },
  { id: "dni", texto: `TRAMITACIÓN DE DOCUMENTO NACIONAL DE IDENTIDAD (DNI) — RENOVACIÓN\n\nCorresponde tramitar la renovación del DNI en los siguientes casos: vencimiento del ejemplar, deterioro que impida su lectura o identificación, extravío o robo, cambio de datos personales.` },
  { id: "monotributo2", texto: `RECATEGORIZACIÓN DEL RÉGIMEN SIMPLIFICADO PARA PEQUEÑOS CONTRIBUYENTES (MONOTRIBUTO)\n\nSi no se registraron cambios en dichos parámetros, no corresponde realizar el trámite y el contribuyente permanece en su categoría actual sin necesidad de acción alguna.` },
  { id: "auh2", texto: `ASIGNACIÓN UNIVERSAL POR HIJO PARA PROTECCIÓN SOCIAL (AUH)\n\nDocumentación a presentar:\n- DNI del titular y de los hijos/as a cargo.\n- Certificado de Escolaridad (a partir de los 5 años, obligatorio presentar antes de fin del ciclo lectivo para no perder el 20% retenido de la prestación).` },
];

const MODEL_ID = "gemini-3.5-flash";
const CONFIG = {
  responseMimeType: "application/json",
  responseSchema: tramiteResponseSchema,
  thinkingConfig: { thinkingLevel: "low" },
};

async function traducir(texto) {
  const resp = await client.models.generateContent({
    model: MODEL_ID,
    contents: [{ role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(texto)}` }] }],
    config: CONFIG,
  });
  return resp.text;
}

console.log(`Testing ${MODEL_ID} 6 veces seguidas...`);
for (let i = 0; i < 6; i++) {
  const ej = EJEMPLOS[i % EJEMPLOS.length];
  const start = Date.now();
  console.log(`\n[${i + 1}/6] ${ej.id} — ${new Date().toISOString()}`);
  try {
    const text = await traducir(ej.texto);
    const ms = Date.now() - start;
    const parsed = JSON.parse(text);
    console.log(`OK ${ms}ms — resumen: "${parsed.resumen.slice(0, 80)}..." urgencia:${parsed.urgencia} checklist:${parsed.checklist.length} alertas:${parsed.alertas.length} plazo:"${parsed.plazo.slice(0, 40)}"`);
    // validar claves
    const missing = ["resumen", "organismo", "urgencia", "checklist", "alertas", "plazo"].filter(k => !(k in parsed));
    if (missing.length) console.log(`WARN claves faltantes: ${missing.join(",")}`);
    if (!["baja","media","alta"].includes(parsed.urgencia)) console.log(`WARN urgencia fuera de enum: ${parsed.urgencia}`);
    for (const a of parsed.alertas) if (!["info","importante","critico"].includes(a.severidad)) console.log(`WARN severidad fuera de enum: ${a.severidad}`);
  } catch (e) {
    const ms = Date.now() - start;
    console.error(`FAIL ${ms}ms —`, e.message ?? e);
    if (e.message) console.error(e.message.slice(0, 1000));
    // no salir, seguir
  }
  if (i < 5) await new Promise(r => setTimeout(r, 1500));
}
console.log("\nDone");
