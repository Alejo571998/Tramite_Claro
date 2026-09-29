// src/auth/AuthContext.tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { localAuthService, type AuthService, type User } from "./authService";
import { readJSON, removeKey, writeJSON } from "../lib/storage";
import { tramitesStore } from "../lib/tramitesStore";

const GUEST_KEY = "tc:guest";

interface AuthState {
  user: User | null;
  /** Eligió "Probar sin cuenta": no le volvemos a mostrar el login al entrar. */
  guest: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (nombre: string, email: string, password: string) => Promise<User>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children, service = localAuthService }: { children: ReactNode; service?: AuthService }) {
  const [user, setUser] = useState<User | null>(() => {
    const u = service.current();
    // El historial es por usuario: se fija antes del primer render para no mostrar el de otro.
    tramitesStore.setOwner(u?.id ?? "guest");
    return u;
  });
  const [guest, setGuest] = useState<boolean>(() => readJSON(GUEST_KEY, false));

  const login = useCallback(async (e: string, p: string) => {
    const u = await service.login(e, p);
    tramitesStore.setOwner(u.id); // se lleva lo que hizo como invitado
    setUser(u);
    return u;
  }, [service]);

  const register = useCallback(async (n: string, e: string, p: string) => {
    const u = await service.register(n, e, p);
    tramitesStore.setOwner(u.id);
    setUser(u);
    return u;
  }, [service]);

  const continueAsGuest = useCallback(() => {
    writeJSON(GUEST_KEY, true);
    setGuest(true);
  }, []);

  const logout = useCallback(async () => {
    await service.logout();
    removeKey(GUEST_KEY);
    tramitesStore.setOwner("guest");
    setGuest(false);
    setUser(null);
  }, [service]);

  const value = useMemo(() => ({ user, guest, login, register, continueAsGuest, logout }), [user, guest, login, register, continueAsGuest, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fuera de AuthProvider");
  return v;
}
