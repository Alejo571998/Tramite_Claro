import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const apiKey = env.match(/VITE_GEMINI_API_KEY=(.+)/)?.[1]?.trim();
if (!apiKey) { console.error("no key"); process.exit(1); }
const client = new GoogleGenAI({ apiKey });

const schema = {
  type: "object",
  properties: {
    resumen: { type: "string" },
    organismo: { type: "string" },
    urgencia: { type: "string", enum: ["baja", "media", "alta"] },
    checklist: { type: "array", items: { type: "object", properties: { paso: { type: "string" }, detalle: { type: "string" } }, required: ["paso", "detalle"] } },
    alertas: { type: "array", items: { type: "object", properties: { texto: { type: "string" }, severidad: { type: "string", enum: ["info", "importante", "critico"] } }, required: ["texto", "severidad"] } },
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

function buildUserPrompt(t){ return `Texto del trámite a traducir:\n\n${t}`; }

// Leer ejemplos reales desde src/lib/examples.ts (parse simple)
const examplesRaw = fs.readFileSync("src/lib/examples.ts", "utf8");
const EJEMPLOS = [];
const regex = /\{\s*id:\s*"([^"]+)".*?texto:\s*`([\s\S]*?)`\s*,?\s*\}/g;
let m;
while ((m = regex.exec(examplesRaw)) !== null) {
  EJEMPLOS.push({ id: m[1], texto: m[2] });
}
console.log("Ejemplos detectados:", EJEMPLOS.map(e=>e.id).join(", "));

const MODEL_ID = "gemini-3.5-flash";
const CONFIG = { responseMimeType: "application/json", responseSchema: schema, thinkingConfig: { thinkingLevel: "low" } };

const results = {};

for (const ej of EJEMPLOS) {
  console.log(`\n--- ${ej.id} --- ${new Date().toISOString()}`);
  const start = Date.now();
  try {
    const resp = await client.models.generateContent({
      model: MODEL_ID,
      contents: [{ role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(ej.texto)}` }] }],
      config: CONFIG,
    });
    const text = resp.text;
    const parsed = JSON.parse(text);
    console.log(`OK ${Date.now()-start}ms resumen: ${parsed.resumen.slice(0,80)}...`);
    results[ej.id] = parsed;
    await new Promise(r=>setTimeout(r, 2000));
  } catch (e) {
    console.error(`FAIL ${ej.id}`, e.message?.slice(0,800));
    console.error(e);
  }
}

fs.writeFileSync("scripts/fallback-raw.json", JSON.stringify(results, null, 2), "utf8");
console.log("\nGuardado scripts/fallback-raw.json");

// Generar fallbackResponses.ts
const tsContent = `// src/lib/fallbackResponses.ts
// Respuestas validadas el ${new Date().toISOString().slice(0,10)} contra gemini-3.5-flash.
// Usar solo vía botón manual "Ver resultado" para demo sin red (ver App.tsx).
// Fuente texto: src/lib/examples.ts — salida normalizada por src/lib/gemini.ts

import type { TramiteTraducido } from "../types/tramite";

export const FALLBACK_RESPONSES: Record<string, TramiteTraducido> = ${JSON.stringify(results, null, 2)} as Record<string, TramiteTraducido>;
`;

fs.writeFileSync("src/lib/fallbackResponses.ts", tsContent, "utf8");
console.log("Generado src/lib/fallbackResponses.ts");
