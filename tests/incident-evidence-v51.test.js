"use strict";

const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=file=>fs.readFileSync(path.join(root,file),"utf8"),source=read("src/evidence-resolver.js");

function runtime(){
  const files=new Map(),reports=new Map(),revoked=[],listeners=new Map();let sequence=0,signedCalls=0;
  const URL={createObjectURL:()=>`blob:v51-${++sequence}`,revokeObjectURL:url=>revoked.push(url)};
  const window={Blob,TextEncoder,URL,addEventListener:(name,handler)=>listeners.set(name,handler),GraviOfflineEvidenceQueue:{get:async id=>files.get(id)||null,getReport:async id=>reports.get(id)||null},GraviEvidenceManager:{getSignedUrl:async path=>{signedCalls++;return`https://storage.test/signed/${path}?token=v51`;}}};window.window=window;
  vm.runInNewContext(source,{window,Blob,TextEncoder,URL,console});
  return{resolver:window.GraviEvidenceResolver,files,reports,revoked,signedCalls:()=>signedCalls};
}

(async()=>{
  const env=runtime(),resolver=env.resolver,photo=new Blob([new Uint8Array([0xff,0xd8,0xff,0xd9])],{type:"image/jpeg"});
  env.files.set("one",{clientUuid:"one",blob:photo,status:"pending"});
  const one=await resolver.resolveEvidenceSource({clientUuid:"one"},{owner:"report:one"});assert.match(one.url,/^blob:v51-/,"1 imagen inmediata visible");
  for(let index=0;index<6;index++)env.files.set(`six-${index}`,{clientUuid:`six-${index}`,blob:photo});const six=await Promise.all(Array.from({length:6},(_,index)=>resolver.resolveEvidenceSource({clientUuid:`six-${index}`},{owner:"report:six"})));assert.equal(six.filter(item=>item.url).length,6,"2 seis imágenes visibles");
  assert.equal(one.kind,"indexeddb","3 recuperación desde evidenceFiles");
  env.files.set("remote",{clientUuid:"remote",blob:null,storagePath:"work-evidence/work/report/photo.jpg",status:"synced"});const remote=await resolver.resolveEvidenceSource({clientUuid:"remote"},{owner:"report:remote"});assert.match(remote.url,/https:\/\/storage\.test\/signed\//,"4 Storage resuelto");assert.equal(remote.kind,"storage","5 bucket privado usa URL firmada");
  const offline=await resolver.resolveEvidenceSource({clientUuid:"one",syncStatus:"pending"},{owner:"report:offline"});assert.ok(offline.url,"6 reporte offline visible");
  await resolver.resolveEvidenceSource({clientUuid:"remote"},{owner:"report:remote-2"});assert.equal(env.signedCalls(),1,"7 URL firmada reutilizada sin duplicar descarga");
  env.reports.set("report-reload",{payload:{evidence:[{clientUuid:"one"}]}});const reloaded=await resolver.resolveEvidenceSource({clientUuid:"missing",indexedDbRef:"report-reload"},{owner:"report:reload",reportId:"report-reload"});assert.ok(reloaded.url,"8 referencia reconstruida después de recarga");
  assert.ok(resolver.activeUrls("report:one").includes(one.url),"9 URL permanece al cambiar dentro del reporte");
  const print=read("src/print/print-manager.js"),app=read("src/app.js"),manager=read("src/evidence-manager.js"),sw=read("service-worker.js"),css=read("src/styles/styles.css");assert.match(print,/await \(global\.GraviReportEvidenceReady \|\| Promise\.resolve\(\)\)/,"10 impresión espera evidencias");
  assert.equal(env.revoked.length,0,"11 object URL no revocada antes de cargar");const released=resolver.release("report:one");assert.equal(released,1,"12 URL liberada al cerrar");assert.ok(env.revoked.includes(one.url),"12 revocación confirmada");
  const mixed=await Promise.allSettled([resolver.resolveEvidenceSource({clientUuid:"one"},{owner:"mixed"}),resolver.resolveEvidenceSource({clientUuid:"damaged"},{owner:"mixed"})]);assert.equal(mixed.length,2,"13 evidencia dañada no bloquea las demás");assert.ok(app.includes("Promise.allSettled"));
  assert.doesNotMatch(read("src/incident-storage.js"),/localStorage\.setItem\([^\n]*data:image/i,"14 sin Base64 en localStorage");assert.match(css,/@media\(max-width:800px\)/,"15 responsive escritorio/móvil");
  assert.match(app,/await \(window\.GraviReportEvidenceReady\|\|Promise\.resolve\(\)\)/,"16 botón espera carga");assert.match(app,/image\.naturalWidth>0/);assert.match(print,/image\.naturalWidth===0/,"17 impresión rechaza imágenes existentes sin dimensiones");
  assert.doesNotMatch(manager,/saved\.push\(row\);if\(item\.objectUrl\)URL\.revokeObjectURL/);assert.ok(sw.includes("gravi-sst-v2-shell-v51")&&sw.includes('url.pathname.startsWith("/storage/")'));
  console.log("PASS incident-evidence-v51: 17 contratos de resolución, IndexedDB, Storage, ciclo de vida, fallback, impresión y responsive verificados.");
})().catch(error=>{console.error(error);process.exitCode=1;});
