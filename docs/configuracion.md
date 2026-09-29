# Configuración opcional (Vercel)

La app funciona solo con `GEMINI_API_KEY`. Estas piezas suman robustez y funciones; cada una se
activa sola cuando cargás sus variables en **Vercel → Settings → Environment Variables** y hacés
**Redeploy**.

## 1. Límite de uso global (Upstash Redis) — recomendado

Sin esto, el límite por IP funciona por instancia de servidor (frena el abuso básico). Con Redis es global y
además se guardan el feedback y los errores para revisarlos.

1. Vercel → tu proyecto → pestaña **Storage** (o **Marketplace**) → **Upstash for Redis** → *Create* (plan gratis).
2. Conectalo al proyecto `tramite-claro`. Vercel crea solas `KV_REST_API_URL` y `KV_REST_API_TOKEN`
   (o `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`; la app acepta ambas).
3. Redeploy.

Límites actuales (por IP): traducir 6/min y 60/día · chat 15/min y 200/día · notas 5/min y 30/día.
Se cambian en `api/_lib/traducir.ts`, `taku.ts` y `redactar.ts`.

**Ver el feedback y los errores:** en la consola de Upstash → *Data Browser* → listas `tc:feedback` y
`tc:errors`. Sin Redis, aparecen igual en Vercel → **Logs** (buscá `[feedback]` o `[client-error]`).

## 2. Cuentas en la nube (Supabase)

Sin esto, las cuentas y "Mis trámites" viven en el dispositivo. Con Supabase se sincronizan entre celular y compu.

1. Creá un proyecto gratis en https://supabase.com.
2. **SQL Editor** → pegá el contenido de [`supabase/schema.sql`](../supabase/schema.sql) → *Run*.
3. **Authentication → URL Configuration**: en *Site URL* poné `https://tramite-claro-omega.vercel.app`
   y agregá la misma URL en *Redirect URLs*.
4. **Project Settings → API**: copiá *Project URL* y la clave **anon / public**
   (nunca la `service_role`).
5. En Vercel agregá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` → Redeploy.

La clave *anon* es pública por diseño: la seguridad la dan las políticas RLS del `schema.sql`
(cada persona solo ve sus trámites).

Por defecto Supabase pide confirmar el mail al registrarse; la app ya muestra el aviso "Revisá tu mail".

### Opcional: "Continuar con Google"

1. Supabase → **Authentication → Providers → Google** → activalo con un *Client ID/Secret* de
   Google Cloud (OAuth, tipo "Aplicación web"; como URI de redirección usá la que te muestra Supabase).
2. En Vercel agregá `VITE_SUPABASE_GOOGLE=1` → Redeploy.

## 3. Chat de Taku

Ya viene activo (usa `GEMINI_API_KEY`). Para forzar el modo sin red: `VITE_TAKU_CHAT_MODE=local`.
