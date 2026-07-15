"use strict";

const CACHE_NAME = "gravi-sst-v2-shell-v40";
const DOCUMENT_CACHE_VERSION = "v37";
const ACTIVE_CACHE_NAME = `${CACHE_NAME}-${DOCUMENT_CACHE_VERSION}`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json?v=2026-07-10-daily-sync",
  "./src/styles/styles.css?v=2026-07-07-hotfix-charset",
  "./src/styles/fixes.css?v=2026-07-07-hotfix-charset",
  "./src/styles/system.css?v=2026-07-07-hotfix-charset",
  "./src/styles/corporate-documents.css?v=35",
  "./src/styles/phase2.css?v=2",
  "./src/styles/phase3.css?v=1",
  "./src/styles/phase4.css?v=1",
  "./src/styles/phase5.css?v=1",
  "./src/styles/phase5-2.css?v=18",
  "./src/styles/executive-dashboard.css?v=2026-07-15-executive-init-v40",
  "./src/styles/work-permits.css?v=1",
  "./src/styles/signatures.css?v=1",
  "./src/styles/print-documents.css?v=35",
  "./src/styles/print-documents.css?v=34",
  "./src/app.js?v=2026-07-13-permissions-v38",
  "./src/supabase.js?v=2026-07-13-permissions-v38",
  "./src/repositories.js?v=2026-07-07-hotfix-charset",
  "./src/bootstrap.js?v=2026-07-15-executive-init-v40",
  "./src/print/print-manager.js?v=34",
  "./src/corporate-documents.js?v=35",
  "./src/extensions.js?v=2026-07-07-hotfix-charset",
  "./src/system.js?v=2026-07-15-executive-init-v40",
  "./src/executive-dashboard.js?v=2026-07-15-executive-init-v40",
  "./src/work-permits.js?v=2026-07-13-permissions-v38",
  "./src/signatures.js?v=2026-07-13-permissions-v38",
  "./src/dynamic-formats.js?v=2026-07-07-hotfix-charset",
  "./src/dynamic-formats-controller.js?v=2026-07-07-hotfix-charset",
  "./src/dynamic-formats-bootstrap.js?v=2026-07-07-hotfix-charset",
  "./src/dynamic-formats-ui.html?v=2026-07-07-hotfix-charset",
  "./src/pwa.js?v=2026-07-07-hotfix-charset",
  "./assets/gravi-sst-logo-dark.png",
  "./assets/gravi-sst-login-panel.png",
  "./assets/gravi-sst-splash.png",
  "./assets/documents/gravi-constructora-documentos.jpg",
  "./assets/pwa-icon-192.png",
  "./assets/pwa-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(ACTIVE_CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== ACTIVE_CACHE_NAME).map(key => caches.delete(key))))
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
          caches.open(ACTIVE_CACHE_NAME).then(cache => cache.put(request, copy));
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
