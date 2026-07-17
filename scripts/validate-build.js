"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "index.html",
  "manifest.json",
  "service-worker.js",
  "vercel.json",
  "src/app.js",
  "src/bootstrap.js",
  "src/corporate-documents.js",
  "src/extensions.js",
  "src/pwa.js",
  "src/supabase.js",
  "src/system.js",
  "src/signatures.js",
  "api/manage-users.js",
  "api/permissions-contract.js",
  "database/permissions_full_v3.sql",
  "tests/permission-contract.test.js",
  "tests/permission-security.test.js",
  "src/print/print-manager.js",
  "src/styles/styles.css",
  "src/styles/fixes.css",
  "src/styles/system.css",
  "src/styles/corporate-documents.css",
  "src/styles/phase2.css",
  "src/styles/phase3.css",
  "src/styles/phase4.css",
  "src/styles/phase5.css",
  "src/styles/phase5-2.css",
  "src/styles/signatures.css",
  "src/styles/print-documents.css",
  "assets/gravi-sst-logo-dark.png",
  "assets/gravi-sst-login-panel.png",
  "assets/gravi-sst-splash.png",
  "assets/pwa-icon-192.png",
  "assets/pwa-icon-512.png",
  "api/supabase-config.js",
  "api/invite-user.js",
  "database/schema.sql",
  "database/registro_diario.sql",
  "database/daily_reports_v2.sql",
  "database/storage_evidencias.sql"
  ,"database/document_signatures.sql"
  ,"database/core_permissions_v2.sql"
  ,"tests/permissions.test.js"
];

