// WORU service worker: lets the app open offline and keeps updates fresh.
// Change the number below whenever you want to force every device to refresh its saved copy.
const CACHE = "woru-v1";
const SHELL = [
  "./", "index.html", "style.css", "cbt.css", "data.js", "questions.js",
  "app.js", "theme.js", "pwa.js", "bg.jpg", "manifest.webmanifest",
  "icon-192.png", "icon-512.png", "favicon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // One missing file must not stop the install, so add them one by one.
      return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;                       // AI calls are POST: never touched
  const url = new URL(req.url);
  if (url.hostname.indexOf("supabase.co") !== -1) return; // never cache the AI servers

  // Network first, so a new deploy shows up straight away. Offline, the saved copy is used.
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error());
      });
    })
  );
});
