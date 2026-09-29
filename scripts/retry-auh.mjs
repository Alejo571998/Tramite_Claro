import { GoogleGenAI } from "@google/genai";
import fs from "fs";
const apiKey = fs.readFileSync(".env.local","utf8").match(/VITE_GEMINI_API_KEY=(.+)/)[1].trim();
const client=new GoogleGenAI({apiKey});
const schema={type:"object",properties:{resumen:{type:"string"},organismo:{type:"string"},urgencia:{type:"string",enum:["baja","media","alta"]},checklist:{type:"array",items:{type:"object",properties:{paso:{type:"string"},detalle:{type:"string"}},required:["paso","detalle"]}},alertas:{type:"array",items:{type:"object",properties:{texto:{type:"string"},severidad:{type:"string",enum:["info","importante","critico"]}},required:["texto","severidad"]}},plazo:{type:"string"}},required:["resumen","organismo","urgencia","checklist","alertas","plazo"]};
const SYSTEM_PROMPT=`Sos un asistente que traduce trámites burocráticos argentinos (ARCA/AFIP, ANSES, municipalidades, RENAPER, registros civiles, etc.) a lenguaje simple y accionable para gente común, sin conocimiento legal ni administrativo previo.

Reglas:
- Escribí en español rioplatense, tono cercano pero respetuoso — como alguien que sabe del tema y te lo explica tomando un café, no como un formulario ni como un influencer.
- Nunca inventes requisitos, plazos, montos ni datos que no estén en el texto original o que no sean de conocimiento general y estable sobre ese organismo. Si no estás seguro de algo, omitilo en vez de arriesgar un dato falso — es mejor un checklist incompleto que uno con errores.
- El checklist tiene que estar en orden lógico de ejecución: qué hacer primero, qué depende de qué.
- Las alertas son solo para riesgos reales y específicos mencionados o implícitos en el texto (ej: "si no presentás esto antes de tal fecha, perdés el beneficio"), nunca relleno genérico tipo "llevá tu DNI" a menos que el texto indique que eso específicamente se suele olvidar.
- Si el texto pegado no parece ser un trámite argentino real, respondé igual con tu mejor interpretación pero marcá organismo como "No identificado" y sé conservador con el checklist en vez de inventar pasos.
- El campo "plazo" queda vacío ("") si el texto no menciona ningún plazo o vigencia concreta. No lo completes con suposiciones.
- Campos con valores cerrados: "urgencia" debe ser EXACTAMENTE "baja", "media" o "alta" (sin tilde, minúscula, singular). "severidad" debe ser EXACTAMENTE "info", "importante" o "critico" (sin tilde, minúscula). No uses variantes con tilde, plural o mayúscula.
- Las claves del JSON deben ser EXACTAMENTE: resumen, organismo, urgencia, checklist, alertas, plazo. No las traduzcas ni cambies.`;
function build(t){return `Texto del trámite a traducir:\n\n${t}`;}
const texto=`ASIGNACIÓN UNIVERSAL POR HIJO PARA PROTECCIÓN SOCIAL (AUH)

La Asignación Universal por Hijo (AUH) es una prestación mensual destinada
a hijos e hijas de personas desocupadas, monotributistas sociales, o que
se desempeñen en la economía informal con ingresos iguales o inferiores al
Salario Mínimo, Vital y Móvil.

Requisitos para el/la titular:
- Ser argentino/a nativo/a o naturalizado/a, o extranjero/a con residencia
  legal mínima de 2 años en el país.
- No percibir otra prestación de la seguridad social (Asignaciones
  Familiares del régimen contributivo, seguro de desempleo, prestaciones
  previsionales, entre otras).
- Acreditar la identidad del titular y de los hijos/as mediante DNI.

Requisitos respecto a los hijos/as:
- Ser menores de 18 años, o sin límite de edad en caso de discapacidad.
- Se abona hasta un máximo de 5 hijos/as por grupo familiar (sin tope en
  caso de discapacidad).

Documentación a presentar:
- DNI del titular y de los hijos/as a cargo.
- Certificado de Escolaridad (a partir de los 5 años, obligatorio
  presentar antes de fin del ciclo lectivo para no perder el 20% retenido
  de la prestación).
- Libreta de vacunación al día (controles sanitarios obligatorios según
  edad).

Importante: el 20% del monto de la AUH se retiene y se abona una vez al
año, previa acreditación del cumplimiento de los controles sanitarios y de
la certificación escolar correspondiente al ciclo lectivo. La falta de
presentación de esta documentación puede resultar en la suspensión del
pago del retenido.

La solicitud se realiza a través del sitio web de ANSES o en una oficina
de atención, con turno previo, presentando la documentación mencionada.`;
for(let attempt=0; attempt<4; attempt++){
  try{
    console.log(`Intento ${attempt+1} ${new Date().toISOString()}`);
    const r=await client.models.generateContent({model:"gemini-3.5-flash", contents:[{role:"user", parts:[{text:`${SYSTEM_PROMPT}\n\n${build(texto)}`}]}], config:{responseMimeType:"application/json", responseSchema:schema, thinkingConfig:{thinkingLevel:"low"}}});
    const parsed=JSON.parse(r.text);
    console.log("OK", JSON.stringify(parsed,null,2).slice(0,800));
    const existingRaw = fs.readFileSync("src/lib/fallbackResponses.ts","utf8");
    const m = existingRaw.match(/=\s*(\{[\s\S]*\})\s*as/);
    const existing = m ? JSON.parse(m[1]) : {};
    existing["auh"]=parsed;
    fs.writeFileSync("src/lib/fallbackResponses.ts", `// src/lib/fallbackResponses.ts
// Generado ${new Date().toISOString()} — gemini-3.5-flash validado.
// Botón manual "Ver resultado" (no auto) — ver App.tsx
import type { TramiteTraducido } from "../types/tramite";
export const FALLBACK_RESPONSES: Record<string, TramiteTraducido> = ${JSON.stringify(existing,null,2)} as Record<string, TramiteTraducido>;
`);
    console.log("AUH guardado");
    break;
  }catch(e){ console.error("FAIL", e.message?.slice(0,600)); await new Promise(r=>setTimeout(r, 3000*(attempt+1))); }
}
