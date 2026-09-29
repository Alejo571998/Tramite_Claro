// src/auth/AuthContext.tsx — sesión del usuario. Usa Supabase si está configurado
// (cuentas en la nube + sincronización de trámites) o cuentas locales si no.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { localAuthService, type AuthService, type User } from "./authService";
import { supabaseAuthService } from "./supabaseAuthService";
import { supabaseEnabled } from "./supabase";
import { readJSON, removeKey, writeJSON } from "../lib/storage";
import { tramitesStore } from "../lib/tramitesStore";
import { startCloudSync } from "../lib/cloudSync";

const GUEST_KEY = "tc:guest";
const defaultService = supabaseEnabled ? supabaseAuthService : localAuthService;

interface AuthState {
  user: User | null;
  /** false mientras se restaura la sesión (solo en la nube). */
  ready: boolean;
  /** Eligió "Probar sin cuenta": no le volvemos a mostrar el login al entrar. */
  guest: boolean;
  cloud: boolean;
  googleAvailable: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (nombre: string, email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children, service = defaultService }: { children: ReactNode; service?: AuthService }) {
  const [user, setUserState] = useState<User | null>(() => {
    const u = service.currentSync();
    // El historial es por usuario: se fija antes del primer render para no mostrar el de otro.
    tramitesStore.setOwner(u?.id ?? "guest");
    return u;
  });
  const [ready, setReady] = useState(service.kind === "local");
  const [guest, setGuest] = useState<boolean>(() => readJSON(GUEST_KEY, false));

  const setUser = useCallback((u: User | null) => {
    tramitesStore.setOwner(u?.id ?? "guest"); // al loguearse se lleva lo que hizo como invitado
    setUserState(u);
  }, []);

  // Restaurar sesión + escuchar cambios (vuelta del login con Google, token vencido)
  useEffect(() => {
    if (service.kind === "local") return;
    let alive = true;
    service
      .init()
      .then((u) => alive && setUser(u))
      .catch((e) => console.warn("[auth] no se pudo restaurar la sesión", e))
      .finally(() => alive && setReady(true));
    const off = service.onChange?.((u) => alive && setUser(u));
    return () => {
      alive = false;
      off?.();
    };
  }, [service, setUser]);

  // Sincronizar "Mis trámites" con la nube mientras haya sesión
  useEffect(() => {
    if (service.kind !== "supabase" || !user) return;
    return startCloudSync(user.id);
  }, [service.kind, user]);

  const login = useCallback(
    async (e: string, p: string) => {
      const u = await service.login(e, p);
      setUser(u);
      return u;
    },
    [service, setUser],
  );

  const register = useCallback(
    async (n: string, e: string, p: string) => {
      const u = await service.register(n, e, p);
      setUser(u);
      return u;
    },
    [service, setUser],
  );

  const loginWithGoogle = useCallback(async () => {
    if (!service.loginWithGoogle) throw new Error("Google no está disponible");
    await service.loginWithGoogle();
  }, [service]);

  const continueAsGuest = useCallback(() => {
    writeJSON(GUEST_KEY, true);
    setGuest(true);
  }, []);

  const logout = useCallback(async () => {
    await service.logout();
    removeKey(GUEST_KEY);
    setGuest(false);
    setUser(null);
  }, [service, setUser]);

  const value = useMemo(
    () => ({
      user,
      ready,
      guest,
      cloud: service.kind === "supabase",
      googleAvailable: Boolean(service.loginWithGoogle) && import.meta.env.VITE_SUPABASE_GOOGLE === "1",
      login,
      register,
      loginWithGoogle,
      continueAsGuest,
      logout,
    }),
    [user, ready, guest, service, login, register, loginWithGoogle, continueAsGuest, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fuera de AuthProvider");
  return v;
}
