"use strict";

const ALL_PERMISSION_KEYS = Object.freeze([
  "works.view","developments.create","developments.edit","developments.archive","works.create","works.edit","works.archive",
  "contractors.view","contractors.create","contractors.edit","contractors.archive","workers.view","workers.create","workers.edit","workers.archive","visitors.view","visitors.register","visitors.edit",
  "operations.view","attendance.view","attendance.register","attendance.edit","inspections.view","inspections.create","inspections.edit","incidents.view","incidents.create","incidents.edit",
  "daily_reports.view","daily_reports.edit","daily_reports.close","daily_reports.validate","daily_reports.reopen",
  "permits.view","permits.create","permits.edit","permits.review","permits.authorize","permits.suspend","permits.cancel","permits.close","permits.export",
  "evidence.view","evidence.upload","evidence.delete","compliance.view","compliance.edit","compliance.monthly_report","compliance.nom_matrix",
  "documents.view","documents.generate","documents.manage","reports.view","reports.generate","histories.global","histories.work","audit.view",
  "signatures.view","signatures.capture","signatures.invalidate","signatures.export",
  "users.view","users.invite","users.edit","users.change_roles","users.manage_permissions","users.deactivate"
]);
const SUPERVISOR = Object.freeze(["works.view","contractors.view","contractors.create","contractors.edit","workers.view","workers.create","workers.edit","visitors.view","visitors.register","visitors.edit","operations.view","attendance.view","attendance.register","attendance.edit","inspections.view","inspections.create","inspections.edit","incidents.view","incidents.create","incidents.edit","daily_reports.view","daily_reports.edit","daily_reports.close","daily_reports.validate","permits.view","permits.create","permits.edit","permits.review","permits.authorize","permits.suspend","permits.cancel","permits.close","permits.export","evidence.view","evidence.upload","compliance.view","compliance.edit","compliance.monthly_report","documents.view","documents.generate","reports.view","reports.generate","histories.work","audit.view","signatures.view","signatures.capture","signatures.invalidate","signatures.export"]);
const CONSULTA = Object.freeze(["works.view","contractors.view","workers.view","visitors.view","operations.view","attendance.view","inspections.view","incidents.view","daily_reports.view","permits.view","evidence.view","compliance.view","documents.view","reports.view","histories.global","histories.work","audit.view","signatures.view"]);
const ROLE_DEFAULTS = Object.freeze({"Administrador":ALL_PERMISSION_KEYS,"Supervisor SST":SUPERVISOR,"Consulta":CONSULTA});
const CRITICAL_ADMIN_PERMISSIONS = Object.freeze(["users.change_roles","users.manage_permissions","users.deactivate"]);

function hasPermission(profile,key) {
  if (!profile?.active || !ALL_PERMISSION_KEYS.includes(key)) return false;
  if (profile.role === "Administrador") return true;
  const defaultValue=(ROLE_DEFAULTS[profile.role] || []).includes(key);
  if (profile.permissions_mode === "custom" && Object.prototype.hasOwnProperty.call(profile.custom_permissions || {},key)) return profile.custom_permissions[key] === true;
  return defaultValue;
}
function validateCustomPermissions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("custom_permissions debe ser un objeto.");
  for (const [key,enabled] of Object.entries(value)) if (!ALL_PERMISSION_KEYS.includes(key) || typeof enabled !== "boolean") throw new Error(`Permiso inv\u00e1lido: ${key}`);
  return {...value};
}
module.exports={ALL_PERMISSION_KEYS,ROLE_DEFAULTS,CRITICAL_ADMIN_PERMISSIONS,hasPermission,validateCustomPermissions};
