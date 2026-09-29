// src/auth/supabaseAuthService.ts — cuentas en la nube (mail + contraseña, y Google opcional).
import type { User as SbUser } from "@supabase/supabase-js";
import { AuthError, type AuthService, type User } from "./authService";
import { getSupabase } from "./supabase";

const toUser = (u: SbUser): User => ({
  id: u.id,
  email: u.email ?? "",
  nombre: String(u.user_metadata?.nombre ?? u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split("@")[0] ?? "Vos"),
  createdAt: Date.parse(u.created_at) || Date.now(),
});

function mapError(message: string): AuthError {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return new AuthError("El mail o la contraseña no coinciden.", "password");
  if (m.includes("not confirmed")) return new AuthError("Todavía no confirmaste tu mail. Buscá el correo que te mandamos (fijate en spam).", "email");
  if (m.includes("already registered") || m.includes("already exists")) return new AuthError("Ya hay una cuenta con ese mail. Probá ingresar.", "email");
  if (m.includes("password")) return new AuthError("La contraseña es muy débil. Usá al menos 6 caracteres, mejor si combina letras y números.", "password");
  if (m.includes("rate limit")) return new AuthError("Demasiados intentos. Esperá unos minutos.");
  return new AuthError("No pudimos completar el ingreso. Probá de nuevo.");
}

/** Limpia ?code= de la URL después del login con Google (sin tocar el #/ruta). */
function cleanAuthParams() {
  const url = new URL(location.href);
  if (url.searchParams.has("code") || url.searchParams.has("error")) {
    url.searchParams.delete("code");
    url.searchParams.delete("error");
    url.searchParams.delete("error_description");
    history.replaceState(null, "", url.pathname + (url.search || "") + url.hash);
  }
}

export const supabaseAuthService: AuthService = {
  kind: "supabase",
  currentSync: () => null,

  async init() {
    const sb = await getSupabase();
    const { data } = await sb.auth.getSession();
    cleanAuthParams();
    return data.session?.user ? toUser(data.session.user) : null;
  },

  async login(email, password) {
    const sb = await getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) throw mapError(error?.message ?? "");
    return toUser(data.user);
  },

  async register(nombre, email, password) {
    const sb = await getSupabase();
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nombre: nombre.trim() }, emailRedirectTo: `${location.origin}/` },
    });
    if (error) throw mapError(error.message);
    if (!data.session || !data.user)
      throw new AuthError("¡Listo! Te mandamos un mail para confirmar la cuenta. Abrilo y después ingresá.", undefined, "confirm");
    return toUser(data.user);
  },

  async logout() {
    const sb = await getSupabase();
    await sb.auth.signOut();
  },

  async loginWithGoogle() {
    const sb = await getSupabase();
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/` } });
    if (error) throw mapError(error.message);
  },

  onChange(cb) {
    let unsub = () => {};
    let cancelled = false;
    void getSupabase().then((sb) => {
      if (cancelled) return;
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session?.user ? toUser(session.user) : null));
      unsub = () => data.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  },
};
