// Trousseau — service worker
// Pour publier une nouvelle version : modifie l'appli, puis change VERSION ci-dessous.
// Les téléphones la récupèrent automatiquement à la prochaine ouverture avec du réseau.
const VERSION = "1.4.0";
const CACHE = "trousseau-" + VERSION;
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("trousseau-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });

// Réseau d'abord pour la page (toujours la dernière version si connecté), cache sinon (hors ligne).
// Cache d'abord pour les icônes et le manifeste, rafraîchis en arrière-plan.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch(req, { signal: ctrl.signal, cache: "no-store" });
        clearTimeout(t);
        if (res.ok) { const c = await caches.open(CACHE); c.put("./index.html", res.clone()); }
        return res;
      } catch {
        return (await caches.match("./index.html")) || (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cached = await caches.match(req);
    const fresh = fetch(req).then(async res => {
      if (res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    }).catch(() => cached);
    return cached || fresh;
  })());
});
