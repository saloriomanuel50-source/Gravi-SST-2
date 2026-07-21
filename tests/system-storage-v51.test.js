"use strict";

const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),source=fs.readFileSync(path.join(root,"src/system-storage.js"),"utf8"),system=fs.readFileSync(path.join(root,"src/system.js"),"utf8"),supabase=fs.readFileSync(path.join(root,"src/supabase.js"),"utf8");

function fakeIndexedDb(seed={}){
  const stores=new Map(Object.entries(seed).map(([name,rows])=>[name,new Map(rows.map(row=>[row.clientUuid||row.id,{...row}]))])),indexes=new Map(),state={version:2,upgradeCount:0};
  const names={contains:name=>stores.has(name)};
  function request(result,error=null){const req={};setTimeout(()=>{if(error)req.onerror?.();else{req.result=result;req.onsuccess?.();}},0);return req;}
  function storeApi(name,tx){const rows=stores.get(name);return{
    createIndex(index){if(!indexes.has(name))indexes.set(name,new Set());indexes.get(name).add(index);},
    put(value){rows.set(value.clientUuid||value.id,structuredClone(value));const req=request(value);setTimeout(()=>tx.oncomplete?.(),1);return req;},
    get(id){const req=request(rows.has(id)?structuredClone(rows.get(id)):undefined);setTimeout(()=>tx.oncomplete?.(),1);return req;},
    getAll(){const req=request([...rows.values()].map(structuredClone));setTimeout(()=>tx.oncomplete?.(),1);return req;},
    delete(id){rows.delete(id);const req=request(undefined);setTimeout(()=>tx.oncomplete?.(),1);return req;}
  };}
  const db={objectStoreNames:names,createObjectStore(name){const rows=new Map();stores.set(name,rows);return storeApi(name,{})},transaction(name){const tx={objectStore:()=>storeApi(name,tx)};return tx;}};
  return{stores,state,open(name,version){const req={result:db};setTimeout(()=>{if(version>state.version){state.version=version;state.upgradeCount++;req.onupgradeneeded?.();}req.onsuccess?.();},0);return req;}};
}

function runtime({legacy=null,quota=false,indexedDB=fakeIndexedDb()}={}){
  const values=new Map();if(legacy!==null)values.set("gvc-ops-system-v1",typeof legacy==="string"?legacy:JSON.stringify(legacy));
  const localStorage={get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.has(key)?values.get(key):null,removeItem:key=>values.delete(key),setItem(key,value){if(quota)throw new DOMException("quota","QuotaExceededError");values.set(key,String(value));}};
  const logs=[],window={localStorage,indexedDB,TextEncoder,structuredClone,console:{info:(...args)=>logs.push(args),warn:(...args)=>logs.push(args)},setTimeout};window.window=window;
  vm.runInNewContext(source,{window,localStorage,indexedDB,TextEncoder,structuredClone,DOMException,console:window.console,setTimeout});
  return{window,values,indexedDB,logs};
}

function largeLegacy(){
  const photo=`data:image/jpeg;base64,${"A".repeat(5*1024*1024)}`;
  return{schemaVersion:6,developments:[{id:"d1"}],works:[{id:"w1"}],contractors:[],workers:[{id:"worker-1",photo}],visitors:[],attendance:{"w1|2026-07-21":{"worker-1":"P"}},compliance:{},complianceMatrix:{},histories:[],investigations:[],activity:[],auditLog:[],complianceAudit:[],scheduledActivities:[],legacyMigrations:[]};
}

