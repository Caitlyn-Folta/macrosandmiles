/* Macros & Miles service worker — bump CACHE version when you change
   index.html, food-db.js, or humor-bank.js */
const CACHE = "mm-v41";

const ASSETS = [
  "./",
  "./index.html",
  "./food-db.js",
  "./humor-bank.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
  "https://unpkg.com/prop-types@15.8.1/prop-types.min.js",
  "https://unpkg.com/recharts@2.12.7/umd/Recharts.js",
  "https://unpkg.com/@babel/standalone@7.24.7/babel.min.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = e.request.url;
  // POSTs (the AI lookup Worker) and nutrition lookups always go to the
  // network; the app has its own offline fallback
  if (e.request.method !== "GET") return;
  if (url.includes("api.nal.usda.gov")) return;
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request)
          .then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return resp;
          })
          .catch(() => caches.match("./index.html"))
    )
  );
});
