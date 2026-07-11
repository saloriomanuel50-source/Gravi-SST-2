"use strict";
const assert=require("assert"),fs=require("fs");
const js=fs.readFileSync("src/signatures.js","utf8"),css=fs.readFileSync("src/styles/signatures.css","utf8"),sql=fs.readFileSync("database/document_signatures.sql","utf8"),permit=fs.readFileSync("src/work-permits.js","utf8");
["onpointerdown","onpointermove","onpointerup","onpointercancel","devicePixelRatio","toBlob","image/png","strokesData","acceptanceConfirmed","indexedDB"].forEach(token=>assert(js.includes(token),`Falta ${token}`));assert(css.includes("touch-action:none"));
["contractor_responsible","sst_supervisor","closure_contractor","closure_sst"].forEach(slot=>assert(js.includes(slot),`Falta slot ${slot}`));
["document_signatures","document_signature_events","client_uuid","document_content_hash","invalidated_at","captured_in_presence_of_user_id","signature_status"].forEach(token=>assert(sql.includes(token),`Falta SQL ${token}`));
assert(permit.includes("invalidateChangedSignatures"));assert(permit.includes("syncedSignature"));assert(permit.includes("Firma manuscrita capturada en dispositivo"));
console.log("Componente, slots, modelo, invalidación y guardas de sincronización verificados");
