(function createOfflineEvidenceQueue(global){
  "use strict";

  const schema=global.GraviStorageSchema;
  if(!schema)throw new Error("GraviStorageSchema V51 debe cargarse antes de la cola de evidencias.");
  const {DB_NAME,DB_VERSION,FILE_STORE,QUEUE_STORE,REPORT_STORE}=schema;
  let dbPromise=null;
  function requestResult(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error("IndexedDB no respondió."));});}
  function open(){
    if(dbPromise)return dbPromise;if(!global.indexedDB)return Promise.reject(new Error("IndexedDB no está disponible."));
    dbPromise=new Promise((resolve,reject)=>{const request=global.indexedDB.open(DB_NAME,DB_VERSION);request.onupgradeneeded=()=>global.GraviSystemStorage.upgradeDatabase(request.result);request.onsuccess=()=>{resolve(request.result);queueMicrotask(()=>recoverAbandoned().then(()=>cleanupOrphans()).catch(error=>console.error("[GraviOfflineEvidenceQueue:recover]",error)));};request.onerror=()=>reject(request.error||new Error("No fue posible abrir la cola de evidencias."));});return dbPromise;
  }
  async function transaction(storeName,mode,callback){const db=await open(),tx=db.transaction(storeName,mode),store=tx.objectStore(storeName),result=await callback(store);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error("Transacción cancelada."));});return result;}
  async function save(item){const now=new Date().toISOString(),record={attempts:0,lastError:"",status:"local",createdAt:now,...item,updatedAt:now,recordKey:`${item.recordType||"general"}:${item.recordId||""}`};await transaction(FILE_STORE,"readwrite",store=>requestResult(store.put(record)));await transaction(QUEUE_STORE,"readwrite",store=>requestResult(store.put({clientUuid:record.clientUuid,status:record.status,createdAt:record.createdAt,updatedAt:now})));return record;}
  async function get(clientUuid){return transaction(FILE_STORE,"readonly",store=>requestResult(store.get(clientUuid)));}
  async function list(filters={}){const rows=await transaction(FILE_STORE,"readonly",store=>requestResult(store.getAll()));return rows.filter(item=>(!filters.recordType||item.recordType===filters.recordType)&&(!filters.recordId||item.recordId===filters.recordId)&&(!filters.workId||item.workId===filters.workId)&&(!filters.statuses||filters.statuses.includes(item.status))&&!item.deletedAt).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));}
  async function update(clientUuid,patch={}){const current=await get(clientUuid);if(!current)return null;const next={...current,...patch,clientUuid,updatedAt:new Date().toISOString()};await transaction(FILE_STORE,"readwrite",store=>requestResult(store.put(next)));await transaction(QUEUE_STORE,"readwrite",store=>requestResult(["synced","deleted"].includes(next.status)?store.delete(clientUuid):store.put({clientUuid,status:next.status,createdAt:next.createdAt,updatedAt:next.updatedAt})));return next;}
  async function softDelete(clientUuid){return update(clientUuid,{status:"deleted",deletedAt:new Date().toISOString(),blob:null});}
  async function pending(){return list({statuses:["local","pending","error"]});}
  function isAbandoned(item,maxAgeMs=120000,now=Date.now()){if(item?.status!=="uploading")return false;const updated=Date.parse(item.updatedAt||item.createdAt||0);return!Number.isFinite(updated)||updated<=now-maxAgeMs;}
  async function recoverAbandoned(maxAgeMs=120000){const rows=await list({statuses:["uploading"]}),recovered=[];for(const item of rows){if(isAbandoned(item,maxAgeMs))recovered.push(await update(item.clientUuid,{status:"pending",lastError:"Carga interrumpida; se reintentará."}));}return recovered;}
  async function countAvailable(filters={}){return(await list(filters)).filter(item=>item.blob||item.status==="synced"&&item.storagePath).length;}
  async function cleanupOrphans(maxAgeMs=7*24*60*60*1000){const rows=await transaction(FILE_STORE,"readonly",store=>requestResult(store.getAll())),cutoff=Date.now()-maxAgeMs,removed=[];for(const item of rows){const stale=Date.parse(item.deletedAt||item.updatedAt||item.createdAt||0)<=cutoff;if(stale&&(item.deletedAt||!item.recordId&&!item.storagePath)){await transaction(FILE_STORE,"readwrite",store=>requestResult(store.delete(item.clientUuid)));await transaction(QUEUE_STORE,"readwrite",store=>requestResult(store.delete(item.clientUuid)));removed.push(item.clientUuid);}}return removed;}
  async function saveReport(item){const now=new Date().toISOString(),record={status:"draft",createdAt:now,...item,updatedAt:now};await transaction(REPORT_STORE,"readwrite",store=>requestResult(store.put(record)));return record;}
  async function getReport(id){return transaction(REPORT_STORE,"readonly",store=>requestResult(store.get(id)));}
  async function listReports(filters={}){const rows=await transaction(REPORT_STORE,"readonly",store=>requestResult(store.getAll()));return rows.filter(item=>(!filters.statuses||filters.statuses.includes(item.status))&&(!filters.workId||item.workId===filters.workId)&&(!filters.draftKey||item.draftKey===filters.draftKey));}
  async function deleteReport(id){return transaction(REPORT_STORE,"readwrite",store=>requestResult(store.delete(id)));}

  global.GraviOfflineEvidenceQueue=Object.freeze({open,save,get,list,update,softDelete,pending,recoverAbandoned,isAbandoned,countAvailable,cleanupOrphans,saveReport,getReport,listReports,deleteReport,constants:Object.freeze({DB_NAME,DB_VERSION,FILE_STORE,QUEUE_STORE,REPORT_STORE})});
})(window);
