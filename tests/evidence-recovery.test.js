"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=file=>fs.readFileSync(path.join(root,file),"utf8");

async function testRemoteRecovery(){
  const cached=[],localBlob=new Blob(["local"],{type:"image/jpeg"});
  const local=[{clientUuid:"same",recordType:"preventive_control",recordId:"control-1",blob:localBlob,status:"pending"}];
  const window={
    crypto:require("node:crypto").webcrypto,
    GraviOfflineEvidenceQueue:{list:async filter=>filter?.recordId?local:[],recoverAbandoned:async()=>{},pending:async()=>[]},
    GraviRepositories:{preventiveEvidence:{cache:rows=>cached.push(...rows),listByRecord:()=>[]},workEvidence:{cache:rows=>cached.push(...rows),listBySource:()=>[]}},
    GraviSupabase:{isAuthenticated:()=>true,preventiveEvidence:{list:async()=>[{id:"remote-only",client_uuid:"remote-only",control_id:"control-1",storage_path:"preventive-controls/work/control/remote.jpg"},{id:"remote-copy",client_uuid:"same",control_id:"control-1",storage_path:"preventive-controls/work/control/same.jpg"}]},workEvidence:{listBySource:async()=>[{id:"source-remote",client_uuid:"source-remote",source_module:"incident",source_entry_id:"incident-1",storage_path:"work-evidence/work/incident/source.jpg"}]}},
    GraviLegacyCaptureAdapter:{hasAvailablePhoto:()=>false}
  };
  const document={createElement:null,querySelector:()=>null,body:{append(){},classList:{add(){},remove(){}}}};
  vm.runInNewContext(read("src/evidence-manager.js"),{window,document,navigator:{onLine:true},URL,Blob,console});
  const records=await window.GraviEvidenceManager.listByRecord("preventive_control","control-1");
  assert.equal(records.length,2,"Un dispositivo sin cache debe recuperar filas remotas");
  assert.equal(records.find(item=>(item.clientUuid||item.client_uuid)==="same").blob,localBlob,"El Blob local debe ganar al duplicado remoto");
  assert.equal(cached.length,2,"La metadata remota debe quedar en cache");
  const related=await window.GraviEvidenceManager.listBySource("incident","incident-1");
  assert.equal(related.length,1);assert.equal(related[0].status,"synced");
}

async function testCoordinator(){
  const events=[],listeners={};let releaseUpload;
  const uploadGate=new Promise(resolve=>{releaseUpload=resolve;});
  const window={
    navigator:{onLine:true},localStorage:{getItem:()=>"work-1"},
    addEventListener:(name,handler)=>{listeners[name]=handler},
    GraviOfflineEvidenceQueue:{open:async()=>{},recoverAbandoned:async age=>{assert.equal(age,120000);}},
    GraviRepositories:{preventiveControls:{syncPending:async()=>{events.push("controls");return{synced:1,pending:0};},refreshRemote:async()=>{events.push("metadata-controls");return[{id:"control-1"}];}},workEvidence:{cache:()=>events.push("metadata-cache")}},
    GraviEvidenceManager:{uploadPendingDirect:async()=>{events.push("upload");await uploadGate;return{synced:1,failed:0};},listByRecord:async()=>{events.push("metadata-preventive");return[];}},
    GraviSupabase:{isAuthenticated:()=>true,workEvidence:{list:async()=>{events.push("metadata-work");return[];}}}
  };
  vm.runInNewContext(read("src/evidence-sync-coordinator.js"),{window,localStorage:window.localStorage,navigator:window.navigator,console});
  await new Promise(resolve=>setImmediate(resolve));events.length=0;
  const first=window.GraviEvidenceSyncCoordinator.synchronize({workId:"work-1"}),second=window.GraviEvidenceSyncCoordinator.synchronize({workId:"work-1"});
  assert.equal(first,second,"El coordinador debe compartir el mutex activo");
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(events,["controls","upload"],"Los controles deben sincronizarse antes de subir evidencia");
  releaseUpload();await first;
  assert.deepEqual(events,["controls","upload","metadata-controls","metadata-preventive","metadata-work","metadata-cache"]);
  assert.equal(typeof listeners.online,"function");assert.equal(typeof listeners["gvc:auth-ready"],"function");
}

