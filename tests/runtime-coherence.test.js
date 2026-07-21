"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const system=read("src/system.js"),supabase=read("src/supabase.js"),pwa=read("src/pwa.js"),sw=read("service-worker.js"),index=read("index.html"),bootstrap=read("src/bootstrap.js");

for(const contract of [
  "normalizeSystemData48",
  "refreshSystemDataFromStorage48",
  "scheduleActiveModuleRender48",
  "renderModuleByType48",
  "scheduleAttendanceRender48",
  'window.addEventListener("gvc:data-hydrated"',
  'window.addEventListener("storage"',
  'window.addEventListener("pageshow"'
]) assert.ok(system.includes(contract),`Falta contrato runtime: ${contract}`);

const open=system.match(/function openModule\(type\)\{[\s\S]*?\n\}/)?.[0]||"";
assert.ok(open.includes('refreshSystemDataFromStorage48("module-open")'));
assert.ok(open.includes("for(let attempt=0;attempt<2;attempt++)"));
assert.ok(open.includes("renderModuleByType48(type)"));

const attendance=system.match(/function renderAttendance\(date=today\(\)\)\{[\s\S]*?\n\}/)?.[0]||"";
assert.ok(attendance.includes("normalizeSystemData48(data)"));
assert.ok(attendance.includes("Los contenedores de Asistencia todavía no están disponibles"));
assert.ok(attendance.includes("safeDate"));

for(const migration of ["migrateExtendedData","migratePhase2Data","migratePhase3Data","migratePhase5Data"]){
 const block=system.match(new RegExp(`function ${migration}\\(\\)\\{[\\s\\S]*?\\n\\}`))?.[0]||"";
 assert.ok(block.includes("mutateSystemDataIfChanged48"),`${migration} todavía sincroniza sin detectar cambios`);
}

for(const contract of ["emitDataHydrated48","emitEntitySynced48",'new CustomEvent("gvc:data-hydrated"','new CustomEvent("gvc:entity-synced"']) assert.ok(supabase.includes(contract),`Falta evento Supabase: ${contract}`);
for(const contract of ["controllerchange",'updateViaCache:"none"',"SKIP_WAITING","registration.update()","gravi-sw-last-controller"]) assert.ok(pwa.includes(contract),`Falta ciclo PWA: ${contract}`);
for(const contract of ['gravi-sst-v2-shell-v51','cache:"no-store"','event.data?.type === "SKIP_WAITING"']) assert.ok(sw.includes(contract),`Falta contrato SW: ${contract}`);
assert.ok(index.includes('./src/pwa.js?v=2026-07-21-localstorage-v51'));
assert.doesNotMatch(bootstrap,/src\/pwa\.js/);
console.log("PASS runtime-coherence-v48: actualización automática, puente de datos, recuperación de módulos y reducción de sincronización de arranque verificados.");
