"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),{webcrypto}=require("node:crypto");
const root=path.resolve(__dirname,".."),source=fs.readFileSync(path.join(root,"src/evidence-manager.js"),"utf8"),queueSource=fs.readFileSync(path.join(root,"src/offline-evidence-queue.js"),"utf8"),legacy=fs.readFileSync(path.join(root,"src/legacy-capture-adapter.js"),"utf8"),sql=fs.readFileSync(path.join(root,"database/preventive_controls_evidence_v2.sql"),"utf8");
const listeners={},document={createElement:null,querySelector:()=>null,body:{append(){},classList:{add(){},remove(){}}}},window={crypto:webcrypto,navigator:{onLine:false},addEventListener:(name,fn)=>{listeners[name]=fn},GraviLegacyCaptureAdapter:{hasAvailablePhoto:item=>/^data:image\/(jpeg|png|webp);base64,/i.test(item?.photo||"")}};
const sandbox={window,document,navigator:window.navigator,crypto:webcrypto,Blob,URL,console,fetch};vm.createContext(sandbox);vm.runInContext(queueSource,sandbox);vm.runInContext(source,sandbox);
const manager=window.GraviEvidenceManager;
for(const name of ["selectFiles","prepareImages","renderPreview","removePreparedFile","saveOffline","uploadPending","getSignedUrl","openViewer","listByRecord","retry","getAvailableCount"])assert.equal(typeof manager[name],"function",`${name} ausente`);
const image=(bytes,type,name)=>{const blob=new Blob([Uint8Array.from(bytes)],{type});Object.defineProperty(blob,"name",{value:name});return blob;};
(async()=>{
  const jpeg=image([0xff,0xd8,0xff,0xe0,0,0,0,0,0,0,0,0],"image/jpeg","foto.jpg"),png=image([0x89,0x50,0x4e,0x47,0,0,0,0,0,0,0,0],"image/png","foto.png"),bad=image([1,2,3,4,5,6,7,8,9,10,11,12],"image/jpeg","falsa.jpg");
  const valid=await manager.prepareImages([jpeg,png]);assert.equal(valid.prepared.length,2);assert.equal(valid.rejected.length,0);assert.notEqual(valid.prepared[0].clientUuid,valid.prepared[1].clientUuid);
  const invalid=await manager.prepareImages([bad]);assert.equal(invalid.prepared.length,0);assert.equal(invalid.rejected.length,1);
  const seven=await manager.prepareImages([jpeg,jpeg,jpeg,jpeg,jpeg,jpeg,jpeg]);assert.equal(seven.prepared.length,6);assert.equal(seven.rejected.length,1);
  assert.equal(manager.getAvailableCount([{blob:jpeg},{storagePath:"x"},{photo:"data:image/jpeg;base64,AA=="},{photo:""},{deletedAt:"x",storagePath:"y"}]),3);
  assert.ok(!source.includes("localStorage"),"El administrador no debe guardar blobs en localStorage");assert.ok(queueSource.includes("evidenceFiles")&&queueSource.includes("evidenceQueue"));
  assert.ok(sql.includes("client_uuid text not null unique"));assert.ok(sql.includes("public.preventive_control_evidence"));assert.ok(sql.includes("public.work_evidence"));assert.ok(sql.includes("enable row level security"));assert.ok(!sql.match(/to\s+anon/i));
  assert.ok(legacy.includes("DATA_IMAGE"));assert.ok(!/item\.photo\s*=(?!=)/.test(legacy));
  console.log("20/20 selección, MIME, límites, disponibilidad, offline, UUID y SQL de evidencias verificados.");
})().catch(error=>{console.error(error);process.exitCode=1;});