async function testParentAndUploadMutex(){
  const item={clientUuid:"pending-photo",recordType:"preventive_control",recordId:"control-1",workId:"work-1",blob:new Blob(["photo"],{type:"image/jpeg"}),mimeType:"image/jpeg",status:"pending"};let parentStatus="pending",uploads=0,relations=0,release;
  const gate=new Promise(resolve=>{release=resolve;});
  const window={crypto:require("node:crypto").webcrypto,GraviOfflineEvidenceQueue:{recoverAbandoned:async()=>{},pending:async()=>[item],update:async(id,patch)=>Object.assign(item,patch),list:async()=>[]},GraviRepositories:{preventiveControls:{get:()=>({sync_status:parentStatus})}},GraviSupabase:{isAuthenticated:()=>true,evidence:{uploadFile:async()=>{uploads++;await gate;},create:async row=>{relations++;return{id:"remote-1",client_uuid:row.clientUuid||row.client_uuid,storage_path:row.storage_path};}}},GraviLegacyCaptureAdapter:{hasAvailablePhoto:()=>false}};
  const document={createElement:null,querySelector:()=>null,body:{append(){},classList:{add(){},remove(){}}}};
  vm.runInNewContext(read("src/evidence-manager.js"),{window,document,navigator:{onLine:true},URL,Blob,console});
  const deferred=await window.GraviEvidenceManager.uploadPending();assert.equal(deferred.deferred,1);assert.equal(uploads,0,"No debe subir antes del control padre");
  parentStatus="synced";item.status="pending";const first=window.GraviEvidenceManager.uploadPending(),second=window.GraviEvidenceManager.uploadPending();assert.equal(first,second,"uploadPending debe reutilizar su mutex");await new Promise(resolve=>setImmediate(resolve));assert.equal(uploads,1);release();await first;assert.equal(relations,1,"El reintento concurrente no debe duplicar la fila");assert.equal(item.blob,null,"El Blob se libera solo tras confirmar Storage y fila");
}

async function testRemoteGallery(){
  const window={navigator:{onLine:true},addEventListener(){},GraviSystemContext:{getRecords:()=>[],getDailyReports:()=>[]},GraviOfflineEvidenceQueue:{list:async()=>[]},GraviLegacyCaptureAdapter:{list:()=>[]},GraviWorkPermits:{listLocal:()=>[]},GraviRepositories:{workEvidence:{list:()=>[],cache(){}},preventiveControls:{listByWork:()=>[],refreshRemote:async()=>[{id:"control-1",folio:"OBS-1"}]}},GraviSupabase:{isAuthenticated:()=>true,workEvidence:{list:async()=>[{client_uuid:"work-remote",work_id:"work-1",storage_path:"work-evidence/work-1/general/work.jpg"}]}},GraviEvidenceManager:{normalizeRemote:(item,recordType)=>({...item,clientUuid:item.client_uuid,recordType,storagePath:item.storage_path,status:"synced"}),listByRecord:async()=>[{clientUuid:"preventive-remote",storagePath:"preventive-controls/work-1/control-1/photo.jpg",status:"synced"}],getSignedUrlSafe:async()=>""}};
  const document={addEventListener(){}};
  vm.runInNewContext(read("src/evidence-gallery.js"),{window,document,navigator:window.navigator,URL,console});
  const rows=await window.GraviEvidenceGallery.collect("work-1");
  assert.ok(rows.some(item=>item.clientUuid==="work-remote"),"La galeria debe incluir evidencia remota de obra");
  assert.ok(rows.some(item=>item.clientUuid==="preventive-remote"),"La galeria debe incluir evidencia remota preventiva");
}

