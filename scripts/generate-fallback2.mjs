import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const apiKey = fs.readFileSync(".env.local","utf8").match(/VITE_GEMINI_API_KEY=(.+)/)[1].trim();
const client = new GoogleGenAI({ apiKey });

const schema = {
  type: "object",
  properties: {
    resumen: { type: "string" },
    organismo: { type: "string" },
    urgencia: { type: "string", enum: ["baja","media","alta"] },
    checklist: { type: "array", items: { type: "object", properties: { paso:{type:"string"}, detalle:{type:"string"}}, required:["paso","detalle"]}},
    alertas: { type: "array", items: { type: "object", properties: { texto:{type:"string"}, severidad:{type:"string", enum:["info","importante","critico"]}}, required:["texto","severidad"]}},
    plazo: { type: "string" }
  },
  required: ["resumen","organismo","urgencia","checklist","alertas","plazo"]
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
function build(t){return `Texto del trámite a traducir:\n\n${t}`;}

const EJEMPLOS = [
  { id:"monotributo", texto:`RECATEGORIZACIÓN DEL RÉGIMEN SIMPLIFICADO PARA PEQUEÑOS
CONTRIBUYENTES (MONOTRIBUTO)

La recategorización en el Régimen Simplificado (RS) es obligatoria y debe
realizarse dos veces al año, en los meses de febrero y agosto, evaluando la
actividad económica de los últimos 12 meses.

Corresponde recategorizarse cuando, durante los últimos 12 meses, se hayan
modificado los valores de alguno de los siguientes parámetros respecto de
la categoría actual: ingresos brutos devengados, superficie afectada a la
actividad, energía eléctrica consumida y alquileres devengados. La
categoría resultante será la que corresponda según el parámetro de mayor
valor.

Si no se registraron cambios en dichos parámetros, no corresponde realizar
el trámite y el contribuyente permanece en su categoría actual sin
necesidad de acción alguna.

Procedimiento: el contribuyente deberá ingresar al Portal Monotributo con
su CUIT y Clave Fiscal, seleccionar la opción "Recategorizarme", revisar
los datos precargados por el sistema (facturación anual detectada
automáticamente), confirmar o corregir la información según corresponda, y
finalmente emitir la nueva credencial de pago.

La obligación de pago resultante de la recategorización tendrá efecto a
partir del período devengado del mes en que se realiza el trámite (febrero
o agosto) y se mantendrá vigente hasta la próxima recategorización.

En caso de no efectuar la recategorización correspondiente estando
obligado a hacerlo, ARCA podrá aplicar de oficio la recategorización que
corresponda según los datos detectados (compras, gastos, acreditaciones
bancarias), notificando al contribuyente en su Domicilio Fiscal
Electrónico dentro de los 10 días hábiles administrativos posteriores al
vencimiento del plazo. La recategorización de oficio puede derivar en la
aplicación de sanciones.`},
  { id:"auh", texto:`ASIGNACIÓN UNIVERSAL POR HIJO PARA PROTECCIÓN SOCIAL (AUH)

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
de atención, con turno previo, presentando la documentación mencionada.`},
  { id:"habilitacion", texto:`HABILITACIÓN DE COMERCIO — TRÁMITE MUNICIPAL

Toda actividad comercial, industrial o de servicios que se desarrolle
dentro del ejido municipal requiere de la correspondiente habilitación
previa al inicio de actividades, independientemente de la inscripción
fiscal nacional o provincial que corresponda.

Documentación requerida para iniciar el expediente:
1. Formulario de solicitud de habilitación, completo y firmado por el
   titular o representante legal.
2. Constancia de inscripción en AFIP/ARCA (CUIT) y en Ingresos Brutos
   (según jurisdicción provincial).
3. Contrato de locación del inmueble o título de propiedad, según
   corresponda, con vigencia acreditada.
4. Plano del local con las medidas de superficie cubierta y descubierta,
   visado por profesional matriculado cuando la actividad lo requiera.
5. Certificado de factibilidad de uso de suelo, a solicitar previamente en
   la Dirección de Planeamiento, verificando que la actividad sea
   compatible con la zonificación del inmueble.
6. Certificado de Bomberos (Prevención) vigente, según rubro y superficie
   del local.
7. Libre deuda municipal del inmueble.

Procedimiento:
El expediente se inicia en la Dirección de Habilitaciones, donde se
realiza una inspección técnica del local para verificar el cumplimiento de
las condiciones de seguridad, higiene y accesibilidad exigidas para el
rubro solicitado. En caso de observaciones, el titular cuenta con un plazo
para subsanarlas antes de que el expediente sea rechazado.

Una vez aprobada la inspección y verificada la documentación, se emite el
Certificado de Habilitación, que debe exhibirse en un lugar visible del
local.

Nota: iniciar actividad comercial sin la habilitación correspondiente
puede derivar en clausura preventiva del local y la aplicación de multas,
independientemente de que el trámite se encuentre en curso.`},
  { id:"dni", texto:`TRAMITACIÓN DE DOCUMENTO NACIONAL DE IDENTIDAD (DNI) —
RENOVACIÓN

Corresponde tramitar la renovación del DNI en los siguientes casos:
vencimiento del ejemplar, deterioro que impida su lectura o
identificación, extravío o robo, cambio de datos personales (domicilio,
estado civil cuando corresponda), o agotamiento de las fojas del
ejemplar libreta (en el caso de documentos formato libreta).

Requisitos generales:
- Turno previo obligatorio, gestionado a través del sitio web de RENAPER
  o Mi Argentina.
- Presentarse el día del turno con el DNI anterior (o denuncia policial en
  caso de robo/extravío) y la documentación respaldatoria si el trámite
  involucra un cambio de datos.
- Para menores de edad, debe concurrir acompañado de al menos uno de sus
  padres o representante legal, quien deberá también acreditar su
  identidad.

Costos: el trámite tiene un arancel que varía según se trate de una
renovación por vencimiento natural (sin cargo dentro de determinados
plazos posteriores al vencimiento) o por pérdida/deterioro (con cargo).
Existe además la opción de trámite exprés con entrega prioritaria, sujeto
a un arancel adicional.

Plazos de entrega: el nuevo ejemplar se envía por correo al domicilio
declarado dentro de un plazo estimado que puede variar según la época del
año (los plazos suelen extenderse considerablemente en períodos de alta
demanda, como previo a elecciones o vacaciones de verano).

Importante: viajar con un DNI vencido puede generar inconvenientes en
pasos fronterizos terrestres hacia países limítrofes, donde en general se
acepta con cierta tolerancia, pero no así para trámites bancarios,
migratorios internacionales o determinados trámites administrativos que
exigen vigencia plena del documento.`}
];

const MODEL_ID="gemini-3.5-flash";
const CONFIG={ responseMimeType:"application/json", responseSchema:schema, thinkingConfig:{thinkingLevel:"low"}};
const out={};
for(const ej of EJEMPLOS){
  console.log(`\n--- ${ej.id} ${new Date().toISOString()}`);
  const s=Date.now();
  try{
    const r= await client.models.generateContent({ model:MODEL_ID, contents:[{role:"user", parts:[{text:`${SYSTEM_PROMPT}\n\n${build(ej.texto)}`}]} ], config:CONFIG });
    const parsed=JSON.parse(r.text);
    console.log(`OK ${Date.now()-s}ms chk:${parsed.checklist.length} alert:${parsed.alertas.length} urg:${parsed.urgencia}`);
    out[ej.id]=parsed;
  }catch(e){ console.error("FAIL",e.message?.slice(0,600)); console.error(e); }
  await new Promise(r=>setTimeout(r,2500));
}
fs.writeFileSync("src/lib/fallbackResponses.ts", `// src/lib/fallbackResponses.ts
// Generado ${new Date().toISOString()} — gemini-3.5-flash validado.
// Botón manual "Ver resultado" (no auto) — ver App.tsx
import type { TramiteTraducido } from "../types/tramite";
export const FALLBACK_RESPONSES: Record<string, TramiteTraducido> = ${JSON.stringify(out,null,2)} as Record<string, TramiteTraducido>;
`, "utf8");
console.log("Escrito src/lib/fallbackResponses.ts con", Object.keys(out).length, "entradas");
