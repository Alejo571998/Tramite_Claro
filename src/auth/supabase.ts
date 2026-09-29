// src/auth/supabase.ts — cliente de Supabase, cargado solo si está configurado
// (así el bundle no suma la librería cuando se usan cuentas locales).
import type { SupabaseClient } from "@supabase/supabase-js";

export const supabaseEnabled = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
export const googleEnabled = supabaseEnabled && import.meta.env.VITE_SUPABASE_GOOGLE === "1";

let client: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseEnabled) return Promise.reject(new Error("Supabase no configurado"));
  client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!, {
      // PKCE devuelve ?code= en la query: no choca con el router por hash (#/...)
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  );
  return client;
}
