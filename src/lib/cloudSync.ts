// src/lib/cloudSync.ts — sincroniza "Mis trámites" con Supabase (tabla public.tramites,
// ver supabase/schema.sql). La UI sigue leyendo del store local (rápido y offline);
// esto baja lo remoto al iniciar sesión y sube los cambios con un pequeño debounce.
import { getSupabase } from "../auth/supabase";
import { tramitesStore, type TramiteGuardado } from "./tramitesStore";

interface Row {
  id: string;
  user_id: string;
  fuente: TramiteGuardado["fuente"];
  ejemplo_id: string | null;
  data: TramiteGuardado["data"];
  done: number[];
  created_at: string;
  updated_at: string;
}

const toRow = (t: TramiteGuardado, userId: string): Row => ({
  id: t.id,
  user_id: userId,
  fuente: t.fuente,
  ejemplo_id: t.ejemploId ?? null,
  data: t.data,
  done: t.done,
  created_at: new Date(t.createdAt).toISOString(),
  updated_at: new Date(t.updatedAt).toISOString(),
});

const fromRow = (r: Row): TramiteGuardado => ({
  id: r.id,
  fuente: r.fuente,
  ejemploId: r.ejemplo_id ?? undefined,
  data: r.data,
  done: r.done ?? [],
  createdAt: Date.parse(r.created_at),
  updatedAt: Date.parse(r.updated_at),
});

/** Une local y remoto: por id, gana el más reciente. Devuelve también qué hay que subir. */
export function mergeTramites(local: TramiteGuardado[], remote: TramiteGuardado[]) {
  const byId = new Map<string, TramiteGuardado>();
  for (const r of remote) byId.set(r.id, r);
  const toPush: TramiteGuardado[] = [];
  for (const l of local) {
    const r = byId.get(l.id);
    if (!r || l.updatedAt > r.updatedAt) {
      byId.set(l.id, l);
      toPush.push(l);
    }
  }
  const merged = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
  return { merged, toPush };
}

/** Arranca la sincronización para el usuario. Devuelve la función para detenerla. */
export function startCloudSync(userId: string): () => void {
  let stopped = false;
  let synced = new Map<string, number>(); // id → updatedAt ya subido
  let timer: number | undefined;
  let unsubscribe = () => {};

  const flush = async () => {
    if (stopped) return;
    const sb = await getSupabase();
    const list = tramitesStore.list();
    const upserts = list.filter((t) => synced.get(t.id) !== t.updatedAt);
    const ids = new Set(list.map((t) => t.id));
    const deletes = [...synced.keys()].filter((id) => !ids.has(id));
    if (upserts.length) {
      const { error } = await sb.from("tramites").upsert(upserts.map((t) => toRow(t, userId)));
      if (!error) upserts.forEach((t) => synced.set(t.id, t.updatedAt));
      else console.warn("[sync] upsert", error.message);
    }
    if (deletes.length) {
      const { error } = await sb.from("tramites").delete().in("id", deletes);
      if (!error) deletes.forEach((id) => synced.delete(id));
      else console.warn("[sync] delete", error.message);
    }
  };

  void (async () => {
    try {
      const sb = await getSupabase();
      const { data, error } = await sb.from("tramites").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      if (stopped) return;
      const remote = (data as Row[]).map(fromRow);
      const { merged } = mergeTramites(tramitesStore.list(), remote);
      synced = new Map(remote.map((r) => [r.id, r.updatedAt]));
      tramitesStore.replaceAll(merged);
      await flush();
      unsubscribe = tramitesStore.subscribe(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => void flush(), 800);
      });
    } catch (e) {
      console.warn("[sync] no se pudo sincronizar (sigue funcionando local):", e);
    }
  })();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    unsubscribe();
  };
}
