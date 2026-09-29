import { GoogleGenAI } from "@google/genai";
const bad = new GoogleGenAI({ apiKey: "INVALID_KEY_FOR_TEST" });
const schema = { type:"object", properties:{resumen:{type:"string"},organismo:{type:"string"},urgencia:{type:"string",enum:["baja","media","alta"]},checklist:{type:"array",items:{type:"object",properties:{paso:{type:"string"},detalle:{type:"string"}},required:["paso","detalle"]}},alertas:{type:"array",items:{type:"object",properties:{texto:{type:"string"},severidad:{type:"string",enum:["info","importante","critico"]}},required:["texto","severidad"]}},plazo:{type:"string"}},required:["resumen","organismo","urgencia","checklist","alertas","plazo"]};
try{
  await bad.models.generateContent({ model:"gemini-3.5-flash", contents:[{role:"user",parts:[{text:"hola"}]}], config:{responseMimeType:"application/json", responseSchema:schema, thinkingConfig:{thinkingLevel:"low"}}});
}catch(e){ console.log("INVALID_KEY_ERROR:"); console.log(e.message?.slice(0,1200)); console.log("---CODE---", e.status||e.code); }
