// src/lib/pwa.ts — registro del service worker, instalación y archivos compartidos.
import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function registerPWA() {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("[pwa] no se pudo registrar el SW", e));
  });
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** canInstall: Chrome/Android/Edge ofrecen el diálogo. iosHint: en iPhone hay que hacerlo a mano. */
export function useInstall() {
  const canInstall = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => deferred !== null,
  );
  return {
    canInstall,
    iosHint: !canInstall && isIOS() && !isStandalone(),
    async install() {
      if (!deferred) return false;
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      notify();
      return outcome === "accepted";
    },
  };
}

/** Levanta (y borra) lo que dejó el service worker al compartir a la app. */
export async function takeShared(): Promise<{ files: File[]; text: string } | null> {
  if (!("caches" in window) || !(await caches.has("tc-share"))) return null;
  const cache = await caches.open("tc-share");
  const meta = await cache.match("/shared/meta");
  if (!meta) {
    await caches.delete("tc-share");
    return null;
  }
  const { count, text } = (await meta.json()) as { count: number; text: string };
  const files: File[] = [];
  for (let i = 0; i < count; i++) {
    const r = await cache.match(`/shared/${i}`);
    if (!r) continue;
    const blob = await r.blob();
    files.push(new File([blob], decodeURIComponent(r.headers.get("X-Name") ?? `archivo-${i}`), { type: blob.type }));
  }
  await caches.delete("tc-share");
  return files.length || text ? { files, text: text ?? "" } : null;
}
