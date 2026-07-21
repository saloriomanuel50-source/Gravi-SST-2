function localDateISO(date = new Date()) { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 10); }
const criteria = [
  "Fácil acceso (no obstruido)", "Altura adecuada de montaje", "Colocación visible y señalizada",
  "Etiqueta legible", "Flecha del manómetro en zona verde", "Seguro y sello colocados",
  "Sin daños visibles en cilindro", "Boquilla y manguera en buen estado", "Peso adecuado", "Último servicio vigente"
];
const firstAidConditionLabels = [
  "Ubicado en lugar visible y accesible.",
  "Identificado con señalética.",
  "Limpio y ordenado.",
  "Sin obstrucciones.",
  "Lista de contenidos actualizada.",
  "Responsable asignado."
];
const firstAidCatalog = [
  [1, "Gasa estéril 10x10 C/100 pzas", 100],
  [2, "Tijera uso rudo 19 cm Hergom", 1],
  [3, "Venda elástica 5 cm", 2],
  [4, "Venda elástica 10 cm", 2],
  [5, "Venda elástica 15 cm", 2],
  [6, "Alcohol desnaturalizado 1000 ml", 1],
  [7, "Torunda de algodón 500 g / 1000 pzas", 1],
  [8, "Tela adhesiva 5 cm x 10 m", 6],
  [9, "Yodo espuma Dermodine 118 ml", 2],
  [10, "Sol. cloruro de sodio al 0.9% 500 ml", 2],
  [11, "Pinza Kelly recta 14 cm / acero inoxidable", 1],
  [12, "Hisopos de algodón bolsa 100 pzas", 100],
  [13, "Guante de látex no estéril Ambiderm Plus blanco C/100 pzas", 100],
  [14, "Apósito gasa 20 cm x 8 cm C/10 pzas", 10],
  [15, "Termómetro digital punta rígida", 1],
  [16, "Cinta Micropore 3M C/6 pzas", 6],
  [17, "Jabón quirúrgico 950 ml", 1],
  [18, "Abatelenguas de madera C/25 pzas", 25],
  [19, "Torniquete táctico para emergencia con hebilla ajustable", 2],
  [20, "Baumanómetro aneroide rojo Hergom", 1],
  [21, "Oxímetro de pulso Xignal adulto y pediátrico", 1],
  [22, "Lámpara tipo pluma de diagnóstico Super Confort", 1],
  [23, "Pomada Nitrofural", 1],
  [24, "Pomada diclofenaco", 1],
  [25, "Pastillas Cloropiramina / Abapena 20 pzas", 20],
  [26, "Pastillas Loratadina 20 pzas", 20],
  [27, "Botiquín mochila 52 x 23 x 30 cm", 1]
];
const commonPpe = ["Casco con barbiquejo","Lentes / goggles","Careta facial","Careta para soldar","Chaleco de alta visibilidad clase II","Protección auditiva","Máscara con filtro / desechable","Uniforme","Faja","Traje Tyvek","Mandil de plástico","Zapato de seguridad","Mangas de Kevlar","Guantes de piel / carnaza","Guantes de hule / neopreno","Guantes anticorte","Guantes de tela con neopreno","Otros"];
const equipmentConfigs = {
  tableSaw: {
    code:"GVC-SSH-FMT-005", title:"Inspección de sierra de banco", reportTitle:"INSPECCIÓN DE SIERRA DE BANCO",
    fields:[["contractor","Compañía contratista","text"],["year","Año","number"],["number","Número","text"],["work","Trabajo ejecutado","text"],["serial","N.º de serie","text"],["brand","Marca","text"],["model","Modelo","text"],["date","Fecha de inspección","date"],["inspector","Inspector","text"]],
    criteria:["Estructura general","Enchufe aislado","Cordón","Cable de PVC + PVC calibre 12","Switch","Mango","Guarda de seguridad","Gatillo","Carcaza","Aislamiento","Seguro de disco","Elemento de corte (disco)","Estabilidad en el banco","A la altura de la cintura"], ppe:commonPpe
  },
  grinder: {
    code:"GVC-SSH-FMT-007", title:"Inspección de esmeril angular", reportTitle:"INSPECCIÓN DE ESMERIL ANGULAR",
    fields:[["contractor","Compañía contratista","text"],["year","Año","number"],["number","Número","text"],["work","Trabajo ejecutado","text"],["serial","N.º de serie","text"],["capacity","Capacidad","text"],["model","Modelo","text"],["brand","Marca","text"],["manufactureYear","Año de fabricación","number"],["inspector","Inspector","text"],["date","Fecha de inspección","date"]],
    criteria:["Estructura general","Enchufe aislado","Cordón","Cable de PVC + PVC calibre 12","Pasacordón","Mango","Guarda de seguridad","Gatillo","Clavija","Aislamiento","Seguro de disco","Elemento de corte / desbaste (disco)","Carcaza","Seguro","Switch"], ppe:commonPpe
  },
  extensionCord: {
    code:"GVC-SSH-FMT-008", title:"Inspección de extensión eléctrica", reportTitle:"INSPECCIÓN DE EXTENSIÓN ELÉCTRICA",
    fields:[["contractor","Compañía contratista","text"],["year","Año","number"],["number","Número","text"],["work","Trabajo ejecutado","text"],["length","Largo","text"],["date","Fecha de inspección","date"],["inspector","Inspector","text"]],
    criteria:["Estructura general","Clavija","Tapa de uso rudo","Cable de PVC + PVC calibre 12","Pasacordón","Tapa de protección contra humedad","Forro"], ppe:[]
  }
};
const WORK_SCOPE = localStorage.getItem("gvc-active-work-id") || "legacy";
const STORAGE_DRAFT = `gvc-extintores-draft-v1-${WORK_SCOPE}`;
const STORAGE_FIRST_AID_DRAFT = `gvc-botiquin-draft-v1-${WORK_SCOPE}`;
const STORAGE_INCIDENT_DRAFT = `gvc-reporte-seguridad-draft-v1-${WORK_SCOPE}`;
const STORAGE_RECORDS = "gvc-extintores-records-v1";
let evidence = [];
let firstAidEvidence = [];
let equipmentEvidence = [];
let incidentEvidence = [];
let currentEquipmentType = null;
let currentRecord = null;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const form = $("#inspectionForm");
const firstAidForm = $("#firstAidForm");
const equipmentForm = $("#equipmentForm");
const incidentForm = $("#incidentForm");
let activeReportEvidenceOwner="";

