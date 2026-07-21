"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const system = read("src/system.js");
const bootstrap = read("src/bootstrap.js");
const sw = read("service-worker.js");
const index = read("index.html");

const wizard = system.match(/function incidentWizardRender63\(\)\{[\s\S]*?\n\}/)?.[0] || "";
assert.ok(wizard, "No se encontró incidentWizardRender63");

// La fecha y hora debe venir precargada para evitar que un control requerido oculto bloquee el envío.
assert.match(wizard, /defaultDateTime63=new Date\(Date\.now\(\)-new Date\(\)\.getTimezoneOffset\(\)\*60000\)\.toISOString\(\)\.slice\(0,16\)/);
assert.match(wizard, /name="dateTime"[^>]*value="\$\{esc\(defaultDateTime63\)\}"[^>]*required/);

// La revisión debe evaluar todos los campos realmente requeridos, incluida la fecha/hora.
for (const name of ["dateTime", "area", "incidentType", "activity", "description"]) {
  assert.ok(wizard.includes(`name:"${name}"`), `Falta validar el campo obligatorio ${name}`);
}
assert.match(wizard, /Falta completar:/);
assert.match(wizard, /Fecha y hora/);

// No se debe depender de reportValidity sobre un paso oculto sin llevar al usuario al campo faltante.
assert.match(wizard, /focusIncidentMissing63/);
assert.match(wizard, /step=missing\[0\]\.step;showStep\(\)/);
assert.match(wizard, /control\?\.focus\?\.\(\)/);
assert.doesNotMatch(wizard, /if\(!incidentForm\.reportValidity\(\)\)return;saveWizard\(true\)/);

// El botón Siguiente debe validar el paso obligatorio y el envío debe proteger contra doble clic.
assert.match(wizard, /step===1&&!focusIncidentMissing63\(\)/);
assert.match(wizard, /incidentSubmitting63/);
assert.match(wizard, /button\.textContent="Enviando…"/);
assert.match(wizard, /button\.textContent="Enviar reporte"/);

// Un nuevo registro no debe reutilizar el id de un expediente previamente abierto.
assert.match(system, /q\("#incidentButton"\)\.onclick=\(\)=>\{currentRecord=null;incidentWizardRender63\(\);installIncidentSubmit50\(\);\}/);
assert.match(system, /dataset\.submittingV50/);
assert.match(system, /await finish\(record\)/);

// Coherencia de caché y carga de scripts.
assert.match(sw, /gravi-sst-v2-shell-v51/);
assert.match(sw, /system\.js\?v=2026-07-18-evidence-v51/);
assert.match(bootstrap, /system\.js\?v=2026-07-18-evidence-v51/);
assert.match(index, /bootstrap\.js\?v=2026-07-18-evidence-v51/);

console.log("PASS incident-report-v50: validación visible, fecha/hora precargada, envío asíncrono protegido y caché coordinada verificados.");
