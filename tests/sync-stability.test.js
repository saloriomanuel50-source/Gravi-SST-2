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
const pwa = read("src/pwa.js");

const version = "2026-07-17-runtime-coherence-v48";
const storageVersion = "2026-07-18-evidence-v51";
for (const reference of [
  `window.GRAVI_BUILD_VERSION = "${version}"`,
  `./src/pwa.js?v=${storageVersion}`,
  `./src/supabase.js?v=${version}`,
  `./src/bootstrap.js?v=${storageVersion}`
]) assert.ok(index.includes(reference), `index.html no contiene ${reference}`);
assert.ok(bootstrap.includes(`./src/system.js?v=${storageVersion}`));
assert.ok(sw.includes(`./src/system.js?v=${storageVersion}`));
assert.ok(sw.includes(`./src/supabase.js?v=${version}`));
assert.ok(sw.includes(`./src/bootstrap.js?v=${storageVersion}`));
assert.ok(sw.includes(`./src/pwa.js?v=${storageVersion}`));

assert.match(sw, /const CACHE_NAME = "gravi-sst-v2-shell-v51";/);
assert.match(sw, /keys\.filter\(key => key !== ACTIVE_CACHE_NAME\)/);
assert.match(sw, /request\.mode === "navigate" \? new Request\(request, \{cache:"no-store"\}\)/);
assert.match(sw, /event\.data\?\.type === "SKIP_WAITING"/);

assert.match(pwa, /updateViaCache:"none"/);
assert.match(pwa, /controllerchange/);
assert.match(pwa, /registration\.update\(\)/);
assert.match(pwa, /location\.reload\(\)/);

assert.match(system, /function openModule\(type\)\{/);
assert.match(system, /\[GRAVI Module v48\]/);
assert.match(system, /module-retry-/);
assert.match(system, /No fue posible abrir este módulo/);
assert.match(system, /function normalizeSystemData48/);
assert.match(system, /function refreshSystemDataFromStorage48/);
assert.match(system, /gvc:data-hydrated/);
assert.match(system, /cross-tab-storage/);

const persistBlock = system.match(/function persistLocalData\([\s\S]*?\n\}/)?.[0] || "";
assert.ok(persistBlock.includes("localStorage.setItem"));
assert.ok(persistBlock.includes("gvc:local-data-updated"));
const saveBlock = system.match(/function save\([\s\S]*?\n\}/)?.[0] || "";
assert.ok(saveBlock.indexOf("persistLocalData") < saveBlock.indexOf("scheduleSystemSync"));

const loadBlock = supabase.match(/async function loadAuthenticatedData\(\)[\s\S]*?\n  \}/)?.[0] || "";
assert.ok(loadBlock.includes("await flushPending()"));
assert.ok(loadBlock.includes("emitDataHydrated48"));
assert.doesNotMatch(loadBlock, /await flushEntityMutations\(\)/);
assert.match(supabase, /function emitEntitySynced48/);
assert.match(supabase, /gvc:system-cache-updated/);

assert.doesNotMatch(bootstrap, /attendance-state\.js/);
assert.doesNotMatch(system, /GraviAttendance/);

console.log("PASS sync-stability-v48: runtime coordinado, actualización PWA, estado local coherente, navegación recuperable e hidratación observable verificadas.");
