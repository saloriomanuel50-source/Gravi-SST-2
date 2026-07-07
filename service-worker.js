"use strict";

const CACHE_NAME = "gravi-sst-v2-shell-v8";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./src/styles/styles.css",
  "./src/styles/fixes.css",
  "./src/styles/system.css",
  "./src/styles/corporate-documents.css",
  "./src/styles/phase2.css?v=2",
  "./src/styles/phase3.css?v=1",
  "./src/styles/phase4.css?v=1",
  "./src/styles/phase5.css?v=1",
  "./src/styles/phase5-2.css?v=6",
  "./src/app.js",
  "./src/supabase.js",
  "./src/repositories.js",
  "./src/bootstrap.js",
  "./src/corporate-documents.js",
  "./src/extensions.js?v=2",
  "./src/system.js",
  "./src/dynamic-formats.js",
  "./src/dynamic-formats-controller.js",
  "./src/dynamic-formats-bootstrap.js",
  "./src/dynamic-formats-ui.html",
  "./src/pwa.js",
  "./assets/gravi-sst-logo-dark.png",
  "./assets/gravi-sst-login-panel.png",
  "./assets/gravi-sst-splash.png",
  "./assets/pwa-icon-192.png",
  "./assets/pwa-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      })
  );
});
