(function createGraviSupabase(global){
  "use strict";

  const SYSTEM_CACHE_KEY = "gvc-ops-system-v1";
  const RECORDS_CACHE_KEY = "gvc-extintores-records-v1";
  const PENDING_KEY = "gvc-supabase-pending-v1";
  const SESSION_KEY = "gvc-supabase-session-v1";
  const PASSWORD_SETUP_PENDING_KEY = "gravi-password-setup-pending-v1";
  const PASSWORD_SETUP_TTL_MS = 20 * 60 * 1000;
  const DYNAMIC_FORMATS_CACHE_KEY = "gvc-dynamic-formats-v1";
  const DYNAMIC_FORMATS_PENDING_KEY = "gvc-dynamic-formats-pending-v1";
  const DAILY_REPORTS_CACHE_KEY = "gvc-daily-log-v1";
  const DAILY_REPORTS_MIGRATION_KEY = "gvc-daily-log-v2-migration";
  const USER_PERMISSIONS_KEY = "gvc-user-permissions-v1";
  const PENDING_INVITE_PERMISSIONS_KEY = "gvc-user-permissions-pending-invites-v1";
  const TABLES = {
    developments: "desarrollos",
    works: "obras",
    contractors: "contratistas",
    workers: "trabajadores",
    visitors: "visitantes",
    attendance: "asistencia",
    investigations: "investigaciones",
    histories: "historial",
    records: "registros",
    state: "estado_aplicacion",
    compliance: "cumplimiento_estado",
    profiles: "perfiles_usuario",
    dailyReports: "registro_diario"
    ,workPermits: "work_permits"
  };

  let config = null;
  let configured = false;
  let syncTimer = null;
  let pendingSystemSnapshot = null;
  let syncChain = Promise.resolve();
  let lastStatus = {state:"cached",message:"Caché local"};
  let currentSession = null;
  let currentProfile = null;
  const PERMISSION_GROUPS = Object.freeze([
    {id:"catalogs",label:"Cat\u00e1logos",permissions:[["works.view","Ver desarrollos y obras"],["developments.create","Crear desarrollos"],["developments.edit","Editar desarrollos"],["developments.archive","Archivar desarrollos"],["works.create","Crear obras"],["works.edit","Editar obras"],["works.archive","Archivar obras"]]},
    {id:"workforce",label:"Fuerza de trabajo",permissions:[["contractors.view","Ver contratistas"],["contractors.create","Crear contratistas"],["contractors.edit","Editar contratistas"],["contractors.archive","Archivar contratistas"],["workers.view","Ver trabajadores"],["workers.create","Crear trabajadores"],["workers.edit","Editar trabajadores"],["workers.archive","Archivar trabajadores"],["visitors.view","Ver visitantes"],["visitors.register","Registrar visitantes"]]},
    {id:"operation",label:"Operaci\u00f3n",permissions:[["attendance.view","Ver asistencia"],["attendance.register","Registrar asistencia"],["attendance.edit","Editar asistencia"],["operations.view","Ver operaciones"],["inspections.create","Crear inspecciones"],["inspections.edit","Editar inspecciones"],["incidents.view","Ver incidencias"],["incidents.create","Crear incidencias"],["incidents.edit","Editar incidencias"],["permits.view","Ver permisos de trabajo"],["permits.create","Crear permisos de trabajo"],["permits.edit","Editar permisos de trabajo"],["permits.review","Revisar permisos de trabajo"],["permits.authorize","Autorizar permisos de trabajo"],["permits.suspend","Suspender permisos de trabajo"],["permits.cancel","Cancelar permisos de trabajo"],["permits.close","Cerrar permisos de trabajo"],["permits.export","Exportar permisos de trabajo"]]},
    {id:"compliance",label:"Cumplimiento",permissions:[["compliance.view","Ver cumplimiento"],["compliance.edit","Editar cumplimiento"],["compliance.monthly_report","Generar reporte mensual"],["compliance.nom_matrix","Administrar matriz NOM"]]},
    {id:"intelligence",label:"Inteligencia",permissions:[["documents.view","Ver documentos"],["documents.generate","Generar documentos/PDF"],["reports.view","Ver reportes"],["reports.generate","Generar reportes"],["histories.global","Ver hist\u00f3ricos generales"],["histories.work","Ver hist\u00f3ricos de obra"],["audit.view","Ver bit\u00e1cora"]]},
    {id:"signatures",label:"Firmas manuscritas",permissions:[["signatures.view","Ver firmas manuscritas"],["signatures.capture","Capturar firmas manuscritas"],["signatures.invalidate","Invalidar firmas manuscritas"],["signatures.export","Incluir firmas en documentos"]]},
    {id:"administration",label:"Administraci\u00f3n",permissions:[["users.invite","Invitar usuarios"],["users.edit","Editar usuarios"],["users.change_roles","Cambiar roles"],["users.manage_permissions","Editar permisos"],["users.deactivate","Desactivar usuarios"]]}
  ]);
  const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(group => group.permissions.map(item => item[0]));
  const READ_PERMISSION_KEYS = ALL_PERMISSION_KEYS.filter(key => key.endsWith(".view") || key.startsWith("histories.") || key === "audit.view" || key === "works.view");
  const ROLE_PERMISSION_KEYS = Object.freeze({
    "Administrador":ALL_PERMISSION_KEYS,
    "Supervisor SST":["works.view","contractors.view","contractors.create","contractors.edit","workers.view","workers.create","workers.edit","visitors.view","visitors.register","attendance.view","attendance.register","attendance.edit","operations.view","inspections.create","inspections.edit","incidents.view","incidents.create","incidents.edit","permits.view","permits.create","permits.edit","permits.review","permits.authorize","permits.suspend","permits.cancel","permits.close","permits.export","signatures.view","signatures.capture","signatures.invalidate","signatures.export","compliance.view","compliance.edit","compliance.monthly_report","documents.view","documents.generate","reports.view","reports.generate","histories.work","audit.view"],
    "Consulta":READ_PERMISSION_KEYS
  });

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function permissionDefaults(role) {
    const allowed = new Set(ROLE_PERMISSION_KEYS[role] || ROLE_PERMISSION_KEYS.Consulta);
    return Object.fromEntries(ALL_PERMISSION_KEYS.map(key => [key, allowed.has(key)]));
  }

  function localPermissionStore() {
    return readJson(USER_PERMISSIONS_KEY, {});
  }

  function pendingInvitePermissionStore() {
    return readJson(PENDING_INVITE_PERMISSIONS_KEY, {});
  }

  function hasRemotePermissionFields(profile={}) {
    return Object.prototype.hasOwnProperty.call(profile, "permissions_mode") || Object.prototype.hasOwnProperty.call(profile, "custom_permissions") ||
      Object.prototype.hasOwnProperty.call(profile.payload || {}, "permissions_mode") || Object.prototype.hasOwnProperty.call(profile.payload || {}, "custom_permissions");
  }

  function fallbackPermissionSettingsFor(profile={}) {
    const local = profile.user_id ? localPermissionStore()[profile.user_id] : null;
    const pending = profile.email ? pendingInvitePermissionStore()[normalized(profile.email)] : null;
    return local || pending || null;
  }

  function permissionSettingsFor(profile={}) {
    const fallback = fallbackPermissionSettingsFor(profile);
    const mode = hasRemotePermissionFields(profile) ? (profile.permissions_mode || profile.payload?.permissions_mode || "role-default") : (fallback?.permissions_mode || "role-default");
    const custom = hasRemotePermissionFields(profile) ? (profile.custom_permissions || profile.payload?.custom_permissions || {}) : (fallback?.custom_permissions || {});
    return {permissions_mode:mode === "custom" ? "custom" : "role-default", custom_permissions:{...custom}};
  }

  function effectivePermissions(profile=currentProfile) {
    if (!profile) return permissionDefaults("Consulta");
    if (profile.role === "Administrador") return permissionDefaults("Administrador");
    const settings = permissionSettingsFor(profile);
    if (settings.permissions_mode === "custom") return {...permissionDefaults(profile.role), ...settings.custom_permissions};
    return permissionDefaults(profile.role);
  }

  function canPermission(permissionKey, profile=currentProfile) {
    return Boolean(effectivePermissions(profile)[permissionKey]);
  }

  function normalizePermissionSettings(settings={}) {
    return {
      permissions_mode:settings.permissions_mode === "custom" ? "custom" : "role-default",
      custom_permissions:{...(settings.custom_permissions || {})}
    };
  }

  function removeMigratedLocalPermissions(userId="", email="") {
    const local = localPermissionStore();
    const pending = pendingInvitePermissionStore();
    if (userId && local[userId]) { delete local[userId]; writeJson(USER_PERMISSIONS_KEY, local); }
    const clean = normalized(email);
    if (clean && pending[clean]) { delete pending[clean]; writeJson(PENDING_INVITE_PERMISSIONS_KEY, pending); }
  }

  function saveLocalUserPermissions(userId, settings={}) {
    if (!userId) return;
    const normalizedSettings = normalizePermissionSettings(settings);
    const store = localPermissionStore();
    store[userId] = {
      ...normalizedSettings,
      updated_at:new Date().toISOString()
    };
    writeJson(USER_PERMISSIONS_KEY, store);
    if (currentProfile?.user_id === userId) currentProfile = {...currentProfile, ...store[userId]};
  }

  function savePendingInvitePermissions(email, settings={}) {
    const clean = normalized(email);
    if (!clean) return;
    const normalizedSettings = normalizePermissionSettings(settings);
    const store = pendingInvitePermissionStore();
    store[clean] = {
      ...normalizedSettings,
      updated_at:new Date().toISOString()
    };
    writeJson(PENDING_INVITE_PERMISSIONS_KEY, store);
  }

  function normalized(value) {
    return String(value || "").trim().toLocaleLowerCase("es-MX");
  }

  function emitStatus(state, message) {
    lastStatus = {state, message};
    const dot = document.querySelector("#syncDot");
    const label = document.querySelector("#syncLabel");
    if (dot) dot.className = `sync-dot ${state}`;
    if (label) label.textContent = message;
    global.dispatchEvent(new CustomEvent("gvc:sync-status", {detail:lastStatus}));
  }

  async function resolveConfig() {
    const injected = global.GRAVI_SUPABASE_CONFIG;
    if (injected?.url && injected?.anonKey) return {url:injected.url, anonKey:injected.anonKey};

    try {
      const response = await fetch("./api/supabase-config", {cache:"no-store"});
      if (!response.ok) return null;
      const remote = await response.json();
      return remote?.url && remote?.anonKey ? remote : null;
    } catch {
      return null;
    }
  }

  function saveSession(session) {
    if (!session) { localStorage.removeItem(SESSION_KEY); return; }
    if (!session.expires_at && session.expires_in) session.expires_at = Math.floor(Date.now() / 1000) + Number(session.expires_in);
    currentSession = session;
    writeJson(SESSION_KEY, session);
  }

  function clearSensitiveCache() {
    const fixed = [SYSTEM_CACHE_KEY,RECORDS_CACHE_KEY,PENDING_KEY,"gvc-active-work-id","gvc-work-context-v1"];
    fixed.forEach(key => localStorage.removeItem(key));
    const keys = [];
    for (let index = 0; index < localStorage.length; index++) keys.push(localStorage.key(index));
    keys.filter(key => key && ((key===DAILY_REPORTS_CACHE_KEY) || key.startsWith(`${DAILY_REPORTS_CACHE_KEY}:`) || key===DAILY_REPORTS_MIGRATION_KEY || key.startsWith(`${DAILY_REPORTS_MIGRATION_KEY}:`) || (key.startsWith("gvc-") && key.includes("draft")))).forEach(key => localStorage.removeItem(key));
  }

  async function authRequest(path, options={}) {
    const response = await fetch(`${config.url}/auth/v1/${path}`, {
      method:options.method || "GET",
      headers:{"apikey":config.anonKey,"Authorization":`Bearer ${options.token || config.anonKey}`,"Content-Type":"application/json"},
      body:options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) { const error=new Error(payload?.msg || payload?.message || payload?.error_description || "Error de autenticación.");error.status=response.status;throw error; }
    return payload;
  }

  async function ensureConfigured() {
    if (configured && config?.url && config?.anonKey) return true;
    config = await resolveConfig();
    configured = Boolean(config?.url && config?.anonKey);
    if (configured) config.url = config.url.replace(/\/$/, "");
    return configured;
  }

  function authRedirectParams() {
    const params = new URLSearchParams();
    const addAll = source => source.forEach((value, key) => params.set(key, value));
    const query = String(global.location.search || "").replace(/^\?/, "");
    const hash = String(global.location.hash || "").replace(/^#/, "");
    if (query) addAll(new URLSearchParams(query));
    if (hash) addAll(new URLSearchParams(hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : hash));
    return params;
  }

  function hasAuthRedirect() {
    const params = authRedirectParams();
    return Boolean(params.get("access_token") || params.get("refresh_token") || params.get("type") === "invite");
  }

  function clearPasswordSetupPending() {
    localStorage.removeItem(PASSWORD_SETUP_PENDING_KEY);
  }

  function createPasswordSetupPending(userId) {
    if (!userId) throw new Error("La invitación no identificó al usuario.");
    const createdAt = Date.now();
    writeJson(PASSWORD_SETUP_PENDING_KEY, {userId,createdAt,expiresAt:createdAt + PASSWORD_SETUP_TTL_MS});
  }

  function validPasswordSetupPending(userId) {
    const pending = readJson(PASSWORD_SETUP_PENDING_KEY, null);
    if (!pending?.userId || !pending.expiresAt || Number(pending.expiresAt) <= Date.now() || pending.userId !== userId) {
      clearPasswordSetupPending();
      return false;
    }
    return true;
  }

  async function processAuthRedirect() {
    if (!await ensureConfigured()) throw new Error("Supabase no est\u00e1 configurado en este despliegue.");
    const params = authRedirectParams();
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (params.get("error_description")) throw new Error(params.get("error_description"));
    if (!accessToken || !refreshToken) throw new Error("El enlace de invitaci\u00f3n no contiene una sesi\u00f3n v\u00e1lida. Solicita una nueva invitaci\u00f3n.");
    const redirectType = params.get("type") || "";
    if (redirectType !== "invite") throw new Error("El enlace no corresponde a una invitaci\u00f3n de usuario.");
    const session = {
      access_token:accessToken,
      refresh_token:refreshToken,
      token_type:params.get("token_type") || "bearer",
      expires_in:Number(params.get("expires_in") || 3600)
    };
    saveSession(session);
    const user = await authRequest("user", {token:accessToken});
    currentSession.user = user;
    saveSession(currentSession);
    createPasswordSetupPending(user.id);
    return {session:currentSession,user,type:redirectType};
  }

  async function resumePasswordSetup() {
    if (!await ensureConfigured()) throw new Error("Supabase no est\u00e1 configurado en este despliegue.");
    currentSession = readJson(SESSION_KEY, null);
    if (!currentSession) {
      clearPasswordSetupPending();
      throw new Error("No existe una invitaci\u00f3n pendiente.");
    }
    await ensureFreshSession();
    const user = await authRequest("user", {token:currentSession.access_token});
    currentSession.user = user;
    saveSession(currentSession);
    if (!validPasswordSetupPending(user.id)) throw new Error("La invitaci\u00f3n pendiente no corresponde a esta sesi\u00f3n o ya expir\u00f3.");
    return {session:currentSession,user};
  }

  function clearAuthRedirectUrl(path="/set-password") {
    if (global.history?.replaceState) global.history.replaceState({}, document.title, path);
  }

  async function refreshSession() {
    if (!currentSession?.refresh_token) throw new Error("La sesión expiró.");
    const refreshed = await authRequest("token?grant_type=refresh_token", {method:"POST",body:{refresh_token:currentSession.refresh_token}});
    saveSession(refreshed);
    return refreshed;
  }

  async function ensureFreshSession() {
    if (!currentSession) throw new Error("Debes iniciar sesión.");
    if (Number(currentSession.expires_at || 0) <= Math.floor(Date.now() / 1000) + 60) await refreshSession();
    return currentSession;
  }

  async function loadProfile() {
    const rows = await request(TABLES.profiles, {query:`?user_id=eq.${encodeURIComponent(currentSession.user.id)}&select=*`});
    const profile = rows?.[0];
    if (!profile) throw new Error("Tu cuenta no tiene un perfil GRAVI asignado.");
    if (!profile.active) throw new Error("Tu acceso está suspendido. Contacta al administrador.");
    currentProfile = {...profile, ...permissionSettingsFor(profile)};
    currentSession.gravi_profile = currentProfile;
    saveSession(currentSession);
    return profile;
  }

  function headers(extra={}) {
    return {
      "apikey": config.anonKey,
      "Authorization": `Bearer ${currentSession?.access_token || config.anonKey}`,
      "Content-Type": "application/json",
      ...extra
    };
  }

  async function request(table, options={}) {
    if (!configured) throw new Error("Supabase no está configurado.");
    if (!options.allowAnonymous) await ensureFreshSession();
    const query = options.query || "";
    const response = await fetch(`${config.url}/rest/v1/${table}${query}`, {
      method: options.method || "GET",
      headers: headers(options.headers),
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`${table}: ${response.status} ${detail}`);
    }
    if (response.status === 204 || options.returnMinimal) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function selectAll(table) {
    const rows = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const page = await request(table, {query:"?select=*",headers:{"Range":`${from}-${from + pageSize - 1}`}});
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  }

  async function upsert(table, rows, conflict="id") {
    if (!rows?.length) return;
    for (let index = 0; index < rows.length; index += 25) {
      await request(table, {
        method:"POST",
        query:`?on_conflict=${encodeURIComponent(conflict)}`,
        headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},
        body:rows.slice(index, index + 25),
        returnMinimal:true
      });
    }
  }

  function baseRow(item) {
    return {
      id:String(item.id),
      payload:item,
      created_at:item.createdAt || new Date().toISOString(),
      updated_at:new Date().toISOString()
    };
  }

  function developmentRows(data) {
    return (data.developments || []).map(item => ({
      ...baseRow(item), name:item.name || "Sin nombre", location:item.location || "",
      client:item.client || "", observations:item.observations || "", deleted_at:item.deletedAt || null
    }));
  }

  function workRows(data) {
    const developments = data.developments || [];
    return (data.works || []).map(item => ({
      ...baseRow(item), development_id:developments.find(dev => normalized(dev.name) === normalized(item.development))?.id || null,
      development_name:item.development || "", name:item.name || "Sin nombre", status:item.status || "Activa",
      location:item.location || "", client:item.client || "", start_date:item.startDate || null,
      timezone:item.timezone || "America/Mazatlan", deleted_at:item.deletedAt || null
    }));
  }

  function scopedRows(items, columns={}) {
    return (items || []).map(item => {
      const row = {...baseRow(item), work_id:item.workId || "legacy"};
      Object.entries(columns).forEach(([column, source]) => row[column] = item[source] || null);
      return row;
    });
  }

  function attendanceRows(data) {
    return Object.entries(data.attendance || {}).map(([key, marks]) => {
      const separator = key.indexOf("|");
      return {
        work_id:key.slice(0, separator), attendance_date:key.slice(separator + 1), marks,
        payload:{workId:key.slice(0, separator), date:key.slice(separator + 1), marks}, updated_at:new Date().toISOString()
      };
    });
  }

  function evidenceArray(item) {
    return Array.isArray(item?.evidence) ? item.evidence : [];
  }

  function isDataUrl(value) {
    return typeof value === "string" && value.startsWith("data:image/");
  }

  function normalizeEvidenceItem(item) {
    if (typeof item === "string") return {id:crypto.randomUUID(),src:item,comment:"",syncStatus:"local",createdAt:new Date().toISOString()};
    return {...item,id:item.id || crypto.randomUUID(),src:item.src || item.dataUrl || item.url || "",comment:item.comment || "",syncStatus:item.syncStatus || (item.storagePath ? "synced" : "local")};
  }

  async function uploadEvidence(record, evidence) {
    if (!configured || !currentSession?.access_token || !isDataUrl(evidence.src) || evidence.storagePath) return evidence;
    const extension = evidence.src.startsWith("data:image/png") ? "png" : "jpg";
    const workId = String(record.workId || "legacy").replace(/[^a-zA-Z0-9_-]/g, "_");
    const recordId = String(record.id || "registro").replace(/[^a-zA-Z0-9_-]/g, "_");
    const evidenceId = String(evidence.id || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `${workId}/${recordId}/${evidenceId}.${extension}`;
    const blob = await fetch(evidence.src).then(response => response.blob());
    const response = await fetch(`${config.url}/storage/v1/object/evidencias/${path}`, {
      method:"POST",
      headers:{"apikey":config.anonKey,"Authorization":`Bearer ${currentSession.access_token}`,"Content-Type":blob.type || "image/jpeg","x-upsert":"true"},
      body:blob
    });
    if (!response.ok) throw new Error(`Storage evidencias: ${response.status} ${await response.text()}`);
    return {...evidence,storagePath:path,syncStatus:"synced",syncedAt:new Date().toISOString()};
  }

  async function processRecordEvidence(item) {
    if (!evidenceArray(item).length) return item;
    const record = clone(item);
    const processed = [];
    for (const raw of evidenceArray(record)) {
      const evidence = normalizeEvidenceItem(raw);
      try { processed.push(await uploadEvidence(record, evidence)); }
      catch (error) { console.warn("Evidencia pendiente de sincronizar.", error); processed.push({...evidence,syncStatus:"pending",syncError:"No fue posible subir a Supabase Storage."}); }
    }
    record.evidence = processed;
    return record;
  }

  function hasPendingEvidence(item) {
    return evidenceArray(item).some(evidence => normalizeEvidenceItem(evidence).syncStatus === "pending");
  }

  function can(permission) {
    const role = currentProfile?.role;
    if (role === "Administrador") return true;
    if (role === "Supervisor SST") return ["field-write","records-write","operational-state"].includes(permission);
    return permission === "read";
  }

  function statePayload(data) {
    const payload = clone(data);
    ["developments","works","contractors","workers","visitors","attendance","investigations","histories"].forEach(key => delete payload[key]);
    ["compliance","complianceAudit","complianceMatrix"].forEach(key => delete payload[key]);
    return payload;
  }

  function compliancePayload(data) {
    return {compliance:data.compliance || {},complianceAudit:data.complianceAudit || [],complianceMatrix:data.complianceMatrix || {}};
  }

  function queueSnapshot(kind, value) {
    const pending = readJson(PENDING_KEY, {system:null,records:{}});
    if (kind === "system") pending.system = value;
    if (kind === "record") pending.records[value.id] = value;
    if (kind === "records") value.forEach(item => pending.records[item.id] = item);
    writeJson(PENDING_KEY, pending);
  }

  async function performSystemSync(data, queueOnFailure=true) {
    if (!can("operational-state") && !can("admin-write")) return false;
    if (!configured) {
      if (queueOnFailure) queueSnapshot("system", data);
      emitStatus("cached", "Caché local; Supabase sin configurar");
      return false;
    }
    emitStatus("syncing", "Sincronizando...");
    try {
      if (can("admin-write")) {
        await upsert(TABLES.developments, developmentRows(data));
        await upsert(TABLES.works, workRows(data));
        await upsert(TABLES.contractors, scopedRows(data.contractors, {name:"name",status:"status"}));
      }
      await upsert(TABLES.workers, scopedRows(data.workers, {name:"name",status:"status",contractor_id:"contractorId"}));
      await Promise.all([
        upsert(TABLES.visitors, scopedRows(data.visitors, {visit_date:"date",name:"name"})),
        upsert(TABLES.attendance, attendanceRows(data), "work_id,attendance_date"),
        upsert(TABLES.investigations, scopedRows(data.investigations, {folio:"folio",event_date:"date"})),
        upsert(TABLES.histories, scopedRows(data.histories, {document_type:"type",document_date:"date",folio:"folio"})),
        upsert(TABLES.state, [{id:"global",payload:statePayload(data),updated_at:new Date().toISOString()}]),
        can("admin-write") ? upsert(TABLES.compliance, [{id:"global",payload:compliancePayload(data),updated_at:new Date().toISOString()}]) : Promise.resolve()
      ]);
      const pending = readJson(PENDING_KEY, {system:null,records:{}});
      pending.system = null;
      writeJson(PENDING_KEY, pending);
      emitStatus("synced", "Sincronizado con Supabase");
      return true;
    } catch (error) {
      if (queueOnFailure) queueSnapshot("system", data);
      emitStatus("error", "Error de sincronización; datos conservados localmente");
      console.error("Error al sincronizar el sistema con Supabase.", error);
      return false;
    }
  }

  function syncSystemData(data) {
    const snapshot = clone(data);
    syncChain = syncChain.then(() => performSystemSync(snapshot));
    return syncChain;
  }

  function scheduleSystemSync(data) {
    if (!can("operational-state") && !can("admin-write")) return;
    pendingSystemSnapshot = clone(data);
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      const snapshot = pendingSystemSnapshot;
      pendingSystemSnapshot = null;
      syncSystemData(snapshot);
    }, 500);
  }

  function recordRow(item) {
    return {
      ...baseRow(item), work_id:item.workId || "legacy", record_type:item.type || "otros",
      record_date:item.date || null, status:item.status || "", folio:item.folio || item.documentNumber || ""
    };
  }

  async function upsertRecord(item, queueOnFailure=true) {
    if (!item?.id) return false;
    if (!can("records-write")) return false;
    if (!configured) {
      if (queueOnFailure) queueSnapshot("record", clone(item));
      emitStatus("cached", "Caché local; Supabase sin configurar");
      return false;
    }
    emitStatus("syncing", "Sincronizando...");
    try {
      const prepared = await processRecordEvidence(item);
      await upsert(TABLES.records, [recordRow(prepared)]);
      if (prepared !== item) {
        const records = readJson(RECORDS_CACHE_KEY, []);
        const index = records.findIndex(record => record.id === prepared.id);
        if (index >= 0) { records[index] = prepared; writeJson(RECORDS_CACHE_KEY, records); }
      }
      const pending = readJson(PENDING_KEY, {system:null,records:{}});
      if (hasPendingEvidence(prepared)) pending.records[item.id] = prepared;
      else delete pending.records[item.id];
      writeJson(PENDING_KEY, pending);
      emitStatus("synced", "Sincronizado con Supabase");
      return true;
    } catch (error) {
      if (queueOnFailure) queueSnapshot("record", clone(item));
      emitStatus("error", "Error de sincronización; registro conservado localmente");
      console.error("Error al sincronizar el registro con Supabase.", error);
      return false;
    }
  }

  async function syncRecords(items, queueOnFailure=true) {
    if (!items?.length) return true;
    if (!can("records-write")) return false;
    if (!configured) {
      if (queueOnFailure) queueSnapshot("records", clone(items));
      return false;
    }
    try {
      const prepared = [];
      for (const item of items) prepared.push(await processRecordEvidence(item));
      await upsert(TABLES.records, prepared.map(recordRow));
      const records = readJson(RECORDS_CACHE_KEY, []);
      prepared.forEach(item => { const index=records.findIndex(record => record.id === item.id); if (index >= 0) records[index]=item; });
      writeJson(RECORDS_CACHE_KEY, records);
      const pending = readJson(PENDING_KEY, {system:null,records:{}});
      prepared.forEach(item => { if (hasPendingEvidence(item)) pending.records[item.id] = item; else delete pending.records[item.id]; });
      writeJson(PENDING_KEY, pending);
      emitStatus("synced", "Sincronizado con Supabase");
      return true;
    } catch (error) {
      if (queueOnFailure) queueSnapshot("records", clone(items));
      emitStatus("error", "Error de sincronización; registros conservados localmente");
      console.error("Error al sincronizar registros con Supabase.", error);
      return false;
    }
  }

  async function flushPending() {
    const pending = readJson(PENDING_KEY, {system:null,records:{}});
    if (pending.system) await performSystemSync(pending.system, false);
    const records = Object.values(pending.records || {});
    if (records.length) await syncRecords(records, false);
  }

  function payloads(rows) {
    return (rows || []).map(row => row.payload).filter(Boolean);
  }

  function hydrateSystem(local, remote) {
    const state = remote.state.find(row => row.id === "global")?.payload || {};
    const compliance = remote.compliance.find(row => row.id === "global")?.payload || {};
    const hydrated = {
      ...local,
      ...state,
      ...compliance,
      developments:payloads(remote.developments), works:remote.works.map(row => ({...(row.payload || {}),timezone:row.timezone || row.payload?.timezone || "America/Mazatlan"})),
      contractors:payloads(remote.contractors), workers:payloads(remote.workers),
      visitors:payloads(remote.visitors), investigations:payloads(remote.investigations),
      histories:payloads(remote.histories), attendance:{}
    };
    remote.attendance.forEach(row => {
      hydrated.attendance[`${row.work_id}|${row.attendance_date}`] = row.marks || row.payload?.marks || {};
    });
    return hydrated;
  }

  function hasLocalBusinessData(system, records) {
    return Boolean(records.length || system.works?.length || system.developments?.length || system.contractors?.length ||
      system.workers?.length || system.visitors?.length || system.investigations?.length || system.histories?.length ||
      Object.keys(system.attendance || {}).length);
  }

  async function loadRemote() {
    const [developments,works,contractors,workers,visitors,attendance,investigations,histories,records,state,compliance] = await Promise.all([
      selectAll(TABLES.developments), selectAll(TABLES.works), selectAll(TABLES.contractors), selectAll(TABLES.workers),
      selectAll(TABLES.visitors), selectAll(TABLES.attendance), selectAll(TABLES.investigations), selectAll(TABLES.histories),
      selectAll(TABLES.records), selectAll(TABLES.state), selectAll(TABLES.compliance)
    ]);
    return {developments,works,contractors,workers,visitors,attendance,investigations,histories,records,state,compliance};
  }

  async function loadAuthenticatedData() {
    try {
      await flushPending();
      const remote = await loadRemote();
      const localSystem = readJson(SYSTEM_CACHE_KEY, {});
      const localRecords = readJson(RECORDS_CACHE_KEY, []);
      const remoteCount = remote.developments.length + remote.works.length + remote.contractors.length + remote.workers.length +
        remote.visitors.length + remote.attendance.length + remote.investigations.length + remote.histories.length + remote.records.length;

      if (remoteCount === 0 && hasLocalBusinessData(localSystem, localRecords)) {
        if (!can("admin-write")) {
          emitStatus("error", "Un Administrador debe realizar la migración inicial");
          return {configured:true,authenticated:true,source:"cache",migrationPending:true};
        }
        await performSystemSync(localSystem);
        await syncRecords(localRecords);
        emitStatus("synced", "Datos locales migrados a Supabase");
        return {configured:true,authenticated:true,source:"local-migration"};
      }

      if (remoteCount > 0 || remote.state.length || remote.compliance.length) {
        writeJson(SYSTEM_CACHE_KEY, hydrateSystem(localSystem, remote));
        writeJson(RECORDS_CACHE_KEY, payloads(remote.records));
      }
      emitStatus("synced", "Datos cargados desde Supabase");
      return {configured:true,authenticated:true,source:"supabase"};
    } catch (error) {
      emitStatus("error", "Supabase no disponible; usando caché local");
      console.error("No fue posible cargar datos desde Supabase.", error);
      return {configured:true,authenticated:true,source:"cache",error};
    }
  }

  async function restoreSession() {
    currentSession = readJson(SESSION_KEY, null);
    if (!currentSession) {
      clearSensitiveCache();
      return false;
    }
    try {
      await ensureFreshSession();
      const user = await authRequest("user", {token:currentSession.access_token});
      currentSession.user = user;
      saveSession(currentSession);
      await loadProfile();
      return true;
    } catch (error) {
      const cachedProfile=currentSession?.gravi_profile,tokenStillValid=Number(currentSession?.expires_at||0)>Math.floor(Date.now()/1000);
      if ((!error.status||error.status>=500)&&cachedProfile?.active&&tokenStillValid) {
        currentProfile=cachedProfile;
        emitStatus("cached","Sin conexión; sesión y datos en caché");
        return true;
      }
      console.warn("La sesión guardada ya no es válida.", error);
      currentSession = null;
      currentProfile = null;
      localStorage.removeItem(SESSION_KEY);
      clearSensitiveCache();
      return false;
    }
  }

  async function bootstrap() {
    emitStatus("syncing", "Preparando acceso seguro...");
    if (!readJson(SESSION_KEY, null)) clearSensitiveCache();
    if (!await ensureConfigured()) {
      emitStatus("error", "Supabase sin configurar");
      return {configured:false,authenticated:false};
    }
    if (!await restoreSession()) return {configured:true,authenticated:false};
    const result = await loadAuthenticatedData();
    await prepareDailyReports();
    return result;
  }

  async function login(email, password) {
    if (!await ensureConfigured()) throw new Error("Supabase no est\u00e1 configurado en este despliegue.");
    const session = await authRequest("token?grant_type=password", {method:"POST",body:{email:String(email||"").trim(),password:String(password||"")}});
    saveSession(session);
    try {
      await loadProfile();
      await loadAuthenticatedData();
      await prepareDailyReports();
      return {user:currentSession.user,profile:currentProfile};
    } catch (error) {
      currentSession = null;
      currentProfile = null;
      localStorage.removeItem(SESSION_KEY);
      clearSensitiveCache();
      throw error;
    }
  }

  async function logout() {
    try { if (configured && currentSession?.access_token) await authRequest("logout", {method:"POST",token:currentSession.access_token}); }
    catch (error) { console.warn("La sesión remota ya estaba cerrada.", error); }
    currentSession = null;
    currentProfile = null;
    localStorage.removeItem(SESSION_KEY);
    clearPasswordSetupPending();
    clearSensitiveCache();
  }

  async function updatePassword(password) {
    if (!await ensureConfigured()) throw new Error("Supabase no est\u00e1 configurado en este despliegue.");
    await ensureFreshSession();
    const user = await authRequest("user", {method:"PUT",token:currentSession.access_token,body:{password}});
    currentSession.user = user;
    saveSession(currentSession);
    return {user:currentSession.user};
  }

  async function loadCurrentProfileAndData() {
    await loadProfile();
    await loadAuthenticatedData();
    await prepareDailyReports();
    return {user:currentSession.user,profile:currentProfile};
  }

  async function listProfiles() {
    if (!can("admin-write") && !canPermission("users.edit") && !canPermission("users.manage_permissions") && !canPermission("users.invite")) throw new Error("Tu rol no permite consultar usuarios.");
    const rows = await request(TABLES.profiles, {query:"?select=*&order=full_name.asc"});
    const migrated = [];
    for (const profile of rows) {
      const fallback = fallbackPermissionSettingsFor(profile);
      if (fallback && can("admin-write")) {
        const settings = normalizePermissionSettings(fallback);
        try {
          await request(TABLES.profiles, {method:"PATCH",query:`?user_id=eq.${encodeURIComponent(profile.user_id)}`,headers:{"Prefer":"return=minimal"},body:{...settings,updated_at:new Date().toISOString()},returnMinimal:true});
          removeMigratedLocalPermissions(profile.user_id, profile.email);
          migrated.push({...profile, ...settings});
          continue;
        } catch (error) {
          console.warn("No fue posible migrar permisos locales a Supabase.", error);
        }
      }
      const settings = permissionSettingsFor(profile);
      migrated.push({...profile, ...settings});
    }
    return migrated;
  }

  async function updateProfile(userId, role, active, permissionSettings=null) {
    if (!can("admin-write") && !canPermission("users.edit")) throw new Error("Tu rol no permite modificar usuarios.");
    if (permissionSettings && !can("admin-write") && !canPermission("users.manage_permissions")) throw new Error("Tu rol no permite editar permisos.");
    if (userId === currentSession.user.id && (role !== "Administrador" || !active)) throw new Error("No puedes retirar tu propio acceso de Administrador.");
    const settings = permissionSettings ? normalizePermissionSettings(permissionSettings) : null;
    const body = {role,active,updated_at:new Date().toISOString(),...(settings || {})};
    await request(TABLES.profiles, {method:"PATCH",query:`?user_id=eq.${encodeURIComponent(userId)}`,headers:{"Prefer":"return=minimal"},body,returnMinimal:true});
    removeMigratedLocalPermissions(userId);
    if (currentProfile?.user_id === userId) currentProfile = {...currentProfile, ...body};
  }

  async function inviteUser({email,fullName,role,permissions=null}) {
    if (!can("admin-write") && !canPermission("users.invite")) throw new Error("Tu rol no permite invitar usuarios.");
    const settings = permissions ? normalizePermissionSettings(permissions) : {permissions_mode:"role-default", custom_permissions:{}};
    const response = await fetch("./api/invite-user", {method:"POST",headers:{"Authorization":`Bearer ${currentSession.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({email,fullName,role,permissions:settings})});
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorText = String(payload.error || "");
      const redirectDenied = /redirect|redirecci|uri|url/i.test(errorText) && /allow|permit|not allowed|invalid/i.test(errorText);
      throw new Error(redirectDenied ? "La URL de redirecci\u00f3n no est\u00e1 permitida en Supabase. Verifica Authentication > URL Configuration." : (payload.error || "No fue posible enviar la invitaci\u00f3n."));
    }
    removeMigratedLocalPermissions("", email);
    return payload;
  }

  function dynamicFormatsCache() {
    return readJson(DYNAMIC_FORMATS_CACHE_KEY, {formats:[],records:[]});
  }

  function writeDynamicFormatsCache(cache) {
    writeJson(DYNAMIC_FORMATS_CACHE_KEY, {formats:cache.formats || [], records:cache.records || []});
  }

  function queueDynamicFormatOperation(type, payload) {
    const pending = readJson(DYNAMIC_FORMATS_PENDING_KEY, []);
    pending.push({id:crypto.randomUUID(),type,payload,queuedAt:new Date().toISOString()});
    writeJson(DYNAMIC_FORMATS_PENDING_KEY, pending);
  }

  function dynamicFormatResult(data, extra={}) {
    return {success:true, source:"local-placeholder", data, ...extra};
  }

  async function listDynamicFormats(filters={}) {
    const cache = dynamicFormatsCache();
    let formats = cache.formats.filter(item => !item.deletedAt);
    if (filters.workId) formats = formats.filter(item => !item.workId || item.workId === filters.workId);
    if (filters.category) formats = formats.filter(item => item.category === filters.category || item.category_id === filters.category);
    if (filters.status) formats = formats.filter(item => item.status === filters.status);
    return dynamicFormatResult(formats);
  }

  async function getDynamicFormat(id) {
    const format = dynamicFormatsCache().formats.find(item => item.id === id && !item.deletedAt) || null;
    return dynamicFormatResult(format);
  }

  async function saveDynamicFormat(payload={}) {
    if (!can("admin-write")) return {success:false,error:"Solo un Administrador puede guardar formatos."};
    const cache = dynamicFormatsCache();
    const now = new Date().toISOString();
    const item = {...payload,id:payload.id || crypto.randomUUID(),createdAt:payload.createdAt || now,updatedAt:now};
    cache.formats = cache.formats.filter(format => format.id !== item.id);
    cache.formats.unshift(item);
    writeDynamicFormatsCache(cache);
    queueDynamicFormatOperation("saveFormat", item);
    return dynamicFormatResult(item, {formatId:item.id});
  }

  async function deleteDynamicFormat(id) {
    if (!can("admin-write")) return {success:false,error:"Solo un Administrador puede eliminar formatos."};
    const cache = dynamicFormatsCache();
    const item = cache.formats.find(format => format.id === id);
    if (item) {
      item.deletedAt = new Date().toISOString();
      item.updatedAt = item.deletedAt;
      writeDynamicFormatsCache(cache);
    }
    queueDynamicFormatOperation("deleteFormat", {id});
    return dynamicFormatResult(null);
  }

  async function createDynamicFormatRecord(payload={}) {
    if (!can("field-write")) return {success:false,error:"Tu rol no permite crear registros de formatos."};
    const cache = dynamicFormatsCache();
    const now = new Date().toISOString();
    const item = {...payload,id:payload.id || crypto.randomUUID(),createdAt:payload.createdAt || now,updatedAt:now};
    cache.records.unshift(item);
    writeDynamicFormatsCache(cache);
    queueDynamicFormatOperation("createRecord", item);
    return dynamicFormatResult(item, {recordId:item.id});
  }

  async function updateDynamicFormatRecord(id, updates={}) {
    if (!can("field-write")) return {success:false,error:"Tu rol no permite actualizar registros de formatos."};
    const cache = dynamicFormatsCache();
    const item = cache.records.find(record => record.id === id);
    if (item) Object.assign(item, updates, {updatedAt:new Date().toISOString()});
    writeDynamicFormatsCache(cache);
    queueDynamicFormatOperation("updateRecord", {id,updates});
    return dynamicFormatResult(item || null);
  }

  async function flushDynamicFormatsPending() {
    return {success:true, source:"local-placeholder", pending:readJson(DYNAMIC_FORMATS_PENDING_KEY, []).length};
  }

  function normalizeDailyReportStatus(value) {
    const status = String(value || "draft");
    if (status === "Borrador") return "draft";
    if (status === "Cerrado") return "closed_manual";
    return status;
  }

  function dailyReportIdentity(item={}) {
    const workId = item.workId || item.work_id || "";
    const date = item.date || item.log_date || "";
    const shift = item.shift || "Matutino";
    return `${workId}|${date}|${shift}`;
  }

  function dailyReportFromRow(row={}) {
    const payload = row.payload && typeof row.payload === "object" ? clone(row.payload) : {};
    return {
      ...payload,
      id:row.id || payload.id || dailyReportIdentity({...payload,workId:row.work_id,date:row.log_date,shift:row.shift}),
      workId:row.work_id || payload.workId || "",
      developmentId:row.development_id || payload.developmentId || "",
      date:row.log_date || payload.date || "",
      shift:row.shift || payload.shift || "Matutino",
      timezone:row.timezone || payload.timezone || "America/Mazatlan",
      status:normalizeDailyReportStatus(row.status || payload.status),
      supervisorId:row.supervisor_id || payload.supervisorId || "",
      supervisorName:row.supervisor_name || payload.supervisorName || payload.supervisor || "",
      supervisor:row.supervisor_name || payload.supervisor || "",
      folio:row.folio || payload.folio || "",
      openedAt:row.opened_at || payload.openedAt || row.created_at || "",
      closedAt:row.closed_at || payload.closedAt || "",
      closeType:row.close_type || payload.closeType || "",
      version:Number(row.version || payload.version || 1),
      automaticData:row.automatic_data || payload.automaticData || {},
      automaticSnapshot:row.automatic_snapshot || payload.automaticSnapshot || null,
      manualData:row.manual_data || payload.manualData || {},
      missingFields:row.missing_fields || payload.missingFields || [],
      completenessPercentage:Number(row.completeness_percentage || payload.completenessPercentage || 0),
      completenessStatus:row.completeness_status || payload.completenessStatus || "incomplete",
      requiresReview:Boolean(row.requires_review || payload.requiresReview),
      autoClosed:Boolean(row.auto_closed || payload.autoClosed),
      validatedBy:row.validated_by || payload.validatedBy || "",
      validatedAt:row.validated_at || payload.validatedAt || "",
      reopenedBy:row.reopened_by || payload.reopenedBy || "",
      reopenedAt:row.reopened_at || payload.reopenedAt || "",
      reopenReason:row.reopen_reason || payload.reopenReason || "",
      annulledBy:row.annulled_by || payload.annulledBy || "",
      annulledAt:row.annulled_at || payload.annulledAt || "",
      annulReason:row.annul_reason || payload.annulReason || "",
      closureNote:row.closure_note || payload.closureNote || "",
      remoteSyncedAt:row.updated_at || new Date().toISOString(),
      persistenceVersion:2
    };
  }

  function dailyReportCache() {
    const rows = readJson(dailyReportsStorageKey(), []);
    return Array.isArray(rows) ? rows : [];
  }

  function dailyReportsStorageKey() {
    const userId = currentSession?.user?.id || currentProfile?.user_id || "";
    return userId ? `${DAILY_REPORTS_CACHE_KEY}:${userId}` : DAILY_REPORTS_CACHE_KEY;
  }

  function dailyReportsMigrationKey() {
    const userId = currentSession?.user?.id || currentProfile?.user_id || "";
    return userId ? `${DAILY_REPORTS_MIGRATION_KEY}:${userId}` : DAILY_REPORTS_MIGRATION_KEY;
  }

  function writeDailyReportCache(rows) {
    const unique = new Map();
    (rows || []).forEach(item => unique.set(dailyReportIdentity(item), item));
    writeJson(dailyReportsStorageKey(), [...unique.values()].sort((a,b) => String(b.date || "").localeCompare(String(a.date || ""))));
  }

  function dailyReportPendingStore() {
    const pending = readJson(PENDING_KEY, {system:null,records:{},dailyReports:{}});
    pending.dailyReports ||= {};
    return pending;
  }

  function unwrapDailyReportResponse(result) {
    if (Array.isArray(result)) return unwrapDailyReportResponse(result[0] || null);
    if (result && typeof result === "object" && (result.data || result.result)) return unwrapDailyReportResponse(result.data || result.result);
    return result && typeof result === "object" ? result : null;
  }

  function dailyReportQueueKey(item) {
    const userId = currentSession?.user?.id || currentProfile?.user_id || "anonymous";
    return `${userId}|${dailyReportIdentity(item)}`;
  }

  async function findRemoteDailyReport(item) {
    if (!configured || !currentSession?.access_token) return null;
    const params = `?work_id=eq.${encodeURIComponent(item.workId || item.work_id)}&log_date=eq.${encodeURIComponent(item.date || item.log_date)}&shift=eq.${encodeURIComponent(item.shift || "Matutino")}&select=*`;
    const rows = await request(`${TABLES.dailyReports}${params}`, {method:"GET"});
    return dailyReportFromRow(unwrapDailyReportResponse(rows));
  }

  function cacheDailyReport(item) {
    const rows = dailyReportCache().filter(row => dailyReportIdentity(row) !== dailyReportIdentity(item));
    rows.unshift(item);
    writeDailyReportCache(rows);
  }

  function queueDailyReport(item, mutationId) {
    const pending = dailyReportPendingStore();
    pending.dailyReports[dailyReportQueueKey(item)] = {mutationId,userId:currentSession?.user?.id || currentProfile?.user_id || null,item:clone(item),queuedAt:new Date().toISOString()};
    writeJson(PENDING_KEY, pending);
  }

  function clearQueuedDailyReport(item, mutationId) {
    const pending = dailyReportPendingStore();
    const key = dailyReportQueueKey(item);
    if (pending.dailyReports[key]?.mutationId === mutationId) delete pending.dailyReports[key];
    writeJson(PENDING_KEY, pending);
  }

  async function refreshDailyReports() {
    if (!configured || !currentSession?.access_token) return dailyReportCache();
    try {
      const rows = await selectAll(TABLES.dailyReports);
      const remote = rows.map(dailyReportFromRow);
      const userId = currentSession?.user?.id || currentProfile?.user_id || null;
      const pending = Object.fromEntries(Object.entries(dailyReportPendingStore().dailyReports).filter(([, entry]) => entry.userId === userId));
      const pendingRows = Object.values(pending).map(entry => entry.item);
      const pendingKeys = new Set(pendingRows.map(dailyReportIdentity));
      writeDailyReportCache([...pendingRows, ...remote.filter(item => !pendingKeys.has(dailyReportIdentity(item)))]);
      return dailyReportCache();
    } catch (error) {
      console.warn("Registro Diario remoto no disponible; se conserva la cach\u00e9 local.", error);
      return dailyReportCache();
    }
  }

  async function saveDailyReportDraft(item, options={}) {
    const report = {...clone(item),shift:item.shift || "Matutino",timezone:item.timezone || "America/Mazatlan",status:"draft"};
    report.id = report.id && String(report.id).split("|").length >= 3 ? report.id : dailyReportIdentity(report);
    const mutationId = crypto.randomUUID();
    cacheDailyReport({...report,syncState:"pending"});
    queueDailyReport(report, mutationId);
    if (!configured || !currentSession?.access_token) {
      emitStatus("cached", "Pendiente de sincronizaci\u00f3n");
      return {success:false,pending:true,report};
    }
    emitStatus("syncing", "Guardando Registro Diario...");
    try {
      const result = await request("rpc/save_daily_report_draft", {
        method:"POST",
        body:{p_report:report,p_expected_version:options.expectedVersion ?? report.version ?? null}
      });
      let canonical = dailyReportFromRow(unwrapDailyReportResponse(result));
      if (!canonical || !canonical.id || !canonical.date) canonical = await findRemoteDailyReport(report);
      if (!canonical) throw new Error("Supabase no devolvió el Registro Diario canónico.");
      cacheDailyReport({...canonical,syncState:"saved"});
      clearQueuedDailyReport(report, mutationId);
      emitStatus("synced", "Guardado en Supabase");
      return {success:true,pending:false,report:canonical};
    } catch (error) {
      const conflict = /conflict|version|409/i.test(String(error?.message || error));
      emitStatus(conflict ? "conflict" : "error", conflict ? "Existe una versión más reciente" : "No se pudo sincronizar el Registro Diario");
      console.warn("[Registro Diario] sincronización fallida", {work_id:report.workId,date:report.date,shift:report.shift,conflict});
      return {success:false,pending:true,report,error};
    }
  }

  async function closeDailyReportManual(item) {
    if (!configured || !currentSession?.access_token) throw new Error("El cierre oficial requiere conexi\u00f3n con Supabase.");
    const draft = await saveDailyReportDraft({...item,status:"draft"},{expectedVersion:item.version ?? null});
    if (!draft.success) throw draft.error || new Error("No fue posible sincronizar el borrador antes del cierre.");
    const result = await request("rpc/close_daily_report_manual", {
      method:"POST",
      body:{p_report_id:draft.report.id,p_expected_version:draft.report.version}
    });
    const canonical = dailyReportFromRow(Array.isArray(result) ? result[0] : result);
    cacheDailyReport({...canonical,syncState:"saved"});
    return canonical;
  }

  async function confirmDailyReportAutomatic(item) {
    if (!configured || !currentSession?.access_token) throw new Error("La validación requiere conexión con Supabase.");
    const result = await request("rpc/confirm_daily_report_automatic", {
      method:"POST",
      body:{p_report_id:item.id,p_expected_version:item.version}
    });
    const canonical = dailyReportFromRow(Array.isArray(result) ? result[0] : result);
    cacheDailyReport({...canonical,syncState:"saved"});
    return canonical;
  }

  async function flushDailyReportPending() {
    const userId = currentSession?.user?.id || currentProfile?.user_id || null;
    const entries = Object.values(dailyReportPendingStore().dailyReports).filter(entry => entry.userId === userId);
    for (const entry of entries) await saveDailyReportDraft(entry.item,{expectedVersion:entry.item.version ?? null});
    return {pending:Object.keys(dailyReportPendingStore().dailyReports).length};
  }

  async function migrateLegacyDailyReports() {
    if (!configured || !currentSession?.access_token) return {migrated:0,pending:true};
    const previousMigration = readJson(dailyReportsMigrationKey(), null);
    if (previousMigration?.completedAt) return {migrated:0,pending:false,skipped:true};
    const legacyCache = currentProfile?.role === "Administrador" && dailyReportsStorageKey() !== DAILY_REPORTS_CACHE_KEY
      ? readJson(DAILY_REPORTS_CACHE_KEY, [])
      : [];
    const legacy = (Array.isArray(legacyCache) ? legacyCache : []).filter(item => Number(item.persistenceVersion || 0) < 2);
    let migrated = 0;
    for (const item of legacy) {
      try {
        const result = await request("rpc/import_legacy_daily_report", {method:"POST",body:{p_report:item}});
        cacheDailyReport(dailyReportFromRow(Array.isArray(result) ? result[0] : result));
        migrated++;
      } catch (error) {
        console.warn("Registro Diario heredado pendiente de migraci\u00f3n.", error);
      }
    }
    if (!legacy.length || migrated === legacy.length) writeJson(dailyReportsMigrationKey(),{completedAt:new Date().toISOString(),migrated,source:"legacy-unscoped",userId:currentSession?.user?.id||""});
    return {migrated,pending:migrated !== legacy.length};
  }

  async function prepareDailyReports() {
    await migrateLegacyDailyReports();
    await flushDailyReportPending();
    await refreshDailyReports();
  }

  const dailyReports = Object.freeze({
    list:() => clone(dailyReportCache()),
    get:(workId,date,shift="Matutino") => clone(dailyReportCache().find(item => dailyReportIdentity(item) === dailyReportIdentity({workId,date,shift})) || null),
    refresh:refreshDailyReports,
    saveDraft:saveDailyReportDraft,
    closeManual:closeDailyReportManual,
    confirmAutomatic:confirmDailyReportAutomatic,
    migrateLegacy:migrateLegacyDailyReports,
    flushPending:flushDailyReportPending,
    getSyncStatus:(item=null) => {
      const userId = currentSession?.user?.id || currentProfile?.user_id || null;
      const entries = Object.values(dailyReportPendingStore().dailyReports).filter(entry => entry.userId === userId);
      const active = item ? entries.find(entry => dailyReportIdentity(entry.item) === dailyReportIdentity(item)) : null;
      return {pending:entries.length,status:active ? {state:"queued_offline",message:"Pendiente de sincronización"} : {...lastStatus}};
    }
  });

  global.addEventListener("online", () => {
    if (currentSession && configured) prepareDailyReports().catch(error => console.warn("Sincronizaci\u00f3n de Registro Diario pendiente.", error));
  });

  const dynamicFormats = Object.freeze({
    listFormats:listDynamicFormats,
    getFormat:getDynamicFormat,
    saveFormat:saveDynamicFormat,
    deleteFormat:deleteDynamicFormat,
    createRecord:createDynamicFormatRecord,
    updateRecord:updateDynamicFormatRecord,
    flushPending:flushDynamicFormatsPending
  });

  function workPermitRow(item={}) {
    return {id:item.remoteId||item.id,folio:item.folio,workflow_mode:item.workflowMode||"supervisor_direct",contractor_responsible:item.contractorResponsible||"",contractor_role:item.contractorRole||"",prepared_by_supervisor:item.preparedBySupervisor||"",authorized_by_supervisor:item.authorizedBySupervisor||"",contractor_user_id:item.contractorUserId||null,contractor_acknowledgement:item.contractorAcknowledgement||null,contractor_signature:item.contractorSignature||null,contractor_signed_at:item.contractorSignedAt||null,contractor_request_status:item.contractorRequestStatus||null,development_name:item.developmentName||"",work_name:item.workName||"",contractor_name:item.contractorName||"",resident_name:item.residentName||"",requester_name:item.requesterName||"",activity:item.activity||"",description:item.description||"",execution_area:item.executionArea||"",worker_count:Number(item.workerCount||0),prepared_at:item.preparedAt||new Date().toISOString(),starts_at:item.startsAt||null,ends_at:item.endsAt||null,status:item.status||"draft",max_risk_level:item.maxRisk||"minimum",max_residual_risk_level:item.maxResidualRisk||"minimum",work_types:item.workTypes||[],activity_controls:item.controls||{},hazards:item.hazards||[],ppe:item.ppe||[],additional_equipment:[...(item.equipment||[]),...(item.otherEquipment?[item.otherEquipment]:[])],preventive_measures:item.preventive||[],participants:item.participants||[],additional_requirements:item.additionalRequirements||"",extensions:item.extensions||[],document_code:item.documentCode||"GVC-SSH-FMT-002",form_version:item.formVersion||"00",revision:Number(item.version||1),client_mutation_id:item.clientMutationId||item.id};
  }
  function workPermitFromRow(row={}) {
    return {id:row.id,remoteId:row.id,clientMutationId:row.client_mutation_id||row.id,folio:row.folio,workflowMode:row.workflow_mode||"supervisor_direct",contractorResponsible:row.contractor_responsible,contractorRole:row.contractor_role,preparedBySupervisor:row.prepared_by_supervisor,authorizedBySupervisor:row.authorized_by_supervisor,contractorUserId:row.contractor_user_id,contractorAcknowledgement:row.contractor_acknowledgement,contractorSignature:row.contractor_signature,contractorSignedAt:row.contractor_signed_at,contractorRequestStatus:row.contractor_request_status,developmentName:row.development_name,workName:row.work_name,contractorName:row.contractor_name,residentName:row.resident_name,requesterName:row.requester_name,activity:row.activity,description:row.description,executionArea:row.execution_area,workerCount:row.worker_count,preparedAt:row.prepared_at,startsAt:row.starts_at,endsAt:row.ends_at,status:row.status,maxRisk:row.max_risk_level,maxResidualRisk:row.max_residual_risk_level,workTypes:row.work_types||[],controls:row.activity_controls||{},hazards:row.hazards||[],ppe:row.ppe||[],equipment:row.additional_equipment||[],preventive:row.preventive_measures||[],participants:row.participants||[],additionalRequirements:row.additional_requirements||"",extensions:row.extensions||[],documentCode:row.document_code,formVersion:row.form_version,version:Number(row.revision||1),authorizedSnapshot:row.authorized_snapshot,pdfUrl:row.pdf_url,remoteUpdatedAt:row.updated_at,syncState:"synced"};
  }
  async function listWorkPermits() {
    if (!configured || !currentSession?.access_token) return [];
    const rows=await request(TABLES.workPermits,{query:"?select=*&order=updated_at.desc"});
    return (rows||[]).map(workPermitFromRow);
  }
  async function upsertWorkPermit(item, expectedUpdatedAt=null) {
    if (!configured || !currentSession?.access_token) throw new Error("La sincronización requiere una sesión activa.");
    if (expectedUpdatedAt && item.remoteId) {
      const current=await request(TABLES.workPermits,{query:`?id=eq.${encodeURIComponent(item.remoteId)}&select=updated_at`});
      if (current?.[0]?.updated_at && current[0].updated_at!==expectedUpdatedAt) { const error=new Error("Conflicto: el permiso remoto fue modificado.");error.code="WORK_PERMIT_CONFLICT";throw error; }
    }
    const rows=await request(TABLES.workPermits,{method:"POST",query:"?on_conflict=client_mutation_id",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:workPermitRow(item)});
    return workPermitFromRow(Array.isArray(rows)?rows[0]:rows);
  }
  async function transitionWorkPermit(id,toStatus,observations="") {
    if (!configured || !currentSession?.access_token) throw new Error("La transición requiere conexión y sesión activa.");
    const rows=await request("rpc/transition_work_permit",{method:"POST",body:{p_permit_id:id,p_to_status:toStatus,p_observations:observations}});
    return workPermitFromRow(Array.isArray(rows)?rows[0]:rows);
  }
  async function uploadWorkPermitFile({permitId,workId,type,fileName,mimeType,data}) {
    if (!configured || !currentSession?.access_token) throw new Error("La carga requiere conexión y sesión activa.");
    const safeType=String(type||"general").replace(/[^a-z0-9_-]/gi,"_");
    const safeName=String(fileName||`${crypto.randomUUID()}.jpg`).replace(/[^a-z0-9._-]/gi,"_");
    const storagePath=`work-permits/${workId||"unassigned"}/${permitId}/${safeType}/${crypto.randomUUID()}-${safeName}`;
    const response=await fetch(`${config.url}/storage/v1/object/evidencias/${storagePath}`,{method:"POST",headers:{Authorization:`Bearer ${currentSession.access_token}`,apikey:config.anonKey,"Content-Type":mimeType||"application/octet-stream","x-upsert":"false"},body:data});
    if(!response.ok)throw new Error(await response.text()||"No fue posible cargar la evidencia.");
    return storagePath;
  }
  async function saveWorkPermitEvidence(metadata) {
    const rows=await request("work_permit_evidence",{method:"POST",headers:{Prefer:"return=representation"},body:{permit_id:metadata.permitId,control_key:metadata.controlKey||null,evidence_type:metadata.type,storage_path:metadata.storagePath,caption:metadata.caption||"",metadata:metadata.metadata||{},created_by:currentSession.user.id}});
    return Array.isArray(rows)?rows[0]:rows;
  }
  const workPermits=Object.freeze({list:listWorkPermits,upsert:upsertWorkPermit,transition:transitionWorkPermit,uploadFile:uploadWorkPermitFile,saveEvidence:saveWorkPermitEvidence});
  async function uploadDocumentSignature(item) {
    if (!configured || !currentSession?.access_token) throw new Error("La firma requiere conexión y sesión activa.");
    const safe=value=>String(value||"unknown").replace(/[^a-z0-9_-]/gi,"_");
    const storagePath=`${safe(item.documentType)}/${safe(item.documentId)}/v${safe(item.documentVersion)}/${safe(item.signatureSlot)}/${item.clientUuid}.png`;
    const uploaded=await fetch(`${config.url}/storage/v1/object/document-signatures/${storagePath}`,{method:"POST",headers:{Authorization:`Bearer ${currentSession.access_token}`,apikey:config.anonKey,"Content-Type":"image/png","x-upsert":"false"},body:item.blob});
    if(!uploaded.ok&&!/already exists/i.test(await uploaded.text()))throw new Error("No fue posible cargar la firma manuscrita.");
    const body={client_uuid:item.clientUuid,document_type:item.documentType,document_id:item.documentId,document_version:item.documentVersion,signature_slot:item.signatureSlot,signer_type:item.signerType,signer_user_id:item.signerUserId,signer_name:item.signerName,signer_position:item.signerPosition,signer_company:item.signerCompany,signer_role_label:item.signerRoleLabel,signature_storage_path:storagePath,strokes_data:item.strokesData,acceptance_text:item.acceptanceText,acceptance_confirmed:item.acceptanceConfirmed,signed_at:item.signedAt,captured_by_user_id:item.capturedByUserId,captured_in_presence_of_user_id:item.capturedInPresenceOfUserId,document_content_hash:item.documentContentHash,document_status_at_signing:item.documentStatusAtSigning,signature_status:"valid"};
    const rows=await request("document_signatures",{method:"POST",query:"?on_conflict=client_uuid",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body});const signature=Array.isArray(rows)?rows[0]:rows;
    await request("document_signature_events",{method:"POST",headers:{Prefer:"return=minimal"},returnMinimal:true,body:{signature_id:signature.id,event_type:"sync_completed",details:{storage_path:storagePath},actor_user_id:currentSession.user.id}});
    return signature;
  }
  async function listDocumentSignatures(documentType,documentId){if(!configured||!currentSession?.access_token)return[];return request("document_signatures",{query:`?document_type=eq.${encodeURIComponent(documentType)}&document_id=eq.${encodeURIComponent(documentId)}&select=*&order=signed_at.asc`})}
  async function invalidateDocumentSignatures(documentType,documentId,documentVersion,reason){return request("rpc/invalidate_document_signatures",{method:"POST",body:{p_document_type:documentType,p_document_id:documentId,p_document_version:documentVersion,p_reason:reason}})}
  async function signedSignatureUrl(path,expiresIn=900){const response=await fetch(`${config.url}/storage/v1/object/sign/document-signatures/${path}`,{method:"POST",headers:{Authorization:`Bearer ${currentSession.access_token}`,apikey:config.anonKey,"Content-Type":"application/json"},body:JSON.stringify({expiresIn})});if(!response.ok)throw new Error("No fue posible consultar la firma.");const data=await response.json();return`${config.url}/storage/v1${data.signedURL}`}
  const signatures=Object.freeze({upload:uploadDocumentSignature,list:listDocumentSignatures,invalidate:invalidateDocumentSignatures,signedUrl:signedSignatureUrl});

  global.GraviSupabase = {
    bootstrap, login, logout, scheduleSystemSync, syncSystemData, upsertRecord, syncRecords,
    listProfiles, updateProfile, inviteUser, updatePassword, loadCurrentProfileAndData, processAuthRedirect, resumePasswordSetup, clearPasswordSetupPending, clearAuthRedirectUrl, hasAuthRedirect, can, canPermission, dynamicFormats, dailyReports, workPermits, signatures,
    permissionGroups:() => clone(PERMISSION_GROUPS),
    roleDefaultPermissions:role => permissionDefaults(role),
    getProfilePermissions:profile => ({settings:permissionSettingsFor(profile || currentProfile || {}), effective:effectivePermissions(profile || currentProfile || {})}),
    isConfigured:() => configured, isAuthenticated:() => Boolean(currentSession && currentProfile),
    getStatus:() => ({...lastStatus}), getUser:() => currentSession?.user || null,
    getProfile:() => currentProfile ? {...currentProfile} : null
  };
})(window);
