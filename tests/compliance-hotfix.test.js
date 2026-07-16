"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const system=read("src/system.js"),supabase=read("src/supabase.js"),sql=read("database/compliance_hotfix_v43.sql");

function extractBetween(source,startMarker,endMarker){const start=source.indexOf(startMarker),end=source.indexOf(endMarker,start);assert.notEqual(start,-1,`${startMarker} no existe`);assert.notEqual(end,-1,`${endMarker} no existe`);return source.slice(start,end).trim();}
const calculateSource=extractBetween(system,"function calculateOperationalEntryStats(","function applyCriterionReviewStateV43(");
const applySource=extractBetween(system,"function applyCriterionReviewStateV43(","function operationalEntryStats(");
const {calculateOperationalEntryStats,applyCriterionReviewStateV43}=new Function(`${calculateSource}\n${applySource}\nreturn {calculateOperationalEntryStats,applyCriterionReviewStateV43};`)();
const criteria=statuses=>statuses.map((status,index)=>({id:`c-${index}`,label:`Criterio ${index}`,status}));

assert.deepEqual(calculateOperationalEntryStats(criteria(["Sin revisión","Sin revisión"])).status,"Sin revisión");
assert.equal(calculateOperationalEntryStats(criteria(["Sin revisión","Sin revisión"])).percentage,0);
const incomplete=calculateOperationalEntryStats(criteria(["Cumple",...Array(10).fill("Sin revisión")]));
assert.notEqual(incomplete.percentage,100);assert.equal(incomplete.status,"Parcial");
assert.equal(calculateOperationalEntryStats(criteria(["No aplica","No aplica"])).status,"No aplica");
assert.deepEqual(calculateOperationalEntryStats(criteria(["Cumple","Cumple"])),{percentage:100,status:"Cumple",counts:{"Cumple":2,"Parcial":0,"No cumple":0,"No aplica":0,"Sin revisión":0}});
assert.deepEqual(calculateOperationalEntryStats(criteria(["No cumple","No cumple"])).percentage,0);assert.equal(calculateOperationalEntryStats(criteria(["No cumple","No cumple"])).status,"No cumple");
assert.equal(calculateOperationalEntryStats(criteria(["Cumple","No cumple"])).status,"Parcial");

const entry={code:"NOM-030",criteria:[{id:"criterion-stable",label:"Criterio estable",status:"Sin revisión"}]},audit=[];
for(const [index,status] of ["Parcial","No cumple","Cumple"].entries()){
  const result=applyCriterionReviewStateV43(entry,"criterion-stable",{status,updatedAt:`2026-07-16T10:0${index}:00Z`},{id:`audit-${index+1}`});
  audit.push(result.audit);
}
assert.equal(entry.criteria[0].id,"criterion-stable");assert.equal(entry.criteria[0].status,"Cumple");assert.equal(new Set(audit.map(event=>event.id)).size,3);
assert.deepEqual(audit.map(event=>[event.previousStatus,event.newStatus]),[["Sin revisión","Parcial"],["Parcial","No cumple"],["No cumple","Cumple"]]);

const saveCriterion=extractBetween(system,"async function saveCriterionReview(","function criterionSnapshotAt(");
assert.match(saveCriterion,/await window\.GraviSupabase\.compliance\.saveEntry/);
assert.doesNotMatch(system,new RegExp(["saveCriterionReview","Legacy|saveComplianceEntry","Legacy"].join("")));
assert.match(supabase,/updateCompliance:item=>mutateEntity\("compliance","upsert","compliance\.edit",item\)/);
assert.match(supabase,/saveMonthlyCompliance:item=>mutateEntity\("compliance","upsert","compliance\.monthly_report",item\)/);
assert.match(supabase,/updateNomMatrix:item=>mutateEntity\("compliance","upsert","compliance\.nom_matrix",item\)/);
assert.match(supabase,/resolution=merge-duplicates,return=representation/);
assert.match(supabase,/result\.length!==1\|\|result\[0\]\?\.id!=="global"/);
assert.doesNotMatch(saveCriterion,/resizeImage|FileReader|readAsDataURL/);
assert.doesNotMatch(saveCriterion,/user:\s*"Administrador\s+GRAVI"/);
assert.match(saveCriterion,/finally\{if\(form\.isConnected\).*delete form\.dataset\.saving/);

for(const fragment of ["gravi_save_compliance_entry_v43","for update","has_gravi_permission('compliance.edit')","p_work_id","p_nom_code","criterion->>'id'","limit 500"]){assert.ok(sql.toLowerCase().includes(fragment.toLowerCase()),`SQL sin ${fragment}`);}

console.log("PASS compliance-hotfix: cálculo, tres actualizaciones, persistencia cliente y SQL V43 verificados.");
