"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const system = read("src/system.js");
const supabase = read("src/supabase.js");
const bootstrap = read("src/bootstrap.js");
const css = read("src/styles/system.css");
const serviceWorker = read("service-worker.js");

// El módulo de asistencia debe poder iniciar sin un helper externo opcional.
assert.doesNotMatch(system, /window\.GraviAttendance/);
assert.doesNotMatch(bootstrap, /attendance-state\.js/);

// Un solo punto de entrada de interacción y sin onclick recreado durante render.
assert.match(system, /\[data-att-toggle\]/);
assert.match(system, /stopImmediatePropagation\(\)/);
assert.equal((system.match(/applyAttendanceChange48\(/g) || []).length >= 2, true);
assert.doesNotMatch(system, /qa\("\[data-att-toggle\]"\)[\s\S]{0,120}\.forEach/);

// Contrato optimista: mutar -> persistir -> renderizar -> sincronizar.
const optimisticBlock = system.match(/function applyAttendanceChange48\([\s\S]*?\n\}/)?.[0] || "";
assert.ok(optimisticBlock, "No se encontró applyAttendanceChange48");
const mutateIndex = optimisticBlock.indexOf("data.attendance[key][workerId]=status");
const persistIndex = optimisticBlock.indexOf('persistLocalData("attendance")');
const renderIndex = optimisticBlock.indexOf("renderAttendance(date)");
const syncIndex = optimisticBlock.indexOf("enqueueAttendanceSync48");
assert.ok(mutateIndex >= 0 && persistIndex > mutateIndex, "La asistencia no se persiste después de mutar");
assert.ok(renderIndex > persistIndex, "La asistencia no se renderiza inmediatamente después de persistir");
assert.ok(syncIndex > renderIndex, "La sincronización debe iniciar después de actualizar la interfaz");

// Serialización por obra/fecha y protección frente a respuestas obsoletas.
for (const contract of [
  "attendanceSyncChains48",
  "attendanceSyncVersions48",
  "previous=attendanceSyncChains48.get(key)||Promise.resolve()",
  "attendanceSyncVersions48.get(stateKey)===version"
]) assert.ok(system.includes(contract), `Falta contrato de concurrencia: ${contract}`);

// El estado de la fila y los contadores deben provenir del estado local actual.
for (const contract of [
  "attendanceSummary48",
  "attendanceSyncLabel48",
  'class="attendance-worker-card ${current==="P"?"is-present":"is-absent"}',
  "renderAttendance(date)"
]) assert.ok(system.includes(contract), `Falta contrato visual de asistencia: ${contract}`);

// Offline/reconexión: cola deduplicada, inspeccionable y vaciado automático.
for (const contract of [
  "queueEntityMutation",
  "pendingEntityMutations",
  'entity==="attendance"',
  'global.addEventListener("online"',
  'gvc:entity-mutations-flushed'
]) assert.ok(supabase.includes(contract), `Falta contrato offline: ${contract}`);

// La hidratación remota no debe pisar asistencia local pendiente.
assert.match(supabase, /mutationStore\(\)\.mutations\.filter\(item=>item\.entity==="attendance"\)/);
assert.match(supabase, /hydrated\.attendance\[item\.id\]=clone\(local\.attendance\[item\.id\]\)/);

// La implementación estable evita el upsert que dependía de un constraint no garantizado.
assert.doesNotMatch(supabase, /registerAttendance:item=>mutateEntity\("attendance","upsert"/);
assert.match(supabase, /registerAttendance:async item=>\{let exists=Boolean\(item\.remoteExists\)/);

// Estado de carga limitado a la fila, responsive y caché inequívoca.
assert.match(css, /attendance-worker-card\.is-saving/);
assert.match(css, /@media\(max-width:900px\)/);
assert.match(css, /@media\(max-width:600px\)/);
assert.match(serviceWorker, /const CACHE_NAME = "gravi-sst-v2-shell-v48"/);
assert.doesNotMatch(serviceWorker, /attendance-state\.js/);

console.log("PASS attendance-v48: inicio seguro, UI optimista, contadores, concurrencia, cola offline, hidratación protegida y caché coordinada verificados.");
