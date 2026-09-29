// src/auth/authService.ts
// Contrato de autenticación + implementación local (este dispositivo).
// Para pasar a un backend real (Supabase, Firebase, API propia) alcanza con
// implementar AuthService y cambiarlo en AuthProvider: la UI no se toca.
import { readJSON, removeKey, uid, writeJSON } from "../lib/storage";

export interface User {
  id: string;
  nombre: string;
  email: string;
  createdAt: number;
}

export class AuthError extends Error {
  field?: "email" | "password" | "nombre";
  constructor(message: string, field?: AuthError["field"]) {
    super(message);
    this.field = field;
  }
}

export interface AuthService {
  current(): User | null;
  login(email: string, password: string): Promise<User>;
  register(nombre: string, email: string, password: string): Promise<User>;
  logout(): Promise<void>;
}

interface StoredUser extends User {
  salt: string;
  hash: string;
}

const USERS_KEY = "tc:users";
const SESSION_KEY = "tc:session";

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 120_000 }, key, 256);
  return toHex(bits);
}

const publicUser = ({ id, nombre, email, createdAt }: StoredUser): User => ({ id, nombre, email, createdAt });
const normEmail = (e: string) => e.trim().toLowerCase();

export const localAuthService: AuthService = {
  current() {
    const id = readJSON<string | null>(SESSION_KEY, null);
    const u = id ? readJSON<StoredUser[]>(USERS_KEY, []).find((x) => x.id === id) : undefined;
    return u ? publicUser(u) : null;
  },

  async login(email, password) {
    const users = readJSON<StoredUser[]>(USERS_KEY, []);
    const u = users.find((x) => x.email === normEmail(email));
    if (!u) throw new AuthError("No encontramos una cuenta con ese mail.", "email");
    if ((await hashPassword(password, u.salt)) !== u.hash) throw new AuthError("La contraseña no coincide.", "password");
    writeJSON(SESSION_KEY, u.id);
    return publicUser(u);
  },

  async register(nombre, email, password) {
    const users = readJSON<StoredUser[]>(USERS_KEY, []);
    const e = normEmail(email);
    if (users.some((x) => x.email === e)) throw new AuthError("Ya hay una cuenta con ese mail. Probá ingresar.", "email");
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    const u: StoredUser = { id: uid(), nombre: nombre.trim(), email: e, createdAt: Date.now(), salt, hash: await hashPassword(password, salt) };
    writeJSON(USERS_KEY, [...users, u]);
    writeJSON(SESSION_KEY, u.id);
    return publicUser(u);
  },

  async logout() {
    removeKey(SESSION_KEY);
  },
};
