# Taku en Trámite Claro — análisis e integración UX

Taku no es decoración: aparece donde el usuario siente **ansiedad, duda o logro** frente a un trámite,
y se retira cuando está leyendo o completando algo.

## Dónde aporta valor

| Momento | Emoción del usuario | Qué hace Taku | Implementación |
|---|---|---|---|
| Login / registro | Desconfianza, fricción | Asoma por detrás de la tarjeta, saluda por tu nombre, **se esconde al escribir la contraseña** ("No miro"), se preocupa ante un error, salta al entrar | `screens/AuthScreen.tsx` (`auth-peek--up/shy/jump`) |
| Primera visita | "¿Qué hago acá?" | Se presenta y ofrece "¿Cómo funciona?" | evento `welcome` |
| Carga del documento (5–20 s) | Ansiedad por la espera | Sube "al escenario", lee el documento y narra etapas; se puede cancelar | `components/LoadingState.tsx` + `useTakuOnStage` |
| Resultado urgente | Miedo a perder un plazo | Traduce la urgencia a una frase humana y ofrece "¿Qué hago primero?" | evento `analyze:success` |
| Avance del checklist | Motivación | Refuerzos en hitos (primer paso, mitad, último) y **festejo con confeti** al completar | `checklist:progress` / `checklist:complete` |
| Error | Frustración | Reacción de preocupación + mensaje sin tecnicismos ("No es tu culpa") | `analyze:error` |
| Volver a un trámite | Olvido | "Seguimos donde quedaste: 2 de 5" | `result:revisit` |
| Dudas | Soledad frente al papel | Chat contextual sobre el trámite abierto | `taku/TakuChat.tsx` |

## Reglas para no molestar

- Globos con prioridad; no se repite el mismo mensaje en 30 s; se autodescartan.
- Al navegar se descartan los globos viejos.
- En desktop el globo vive en el margen izquierdo (no pisa el contenido central).
- En mobile: Taku más chico, globo compacto en la franja inferior, se cierra al scrollear o tocar,
  y Taku se oculta con el teclado abierto.
- Se puede silenciar (hover en desktop / campana en el chat); se recuerda.
- `prefers-reduced-motion`: sin animaciones.
- La imagen original nunca se altera: solo se mueve/rota/escala el contenedor.

## Arquitectura (lista para un chatbot real)

```
src/taku/
  types.ts          moods + eventos de producto
  script.ts         guion: evento → mood + mensaje (tono centralizado)
  TakuContext.tsx   estado global: emit(), say(), chat, contexto, silencio
  TakuAvatar.tsx    imagen + animación por mood
  TakuDock.tsx      esquina inferior izquierda: globo + launcher
  TakuChat.tsx      panel de chat (solo conoce la interfaz del proveedor)
  chat/provider.ts  interfaz TakuChatProvider + factory
  chat/localProvider.ts   hoy: responde con los datos del trámite abierto
  chat/remoteProvider.ts  mañana: POST a un backend real (con fallback local)
```

Para conectar un chatbot real:

1. Crear un endpoint (ej. `api/taku.ts`) que reciba `{ messages, context }` y devuelva `{ text, suggestions? }`.
   `context.tramite` trae el trámite abierto y `context.progreso` el avance.
2. Setear `VITE_TAKU_CHAT_MODE=remote` (y `VITE_TAKU_CHAT_ENDPOINT` si no es `/api/taku`).

No hace falta tocar la UI.
