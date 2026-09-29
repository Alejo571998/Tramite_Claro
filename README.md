# Trámite Claro

Los trámites, en palabras simples. Sacale una foto (o subí el PDF, o contalo con tus palabras) a ese
papel que no entendés: **Taku** te explica qué es, qué tan urgente es, hasta cuándo tenés, y te arma
los pasos para resolverlo.

Demo: https://tramite-claro-omega.vercel.app/

## Funcionalidades

- **Entrada flexible:** foto con cámara o galería (hasta 5 páginas, con aviso si sale oscura o borrosa),
  PDF (hasta 3 MB), texto pegado o descripción libre. Arrastrar, pegar con Ctrl+V o **compartir desde
  WhatsApp/Mail** con la app instalada.
- **Resultado:** título, resumen coloquial, urgencia explicada, plazo con **cuenta regresiva y recordatorio**
  (Google Calendar o .ics), **web oficial verificada** del organismo, checklist con progreso, alertas y glosario.
- **Taku, asistente real:** chat con Gemini que conoce el trámite abierto y solo recomienda links oficiales.
- **Borradores de notas:** consulta, prórroga, reclamo o descargo, listas para completar y presentar.
- **Acciones:** escuchar, compartir, imprimir. **Feedback** 👍/👎 en cada resultado.
- **Mis trámites:** historial con avance y vencimientos. Cuentas locales o en la nube (Supabase, opcional).
- Instalable (PWA), funciona offline para ver lo guardado, modo oscuro, responsive y accesible.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y completá GEMINI_API_KEY
npm run dev                  # o npm run dev:ca si tu PC inspecciona HTTPS (antivirus/proxy)
npm test                     # tests unitarios (Vitest)
npm run test:e2e             # tests de punta a punta (Playwright, API simulada)
```

## Arquitectura

- `api/*.ts` — Vercel Functions: `traducir`, `taku` (chat), `redactar`, `feedback`, `log`.
  La **API key vive solo en el servidor**. Todas tienen límite de uso por IP y chequeo de origen
  (`api/_lib/http.ts`, `rateLimit.ts`) y modelo de respaldo si Gemini está saturado (`gemini.ts`).
  En `vite dev` los mismos núcleos se sirven con un middleware.
- `src/lib/` — cliente de API, plazos/calendario, organismos oficiales, calidad de fotos, PWA,
  historial (`tramitesStore`) y sincronización con la nube (`cloudSync`).
- `src/auth/` — `AuthService` con implementación local o Supabase (se elige sola según la configuración).
- `src/taku/` — personaje, guion de reacciones y chat con proveedor intercambiable ([docs/taku-ux.md](docs/taku-ux.md)).
- `public/sw.js` — service worker: offline y recepción de archivos compartidos.

## Deploy

Vercel con `GEMINI_API_KEY`. Límite global, cuentas en la nube y login con Google son opcionales:
ver [docs/configuracion.md](docs/configuracion.md).

## Assets de Taku

`assets/img/taku_tramite.png` es el original. `npm run taku:assets` genera las versiones web
(WebP 240/480), íconos y favicon sin modificar el arte.