function fail(message) {
  console.error(`BUILD ERROR: ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`Falta archivo requerido: ${file}`);
}

for (const jsonFile of ["manifest.json", "vercel.json", "package.json"]) {
  try {
    JSON.parse(read(jsonFile));
  } catch (error) {
    fail(`${jsonFile} no es JSON valido: ${error.message}`);
  }
}

const jsFiles = requiredFiles.filter(file => file.endsWith(".js"));
for (const file of jsFiles) {
  try {
    new vm.Script(read(file), {filename: file});
  } catch (error) {
    fail(`${file} tiene error de sintaxis: ${error.message}`);
  }
}

const index = read("index.html");
const expectedIndexReferences = [
  "./src/styles/styles.css",
  "./src/styles/fixes.css",
  "./src/styles/system.css",
  "./src/styles/corporate-documents.css",
  "./src/styles/phase2.css?v=2",
  "./src/styles/phase3.css?v=1",
  "./src/styles/phase4.css?v=1",
  "./src/styles/phase5.css?v=1",
  "./src/styles/phase5-2.css?v=18",
  "./src/styles/print-documents.css?v=35",
  "./src/supabase.js",
  "./src/bootstrap.js",
  "./assets/gravi-sst-logo-dark.png",
  "./manifest.json"
];
for (const reference of expectedIndexReferences) {
  if (!index.includes(reference)) fail(`index.html no referencia ${reference}`);
}

const bootstrap = read("src/bootstrap.js");
for (const reference of ["./src/print/print-manager.js?v=35", "./src/app.js?v=2026-07-13-permissions-v38", "./src/corporate-documents.js", "./src/extensions.js?v=2", "./src/executive-dashboard.js?v=2026-07-17-executive-navigation-v44", "./src/system.js?v=2026-07-17-executive-navigation-v44", "./src/offline-evidence-queue.js?v=2026-07-15-capture-evidence-v42", "./src/evidence-manager.js?v=2026-07-15-capture-evidence-v42", "./src/evidence-sync-coordinator.js?v=2026-07-15-capture-evidence-v42", "./src/legacy-capture-adapter.js?v=2026-07-15-capture-evidence-v42", "./src/preventive-observations.js?v=2026-07-15-capture-evidence-v42", "./src/evidence-gallery.js?v=2026-07-15-capture-evidence-v42", "./src/work-permits.js?v=2026-07-15-capture-evidence-v42", "./src/evidence-relations.js?v=2026-07-15-capture-evidence-v42", "./src/capture-center.js?v=2026-07-15-capture-evidence-v42", "./src/pwa.js"]) {
  if (!bootstrap.includes(reference)) fail(`bootstrap.js no carga ${reference}`);
}
if (bootstrap.indexOf("./src/executive-dashboard.js") > bootstrap.indexOf("./src/system.js")) fail("bootstrap.js debe cargar executive-dashboard.js antes de system.js");
if (!bootstrap.includes('await window.GraviExecutiveDashboard.mount({reason:"initial-route"})')) fail("bootstrap.js no espera el montaje ejecutivo inicial");
const executiveDashboard = read("src/executive-dashboard.js");
for (const contract of ["mount,refresh,unmount,isMounted", 'aria-busy","true', 'aria-busy","false']) if (!executiveDashboard.includes(contract)) fail(`executive-dashboard.js no cumple el contrato de montaje: ${contract}`);
const system = read("src/system.js");
if (system.includes("renderGeneralDashboard52();enhanceExecutiveDashboard55()")) fail("system.js conserva el fallback visual del Inicio antiguo");
if ((system.match(/function handleCaptureOption53\(/g)||[]).length !== 1 || /handleCaptureOption53\s*=\s*function/.test(system)) fail("system.js contiene más de un controlador del Centro de Captura");
if (system.includes("gvc-preventive-controls-v1:")) fail("system.js conserva el panel preventivo local obsoleto");
const captureCenter = read("src/capture-center.js");
for (const key of ["preventiveObservation","safetyEvent","inspection","permitAts","visitor","quickEvidence"]) if (!captureCenter.includes(`${key}:Object.freeze`)) fail(`capture-center.js no contiene la ruta ${key}`);
if ((captureCenter.match(/:Object\.freeze\(\{label:/g)||[]).length !== 6) fail("capture-center.js debe exponer exactamente seis rutas");
const evidenceManager = read("src/evidence-manager.js");
for (const api of ["selectFiles","prepareImages","renderPreview","removePreparedFile","saveOffline","uploadPending","getSignedUrl","openViewer","listByRecord","retry","getAvailableCount"]) if (!evidenceManager.includes(api)) fail(`evidence-manager.js no expone ${api}`);

const serviceWorker = read("service-worker.js");
for (const reference of ["./src/app.js?v=2026-07-13-permissions-v38", "./src/supabase.js?v=2026-07-16-compliance-hotfix-v43", "./src/repositories.js?v=2026-07-15-capture-evidence-v42", "./src/bootstrap.js?v=2026-07-17-executive-navigation-v44", "./src/print/print-manager.js?v=35", "./src/system.js?v=2026-07-17-executive-navigation-v44", "./src/executive-dashboard.js?v=2026-07-17-executive-navigation-v44", "./src/offline-evidence-queue.js?v=2026-07-15-capture-evidence-v42", "./src/evidence-manager.js?v=2026-07-15-capture-evidence-v42", "./src/evidence-sync-coordinator.js?v=2026-07-15-capture-evidence-v42", "./src/legacy-capture-adapter.js?v=2026-07-15-capture-evidence-v42", "./src/preventive-observations.js?v=2026-07-15-capture-evidence-v42", "./src/evidence-gallery.js?v=2026-07-15-capture-evidence-v42", "./src/work-permits.js?v=2026-07-15-capture-evidence-v42", "./src/evidence-relations.js?v=2026-07-15-capture-evidence-v42", "./src/capture-center.js?v=2026-07-15-capture-evidence-v42", "./src/styles/capture-center.css?v=2026-07-15-capture-v42", "./src/styles/evidence-gallery.css?v=2026-07-15-capture-v42", "./src/styles/executive-dashboard.css?v=2026-07-17-executive-navigation-v44", "./src/styles/print-documents.css?v=35", "./src/styles/phase5-2.css?v=18", "./assets/gravi-sst-logo-dark.png", "./assets/gravi-sst-login-panel.png", "./assets/gravi-sst-splash.png", "./assets/pwa-icon-192.png"]) {
  if (!serviceWorker.includes(reference)) fail(`service-worker.js no precachea ${reference}`);
}

const authStyles = read("src/styles/phase5-2.css");
for (const rule of [".auth-screen [hidden]", "body.auth-login #setPasswordForm", "body.set-password #loginForm"]) {
  if (!authStyles.includes(rule)) fail(`phase5-2.css no contiene la regla definitiva ${rule}`);
}

const inviteApi = read("api/invite-user.js");
if (!inviteApi.includes("profileResponse.ok")) fail("api/invite-user.js no valida profileResponse.ok");

for (const reference of ["window.GRAVI_BUILD_VERSION = \"2026-07-17-executive-navigation-v44\"", "./src/styles/phase5-2.css?v=18", "./src/styles/executive-dashboard.css?v=2026-07-17-executive-navigation-v44", "./src/styles/capture-center.css?v=2026-07-15-capture-v42", "./src/styles/evidence-gallery.css?v=2026-07-15-capture-v42", "./src/bootstrap.js?v=2026-07-17-executive-navigation-v44", "./src/supabase.js?v=2026-07-16-compliance-hotfix-v43", "./src/repositories.js?v=2026-07-15-capture-evidence-v42"]) {
  if (!index.includes(reference)) fail(`index.html no usa la version coordinada ${reference}`);
}
if (!serviceWorker.includes('const CACHE_NAME = "gravi-sst-v2-shell-v44"')) fail("service-worker.js no usa cache v44");

const releaseV38 = read("database/permissions_release_v38.sql");
const verifyV38 = read("database/verify_permissions_v38.sql");
for (const fragment of ["begin;","pg_catalog.pg_policies","revoke insert,update,delete on table public.perfiles_usuario from authenticated","set search_path=pg_catalog,public"]) if (!releaseV38.toLowerCase().includes(fragment)) fail(`permissions_release_v38.sql no contiene ${fragment}`);
if (!verifyV38.includes("PASS") || !verifyV38.includes("FAIL")) fail("verify_permissions_v38.sql no reporta PASS/FAIL");

const dailyReportsSql = read("database/daily_reports_v2.sql");
for (const reference of ["public.registro_diario", "unique index if not exists registro_diario_work_date_shift_uidx", "automatic_snapshot", "close_due_daily_reports", "work_user_assignments"]) {
  if (!dailyReportsSql.includes(reference)) fail(`daily_reports_v2.sql no contiene ${reference}`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("GRAVI SST v2.0 build validation OK");