async function testCorrectionCancel(){
  let updates=0,createdInput;
  const window={addEventListener(){},GraviRepositories:{preventiveControls:{update:async()=>{updates++;}}},GraviEvidenceManager:{},GraviSystemContext:{},GraviSupabase:{canPermission:()=>true}};
  const document={body:{},querySelector:()=>null,addEventListener(){},createElement:()=>createdInput={click(){},files:[]}};
  vm.runInNewContext(read("src/preventive-observations.js"),{window,document,console,crypto:require("node:crypto").webcrypto,prompt(){}});
  await window.GraviPreventiveObservations.selectAndSaveCorrection({id:"control-1",work_id:"work-1"});
  assert.ok(createdInput?.onchange,"El selector debe quedar preparado");assert.equal(updates,0,"Cancelar el selector no debe cambiar el estado");
}

(async()=>{
  await testRemoteRecovery();await testRemoteGallery();await testCoordinator();await testParentAndUploadMutex();await testCorrectionCancel();
  const queue=read("src/offline-evidence-queue.js"),preventive=read("src/preventive-observations.js"),relations=read("src/evidence-relations.js"),system=read("src/system.js"),supabase=read("src/supabase.js"),sql=read("database/preventive_controls_evidence_v2.sql"),storage=read("database/evidence_storage_assignment_v41_1.sql"),sw=read("service-worker.js");
  assert.ok(queue.includes("recoverAbandoned")&&queue.includes("120000"));
  const queueWindow={};vm.runInNewContext(queue,{window:queueWindow,console,queueMicrotask});const check=queueWindow.GraviOfflineEvidenceQueue.isAbandoned,now=Date.parse("2026-07-15T12:05:00Z");assert.equal(check({status:"uploading",updatedAt:"2026-07-15T12:02:59Z"},120000,now),true);assert.equal(check({status:"uploading",updatedAt:"2026-07-15T12:04:00Z"},120000,now),false);assert.equal(check({status:"pending",updatedAt:"2026-07-15T12:00:00Z"},120000,now),false);
  assert.ok(preventive.indexOf("saveOffline(result.prepared")<preventive.lastIndexOf('status:"pending_validation",closed_at:timestamp'));
  assert.ok(preventive.includes("getAvailableCount(corrections)"));
  for(const module of ["incident","inspection","work_permit","daily_report"])assert.ok(relations.includes(`\"${module}\"`),`${module} no integra evidencia relacionada`);
  assert.ok(system.includes("openSource:(sourceModule,sourceEntryId)"));
  for(const column of ["responsible_name","notes","captured_at","closed_at","closed_by","validated_at","validated_by"])assert.ok(sql.includes(column),`${column} ausente`);
  for(const [formField,column] of [["responsibleName","responsible_name"],["notes","notes"],["capturedAt","captured_at"]]){assert.ok(preventive.includes(`name=\"${formField}\"`),`${formField} ausente del formulario`);assert.ok(supabase.includes(`${column}:`),`${column} ausente del mapeo`);}
  for(const field of ["closed_at","closed_by","validated_at","validated_by"])assert.ok(supabase.includes(`${field}:`),`${field} no se persiste`);
  assert.ok(supabase.includes('sync_status:"synced"'));assert.ok(supabase.includes("listBySource:async(sourceModule,sourceEntryId)"));
  assert.ok(sql.includes("enforce_gravi_evidence_immutability"));assert.ok(sql.includes("work_user_assignments"));
  assert.ok(storage.includes("storage.foldername(name))[2]"));assert.ok(storage.includes("owner_id=auth.uid()::text"));assert.ok(!storage.includes("drop policy if exists work_permits"));
  assert.ok(sw.includes("gravi-sst-v2-shell-v51"));assert.equal((sw.match(/print-documents\.css\?v=34/g)||[]).length,0);
  console.log("Recuperacion remota, precedencia local, mutex, orden de sincronizacion, correccion, RLS, Storage y PWA V43 verificados.");
})().catch(error=>{console.error(error);process.exitCode=1;});
