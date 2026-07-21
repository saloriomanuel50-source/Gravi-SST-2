"use strict";

const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const source=fs.readFileSync(path.join(__dirname,"..","src","incident-storage.js"),"utf8");

function runtime(){
  const values=new Map(),files=new Map(),reports=new Map(),listeners=new Map();let quota=false,remoteCalls=0,uploads=0;
  const localStorage={get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.has(key)?values.get(key):null,removeItem:key=>values.delete(key),setItem(key,value){if(quota){const error=new DOMException("quota","QuotaExceededError");throw error;}values.set(key,String(value));}};
  const queue={async save(item){files.set(item.clientUuid,{...item});return item;},async get(id){return files.get(id)||null;},async saveReport(item){reports.set(item.id,{...item,updatedAt:new Date().toISOString()});return item;},async getReport(id){return reports.get(id)||null;},async listReports(filters={}){return[...reports.values()].filter(item=>(!filters.statuses||filters.statuses.includes(item.status))&&(!filters.draftKey||item.draftKey===filters.draftKey));},async deleteReport(id){reports.delete(id);}};
  const window={crypto:global.crypto,Blob,TextEncoder,DOMException,localStorage,navigator:{onLine:true},GraviOfflineEvidenceQueue:queue,URL:{createObjectURL:()=>"blob:test"},atob,addEventListener(name,handler){listeners.set(name,handler);},setTimeout:fn=>fn(),console,GraviSupabase:{isAuthenticated:()=>true,entityMutations:{createIncident:async()=>{remoteCalls++;return{success:true,pending:false};}}},GraviEvidenceManager:{uploadPending:async()=>{uploads++;return{synced:1};}}};window.window=window;
  vm.runInNewContext(source,{window,Blob,TextEncoder,DOMException,URL:window.URL,localStorage,navigator:window.navigator,atob,console,setTimeout:window.setTimeout});
  return{window,values,files,reports,listeners,setQuota:value=>quota=value,counts:()=>({remoteCalls,uploads})};
}

(async()=>{
  const env=runtime(),storage=env.window.GraviIncidentStorage,key="gvc-reporte-seguridad-draft-v1-work",photo=new Blob([new Uint8Array(900000)],{type:"image/jpeg"});
  const base={id:"incident-1",type:"incident",workId:"work",folio:"RSO-2026-0001",description:"Prueba",evidence:[]};
  let saved=await storage.saveDraft(key,base);assert.equal(saved.clean.evidence.length,0,"1 reporte sin evidencia");
  saved=await storage.saveDraft(key,{...base,evidence:[{id:"p1",blob:photo,src:"blob:one"}]});assert.equal(env.files.size,1,"2 una fotografía va a IndexedDB");
  const six=Array.from({length:6},(_,index)=>({id:`p${index+2}`,blob:photo,src:`blob:${index}`}));saved=await storage.saveDraft(key,{...base,evidence:six});assert.equal(saved.clean.evidence.length,6,"3 seis fotografías");
  const light=env.values.get(key);assert.ok(!/data:image|blob:|base64/i.test(light),"4 localStorage no contiene binarios");assert.ok(storage.serializedBytes(light)<65536,"4 límite preventivo");
  env.setQuota(true);saved=await storage.saveDraft(key,{...base,id:"quota-online",evidence:[{id:"q1",blob:photo}]});assert.equal(saved.quotaFallback,true,"5 cuota casi llena usa IndexedDB");assert.ok(env.reports.has("quota-online"),"6 QuotaExceeded conserva el reporte");env.setQuota(false);
  const system=fs.readFileSync(path.join(__dirname,"..","src","system.js"),"utf8");assert.ok(/finally\{delete incidentForm\.dataset\.submittingV50/.test(system),"7 finally restaura interfaz");assert.ok(/dataset\.submittingV50===\"true\"/.test(system),"8 doble clic bloqueado");
  env.window.navigator.onLine=false;await storage.saveDraft(key,{...base,id:"offline-1"},{status:"pending"});assert.equal(env.reports.get("offline-1").status,"pending","9 offline en IndexedDB");
  env.window.navigator.onLine=true;await storage.syncPending();assert.equal(env.counts().remoteCalls,1,"10 reconecta una sola vez");assert.ok(!env.reports.has("offline-1"),"11 limpia cola sincronizada");
  const legacyKey="gvc-reporte-seguridad-draft-v1-legacy",legacyPhoto=`data:image/jpeg;base64,${Buffer.from("legacy-photo").toString("base64")}`;env.values.set(legacyKey,JSON.stringify({...base,id:"legacy-1",evidence:[{id:"legacy-photo",src:legacyPhoto}]}));env.values.delete(storage.constants.MIGRATION_KEY);await storage.migrateLegacy();const migrated=JSON.parse(env.values.get(legacyKey));assert.equal(migrated.indexedDbRef,"legacy-1","12 migración conserva referencia");assert.ok(env.files.has("legacy-photo"),"12 migración conserva evidencia");
  env.values.set("otro-modulo","intacto");await storage.removeDraft(legacyKey,"legacy-1");assert.equal(env.values.get("otro-modulo"),"intacto","13 no elimina otros registros");
  assert.ok(system.includes("incidentWizardRender63();installIncidentSubmit50()"),"14 mismo flujo escritorio/móvil");assert.ok(system.includes('showView("reportView")'),"15 reporte visible sin recargar");
  const restored=await storage.loadDraft(key);assert.ok(restored,"16 borrador recuperable tras recarga");for(const [storedKey,value] of env.values)if(storedKey.includes("reporte")||storedKey.includes("records"))assert.ok(!/data:image[^\"]*;base64/i.test(value),`17 sin Base64 en ${storedKey}`);
  const sw=fs.readFileSync(path.join(__dirname,"..","service-worker.js"),"utf8");assert.ok(sw.includes('gravi-sst-v2-shell-v51')&&sw.includes('url.pathname.startsWith("/api/")'),"cache v51 excluye API");
  console.log("PASS incident-storage-v50: 17 contratos de cuota, evidencia, migración, offline, deduplicación y UI verificados.");
})().catch(error=>{console.error(error);process.exitCode=1;});
