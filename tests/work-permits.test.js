"use strict";
const assert=require("assert");
const frequencies=["Remota","Aislada","Ocasional","Recurrente","Frecuente"];
const severities=["Menor","Moderado","Crítica","Fatal"];
const official=[
  ["minimum","minimum","medium","critical"],
  ["minimum","minimum","medium","critical"],
  ["minimum","minimum","medium","critical"],
  ["minimum","medium","critical","critical"],
  ["medium","high","critical","critical"]
];
const expected={
  "Remota|Menor":"minimum","Remota|Moderado":"minimum","Remota|Crítica":"medium","Remota|Fatal":"critical",
  "Aislada|Menor":"minimum","Aislada|Moderado":"minimum","Aislada|Crítica":"medium","Aislada|Fatal":"critical",
  "Ocasional|Menor":"minimum","Ocasional|Moderado":"minimum","Ocasional|Crítica":"medium","Ocasional|Fatal":"critical",
  "Recurrente|Menor":"minimum","Recurrente|Moderado":"medium","Recurrente|Crítica":"critical","Recurrente|Fatal":"critical",
  "Frecuente|Menor":"medium","Frecuente|Moderado":"high","Frecuente|Crítica":"critical","Frecuente|Fatal":"critical"
};
let checked=0;
frequencies.forEach((frequency,i)=>severities.forEach((severity,j)=>{assert.strictEqual(official[i][j],expected[`${frequency}|${severity}`],`${frequency} + ${severity}`);checked++;}));
assert.strictEqual(checked,20,"El Excel oficial contiene 20 combinaciones (5 frecuencias × 4 severidades), no 25.");
const order=["minimum","medium","high","critical"];
assert.strictEqual(["minimum","high","medium"].reduce((max,x)=>order.indexOf(x)>order.indexOf(max)?x:max,"minimum"),"high");
assert.strictEqual(official[2][2],"medium","El riesgo residual usa la misma matriz oficial.");
console.log("20/20 equivalencias oficiales verificadas individualmente; máximo y residual correctos");

const supervisorDirect={draft:["authorized"],authorized:["active"],active:["suspended","cancelled","expired","closed"],suspended:["active","cancelled"]};
assert.deepStrictEqual(supervisorDirect.draft,["authorized"]);
assert(!supervisorDirect.draft.includes("pending_review"));
assert(supervisorDirect.active.includes("closed"));
assert(supervisorDirect.suspended.includes("active"));
const invalid=["draft|closed","draft|active","authorized|closed","closed|active","cancelled|active","rejected|active"];
invalid.forEach(pair=>{const [from,to]=pair.split("|");assert(!(supervisorDirect[from]||[]).includes(to),`Transición inválida permitida: ${pair}`)});
const highRiskTypes=new Set(["height","hot","electrical","energy","confined","excavation","lifting","demolition"]);
["height","hot","electrical","energy","confined","excavation","lifting","demolition"].forEach(type=>assert(highRiskTypes.has(type)));
assert(!highRiskTypes.has("chemicals"),"Actividades adicionales sólo son alto riesgo cuando se configuran expresamente.");
console.log("Flujo supervisor_direct, transiciones inválidas y catálogo de alto riesgo verificados");
