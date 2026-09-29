// src/lib/tramitesStore.ts — historial de trámites + progreso del checklist, por usuario.
// Hoy persiste en localStorage; la interfaz (list/get/save/update/remove) es la
// que tendría un backend real.
import { useSyncExternalStore } from "react";
import { readJSON, uid, writeJSON } from "./storage";
import type { FuenteTramite, TramiteTraducido } from "../types/tramite";

export interface TramiteGuardado {
  id: string;
  createdAt: number;
  updatedAt: number;
  fuente: FuenteTramite;
  data: TramiteTraducido;
  /** Índices de pasos del checklist marcados como hechos. */
  done: number[];
  /** Id del ejemplo si vino de "Probá con un ejemplo". */
  ejemploId?: string;
}

const MAX_ITEMS = 40;
let owner = "guest";
let cache: TramiteGuardado[] = readJSON(`tc:tramites:${owner}`, []);
const listeners = new Set<() => void>();

const persist = () => {
  writeJSON(`tc:tramites:${owner}`, cache);
  listeners.forEach((l) => l());
};

export const tramitesStore = {
  /** Cambia de dueño (al loguearse). Si venía como invitado, se lleva sus trámites. */
  setOwner(next: string) {
    if (next === owner) return;
    const prev = cache;
    const fromGuest = owner === "guest";
    owner = next;
    cache = readJSON(`tc:tramites:${owner}`, []);
    if (fromGuest && prev.length && next !== "guest") {
      const ids = new Set(cache.map((t) => t.id));
      cache = [...prev.filter((t) => !ids.has(t.id)), ...cache].slice(0, MAX_ITEMS);
      writeJSON("tc:tramites:guest", []);
    }
    persist();
  },
  list: () => cache,
  get: (id: string) => cache.find((t) => t.id === id),
  save(data: TramiteTraducido, fuente: FuenteTramite, ejemploId?: string): TramiteGuardado {
    const now = Date.now();
    const t: TramiteGuardado = { id: uid(), createdAt: now, updatedAt: now, fuente, data, done: [], ejemploId };
    cache = [t, ...cache].slice(0, MAX_ITEMS);
    persist();
    return t;
  },
  setDone(id: string, done: number[]) {
    cache = cache.map((t) => (t.id === id ? { ...t, done, updatedAt: Date.now() } : t));
    persist();
  },
  /** Reemplaza la lista completa (ej: después de unir con lo guardado en la nube). */
  replaceAll(items: TramiteGuardado[]) {
    cache = items.slice(0, MAX_ITEMS);
    persist();
  },
  remove(id: string) {
    cache = cache.filter((t) => t.id !== id);
    persist();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useTramites() {
  return useSyncExternalStore(tramitesStore.subscribe, tramitesStore.list);
}
