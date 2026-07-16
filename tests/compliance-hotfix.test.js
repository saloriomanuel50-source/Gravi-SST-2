"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const system=read("src/system.js"),supabase=read("src/supabase.js"),sql=read("database/compliance_hotfix_v43.sql"),verifier=read("database/verify_compliance_hotfix_v43.sql"),permissions=read("database/permissions_release_v38.sql");

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

const fallbackSource=extractBetween(system,"function complianceFallbackPayloadV43(","function persistComplianceLocalV43(");
const fallback=new Function("data",`${fallbackSource}\nreturn complianceFallbackPayloadV43();`)({compliance:{obra:{}},complianceAudit:[{id:"a-1"}],complianceMatrix:{protected:true}});
assert.deepEqual(Object.keys(fallback).sort(),["compliance","complianceAudit"]);
assert.deepEqual(fallback.compliance,{obra:{}});assert.deepEqual(fallback.complianceAudit,[{id:"a-1"}]);assert.ok(!Object.hasOwn(fallback,"complianceMatrix"));

assert.doesNotMatch(sql,/\bset\s+payload\s*=\s*v_payload\b/i);
assert.match(sql,/\bv_patch\s+jsonb\s*;/i);
const patchStart=sql.indexOf("v_patch := jsonb_build_object("),patchEnd=sql.indexOf("update public.cumplimiento_estado",patchStart);
assert.ok(patchStart>0&&patchEnd>patchStart,"No se encontró la construcción delimitada de v_patch");
const patchConstruction=sql.slice(patchStart,patchEnd);
assert.match(patchConstruction,/v_patch\s*:=\s*jsonb_build_object\s*\(\s*'compliance'/i);
assert.doesNotMatch(patchConstruction,/complianceMatrix/i);
assert.match(sql,/return\s+v_payload\s*;/i);
assert.doesNotMatch(sql,/(drop|alter|disable)\s+trigger\s+gravi_v38_compliance_guard/i);

const supervisorContract=extractBetween(permissions,"when p_role='Supervisor SST'","when p_role='Consulta'");
assert.match(supervisorContract,/'compliance\.edit'/);assert.doesNotMatch(supervisorContract,/'compliance\.nom_matrix'/);
assert.equal((verifier.match(/\('(?:0[1-9]|1[0-9]|20)\s/g)||[]).length,20);
for(const number of ["16","17","18","19","20"]){assert.match(verifier,new RegExp(`\\('${number}\\s`));}

console.log("PASS compliance-hotfix: cálculo, tres actualizaciones, fallback supervisor-safe y 20 verificaciones SQL V43 validadas.");
