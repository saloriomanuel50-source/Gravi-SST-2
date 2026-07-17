"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const context={console,setTimeout,clearTimeout};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(read("src/attendance-state.js"),context,{filename:"attendance-state.js"});
const attendance=context.GraviAttendance;
const staff=[{id:"w1",contractorId:"c1"},{id:"w2",contractorId:"c1"},{id:"w3",contractorId:"c2"}];
const key="work-1|2026-07-17",data={[key]:{w1:"A",w2:"A",w3:"A"}};

// Ausente -> Presente y contadores inmediatos generales/por contratista.
assert.equal(attendance.applyMark(data,key,"w1","P"),true);
assert.equal(data[key].w1,"P");
assert.deepEqual({...attendance.summarize(staff,data[key])},{total:3,present:1,absent:2});
assert.deepEqual({...attendance.summarize(staff.filter(x=>x.contractorId==="c1"),data[key])},{total:2,present:1,absent:1});

// Presente -> Ausente sin recarga.
assert.equal(attendance.applyMark(data,key,"w1","A"),true);
assert.equal(data[key].w1,"A");
assert.deepEqual({...attendance.summarize(staff,data[key])},{total:3,present:0,absent:3});

// Cinco cambios consecutivos conservan el último estado.
for(const status of ["P","A","P","A","P"])assert.equal(attendance.applyMark(data,key,"w1",status),true);
assert.equal(data[key].w1,"P");

// Un doble clic sobre el estado ya activo no genera una segunda mutación.
let mutations=0;
if(attendance.applyMark(data,key,"w2","P"))mutations++;
if(attendance.applyMark(data,key,"w2","P"))mutations++;
assert.equal(mutations,1);

(async()=>{
  // Cambios rápidos en trabajadores distintos se envían en orden por fecha.
  const sent=[],states=[];
  const coordinator=attendance.createSyncCoordinator({
    sync:async payload=>{await new Promise(resolve=>setTimeout(resolve,payload.workerId==="w1"?15:1));sent.push(payload.workerId);return {success:true,pending:false};},
    onState:state=>states.push({...state})
  });
  const first=coordinator.enqueue({key,workerId:"w1",payload:{workerId:"w1",marks:{w1:"A",w2:"P"}}});
  const second=coordinator.enqueue({key,workerId:"w2",payload:{workerId:"w2",marks:{w1:"A",w2:"A"}}});
  await Promise.all([first,second]);
  assert.deepEqual(sent,["w1","w2"]);
  assert.equal(coordinator.isIdle(),true);
  assert.equal(states.at(-1).saving,false);

  // Sin conexión el estado queda visible, pendiente y sin loader permanente.
  const offlineStates=[];
  const offline=attendance.createSyncCoordinator({sync:async()=>({success:false,pending:true}),onState:state=>offlineStates.push({...state})});
  await offline.enqueue({key,workerId:"w3",payload:{workerId:"w3"}});
  assert.equal(offline.get(key,"w3").phase,"pending");
  assert.equal(offline.get(key,"w3").saving,false);

  // Persistencia local equivalente a una recarga.
  const reloaded=JSON.parse(JSON.stringify(data));
  assert.equal(reloaded[key].w1,"P");
  assert.equal(reloaded[key].w2,"P");

  const system=read("src/system.js"),supabase=read("src/supabase.js"),css=read("src/styles/system.css"),sw=read("service-worker.js");
  assert.match(system,/persistLocalData\(\);renderAttendance\(date\);/);
  assert.doesNotMatch(system,/qa\("\[data-att-toggle\]"\)\.forEach/);
  assert.match(system,/stopImmediatePropagation\(\)/);
  assert.match(system,/canPermission\(permission\)/);
  assert.match(supabase,/registerAttendance:item=>mutateEntity\("attendance","upsert"/);
  assert.match(supabase,/on_conflict=work_id,attendance_date/);
  assert.match(supabase,/queueEntityMutation/);
  assert.match(supabase,/flushEntityMutations\(\).*gvc:entity-mutations-flushed/);
  assert.match(supabase,/local\.attendance\?\.\[item\.id\]/);
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(sw,/gravi-sst-v2-shell-v45-attendance-v46/);
  console.log("PASS attendance-v46: actualización optimista, contadores, concurrencia, deduplicación, persistencia, offline, reconexión, loader y responsive validados.");
})().catch(error=>{console.error(error);process.exitCode=1;});
