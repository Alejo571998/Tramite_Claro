// public/sw.js — service worker de Trámite Claro.
// 1) Share target: recibe fotos/PDF/texto desde "Compartir" (WhatsApp, Mail, Galería)
//    y los deja en la caché "tc-share" para que la app los levante.
// 2) Offline básico: la app abre sin conexión (network-first para la página,
//    cache-first para /assets con hash). Nunca cachea /api.
const VERSION = "tc-v2";
const SHARE_CACHE = "tc-share";
const SHELL = ["/", "/manifest.webmanifest", "/favicon.ico", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== SHARE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function handleShare(request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((f) => typeof f === "object" && f.size > 0).slice(0, 5);
    const text = [form.get("title"), form.get("text"), form.get("url")].filter(Boolean).join("\n").slice(0, 30000);
    await caches.delete(SHARE_CACHE);
    const cache = await caches.open(SHARE_CACHE);
    await Promise.all(
      files.map((f, i) =>
        cache.put(
          `/shared/${i}`,
          new Response(f, { headers: { "Content-Type": f.type || "application/octet-stream", "X-Name": encodeURIComponent(f.name || `archivo-${i}`) } }),
        ),
      ),
    );
    await cache.put("/shared/meta", new Response(JSON.stringify({ count: files.length, text, ts: Date.now() }), { headers: { "Content-Type": "application/json" } }));
  } catch (e) {
    console.error("[sw] share", e);
  }
  return Response.redirect("/#/?compartido=1", 303);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(handleShare(request));
    return;
  }
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || Response.error())),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
  }
});
