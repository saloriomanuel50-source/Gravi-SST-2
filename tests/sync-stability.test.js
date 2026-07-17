"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const index = read("index.html");
const bootstrap = read("src/bootstrap.js");
const system = read("src/system.js");
const supabase = read("src/supabase.js");
const sw = read("service-worker.js");

// Todos los puntos de entrada deben apuntar a la misma versión de runtime.
for (const reference of [
  "2026-07-17-sync-stability-v47",
  "./src/supabase.js?v=2026-07-17-sync-stability-v47",
  "./src/bootstrap.js?v=2026-07-17-sync-stability-v47"
]) assert.ok(index.includes(reference), `index.html no contiene ${reference}`);
assert.ok(bootstrap.includes("./src/system.js?v=2026-07-17-sync-stability-v47"));
assert.ok(sw.includes("./src/system.js?v=2026-07-17-sync-stability-v47"));
assert.ok(sw.includes("./src/supabase.js?v=2026-07-17-sync-stability-v47"));
assert.ok(sw.includes("./src/bootstrap.js?v=2026-07-17-sync-stability-v47"));

// El SW usa una sola versión activa y limpia versiones anteriores.
assert.match(sw, /const CACHE_NAME = "gravi-sst-v2-shell-v47";/);
assert.match(sw, /const ACTIVE_CACHE_NAME = CACHE_NAME;/);
assert.match(sw, /keys\.filter\(key => key !== ACTIVE_CACHE_NAME\)/);

// Cualquier módulo que falle debe mostrar un error local, no derribar navegación completa.
assert.match(system, /function openModule\(type\)\{/);
assert.match(system, /catch\(error\)\{console\.error\(`\[GRAVI Module v47\]/);
assert.match(system, /No fue posible abrir este módulo/);

// Persistencia local es síncrona y emite evento antes de cualquier red.
const persistBlock = system.match(/function persistLocalData\([\s\S]*?\n\}/)?.[0] || "";
assert.ok(persistBlock.includes("localStorage.setItem"));
assert.ok(persistBlock.includes("gvc:local-data-updated"));
const saveBlock = system.match(/function save\([\s\S]*?\n\}/)?.[0] || "";
assert.ok(saveBlock.indexOf("persistLocalData") < saveBlock.indexOf("scheduleSystemSync"));

// La carga inicial no ejecuta la nueva cola granular antes de hidratar remoto.
const loadBlock = supabase.match(/async function loadAuthenticatedData\(\)[\s\S]*?\n  \}/)?.[0] || "";
assert.ok(loadBlock.includes("await flushPending()"));
assert.doesNotMatch(loadBlock, /await flushEntityMutations\(\)/);

// Errores de red en mutaciones conservan estado y la reconexión reintenta.
assert.match(supabase, /global\.navigator\?\.onLine===false/);
assert.match(supabase, /isNetworkSyncError\(error\)/);
assert.match(supabase, /flushEntityMutations\(\)\.then\(result=>global\.dispatchEvent/);

// No se reintroduce la dependencia que produjo el fallo de carga del módulo.
assert.doesNotMatch(bootstrap, /attendance-state\.js/);
assert.doesNotMatch(system, /GraviAttendance/);

console.log("PASS sync-stability-v47: versiones coordinadas, persistencia local primero, navegación aislada, hidratación segura y reconexión verificadas.");