(async()=>{
  const legacy=largeLegacy(),database=fakeIndexedDb({evidenceFiles:[{clientUuid:"e1",blob:"photo"}],evidenceQueue:[{clientUuid:"e1",status:"pending"}],incidentReports:[{id:"incident-1",status:"pending"}]});
  const env=runtime({legacy,indexedDB:database}),storage=env.window.GraviSystemStorage;
  const migrated=await storage.prepare("user-1");
  assert.equal(migrated.ok,true,"1 migración V51 correcta");assert.equal(migrated.source,"legacy-migration");
  const manifestText=env.values.get("gvc-ops-system-v1"),manifest=JSON.parse(manifestText);
  assert.equal(manifest.storageVersion,51);assert.ok(storage.serializedBytes(manifestText)<64*1024,"2 manifiesto menor de 64 KiB");assert.doesNotMatch(manifestText,/data:image|base64|workers|attendance|histories/i,"3 manifiesto sin payload ni Base64");
  const current=database.stores.get("operationalCache").get("operational:user-1:current"),recovery=database.stores.get("operationalCache").get("operational:user-1:legacy-recovery"),marker=database.stores.get("operationalCache").get("__migration-v51-operational-cache:user-1");
  assert.ok(current&&recovery&&marker,"4 snapshot, recuperación y marcador conservados");assert.equal(current.payload.workers[0].photo,legacy.workers[0].photo,"5 payload íntegro con Base64 sólo en IndexedDB");assert.equal(storage.verifyRecord(current,legacy).ok,true,"6 checksum verificado");
  const count=database.stores.get("operationalCache").size,again=await storage.prepare("user-1");assert.equal(again.source,"manifest","7 migración idempotente");assert.equal(database.stores.get("operationalCache").size,count);
  const tampered={...current,payload:{...current.payload,works:[]}};assert.equal(storage.verifyRecord(tampered).ok,false,"8 alteración detectada por checksum");
  assert.equal(database.state.version,3,"9 upgrade IndexedDB v2 a v3");assert.equal(database.stores.get("evidenceFiles").get("e1").blob,"photo","10 evidenceFiles conservado");assert.equal(database.stores.get("evidenceQueue").get("e1").status,"pending","11 evidenceQueue conservado");assert.equal(database.stores.get("incidentReports").get("incident-1").status,"pending","12 incidentReports conservado");

  const interrupted=runtime({legacy:{...legacy,workers:[]},quota:true,indexedDB:fakeIndexedDb()});const interruptedResult=await interrupted.window.GraviSystemStorage.prepare("user-2");
  assert.equal(interruptedResult.ok,false);assert.equal(interruptedResult.manifestWritten,false,"13 cuota durante migración reportada sin marcarla completa");assert.ok(JSON.parse(interrupted.values.get("gvc-ops-system-v1")).works,"14 representación legacy preservada");assert.ok(interrupted.indexedDB.stores.get("operationalCache").has("operational:user-2:legacy-recovery"),"15 recuperación preservada");assert.equal(interrupted.indexedDB.stores.get("operationalCache").has("__migration-v51-operational-cache:user-2"),false,"15 migración interrumpida no queda completada");
  const safe=interrupted.window.GraviSystemStorage.safeSetLocalStorage("gvc-ops-system-v1",{storageVersion:51,snapshotRef:"x"});assert.equal(safe.ok,false,"16 localStorage lleno no lanza");assert.equal(safe.quota,true);

  const noIdb=runtime({legacy:{works:[{id:"offline"}],workers:[],attendance:{}},indexedDB:null}),fallback=await noIdb.window.GraviSystemStorage.prepare("user-3");
  assert.equal(fallback.ok,false);assert.equal(fallback.source,"legacy-fallback","17 IndexedDB no disponible conserva estado");assert.equal(fallback.payload.works[0].id,"offline");
  assert.equal(noIdb.window.GraviSystemStorage.safeSetLocalStorage("gvc-ops-system-v1",{payload:"x".repeat(70*1024)}).errorType,"size-limit","18 límite explícito de 64 KiB");

  const persistBlock=system.match(/function persistLocalData\([\s\S]*?\n\}/)?.[0]||"",saveBlock=system.match(/function save\([\s\S]*?\n\}/)?.[0]||"";
  assert.ok(persistBlock.includes("enqueuePersist")&&!persistBlock.includes("localStorage.setItem"),"19 persistLocalData usa IndexedDB y no propaga cuota");assert.ok(saveBlock.includes("finally")&&saveBlock.includes("scheduleSystemSync"),"20 Supabase se programa aunque falle caché");
  const monthly=system.match(/function ensureMonthlySchedules\([\s\S]*?\n?function reconcileScheduledActivities/)?.[0]||"";assert.ok(monthly.includes("if(changed)save"),"21 calendario no guarda sin cambios");
  assert.ok(system.includes("function auditLog")&&system.includes("La bitácora no bloqueó la operación"),"22 auditoría no bloqueante");assert.ok(system.includes("safeSetLocalStorage")&&system.includes("renderAttendance"),"23 Asistencia usa almacenamiento contenido");
  const loadBlock=supabase.match(/async function loadAuthenticatedData\([\s\S]*?\n  \}/)?.[0]||"";assert.ok(loadBlock.indexOf("loadRemote")<loadBlock.indexOf("GraviSystemStorage.persist"));assert.ok(loadBlock.includes("Datos cargados desde Supabase; no fue posible actualizar el caché local"),"24 cuota local no se clasifica como Supabase");
  console.log("PASS system-storage-v51: 24 contratos de cuota, migración, checksum, manifiesto, IndexedDB v3, Asistencia, Supabase y compatibilidad V50 verificados.");
})().catch(error=>{console.error(error);process.exitCode=1;});
