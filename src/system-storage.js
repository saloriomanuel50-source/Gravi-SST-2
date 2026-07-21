(function createGraviSystemStorage(global){
  "use strict";

  const SYSTEM_KEY="gvc-ops-system-v1";
  const STORAGE_VERSION=51;
  const MANIFEST_LIMIT_BYTES=64*1024;
  const MIGRATION_VERSION=51;
  const DB_SCHEMA=Object.freeze({
    DB_NAME:"gravi-evidence-v1",DB_VERSION:3,
    FILE_STORE:"evidenceFiles",QUEUE_STORE:"evidenceQueue",REPORT_STORE:"incidentReports",OPERATIONAL_STORE:"operationalCache"
  });
  let dbPromise=null,persistChain=Promise.resolve(),hydratedPayload=null,activeOwnerKey="anonymous",lastCacheState={state:"idle"};

  const now=()=>new Date().toISOString();
  function serializedText(value){return typeof value==="string"?value:JSON.stringify(value);}
  function serializedBytes(value){const text=serializedText(value);return global.TextEncoder?new TextEncoder().encode(text).byteLength:text.length*2;}
  function isQuotaError(error){return error?.name==="QuotaExceededError"||error?.code===22||/quota/i.test(String(error?.name||"")+" "+String(error?.message||""));}
  function classifyError(error,kind="storage"){
    if(isQuotaError(error))return"localStorage-quota";
    if(kind==="indexeddb"||/indexeddb|idb|database/i.test(String(error?.message||"")))return"indexeddb";
    return kind;
  }
  function safeSetLocalStorage(key,value,options={}){
    let text,bytes=0;
    try{text=serializedText(value);bytes=serializedBytes(text);}
    catch(error){return{ok:false,key,bytes,errorType:"serialization",error};}
    const limit=options.maxBytes??(key===SYSTEM_KEY?MANIFEST_LIMIT_BYTES:Infinity);
    if(bytes>limit)return{ok:false,key,bytes,limit,errorType:"size-limit"};
    try{global.localStorage?.setItem(key,text);return{ok:true,key,bytes};}
    catch(error){const result={ok:false,key,bytes,errorType:classifyError(error,"localStorage"),quota:isQuotaError(error)};console.warn(`[GraviSystemStorage:${result.errorType}]`,{keyType:key===SYSTEM_KEY?"system-manifest":"local-entry",bytes});return result;}
  }
  function clone(value){if(value==null)return value;try{return global.structuredClone?global.structuredClone(value):JSON.parse(JSON.stringify(value));}catch{return JSON.parse(JSON.stringify(value));}}
  function checksum(value){const text=serializedText(value);let hash=2166136261;for(let index=0;index<text.length;index++){hash^=text.charCodeAt(index);hash=Math.imul(hash,16777619);}return`fnv1a-${(hash>>>0).toString(16).padStart(8,"0")}-${text.length}`;}
  function technicalOwner(ownerKey){return checksum(String(ownerKey||"anonymous")).split("-").slice(0,2).join("-");}
  function currentId(ownerKey=activeOwnerKey){return`operational:${ownerKey||"anonymous"}:current`;}
  function recoveryId(ownerKey=activeOwnerKey){return`operational:${ownerKey||"anonymous"}:legacy-recovery`;}
  function migrationId(ownerKey=activeOwnerKey){return`__migration-v51-operational-cache:${ownerKey||"anonymous"}`;}
  function isManifest(value){return Boolean(value&&typeof value==="object"&&!Array.isArray(value)&&value.storageVersion===STORAGE_VERSION&&value.snapshotRef);}
  function isLegacyPayload(value){return Boolean(value&&typeof value==="object"&&!Array.isArray(value)&&!isManifest(value)&&(["works","workers","attendance","compliance","histories"].some(key=>Object.hasOwn(value,key))));}
  function readSystemKey(){try{const raw=global.localStorage?.getItem(SYSTEM_KEY);return raw?{raw,value:JSON.parse(raw)}:{raw:"",value:null};}catch(error){return{raw:"",value:null,error,errorType:"localStorage-read"};}}
  function createManifest(record,migrationStatus="completed"){
    return{schemaVersion:record.schemaVersion??record.payload?.schemaVersion??1,storageVersion:STORAGE_VERSION,ownerKey:record.ownerKey,snapshotRef:record.id,activeWorkId:global.localStorage?.getItem("gvc-active-work-id")||"",updatedAt:record.updatedAt,migrationVersion:MIGRATION_VERSION,migrationStatus,checksum:record.checksum};
  }
  function requestResult(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error("IndexedDB no respondió."));});}
  function ensureStores(db){
    if(!db.objectStoreNames.contains(DB_SCHEMA.FILE_STORE)){const files=db.createObjectStore(DB_SCHEMA.FILE_STORE,{keyPath:"clientUuid"});files.createIndex("record","recordKey",{unique:false});files.createIndex("status","status",{unique:false});files.createIndex("work","workId",{unique:false});}
    if(!db.objectStoreNames.contains(DB_SCHEMA.QUEUE_STORE)){const queue=db.createObjectStore(DB_SCHEMA.QUEUE_STORE,{keyPath:"clientUuid"});queue.createIndex("status","status",{unique:false});queue.createIndex("createdAt","createdAt",{unique:false});}
    if(!db.objectStoreNames.contains(DB_SCHEMA.REPORT_STORE)){const reports=db.createObjectStore(DB_SCHEMA.REPORT_STORE,{keyPath:"id"});reports.createIndex("draftKey","draftKey",{unique:false});reports.createIndex("status","status",{unique:false});reports.createIndex("work","workId",{unique:false});}
    if(!db.objectStoreNames.contains(DB_SCHEMA.OPERATIONAL_STORE)){const cache=db.createObjectStore(DB_SCHEMA.OPERATIONAL_STORE,{keyPath:"id"});cache.createIndex("owner","ownerKey",{unique:false});cache.createIndex("status","status",{unique:false});cache.createIndex("updatedAt","updatedAt",{unique:false});}
  }
  function open(){
    if(dbPromise)return dbPromise;
    if(!global.indexedDB)return Promise.reject(Object.assign(new Error("IndexedDB no está disponible."),{category:"indexeddb"}));
    dbPromise=new Promise((resolve,reject)=>{const request=global.indexedDB.open(DB_SCHEMA.DB_NAME,DB_SCHEMA.DB_VERSION);request.onupgradeneeded=()=>ensureStores(request.result);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error("No fue posible abrir IndexedDB."));request.onblocked=()=>reject(new Error("La actualización de IndexedDB está bloqueada por otra pestaña."));}).catch(error=>{dbPromise=null;throw error;});
    return dbPromise;
  }
  async function transaction(mode,callback){const db=await open(),tx=db.transaction(DB_SCHEMA.OPERATIONAL_STORE,mode),store=tx.objectStore(DB_SCHEMA.OPERATIONAL_STORE),result=await callback(store);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error("Falló la transacción operativa."));tx.onabort=()=>reject(tx.error||new Error("Transacción operativa cancelada."));});return result;}
  async function getRecord(id){return transaction("readonly",store=>requestResult(store.get(id)));}
  async function putRecord(record){await transaction("readwrite",store=>requestResult(store.put(record)));return record;}
  function operationalRecord(payload,ownerKey=activeOwnerKey,options={}){const copy=clone(payload||{}),updatedAt=now();return{id:options.id||currentId(ownerKey),ownerKey,schemaVersion:copy.schemaVersion??1,storageVersion:STORAGE_VERSION,payload:copy,updatedAt,checksum:checksum(copy),migrationVersion:MIGRATION_VERSION,source:options.source||"runtime",status:options.status||"ready"};}
  function verifyRecord(record,payload){if(!record||!record.payload)return{ok:false,reason:"missing"};const expected=checksum(payload??record.payload),actual=checksum(record.payload);return{ok:record.checksum===actual&&expected===actual,expected,actual};}
  function instrumentation(event,detail={}){console.info(`[GraviSystemStorage:${event}]`,detail);}
  async function writeVerified(payload,ownerKey=activeOwnerKey,options={}){
    const record=operationalRecord(payload,ownerKey,options),payloadBytes=serializedBytes(record.payload),started=Date.now();
    await putRecord(record);const stored=await getRecord(record.id),verification=verifyRecord(stored,record.payload);
    if(!verification.ok)throw Object.assign(new Error("No fue posible verificar el estado operativo guardado."),{category:"indexeddb-verification"});
    hydratedPayload=clone(stored.payload);activeOwnerKey=ownerKey;
    const manifest=createManifest(stored,options.migrationStatus||"completed"),local=safeSetLocalStorage(SYSTEM_KEY,manifest,{maxBytes:MANIFEST_LIMIT_BYTES});
    lastCacheState={state:local.ok?"ready":"manifest-fallback",ownerKey,recordId:record.id,payloadBytes,manifestBytes:local.bytes,verification:true,local};
    instrumentation("persist",{owner:technicalOwner(ownerKey),payloadBytes,manifestBytes:local.bytes,durationMs:Date.now()-started,verified:true,cacheState:lastCacheState.state,errorType:local.errorType||""});
    return{ok:true,record,manifest,local,verification,payloadBytes};
  }
  function enqueuePersist(payload,options={}){
    let snapshot;
    try{snapshot=clone(payload);}catch(error){return Promise.resolve({ok:false,error,errorType:"serialization"});}
    const ownerKey=options.ownerKey||activeOwnerKey;
    hydratedPayload=snapshot;
    const task=()=>writeVerified(snapshot,ownerKey,options).catch(error=>{const errorType=classifyError(error,"indexeddb");lastCacheState={state:"error",errorType,ownerKey};instrumentation("error",{owner:technicalOwner(ownerKey),errorType,source:options.source||"runtime"});return{ok:false,error,errorType};});
    persistChain=persistChain.then(task,task);return persistChain;
  }
  async function prepare(ownerKey="anonymous"){
    activeOwnerKey=String(ownerKey||"anonymous");const started=Date.now(),local=readSystemKey();
    try{
      if(isManifest(local.value)){
        const record=await getRecord(local.value.snapshotRef||currentId(activeOwnerKey));const verification=verifyRecord(record);
        if(record?.ownerKey===activeOwnerKey&&verification.ok){hydratedPayload=clone(record.payload);lastCacheState={state:"hydrated",source:"manifest",verification:true};instrumentation("hydrate",{owner:technicalOwner(activeOwnerKey),source:"manifest",payloadBytes:serializedBytes(record.payload),durationMs:Date.now()-started,verified:true});return{ok:true,payload:clone(hydratedPayload),source:"manifest",record,verification};}
      }
      if(isLegacyPayload(local.value)){
        const payload=clone(local.value),recovery=operationalRecord(payload,activeOwnerKey,{id:recoveryId(activeOwnerKey),source:"legacy-localStorage",status:"recovery"});
        await putRecord(recovery);const recoveryRead=await getRecord(recovery.id),recoveryVerification=verifyRecord(recoveryRead,payload);
        if(!recoveryVerification.ok)throw new Error("La copia de recuperación V51 no superó la verificación.");
        const current=await writeVerified(payload,activeOwnerKey,{source:"migration-v51",migrationStatus:"completed"});
        if(!current.local.ok){
          lastCacheState={state:"migration-incomplete",ownerKey:activeOwnerKey,errorType:current.local.errorType||"localStorage"};
          instrumentation("migration",{owner:technicalOwner(activeOwnerKey),payloadBytes:serializedBytes(payload),manifestBytes:current.local.bytes,durationMs:Date.now()-started,verified:true,fallback:"legacy-preserved",errorType:current.local.errorType||"localStorage"});
          return{ok:false,payload:clone(payload),source:"legacy-preserved",record:current.record,recoveryRef:recovery.id,manifestWritten:false,errorType:current.local.errorType||"localStorage"};
        }
        await putRecord({id:migrationId(activeOwnerKey),ownerKey:activeOwnerKey,schemaVersion:payload.schemaVersion??1,storageVersion:STORAGE_VERSION,payload:{completedAt:now(),recoveryRef:recovery.id,snapshotRef:current.record.id},updatedAt:now(),checksum:checksum(payload),migrationVersion:MIGRATION_VERSION,source:"migration-v51",status:"completed"});
        instrumentation("migration",{owner:technicalOwner(activeOwnerKey),payloadBytes:serializedBytes(payload),manifestBytes:current.local.bytes,durationMs:Date.now()-started,verified:true,fallback:current.local.ok?"manifest":"legacy-preserved"});
        return{ok:true,payload:clone(payload),source:"legacy-migration",record:current.record,recoveryRef:recovery.id,manifestWritten:current.local.ok};
      }
      const record=await getRecord(currentId(activeOwnerKey)),verification=verifyRecord(record);
      if(record&&verification.ok){hydratedPayload=clone(record.payload);safeSetLocalStorage(SYSTEM_KEY,createManifest(record),{maxBytes:MANIFEST_LIMIT_BYTES});return{ok:true,payload:clone(hydratedPayload),source:"indexeddb",record,verification};}
      hydratedPayload=null;return{ok:true,payload:null,source:"empty"};
    }catch(error){const errorType=classifyError(error,"indexeddb");lastCacheState={state:"fallback",errorType,source:isLegacyPayload(local.value)?"legacy":"memory"};if(isLegacyPayload(local.value))hydratedPayload=clone(local.value);instrumentation("prepare-fallback",{owner:technicalOwner(activeOwnerKey),durationMs:Date.now()-started,errorType,fallback:hydratedPayload?"legacy":"empty"});return{ok:false,payload:clone(hydratedPayload),source:hydratedPayload?"legacy-fallback":"empty",error,errorType};}
  }
  function getHydratedPayload(){return clone(hydratedPayload);}
  function getOwnerKey(){return activeOwnerKey;}
  function getCacheState(){return clone(lastCacheState);}

  global.GraviStorageSchema=DB_SCHEMA;
  global.GraviSystemStorage=Object.freeze({prepare,open,upgradeDatabase:ensureStores,getRecord,enqueuePersist,persist:(payload,options={})=>enqueuePersist(payload,options),getHydratedPayload,getOwnerKey,getCacheState,safeSetLocalStorage,serializedBytes,isQuotaError,isManifest,isLegacyPayload,checksum,verifyRecord,constants:Object.freeze({SYSTEM_KEY,STORAGE_VERSION,MANIFEST_LIMIT_BYTES,MIGRATION_VERSION,...DB_SCHEMA})});
})(window);