function showView(id) {
  if(id!=="reportView"&&activeReportEvidenceOwner){window.GraviEvidenceResolver?.release?.(activeReportEvidenceOwner);activeReportEvidenceOwner="";}
  $$(".view").forEach(v => v.classList.toggle("active", v.id === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "homeView") renderRecent();
  if (id === "historyView") renderHistory();
}
function toast(message) {
  const el = $("#toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}
function showStep(step) {
  $$(".form-step").forEach(el => el.classList.toggle("active", Number(el.dataset.step) === step));
  $$(".steps button").forEach(el => el.classList.toggle("active", Number(el.dataset.stepTarget) === step));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
const MAX_EVIDENCE_FILES = 8;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
function evidenceItem(item = {}) {
  if (typeof item === "string") return { id: crypto.randomUUID(), src:item, comment:"", syncStatus:"local", createdAt:new Date().toISOString() };
  if ((typeof Blob !== "undefined" && item instanceof Blob) || (typeof File !== "undefined" && item instanceof File)) return { id:crypto.randomUUID(), clientUuid:"", blob:item, src:"", comment:"", syncStatus:"local", createdAt:new Date().toISOString() };
  return { ...item, id:item.id || item.clientUuid || crypto.randomUUID(), clientUuid:item.clientUuid || item.id || "", src:item.src || item.objectUrl || item.dataUrl || item.url || "", comment:item.comment || item.caption || "", syncStatus:item.syncStatus || item.status || (item.storagePath ? "synced" : "local"), storagePath:item.storagePath || "", storageUrl:item.storageUrl || "", createdAt:item.createdAt || new Date().toISOString(), updatedAt:item.updatedAt || "" };
}
function normalizeEvidenceList(list = []) { return list.map(evidenceItem).filter(item => evidenceSrc(item) || item.blob || item.clientUuid || item.storagePath || item.storage_path || item.publicUrl || item.public_url || item.signedUrl || item.signed_url || item.indexedDbRef || item.reportId || item.report_id); }
function evidenceSrc(item) { return typeof item === "string" ? item : item?.src || item?.objectUrl || item?.storageUrl || ""; }
function evidenceComment(item) { return typeof item === "string" ? "" : item?.comment || ""; }
function evidenceStatus(item) { const value=typeof item === "string" ? "local" : item?.syncStatus || "local"; return value === "synced" ? "Sincronizada" : value === "error" ? "Pendiente de reintento" : "Pendiente de sincronizar"; }
function reportEvidenceState(message,ready=false){const toolbar=$("#reportView .report-toolbar"),button=$("#printButton");if(toolbar){const strong=$("strong",toolbar),small=$("small",toolbar);if(strong)strong.textContent=ready?"Reporte listo":"Cargando evidencia…";if(small)small.textContent=message;}if(button)button.disabled=!ready;}
function loadReportImage(url,alt){return new Promise((resolve,reject)=>{const image=new Image(),timer=setTimeout(()=>{image.src="";reject(new Error("Tiempo de carga agotado."));},12000);image.alt=alt;image.decoding="async";image.onload=()=>{clearTimeout(timer);if(image.naturalWidth>0)resolve(image);else reject(new Error("La imagen no contiene dimensiones válidas."));};image.onerror=()=>{clearTimeout(timer);reject(new Error("No fue posible decodificar la imagen."));};image.src=url;});}
async function hydrateReportEvidence(items,token,owner,reportId){const section=$(`[data-report-evidence="${token}"]`),list=normalizeEvidenceList(items);if(!section)return[];const results=await Promise.allSettled(list.map(async(item,index)=>{const figure=$(`[data-report-evidence-item="${index}"]`,section),placeholder=$("[data-evidence-placeholder]",figure);const resolved=await window.GraviEvidenceResolver.resolveEvidenceSource(item,{owner,reportId});if(!resolved.url){placeholder.className="report-evidence-fallback";placeholder.innerHTML=`<b>Evidencia no disponible</b><small>${escapeHtml(resolved.reason||"referencia no encontrada")}</small>`;return{ok:false,reason:resolved.reason};}try{const image=await loadReportImage(resolved.url,`Evidencia ${index+1}`);placeholder.replaceWith(image);return{ok:true,url:resolved.url,kind:resolved.kind,naturalWidth:image.naturalWidth};}catch(error){console.error(`[GRAVI Report:evidence:${index}]`,error);placeholder.className="report-evidence-fallback";placeholder.innerHTML=`<b>Evidencia no disponible</b><small>${escapeHtml(item.syncStatus==="pending"?"archivo pendiente de sincronización":resolved.kind==="storage"?"error de descarga":"formato no compatible")}</small>`;return{ok:false,reason:error.message};}}));const visible=results.filter(result=>result.status==="fulfilled"&&result.value.ok).length;reportEvidenceState(visible===list.length?"Todas las evidencias están disponibles.":`${visible} de ${list.length} evidencias disponibles.`,true);window.dispatchEvent(new CustomEvent("gvc:report-evidence-ready",{detail:{reportId,visible,total:list.length}}));return results;}
function evidenceReportMarkup(items = []) {
  const list = normalizeEvidenceList(items);
  if(!list.length){window.GraviReportEvidenceReady=Promise.resolve([]);return"";}const token=crypto.randomUUID(),owner=`report:${currentRecord?.id||token}`,reportId=currentRecord?.id||"";if(activeReportEvidenceOwner&&activeReportEvidenceOwner!==owner)window.GraviEvidenceResolver?.release?.(activeReportEvidenceOwner);activeReportEvidenceOwner=owner;reportEvidenceState(`Resolviendo ${list.length} evidencia(s)…`,false);window.GraviReportEvidenceReady=new Promise(resolve=>setTimeout(()=>hydrateReportEvidence(list,token,owner,reportId).then(resolve),0));return `<div class="report-band">Apoyo Visual</div><div class="report-evidence evidence-report-grid" data-report-evidence="${token}">${list.map((item,index)=>`<figure data-report-evidence-item="${index}"><div class="report-evidence-loading" data-evidence-placeholder>Cargando evidencia…</div><figcaption>${escapeHtml(evidenceComment(item) || `Evidencia ${index+1}`)}</figcaption></figure>`).join("")}</div>`;
}
function renderEvidenceList(list, selector, removeAttr, saveFn) {
  const normalized = normalizeEvidenceList(list);
  list.splice(0, list.length, ...normalized);
  const target = $(selector);
  target.innerHTML = normalized.map((item, index) => `<div class="evidence-item"><img src="${evidenceSrc(item)}" alt="Evidencia ${index+1}"><button type="button" data-${removeAttr}="${index}" aria-label="Eliminar evidencia">×</button><label class="evidence-comment">Comentario breve<textarea rows="2" data-evidence-comment="${index}" maxlength="180" placeholder="Describe la evidencia">${escapeHtml(evidenceComment(item))}</textarea></label><small class="evidence-sync-status">${evidenceStatus(item)}</small></div>`).join("");
  $$(`[data-${removeAttr}]`).forEach(button => button.onclick = () => { list.splice(Number(button.getAttribute(`data-${removeAttr}`)), 1); renderEvidenceList(list, selector, removeAttr, saveFn); saveFn(true); });
  $$("[data-evidence-comment]", target).forEach(input => input.oninput = () => { const item=list[Number(input.dataset.evidenceComment)]; if (!item) return; item.comment=input.value.trim(); item.updatedAt=new Date().toISOString(); saveFn(true); });
}
function prepareEvidenceInputs() {
  ["#evidenceInput","#firstAidEvidenceInput","#equipmentEvidenceInput","#incidentEvidenceInput"].forEach(selector => {
    const input = $(selector);
    if (!input) return;
    input.accept = "image/*";
    input.multiple = true;
    input.setAttribute("data-supports-camera", "true");
    input.closest(".upload-zone")?.querySelector("span")?.insertAdjacentHTML("beforeend", " · cámara o galería");
  });
}
async function createEvidenceFromFile(file) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name}: selecciona únicamente imágenes.`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}: supera el límite de 12 MB.`);
  const result = await window.GraviEvidenceManager.prepareImages([file], {maxFiles:1});
  if (!result.prepared.length) throw new Error(result.rejected[0]?.message || `${file.name}: no se pudo preparar.`);
  const prepared=result.prepared[0];
  return {...prepared,id:prepared.clientUuid,src:prepared.objectUrl,comment:"",syncStatus:"local",compressedSize:prepared.sizeBytes};
}
async function addEvidenceFiles(event, list, limit, renderFn, saveFn) {
  const files = [...event.target.files];
  const available = Math.max(0, limit - list.length);
  let added = 0;
  if (!available) { toast(`Máximo ${limit} fotografías por registro.`); event.target.value = ""; return; }
  for (const file of files.slice(0, available)) {
    try { list.push(await createEvidenceFromFile(file)); added += 1; }
    catch (error) { toast(error.message || "No se pudo cargar una imagen."); }
  }
  if (files.length > available) toast(`Solo se agregaron ${available} fotografía(s); límite ${limit}.`);
  if (added) window.dispatchEvent(new CustomEvent("gvc:evidence-added", { detail: { count:added, target:event.target.id } }));
  renderFn(); saveFn(true); event.target.value = "";
}
function nowDefaults() {
  const now = new Date();
  form.elements.date.value ||= localDateISO(now);
  form.elements.startTime.value ||= now.toTimeString().slice(0, 5);
}
function addExtinguisher(data = {}) {
  const list = $("#extinguisherList");
  if (list.children.length >= 7) {
    updateExtinguisherLimit();
    return toast("Este reporte ya contiene el máximo de siete extintores.");
  }
  const index = list.children.length;
  const groupId = crypto.randomUUID();
  const card = document.createElement("article"); card.className = "extinguisher-card";
  card.innerHTML = `<div class="extinguisher-head"><strong>Extintor ${index + 1}</strong><button class="remove-ext" type="button">Eliminar</button></div>
    <div class="extinguisher-body"><div class="equipment-grid">
      <label>Número<input data-field="number" required value="${escapeHtml(data.number)}" placeholder="Ej. EXT-01"></label>
      <label>Tipo<select data-field="type" required><option value="">Selecciona</option>${["Agua","P.Q.S","CO2","Otro"].map(x=>`<option ${data.type===x?"selected":""}>${x}</option>`).join("")}</select></label>
      <label>Capacidad<input data-field="capacity" required value="${escapeHtml(data.capacity)}" placeholder="Ej. 4.5 kg"></label>
      <label>Ubicación<input data-field="location" required value="${escapeHtml(data.location)}" placeholder="Zona exacta"></label>
      <label>Fecha último servicio<input data-field="lastService" type="date" value="${escapeHtml(data.lastService)}"></label>
      <label>Próximo servicio<input data-field="nextService" type="date" value="${escapeHtml(data.nextService)}"></label>
      <label>Peso OK<select data-field="weightOk"><option value="Sí" ${data.weightOk==="Sí"?"selected":""}>Sí</option><option value="No" ${data.weightOk==="No"?"selected":""}>No</option></select></label>
      <label class="notes">Observaciones<input data-field="notes" value="${escapeHtml(data.notes)}" placeholder="Hallazgos del equipo"></label>
    </div><div class="criteria"><h3>Condiciones generales</h3>${criteria.map((label, i) => criterionMarkup(label, i, data.criteria?.[i], groupId)).join("")}</div></div>`;
  card.querySelector(".remove-ext").onclick = () => { card.remove(); renumber(); saveDraft(true); };
  list.appendChild(card); renumber();
}
function criterionMarkup(label, i, selected = "", groupId) {
  return `<div class="criterion-row"><p>${label}</p><div class="criterion-options">${[["Sí","✓ Sí"],["No","✕ No"],["N/A","N/A"]].map(([v,t])=>`<label><input type="radio" name="criterion-${groupId}-${i}" value="${v}" ${selected===v?"checked":""} required><span>${t}</span></label>`).join("")}</div></div>`;
}
function renumber() {
  $$(".extinguisher-card").forEach((card, i) => card.querySelector(".extinguisher-head strong").textContent = `Extintor ${i + 1}`);
  updateExtinguisherLimit();
}
function updateExtinguisherLimit() {
  const count = $$(".extinguisher-card").length;
  const counter = $("#extinguisherCount");
  const addButton = $("#addExtinguisher");
  if (counter) counter.textContent = `${count} de 7`;
  if (addButton) {
    addButton.disabled = count >= 7;
    addButton.textContent = count >= 7 ? "Máximo alcanzado" : "+ Agregar extintor";
  }
}
function readExtinguishers() {
  return $$(".extinguisher-card").map(card => ({
    ...Object.fromEntries($$("[data-field]", card).map(el => [el.dataset.field, el.value])),
    criteria: $$(".criterion-row", card).map(row => row.querySelector("input:checked")?.value || "")
  }));
}
function collectData(status = "Borrador") {
  const fd = new FormData(form);
  return { id: currentRecord?.id || crypto.randomUUID(), type: "extinguisher", status, createdAt: currentRecord?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
    project: fd.get("project") || "", date: fd.get("date") || "", startTime: fd.get("startTime") || "", location: fd.get("location") || "",
    areaManager: fd.get("areaManager") || "", agent: fd.get("agent") || "", generalNotes: fd.get("generalNotes") || "",
    safetyName: fd.get("safetyName") || "", residentName: fd.get("residentName") || "", endTime: fd.get("endTime") || "",
    extinguishers: readExtinguishers(), evidence:normalizeEvidenceList(evidence) };
}
function applyData(data) {
  currentRecord = data;
  ["project","date","startTime","location","areaManager","generalNotes","safetyName","residentName","endTime"].forEach(k => { if (form.elements[k]) form.elements[k].value = data[k] || ""; });
  if (data.agent) { const radio = form.querySelector(`[name="agent"][value="${CSS.escape(data.agent)}"]`); if (radio) radio.checked = true; }
  $("#extinguisherList").innerHTML = ""; (data.extinguishers?.length ? data.extinguishers : [{}]).forEach(addExtinguisher);
  evidence = normalizeEvidenceList(data.evidence || []); renderEvidence();
  $("#draftStatus").textContent = data.status || "Borrador";
}
async function saveDraft(silent = false) {
  const data = collectData("Borrador"); await window.GraviIncidentStorage.saveArtifact(STORAGE_DRAFT,data); currentRecord = data;
  $("#draftStatus").textContent = "Borrador guardado"; if (!silent) toast("Borrador guardado en este dispositivo.");
}
function renderEvidence() {
  renderEvidenceList(evidence, "#evidencePreview", "remove-evidence", saveDraft);
}
function renderFirstAidConditions(values = []) {
  $("#firstAidConditions").innerHTML = firstAidConditionLabels.map((label, index) => {
    const item = values[index] || {};
    return `<div class="first-aid-condition-row" data-condition-index="${index}"><p>${escapeHtml(label)}</p><div class="criterion-options">
      <label><input type="radio" name="first-aid-condition-${index}" value="Cumple" ${item.result === "Cumple" ? "checked" : ""} required><span>✓ Cumple</span></label>
      <label><input type="radio" name="first-aid-condition-${index}" value="No cumple" ${item.result === "No cumple" ? "checked" : ""} required><span>✕ No cumple</span></label>
    </div><input class="condition-note" value="${escapeHtml(item.notes)}" placeholder="Observaciones"></div>`;
  }).join("");
}
function renderFirstAidItems(values = []) {
  const officialRows = firstAidCatalog.map(([number, name, required], index) => firstAidItemMarkup({ ...values[index], number, name, required, custom: false }, index));
  const additionalRows = values.slice(firstAidCatalog.length).filter(item => item.custom).map((item, index) => firstAidItemMarkup(item, firstAidCatalog.length + index));
  $("#firstAidItems").innerHTML = [...officialRows, ...additionalRows].join("");
  bindFirstAidItemRemoval();
}
function firstAidItemMarkup(item = {}, index) {
  const custom = Boolean(item.custom);
  const name = item.name || "";
  const number = custom ? `A${index - firstAidCatalog.length + 1}` : item.number;
  const nameCell = custom ? `<div class="custom-item-cell"><input class="custom-item-name" value="${escapeHtml(name)}" placeholder="Nombre del insumo" required aria-label="Nombre del insumo adicional"><button class="remove-first-aid-item" type="button" title="Eliminar insumo">×</button></div>` : escapeHtml(name);
  const requiredCell = custom ? `<input class="item-required item-quantity" type="number" min="1" step="1" value="${escapeHtml(item.required)}" required aria-label="Cantidad requerida del insumo adicional">` : item.required;
  return `<tr data-first-aid-index="${index}" data-custom-item="${custom}"><td class="item-number">${number}</td><td class="item-name">${nameCell}</td><td>${requiredCell}</td>
    <td><input class="item-existing item-quantity" type="number" min="0" step="1" value="${escapeHtml(item.existing)}" required aria-label="Cantidad existente de ${escapeHtml(name || "insumo adicional")}"></td>
    <td><select class="item-validity" required aria-label="Vigencia de ${escapeHtml(name || "insumo adicional")}"><option value="">Selecciona</option><option ${item.validity === "Sí" ? "selected" : ""}>Sí</option><option ${item.validity === "No" ? "selected" : ""}>No</option><option ${item.validity === "N/A" ? "selected" : ""}>N/A</option></select></td>
    <td><select class="item-condition" required aria-label="Estado físico de ${escapeHtml(name || "insumo adicional")}"><option value="">Selecciona</option><option ${item.physicalState === "Bueno" ? "selected" : ""}>Bueno</option><option ${item.physicalState === "Regular" ? "selected" : ""}>Regular</option><option ${item.physicalState === "Malo" ? "selected" : ""}>Malo</option></select></td>
    <td><input class="item-notes" value="${escapeHtml(item.notes)}" placeholder="Observaciones" aria-label="Observaciones de ${escapeHtml(name || "insumo adicional")}"></td></tr>`;
}
function addCustomFirstAidItem(item = {}) {
  const tbody = $("#firstAidItems");
  const customCount = $$('[data-custom-item="true"]', tbody).length;
  const index = firstAidCatalog.length + customCount;
  tbody.insertAdjacentHTML("beforeend", firstAidItemMarkup({ ...item, custom: true }, index));
  bindFirstAidItemRemoval();
  tbody.lastElementChild?.querySelector(".custom-item-name")?.focus();
}
function bindFirstAidItemRemoval() {
  $$(".remove-first-aid-item", $("#firstAidItems")).forEach(button => button.onclick = () => {
    button.closest("tr").remove();
    $$('[data-custom-item="true"]', $("#firstAidItems")).forEach((row, index) => row.querySelector(".item-number").textContent = `A${index + 1}`);
    saveFirstAidDraft(true);
  });
}
function readFirstAidConditions() {
  return $$("[data-condition-index]").map(row => ({
    label: $("p", row).textContent,
    result: row.querySelector("input:checked")?.value || "",
    notes: $(".condition-note", row).value
  }));
}
function readFirstAidItems() {
  return $$("[data-first-aid-index]").map((row, index) => {
    const custom = row.dataset.customItem === "true";
    return {
      number: custom ? row.querySelector(".item-number").textContent : firstAidCatalog[index][0],
      name: custom ? row.querySelector(".custom-item-name").value : firstAidCatalog[index][1],
      required: custom ? row.querySelector(".item-required").value : firstAidCatalog[index][2], custom,
      existing: $(".item-existing", row).value, validity: $(".item-validity", row).value,
      physicalState: $(".item-condition", row).value, notes: $(".item-notes", row).value
    };
  });
}
function collectFirstAidData(status = "Borrador") {
  const fd = new FormData(firstAidForm);
  return { id: currentRecord?.type === "firstAid" && currentRecord.id ? currentRecord.id : crypto.randomUUID(), type: "firstAid", status,
    createdAt: currentRecord?.type === "firstAid" && currentRecord.createdAt ? currentRecord.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString(),
    date: fd.get("date") || "", location: fd.get("location") || "", areaManager: fd.get("areaManager") || "", inspector: fd.get("inspector") || "",
    generalNotes: fd.get("generalNotes") || "", safetyName: fd.get("safetyName") || "", responsibleName: fd.get("responsibleName") || "", endTime: fd.get("endTime") || "",
    conditions: readFirstAidConditions(), items: readFirstAidItems(), evidence: normalizeEvidenceList(firstAidEvidence) };
}
function applyFirstAidData(data) {
  currentRecord = data;
  ["date","location","areaManager","inspector","generalNotes","safetyName","responsibleName","endTime"].forEach(key => { if (firstAidForm.elements[key]) firstAidForm.elements[key].value = data[key] || ""; });
  renderFirstAidConditions(data.conditions || []); renderFirstAidItems(data.items || []);
  firstAidEvidence = normalizeEvidenceList(data.evidence || []); renderFirstAidEvidence();
  $("#firstAidStatus").textContent = data.status || "Borrador";
}
async function saveFirstAidDraft(silent = false) {
  const data = collectFirstAidData("Borrador"); currentRecord = data;
  await window.GraviIncidentStorage.saveArtifact(STORAGE_FIRST_AID_DRAFT,data);
  $("#firstAidStatus").textContent = "Borrador guardado";
  if (!silent) toast("Borrador de botiquín guardado en este dispositivo.");
}
function renderFirstAidEvidence() {
  renderEvidenceList(firstAidEvidence, "#firstAidEvidencePreview", "remove-first-aid-evidence", saveFirstAidDraft);
}
function renderFirstAidReport(data) {
  prepareStandardReport();
  const conditionRows = data.conditions.map(item => `<tr><td>${escapeHtml(item.label)}</td><td class="${item.result === "Cumple" ? "good" : "bad"}">${item.result === "Cumple" ? "✓" : ""}</td><td class="${item.result === "No cumple" ? "bad" : ""}">${item.result === "No cumple" ? "✕" : ""}</td><td>${escapeHtml(item.notes)}</td></tr>`).join("");
  const itemRows = data.items.map(item => {
    const shortage = Number(item.existing) < Number(item.required);
    return `<tr><td>${item.number}</td><td>${escapeHtml(item.name)}</td><td>${item.required}</td><td class="${shortage ? "bad" : "good"}">${escapeHtml(item.existing)}</td><td>${escapeHtml(item.validity)}</td><td>${escapeHtml(item.physicalState)}</td><td>${escapeHtml(item.notes)}</td></tr>`;
  }).join("");
  $("#printReport").innerHTML = `<div class="report-title"><div class="report-logo">GVC</div><div><b>FORMATO</b><h1>INSPECCIÓN DE BOTIQUÍN</h1></div><div><b>Código:<br>GVC-SSH-FMT-006</b><br>Versión: 00</div></div>
    <div class="report-meta first-aid-meta"><div><b>FECHA DE INSPECCIÓN</b>${escapeHtml(data.date)}</div><div><b>RESPONSABLE DEL ÁREA</b>${escapeHtml(data.areaManager)}</div><div><b>UBICACIÓN DEL BOTIQUÍN</b>${escapeHtml(data.location)}</div><div><b>INSPECTOR</b>${escapeHtml(data.inspector)}</div></div>
    <div class="report-band">Condiciones del Botiquín</div><table class="report-table"><thead><tr><th>Detalle</th><th>Cumple</th><th>No cumple</th><th>Observaciones</th></tr></thead><tbody>${conditionRows}</tbody></table>
    <div class="report-band">Materiales y Consumibles</div><table class="report-table"><thead><tr><th>No.</th><th>Material / Equipo</th><th>Cant. requerida</th><th>Cant. existente</th><th>Vigencia OK</th><th>Estado físico</th><th>Observaciones</th></tr></thead><tbody>${itemRows}</tbody></table>
    ${evidenceReportMarkup(data.evidence)}
    <div class="report-band">Observaciones Generales</div><div class="report-notes">${escapeHtml(data.generalNotes) || "Sin observaciones generales."}</div>
    <div class="report-signatures"><div>${escapeHtml(data.safetyName)}<br><b>SEGURIDAD INDUSTRIAL</b></div><div>${escapeHtml(data.responsibleName)}<br><b>RESPONSABLE DEL ÁREA</b></div><div>${escapeHtml(data.endTime)}<br><b>HORA DE FINALIZACIÓN</b></div></div>`;
}
function openEquipmentInspection(type, data = null) {
  const config = equipmentConfigs[type]; if (!config) return;
  currentEquipmentType = type; equipmentForm.reset(); equipmentEvidence = [];
  $("#equipmentCode").textContent = `${config.code} · VERSIÓN 00`;
  $("#equipmentTitle").textContent = config.title;
  $("#equipmentGeneralFields").innerHTML = config.fields.map(([key,label,inputType]) => `<label class="${["contractor","work"].includes(key) ? "wide" : ""}">${label}<input name="${key}" type="${inputType}" ${inputType === "number" ? "min=1900 max=2200" : ""} required></label>`).join("");
  $("#equipmentChecklist").innerHTML = config.criteria.map((label,index) => {
    const group = `equipment-${type}-${index}`;
    return `<div class="equipment-check-row" data-equipment-check="${index}"><p>${escapeHtml(label)}</p><div class="criterion-options">
      ${[["B.E.","B.E."],["E.A.","E.A."],["M.E.","M.E."]].map(([value,text]) => `<label><input type="radio" name="${group}" value="${value}" required><span>${text}</span></label>`).join("")}
    </div><input class="equipment-note" placeholder="Observaciones"></div>`;
  }).join("");
  const hasPpe = config.ppe.length > 0; $("#equipmentPpeCard").hidden = !hasPpe; $("#equipmentCloseStep").textContent = hasPpe ? "04" : "03";
  $("#equipmentPpe").innerHTML = config.ppe.map((label,index) => `<label class="ppe-option"><input type="checkbox" value="${escapeHtml(label)}" data-ppe-index="${index}"><span>${escapeHtml(label)}</span></label>`).join("");
  const stored = data || (() => { try { return JSON.parse(localStorage.getItem(`gvc-${type}-draft-v1-${WORK_SCOPE}`)); } catch { return null; } })();
  applyEquipmentData(stored || {type,fields:{},checks:[],ppe:[],evidence:[]});
  const now = new Date(); equipmentForm.elements.date.value ||= localDateISO(now); equipmentForm.elements.year.value ||= String(now.getFullYear()); equipmentForm.elements.endTime.value ||= now.toTimeString().slice(0,5);
  showView("equipmentView");
}
function applyEquipmentData(data) {
  const config = equipmentConfigs[currentEquipmentType]; currentRecord = data;
  config.fields.forEach(([key]) => { if (equipmentForm.elements[key]) equipmentForm.elements[key].value = data.fields?.[key] || ""; });
  ["generalNotes","safetyName","residentName","endTime"].forEach(key => { if (equipmentForm.elements[key]) equipmentForm.elements[key].value = data[key] || ""; });
  data.checks?.forEach((item,index) => { const row = $(`[data-equipment-check="${index}"]`); if (!row) return; const radio = row.querySelector(`input[value="${CSS.escape(item.result || "")}"]`); if (radio) radio.checked = true; $(".equipment-note",row).value = item.notes || ""; });
  const selectedPpe = new Set(data.ppe || []); $$('[data-ppe-index]', equipmentForm).forEach(input => input.checked = selectedPpe.has(input.value));
  equipmentEvidence = normalizeEvidenceList(data.evidence || []); renderEquipmentEvidence(); $("#equipmentStatus").textContent = data.status || "Borrador";
}
function collectEquipmentData(status = "Borrador") {
  const config = equipmentConfigs[currentEquipmentType]; const fd = new FormData(equipmentForm);
  const fields = Object.fromEntries(config.fields.map(([key]) => [key,fd.get(key) || ""]));
  return {id:currentRecord?.type === currentEquipmentType && currentRecord.id ? currentRecord.id : crypto.randomUUID(),type:currentEquipmentType,status,
    createdAt:currentRecord?.type === currentEquipmentType && currentRecord.createdAt ? currentRecord.createdAt : new Date().toISOString(),updatedAt:new Date().toISOString(),fields,
    date:fields.date,location:fields.contractor,checks:$$('[data-equipment-check]',equipmentForm).map((row,index)=>({label:config.criteria[index],result:row.querySelector('input:checked')?.value || "",notes:$(".equipment-note",row).value})),
    ppe:$$('[data-ppe-index]:checked',equipmentForm).map(input=>input.value),generalNotes:fd.get("generalNotes")||"",safetyName:fd.get("safetyName")||"",residentName:fd.get("residentName")||"",endTime:fd.get("endTime")||"",evidence:normalizeEvidenceList(equipmentEvidence)};
}
async function saveEquipmentDraft(silent = false) {
  const data = collectEquipmentData("Borrador"); currentRecord = data; await window.GraviIncidentStorage.saveArtifact(`gvc-${currentEquipmentType}-draft-v1-${WORK_SCOPE}`,data);
  $("#equipmentStatus").textContent = "Borrador guardado"; if(!silent) toast("Borrador de inspección guardado.");
}
function renderEquipmentEvidence() {
  renderEvidenceList(equipmentEvidence, "#equipmentEvidencePreview", "remove-equipment-evidence", saveEquipmentDraft);
}
function renderEquipmentReport(data) {
  prepareStandardReport();
  const config = equipmentConfigs[data.type];
  const meta = config.fields.map(([key,label])=>`<div><b>${escapeHtml(label.toUpperCase())}</b>${escapeHtml(data.fields?.[key])}</div>`).join("");
  const checks = data.checks.map(item=>`<tr><td>${escapeHtml(item.label)}</td><td class="${item.result === "B.E." ? "good" : item.result === "M.E." ? "bad" : ""}">${escapeHtml(item.result)}</td><td>${escapeHtml(item.notes)}</td></tr>`).join("");
  $("#printReport").innerHTML = `<div class="report-title"><div class="report-logo">GVC</div><div><b>FORMATO</b><h1>${config.reportTitle}</h1></div><div><b>Código:<br>${config.code}</b><br>Versión: 00</div></div>
    <div class="report-section-title">DATOS GENERALES</div><div class="report-meta equipment-meta">${meta}</div>
    <div class="report-band">Condiciones del Equipo</div><table class="report-table"><thead><tr><th>Descripción</th><th>Estado</th><th>Observaciones</th></tr></thead><tbody>${checks}</tbody></table>
    ${data.ppe?.length ? `<div class="report-band">Equipo de Protección Personal</div><div class="report-ppe">${data.ppe.map(item=>`<span>✓ ${escapeHtml(item)}</span>`).join("")}</div>` : ""}
    ${evidenceReportMarkup(data.evidence)}
    <div class="report-band">Observaciones</div><div class="report-notes">${escapeHtml(data.generalNotes)||"Sin observaciones generales."}</div>
    <div class="report-signatures"><div>${escapeHtml(data.safetyName)}<br><b>SEGURIDAD INDUSTRIAL</b></div><div>${escapeHtml(data.residentName)}<br><b>RESIDENTE DE OBRA CIVIL</b></div><div>${escapeHtml(data.endTime)}<br><b>HORA DE FINALIZACIÓN</b></div></div>`;
}
function openIncidentReport(data = null) {
  incidentForm.reset(); incidentEvidence = []; currentRecord = null;
  let stored = data; if (!stored) { try { stored = JSON.parse(localStorage.getItem(STORAGE_INCIDENT_DRAFT)); } catch { stored = null; } }
  applyIncidentData(stored || {type:"incident",folio:generateIncidentFolio(),evidence:[]});
  if(!data&&window.GraviIncidentStorage)window.GraviIncidentStorage.loadDraft(STORAGE_INCIDENT_DRAFT).then(full=>{if(full)applyIncidentData(full);}).catch(error=>console.error("[GRAVI Incidencias] No fue posible recuperar el borrador.",error));
  const today = localDateISO(); incidentForm.elements.date.value ||= today; incidentForm.elements.emissionDate.value ||= today;
  toggleOtherIncidentType(); showView("incidentView");
}
function generateIncidentFolio() {
  const year = new Date().getFullYear(); let highest = 0;
  records().filter(item => item.type === "incident").forEach(item => {
    const folio = item.folio || item.documentNumber || "";
    const match = folio.match(/^RSO-(\d{4})-(\d+)$/);
    if (match && Number(match[1]) === year) highest = Math.max(highest, Number(match[2]));
  });
  return `RSO-${year}-${String(highest + 1).padStart(4,"0")}`;
}
function incidentFolio(data) { return data.folio || data.documentNumber || "S/N"; }
function applyIncidentData(data) {
  currentRecord = data;
  ["date","time","emissionDate","location","reportedBy","involvedNames","positions","contractor","description","otherType","probableCause","immediateAction","preventiveMeasure","observations","workerName","contractorName","safetyResidentName","siteManagerName"].forEach(key=>{if(incidentForm.elements[key])incidentForm.elements[key].value=data[key]||"";});
  incidentForm.elements.folio.value = incidentFolio(data) === "S/N" ? generateIncidentFolio() : incidentFolio(data);
  if(data.incidentType){const radio=incidentForm.querySelector(`[name="incidentType"][value="${CSS.escape(data.incidentType)}"]`);if(radio)radio.checked=true;}
  if(data.accidentOccurred){const accidentRadio=incidentForm.querySelector(`[name="accidentOccurred"][value="${CSS.escape(data.accidentOccurred)}"]`);if(accidentRadio)accidentRadio.checked=true;}
  incidentEvidence=normalizeEvidenceList(data.evidence||[]);renderIncidentEvidence();$("#incidentStatus").textContent=data.status||"Borrador";toggleOtherIncidentType();
}
function collectIncidentData(status="Borrador") {
  const fd=new FormData(incidentForm);return {id:currentRecord?.type==="incident"&&currentRecord.id?currentRecord.id:crypto.randomUUID(),type:"incident",status,
    createdAt:currentRecord?.type==="incident"&&currentRecord.createdAt?currentRecord.createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
    folio:fd.get("folio")||generateIncidentFolio(),date:fd.get("date")||"",time:fd.get("time")||"",emissionDate:fd.get("emissionDate")||"",location:fd.get("location")||"",reportedBy:fd.get("reportedBy")||"",
    involvedNames:fd.get("involvedNames")||"",positions:fd.get("positions")||"",contractor:fd.get("contractor")||"",description:fd.get("description")||"",incidentType:fd.get("incidentType")||"",otherType:fd.get("otherType")||"",
    probableCause:fd.get("probableCause")||"",immediateAction:fd.get("immediateAction")||"",preventiveMeasure:fd.get("preventiveMeasure")||"",observations:fd.get("observations")||"",accidentOccurred:fd.get("accidentOccurred")||"No",investigationId:currentRecord?.investigationId||"",
    workerName:fd.get("workerName")||"",contractorName:fd.get("contractorName")||"",safetyResidentName:fd.get("safetyResidentName")||"",siteManagerName:fd.get("siteManagerName")||"",evidence:normalizeEvidenceList(incidentEvidence)};
}
async function saveIncidentDraft(silent=false){const data=collectIncidentData("Borrador");currentRecord=data;try{const saved=await window.GraviIncidentStorage.saveDraft(STORAGE_INCIDENT_DRAFT,data,{status:"draft"});$("#incidentStatus").textContent=saved.quotaFallback?"Borrador seguro en dispositivo":"Borrador guardado";if(!silent)toast(saved.quotaFallback?"No fue posible guardar el borrador en el almacenamiento rápido. Se conservó de forma segura.":"Borrador del reporte diario guardado.");}catch(error){console.error("[GRAVI Incidencias] No fue posible guardar el borrador.",error);$("#incidentStatus").textContent="Borrador en memoria";if(!silent)toast("No fue posible guardar el borrador ahora. Los datos capturados continúan visibles.");}return data;}
function toggleOtherIncidentType(){const isOther=incidentForm.elements.incidentType?.value==="Otro";$("#otherIncidentTypeField").hidden=!isOther;incidentForm.elements.otherType.required=isOther;}
function renderIncidentEvidence(){renderEvidenceList(incidentEvidence, "#incidentEvidencePreview", "remove-incident-evidence", saveIncidentDraft);}
function renderIncidentReport(data){prepareStandardReport();const type=data.incidentType==="Otro"?`Otro: ${data.otherType}`:data.incidentType;const folio=incidentFolio(data);$("#printReport").innerHTML=`<div class="report-title"><div class="report-logo">GVC</div><div><b>GRAN VISIÓN CONSTRUCCIÓN</b><h1>REPORTE DE SEGURIDAD DE OBRA<br>ACCIDENTE / INCIDENTE</h1></div><div><b>Rev. 01</b><br>Folio: ${escapeHtml(folio)}</div></div>
  <div class="report-meta first-aid-meta"><div><b>FECHA DEL EVENTO</b>${escapeHtml(data.date)}</div><div><b>FECHA DE EMISIÓN</b>${escapeHtml(data.emissionDate)}</div><div><b>HORA DEL INCIDENTE</b>${escapeHtml(data.time)}</div><div><b>LUGAR (OBRA / ÁREA / SECCIÓN)</b>${escapeHtml(data.location)}</div><div><b>REPORTADO POR</b>${escapeHtml(data.reportedBy)}</div><div><b>EMPRESA / CONTRATISTA</b>${escapeHtml(data.contractor)}</div></div>
  <div class="report-band">Descripción del Evento</div><div class="report-notes">${escapeHtml(data.description)}</div>
  <div class="report-meta first-aid-meta"><div><b>PERSONAS INVOLUCRADAS</b>${escapeHtml(data.involvedNames)}</div><div><b>PUESTOS</b>${escapeHtml(data.positions)}</div><div><b>TIPO DE INCIDENTE</b>${escapeHtml(type)}</div><div><b>FOLIO</b>${escapeHtml(folio)}</div></div>
  <div class="report-band">Análisis y Respuesta</div><div class="incident-report-section"><div><b>CAUSA PROBABLE</b>${escapeHtml(data.probableCause)}</div><div><b>ACCIÓN INMEDIATA TOMADA</b>${escapeHtml(data.immediateAction)}</div><div><b>RECOMENDACIÓN / MEDIDA PREVENTIVA</b>${escapeHtml(data.preventiveMeasure)}</div><div><b>OBSERVACIONES</b>${escapeHtml(data.observations)||"Sin observaciones adicionales."}</div></div>
  ${evidenceReportMarkup(data.evidence)}
  <div class="report-signatures incident-report-signatures"><div>${escapeHtml(data.workerName)}<br><b>TRABAJADOR</b></div><div>${escapeHtml(data.contractorName)}<br><b>CONTRATISTA</b></div><div>${escapeHtml(data.safetyResidentName)}<br><b>RESIDENTE DE SEGURIDAD</b></div><div>${escapeHtml(data.siteManagerName)}<br><b>ENCARGADO DE OBRA</b></div></div>`;}
function renderReport(data) {
  prepareStandardReport();
  const ext = data.extinguishers;
  const matrix = criteria.map((criterion, i) => `<tr><td>${criterion}</td>${ext.map(x => `<td class="${x.criteria[i]==="Sí"?"good":x.criteria[i]==="No"?"bad":""}">${escapeHtml(x.criteria[i] || "—")}</td>`).join("")}</tr>`).join("");
  $("#printReport").innerHTML = `<div class="report-title"><div class="report-logo">GVC</div><div><b>FORMATO</b><h1>INSPECCIÓN DE EXTINTOR</h1></div><div><b>Código:<br>GVC-SSH-FMT-009</b><br>Versión: 00</div></div>
    <div class="report-section-title">DATOS GENERALES</div><div class="report-meta"><div><b>PROYECTO / DESARROLLO</b>${escapeHtml(data.project)}</div><div><b>FECHA DE INSPECCIÓN</b>${escapeHtml(data.date)}</div><div><b>HORA DE INICIO</b>${escapeHtml(data.startTime)}</div><div><b>ÁREA / UBICACIÓN</b>${escapeHtml(data.location)}</div><div><b>RESPONSABLE DEL ÁREA</b>${escapeHtml(data.areaManager)}</div><div><b>AGENTE EXTINGUIDOR</b>${escapeHtml(data.agent)}</div></div>
    <div class="report-band">Registro de Extintores</div><table class="report-table"><thead><tr><th>Número</th><th>Tipo</th><th>Capacidad</th><th>Ubicación</th><th>Último servicio</th><th>Próximo servicio</th><th>Peso OK</th><th>Observaciones</th></tr></thead><tbody>${ext.map(x=>`<tr><td>${escapeHtml(x.number)}</td><td>${escapeHtml(x.type)}</td><td>${escapeHtml(x.capacity)}</td><td>${escapeHtml(x.location)}</td><td>${escapeHtml(x.lastService)}</td><td>${escapeHtml(x.nextService)}</td><td>${escapeHtml(x.weightOk)}</td><td>${escapeHtml(x.notes)}</td></tr>`).join("")}</tbody></table>
    <div class="report-band">Condiciones Generales del Extintor</div><table class="report-table"><thead><tr><th>Descripción</th>${ext.map(x=>`<th>${escapeHtml(x.number)}</th>`).join("")}</tr></thead><tbody>${matrix}</tbody></table>
    ${evidenceReportMarkup(data.evidence)}
    <div class="report-band">Observaciones</div><div class="report-notes">${escapeHtml(data.generalNotes) || "Sin observaciones generales."}</div>
    <div class="report-signatures"><div>${escapeHtml(data.safetyName)}<br><b>SEGURIDAD INDUSTRIAL</b></div><div>${escapeHtml(data.residentName)}<br><b>RESIDENTE DE OBRA CIVIL</b></div><div>${escapeHtml(data.endTime)}<br><b>HORA DE FINALIZACIÓN</b></div></div>`;
}
function allRecords() { try { return JSON.parse(localStorage.getItem(STORAGE_RECORDS)) || []; } catch { return []; } }
function records() { const all=allRecords(),workId=localStorage.getItem("gvc-active-work-id");return workId?all.filter(item=>(item.workId||"legacy")===workId):all; }
function repositoryRecords() { const all=window.GraviRepositories?.records?.list?.() || allRecords(),workId=localStorage.getItem("gvc-active-work-id");return workId?all.filter(item=>(item.workId||"legacy")===workId):all; }
async function finish(data) {
  const existedRemotely=allRecords().some(item=>item.id===data.id);
  data.workId = localStorage.getItem("gvc-active-work-id") || data.workId || "legacy";
  const stored=await window.GraviIncidentStorage.saveRecord(data);if(!stored.local.ok)console.error("[GRAVI Registros] El historial ligero no pudo escribirse.",stored.local.error||stored.local.reason);
  const mutations=window.GraviSupabase?.entityMutations;
  let remoteResult=null;if(data.type==="incident")remoteResult=await (existedRemotely?mutations?.updateIncident:mutations?.createIncident)?.(stored.record);
  else (existedRemotely?mutations?.updateInspection:mutations?.createInspection)?.(data);
  if (data.type === "firstAid") localStorage.removeItem(STORAGE_FIRST_AID_DRAFT);
  else if (data.type === "incident") {if(navigator.onLine&&remoteResult&&!remoteResult.pending)await window.GraviIncidentStorage.removeDraft(STORAGE_INCIDENT_DRAFT,data.id);else await window.GraviIncidentStorage.saveDraft(STORAGE_INCIDENT_DRAFT,data,{status:"pending"});}
  else if (equipmentConfigs[data.type]) localStorage.removeItem(`gvc-${data.type}-draft-v1-${WORK_SCOPE}`);
  else localStorage.removeItem(STORAGE_DRAFT);
  window.dispatchEvent(new CustomEvent("gvc:record-saved", { detail: { id:data.id, type:data.type, workId:data.workId, date:data.date, createdAt:data.createdAt, evidenceCount:normalizeEvidenceList(data.evidence||[]).length } }));
  return {record:data,remoteResult,pending:!navigator.onLine||Boolean(remoteResult?.pending)};
}
function prepareStandardReport() { window.systemDownloadData = null; $("#editButton").hidden = false; }
async function resizeImage(file){const result=await window.GraviEvidenceManager.prepareImages([file],{maxFiles:1});if(!result.prepared.length)throw new Error(result.rejected[0]?.message||"No fue posible preparar la fotografía.");const item=result.prepared[0];await window.GraviOfflineEvidenceQueue.save({clientUuid:item.clientUuid,blob:item.blob,mimeType:item.mimeType,originalName:item.originalName,originalSize:item.originalSize,sizeBytes:item.sizeBytes,width:item.width,height:item.height,caption:"Fotografía de trabajador",recordType:"work_evidence",recordId:item.clientUuid,workId:localStorage.getItem("gvc-active-work-id")||"legacy",evidenceStage:"worker-photo",sourceModule:"worker-photo",sourceEntryId:item.clientUuid,status:"pending"});return `idb-evidence:${item.clientUuid}`;}
function renderRecent() {
  const items = repositoryRecords().slice(0, 3); const el = $("#recentList");
  el.className = items.length ? "history-list" : "empty-state";
  el.innerHTML = items.length ? items.map(historyMarkup).join("") : "Todavía no hay inspecciones finalizadas."; bindOpenButtons(el);
}
function historyMarkup(x) {
  const isFirstAid = x.type === "firstAid";
  const isIncident = x.type === "incident";
  const equipment = equipmentConfigs[x.type];
  const detail = isIncident ? `${escapeHtml(x.incidentType || "Evento")} · Folio ${escapeHtml(incidentFolio(x))}` : isFirstAid ? `${x.items?.length || 0} conceptos revisados` : equipment ? `${x.checks?.length || 0} puntos revisados` : `${x.extinguishers?.length || 0} extintor(es)`;
  const title = isIncident ? `Reporte diario · ${escapeHtml(x.location || "Sin ubicación")}` : isFirstAid ? `Botiquín · ${escapeHtml(x.location || "Sin ubicación")}` : equipment ? `${escapeHtml(equipment.title)} · ${escapeHtml(x.fields?.number || "Sin número")}` : `Extintores · ${escapeHtml(x.project || "Inspección sin proyecto")}`;
  return `<article class="history-item"><div><h3>${title}</h3><p>${escapeHtml(x.date)} · ${escapeHtml(x.location)} · ${detail}</p></div><div><button class="secondary" data-open="${x.id}">Ver reporte</button></div></article>`;
}
function renderHistory() { const all=repositoryRecords(); $("#historyList").innerHTML = all.length ? all.map(historyMarkup).join("") : '<div class="empty-state">No hay registros finalizados.</div>'; bindOpenButtons($("#historyList")); }
function bindOpenButtons(root) { $$('[data-open]', root).forEach(b => b.onclick = () => { const data=repositoryRecords().find(x=>x.id===b.dataset.open); if(data){currentRecord=data;if(data.type === "incident") renderIncidentReport(data);else if(data.type === "firstAid") renderFirstAidReport(data); else if(equipmentConfigs[data.type]) renderEquipmentReport(data); else renderReport(data);showView("reportView");} }); }
function validateStep(step) {
  const invalid = $$("[required]", $(`.form-step[data-step="${step}"]`)).find(el => !el.checkValidity());
  if (invalid) { invalid.reportValidity(); invalid.focus(); return false; }
  if (step === 2 && !$(".extinguisher-card")) { toast("Agrega por lo menos un extintor."); return false; }
  return true;
}

$("#homeButton").onclick = () => showView("homeView"); $("#backButton").onclick = () => { saveDraft(true); showView("inspectionMenuView"); };
$("#inspectionButton").onclick = () => showView("inspectionMenuView");
$("#incidentButton").onclick = () => openIncidentReport();
$("#inspectionMenuBack").onclick = () => showView("homeView");
$("#extinguisherInspectionButton").onclick = () => { const draft=localStorage.getItem(STORAGE_DRAFT); currentRecord=null; evidence=[]; form.reset(); applyData(draft?JSON.parse(draft):{type:"extinguisher",extinguishers:[{}],evidence:[]}); nowDefaults(); showStep(1); showView("formView"); };
$("#firstAidInspectionButton").onclick = () => {
  const draft = localStorage.getItem(STORAGE_FIRST_AID_DRAFT); currentRecord = null; firstAidEvidence = []; firstAidForm.reset();
  applyFirstAidData(draft ? JSON.parse(draft) : { type:"firstAid", conditions:[], items:[], evidence:[] });
  const now = new Date(); firstAidForm.elements.date.value ||= localDateISO(now); firstAidForm.elements.endTime.value ||= now.toTimeString().slice(0, 5);
  showView("firstAidView");
};
$$('[data-equipment-type]').forEach(button => button.onclick = () => openEquipmentInspection(button.dataset.equipmentType));
$$('[data-coming]').forEach(b => b.onclick = () => toast(`${b.dataset.coming}: módulo preparado para la siguiente etapa.`));
$("#addExtinguisher").onclick = () => addExtinguisher(); $("#saveDraft").onclick = () => saveDraft();
$$('[data-next]').forEach(b => b.onclick = () => { const step=Number(b.closest('.form-step').dataset.step); if(validateStep(step)){saveDraft(true);showStep(Number(b.dataset.next));} });
$$('[data-prev]').forEach(b => b.onclick = () => showStep(Number(b.dataset.prev))); $$('.steps button').forEach(b=>b.onclick=()=>showStep(Number(b.dataset.stepTarget)));
form.addEventListener("input", () => { $("#draftStatus").textContent = "Cambios sin guardar"; });
form.onsubmit = e => { e.preventDefault(); if(!validateStep(3)) return; const data=collectData("Finalizada"); if(!data.extinguishers.length) return toast("Agrega por lo menos un extintor."); currentRecord=data; finish(data); renderReport(data); showView("reportView"); toast("Inspección finalizada correctamente."); };
$("#evidenceInput").onchange = event => addEvidenceFiles(event, evidence, 6, renderEvidence, saveDraft);
$("#firstAidBack").onclick = () => { saveFirstAidDraft(true); showView("inspectionMenuView"); };
$("#cancelFirstAid").onclick = () => { saveFirstAidDraft(true); showView("inspectionMenuView"); };
$("#saveFirstAidDraft").onclick = () => saveFirstAidDraft();
$("#addFirstAidItem").onclick = () => addCustomFirstAidItem();
firstAidForm.addEventListener("input", () => { $("#firstAidStatus").textContent = "Cambios sin guardar"; });
firstAidForm.onsubmit = event => {
  event.preventDefault();
  if (!firstAidForm.reportValidity()) return;
  const data = collectFirstAidData("Finalizada"); currentRecord = data; finish(data); renderFirstAidReport(data); showView("reportView");
  toast("Inspección de botiquín finalizada correctamente.");
};
$("#firstAidEvidenceInput").onchange = async event => {
  await addEvidenceFiles(event, firstAidEvidence, 6, renderFirstAidEvidence, saveFirstAidDraft);
};
$("#equipmentBack").onclick = () => { saveEquipmentDraft(true); showView("inspectionMenuView"); };
$("#cancelEquipment").onclick = () => { saveEquipmentDraft(true); showView("inspectionMenuView"); };
$("#saveEquipmentDraft").onclick = () => saveEquipmentDraft();
equipmentForm.addEventListener("input",()=>{$("#equipmentStatus").textContent="Cambios sin guardar";});
equipmentForm.onsubmit = event => {event.preventDefault();if(!equipmentForm.reportValidity())return;const data=collectEquipmentData("Finalizada");currentRecord=data;finish(data);renderEquipmentReport(data);showView("reportView");toast("Inspección finalizada correctamente.");};
$("#equipmentEvidenceInput").onchange = event => addEvidenceFiles(event, equipmentEvidence, 6, renderEquipmentEvidence, saveEquipmentDraft);
$("#incidentBack").onclick=()=>{saveIncidentDraft(true);showView("homeView");};$("#cancelIncident").onclick=()=>{saveIncidentDraft(true);showView("homeView");};$("#saveIncidentDraft").onclick=()=>saveIncidentDraft();
$$('[name="incidentType"]',incidentForm).forEach(radio=>radio.addEventListener("change",toggleOtherIncidentType));incidentForm.addEventListener("input",()=>{$("#incidentStatus").textContent="Cambios sin guardar";});
incidentForm.onsubmit=event=>{event.preventDefault();if(!incidentForm.reportValidity())return;const data=collectIncidentData("Finalizada");currentRecord=data;finish(data);renderIncidentReport(data);showView("reportView");toast("Reporte diario finalizado correctamente.");};
$("#incidentEvidenceInput").onchange=event=>addEvidenceFiles(event, incidentEvidence, 8, renderIncidentEvidence, saveIncidentDraft);
$("#editButton").onclick = () => {
  if (currentRecord?.type === "incident") { openIncidentReport(currentRecord); }
  else if (currentRecord?.type === "firstAid") { applyFirstAidData(currentRecord); showView("firstAidView"); }
  else if (equipmentConfigs[currentRecord?.type]) { openEquipmentInspection(currentRecord.type,currentRecord); }
  else { applyData(currentRecord); showStep(1); showView("formView"); }
}; $("#printButton").onclick = async () => { const button=$("#printButton");button.disabled=true;button.textContent="Preparando evidencia…";try { await (window.GraviReportEvidenceReady||Promise.resolve());await window.GraviPrint.printCurrentDocument();window.dispatchEvent(new CustomEvent("gvc:pdf-generated", { detail: { recordId:currentRecord?.id||"", type:currentRecord?.type||"" } })); } catch (error) { console.error("[GRAVI Print:evidence]",error);toast("No fue posible preparar el reporte para impresión."); } finally {button.disabled=false;button.textContent="Imprimir / Guardar PDF";} };
$("#downloadData").onclick = () => { const source=window.systemDownloadData||currentRecord;const blob=new Blob([JSON.stringify(source,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);const kind=source?.downloadName||(source?.type === "incident"?"reporte-seguridad":source?.type === "firstAid"?"botiquin":equipmentConfigs[source?.type]?source.type:"extintores");a.download=`${kind}-${source?.date||'registro'}.json`;a.click();URL.revokeObjectURL(a.href); };
$("#historyButton").onclick = () => showView("historyView"); $("#historyBack").onclick = () => showView("homeView");
prepareEvidenceInputs();
renderRecent();
