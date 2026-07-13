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
  "./src/styles/print-documents.css?v=34",
  "./src/supabase.js",
  "./src/bootstrap.js",
  "./assets/gravi-sst-logo-dark.png",
  "./manifest.json"
];
for (const reference of expectedIndexReferences) {
  if (!index.includes(reference)) fail(`index.html no referencia ${reference}`);
}

const bootstrap = read("src/bootstrap.js");
for (const reference of ["./src/print/print-manager.js?v=34", "./src/app.js", "./src/corporate-documents.js", "./src/extensions.js?v=2", "./src/system.js?v=2026-07-13-print-v34", "./src/pwa.js"]) {
  if (!bootstrap.includes(reference)) fail(`bootstrap.js no carga ${reference}`);
}

const serviceWorker = read("service-worker.js");
for (const reference of ["./src/app.js", "./src/supabase.js?v=2026-07-13-auth-v35", "./src/bootstrap.js?v=2026-07-13-auth-v35", "./src/print/print-manager.js?v=34", "./src/system.js?v=2026-07-13-print-v34", "./src/styles/print-documents.css?v=34", "./src/styles/phase5-2.css?v=18", "./assets/gravi-sst-logo-dark.png", "./assets/gravi-sst-login-panel.png", "./assets/gravi-sst-splash.png", "./assets/pwa-icon-192.png"]) {
  if (!serviceWorker.includes(reference)) fail(`service-worker.js no precachea ${reference}`);
}

const authStyles = read("src/styles/phase5-2.css");
for (const rule of [".auth-screen [hidden]", "body.auth-login #setPasswordForm", "body.set-password #loginForm"]) {
  if (!authStyles.includes(rule)) fail(`phase5-2.css no contiene la regla definitiva ${rule}`);
}

const inviteApi = read("api/invite-user.js");
if (!inviteApi.includes("profileResponse.ok")) fail("api/invite-user.js no valida profileResponse.ok");

for (const reference of ["window.GRAVI_BUILD_VERSION = \"2026-07-13-auth-v35\"", "./src/styles/phase5-2.css?v=18", "./src/bootstrap.js?v=2026-07-13-auth-v35", "./src/supabase.js?v=2026-07-13-auth-v35"]) {
  if (!index.includes(reference)) fail(`index.html no usa la version coordinada ${reference}`);
}
if (!serviceWorker.includes('const CACHE_NAME = "gravi-sst-v2-shell-v35"')) fail("service-worker.js no usa cache v35");

const dailyReportsSql = read("database/daily_reports_v2.sql");
for (const reference of ["public.registro_diario", "unique index if not exists registro_diario_work_date_shift_uidx", "automatic_snapshot", "close_due_daily_reports", "work_user_assignments"]) {
  if (!dailyReportsSql.includes(reference)) fail(`daily_reports_v2.sql no contiene ${reference}`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("GRAVI SST v2.0 build validation OK");
