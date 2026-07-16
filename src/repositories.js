(function createGraviRepositories(global) {
  "use strict";

  const SYSTEM_KEY = "gvc-ops-system-v1";
  const RECORDS_KEY = "gvc-extintores-records-v1";
  const DYNAMIC_FORMATS_KEY = "gvc-dynamic-formats-v1";
  const DAILY_REPORTS_KEY = "gvc-daily-log-v1";
  const PREVENTIVE_CONTROLS_KEY = "gvc-preventive-controls-v2";
  const PREVENTIVE_EVIDENCE_KEY = "gvc-preventive-evidence-v2";
  const WORK_EVIDENCE_KEY = "gvc-work-evidence-v1";

  const emptySystem = Object.freeze({
    works: [],
    developments: [],
    contractors: [],
    workers: [],
    visitors: [],
    attendance: {},
    histories: [],
    investigations: [],
    compliance: {},
    activity: [],
    auditLog: []
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readJson(key, fallback) {
    try {
      const value = global.localStorage?.getItem(key);
      return value ? JSON.parse(value) : clone(fallback);
    } catch {
      return clone(fallback);
    }
  }

  function systemData() {
    return Object.assign(clone(emptySystem), readJson(SYSTEM_KEY, {}));
  }

  function recordsData() {
    return readJson(RECORDS_KEY, []);
  }

  function dynamicFormatsData() {
    return readJson(DYNAMIC_FORMATS_KEY, {formats: [], records: []});
  }

  function dailyReportsData() {
    const userId = global.GraviSupabase?.getUser?.()?.id || global.GraviSupabase?.getProfile?.()?.user_id || "";
    const rows = readJson(userId ? `${DAILY_REPORTS_KEY}:${userId}` : DAILY_REPORTS_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function dailyReportIdentity(item={}) {
    return `${item.workId || item.work_id || ""}|${item.date || item.log_date || ""}|${item.shift || "Matutino"}`;
  }

  function byId(list, id) {
    return list.find(item => item && item.id === id) || null;
  }

  function safeFilter(list, predicate) {
    if (typeof predicate !== "function") return list;
    try {
      return list.filter(predicate);
    } catch {
      return [];
    }
  }

  function readonlyList(getter) {
    return Object.freeze({
      list() {
        return clone(getter());
      },
      getById(id) {
        return clone(byId(getter(), id));
      },
      filter(predicate) {
        return clone(safeFilter(getter(), predicate));
      }
    });
  }

  function localEntityRepository(key,remoteName) {
    const rows=()=>{const value=readJson(key,[]);return Array.isArray(value)?value:[];};
    const write=value=>global.localStorage?.setItem(key,JSON.stringify(value));
    const saveLocal=item=>{const next=rows().filter(row=>row.id!==item.id&&row.client_uuid!==item.client_uuid);next.unshift(clone(item));write(next);return clone(item);};
    return Object.freeze({
      list(filters={}) { return clone(rows().filter(item=>!item.deleted_at&&(!filters.workId||item.work_id===filters.workId||item.workId===filters.workId)&&(!filters.status||item.status===filters.status))); },
      get(id) { return clone(rows().find(item=>item.id===id||item.client_uuid===id)||null); },
      async create(item) { const local=saveLocal({...item,id:item.id||global.crypto?.randomUUID?.()||`local-${Date.now()}`,client_uuid:item.client_uuid||global.crypto?.randomUUID?.()||`client-${Date.now()}`,sync_status:"pending",created_at:item.created_at||new Date().toISOString(),updated_at:new Date().toISOString()});if(global.navigator?.onLine&&global.GraviSupabase?.isAuthenticated?.()&&global.GraviSupabase?.[remoteName]){try{const remote=await global.GraviSupabase[remoteName].create(local);return saveLocal({...local,...remote,sync_status:"synced"});}catch(error){console.error(`[GraviRepositories:${remoteName}:create]`,error);return saveLocal({...local,sync_status:"error",sync_error:error.message});}}return local; },
      async update(id,patch={}) { const current=this.get(id);if(!current)throw new Error("El registro no existe.");const local=saveLocal({...current,...clone(patch),updated_at:new Date().toISOString(),sync_status:"pending"});if(global.navigator?.onLine&&global.GraviSupabase?.isAuthenticated?.()&&global.GraviSupabase?.[remoteName]){try{const remote=await global.GraviSupabase[remoteName].update(local.id,local);return saveLocal({...local,...remote,sync_status:"synced"});}catch(error){console.error(`[GraviRepositories:${remoteName}:update]`,error);return saveLocal({...local,sync_status:"error",sync_error:error.message});}}return local; },
      async softDelete(id) { return this.update(id,{deleted_at:new Date().toISOString(),status:"cancelled"}); },
      listByWork(workId) { return this.list({workId}); },
      listByRecord(recordId) { return clone(rows().filter(item=>!item.deleted_at&&(item.control_id===recordId||item.record_id===recordId))); },
      listBySource(sourceModule,sourceEntryId) { return clone(rows().filter(item=>!item.deleted_at&&(item.source_module||item.sourceModule)===sourceModule&&(item.source_entry_id||item.sourceEntryId)===sourceEntryId)); },
      cache(items=[]) { for(const item of items)saveLocal(item);return clone(items); },
      listPending() { return clone(rows().filter(item=>["pending","error"].includes(item.sync_status))); },
      async syncPending() { if(!global.navigator?.onLine||!global.GraviSupabase?.isAuthenticated?.()||!global.GraviSupabase?.[remoteName]?.create)return{synced:0,pending:this.listPending().length};let synced=0;for(const item of this.listPending()){try{const remote=await global.GraviSupabase[remoteName].create(item);saveLocal({...item,...remote,sync_status:"synced",sync_error:""});synced++;}catch(error){saveLocal({...item,sync_status:"error",sync_error:error.message});}}return{synced,pending:this.listPending().length}; },
      async refreshRemote(workId="") { if(!global.navigator?.onLine||!global.GraviSupabase?.isAuthenticated?.()||!global.GraviSupabase?.[remoteName]?.list)return this.list({workId});try{const remote=await global.GraviSupabase[remoteName].list(workId);remote.forEach(saveLocal);return this.list({workId});}catch(error){console.error(`[GraviRepositories:${remoteName}:list]`,error);return this.list({workId});} }
    });
  }

  function attendanceList() {
    const attendance = systemData().attendance || {};
    return Object.entries(attendance).map(([id, marks]) => {
      const [workId = "", attendanceDate = ""] = id.split("|");
      return {id, workId, attendanceDate, marks: marks || {}};
    });
  }

  function complianceList() {
    const compliance = systemData().compliance || {};
    return Object.entries(compliance).flatMap(([workId, entries]) => {
      if (!entries || typeof entries !== "object") return [];
      return Object.entries(entries).map(([code, entry]) => ({
        id: `${workId}|${code}`,
        workId,
        code,
        ...(entry || {})
      }));
    });
  }

  function documentsList() {
    const system = systemData();
    const records = recordsData().map(item => ({...item, source: "records"}));
    const histories = (system.histories || []).map(item => ({...item, source: "histories"}));
    const dynamicRecords = (dynamicFormatsData().records || []).map(item => ({...item, source: "dynamicFormats"}));
    return [...records, ...histories, ...dynamicRecords];
  }

  function dynamicFormatDocuments() {
    return (dynamicFormatsData().formats || []).map(item => ({...item, source: "dynamicFormats"}));
  }

  const repositories = Object.freeze({
    works: readonlyList(() => systemData().works || []),
    developments: readonlyList(() => systemData().developments || []),
    contractors: readonlyList(() => systemData().contractors || []),
    workers: readonlyList(() => systemData().workers || []),
    visitors: readonlyList(() => systemData().visitors || []),
    attendance: readonlyList(attendanceList),
    records: readonlyList(recordsData),
    compliance: readonlyList(complianceList),
    documents: readonlyList(() => [...documentsList(), ...dynamicFormatDocuments()]),
    audit: readonlyList(() => systemData().auditLog || []),
    dailyReports:Object.freeze({
      list() { return clone(dailyReportsData()); },
      get(workId,date,shift="Matutino") {
        return clone(dailyReportsData().find(item => dailyReportIdentity(item) === dailyReportIdentity({workId,date,shift})) || null);
      },
      forWork(workId) {
        return clone(dailyReportsData().filter(item => item.workId === workId).sort((a,b) => String(b.date || "").localeCompare(String(a.date || ""))));
      },
      saveDraft(item,options={}) {
        if (!global.GraviSupabase?.dailyReports) return Promise.resolve({success:false,pending:true,report:clone(item)});
        return global.GraviSupabase.dailyReports.saveDraft(clone(item),options);
      },
      closeManual(item) {
        if (!global.GraviSupabase?.dailyReports) return Promise.reject(new Error("Supabase no est\u00e1 disponible."));
        return global.GraviSupabase.dailyReports.closeManual(clone(item));
      }
    }),
    preventiveControls:localEntityRepository(PREVENTIVE_CONTROLS_KEY,"preventiveControls"),
    preventiveEvidence:localEntityRepository(PREVENTIVE_EVIDENCE_KEY,"preventiveEvidence"),
    workEvidence:localEntityRepository(WORK_EVIDENCE_KEY,"workEvidence")
  });

  global.GraviRepositories = repositories;
})(window);
