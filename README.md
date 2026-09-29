# Trámite Claro

Los trámites, en palabras simples. Sacale una foto (o subí el PDF, o contalo con tus palabras) a ese
papel que no entendés: **Taku** te explica qué es, qué tan urgente es, hasta cuándo tenés, y te arma
los pasos para resolverlo.

Demo: https://tramite-claro-omega.vercel.app/

## Funcionalidades

- **Entrada flexible:** foto con cámara o galería (hasta 5 páginas), PDF (hasta 3 MB), texto pegado o
  descripción libre. Arrastrar y soltar, y pegar con Ctrl+V.
- **Resultado:** título, resumen coloquial, urgencia explicada, plazo destacado, checklist con
  progreso guardado, alertas por severidad y glosario de palabras difíciles.
- **Acciones:** escuchar (lectura en voz alta), compartir / copiar, imprimir.
- **Mis trámites:** historial con avance; cuentas locales o uso sin cuenta.
- **Taku:** asistente integrado en la experiencia (ver [docs/taku-ux.md](docs/taku-ux.md)).
- Modo oscuro, responsive, accesible (teclado, lectores de pantalla, `prefers-reduced-motion`).

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y completá GEMINI_API_KEY
npm run dev
```

Si en tu PC las llamadas a Gemini fallan con `unable to verify the first certificate` (antivirus o
proxy que inspecciona HTTPS), usá `npm run dev:ca`, que hace que Node confíe en los certificados del sistema.

## Arquitectura

- `api/traducir.ts` — Vercel Function. La **API key de Gemini vive solo en el servidor**
  (`GEMINI_API_KEY`; por compatibilidad también lee `VITE_GEMINI_API_KEY`). En `vite dev`/`preview`
  el mismo núcleo (`api/_lib/traducir.ts`) se sirve con un middleware.
- `src/lib/api.ts` — cliente del endpoint, errores tipados y cancelación.
- `src/auth/` — `AuthService` con implementación local (PBKDF2 + localStorage). Reemplazable por un backend.
- `src/lib/tramitesStore.ts` — historial y progreso por usuario.
- `src/taku/` — personaje, guion de reacciones y chat con proveedor intercambiable.

## Deploy (Vercel)

1. En *Settings → Environment Variables* agregá `GEMINI_API_KEY` (podés borrar `VITE_GEMINI_API_KEY`
   una vez que funcione: con el prefijo `VITE_` una variable puede terminar en el bundle público).
2. Deploy. `vercel.json` le da hasta 60 s a la función.

## Assets de Taku

`assets/img/taku_tramite.png` es el original. `npm run taku:assets` genera las versiones web
(WebP 240/480), íconos y favicon sin modificar el arte.
