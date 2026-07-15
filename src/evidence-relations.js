(function createEvidenceRelations(global){
  "use strict";

  let scheduled=false,lastSource=null;
  const esc=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));

  function activeSource(){
    const records=global.GraviSystemContext?.getRecords?.()||[];
    const incident=document.querySelector(".incident-expedient-v2");
    if(incident){const folio=incident.querySelector("h1,h2,.folio")?.textContent?.trim()||"";const record=records.find(item=>folio.includes(item.folio||"__missing__"));if(record)return{module:"incident",id:record.id,host:incident};}
    const permit=document.querySelector(".permit-form"),currentPermit=global.GraviWorkPermits?.getCurrent?.();
    if(permit&&currentPermit?.id)return{module:"work_permit",id:currentPermit.id,host:permit};
    const daily=document.querySelector("#dailyLogForm");
    if(daily){const date=daily.elements?.date?.value,report=(global.GraviSystemContext?.getDailyReports?.()||[]).find(item=>item.date===date);if(report)return{module:"daily_report",id:report.id||report.date,host:daily};}
    const inspection=document.querySelector("#inspectionForm");
    if(inspection){const record=records.find(item=>item.type!=="incident"&&(item.id===inspection.dataset.recordId||item.id===lastSource?.id||item.folio&&item.folio===inspection.elements?.folio?.value));if(record)return{module:"inspection",id:record.id,host:inspection};}
    return null;
  }

  async function render(){
    scheduled=false;
    const source=activeSource();
    if(!source||!global.GraviEvidenceManager?.listBySource)return;
    const key=`${source.module}:${source.id}`;
    let section=source.host.querySelector(":scope > .related-evidence");
    if(section?.dataset.sourceKey===key)return;
    section=section||document.createElement("section");
    section.className="related-evidence";
    section.dataset.sourceKey=key;
    section.innerHTML="<h3>Evidencia relacionada</h3><p>Consultando evidencia...</p>";
    source.host.appendChild(section);
    try{
      const rows=await global.GraviEvidenceManager.listBySource(source.module,source.id);
      rows.forEach(item=>item.openSource=()=>global.GraviSystemContext?.openSource?.(source.module,source.id));
      section.innerHTML=`<h3>Evidencia relacionada (${global.GraviEvidenceManager.getAvailableCount(rows)})</h3><div>${rows.map((item,index)=>`<button type="button" data-related-evidence="${index}">${esc(item.caption||item.description||item.originalName||`Evidencia ${index+1}`)} <small>${esc(item.status||"synced")}</small></button>`).join("")||"<p>Sin evidencia relacionada.</p>"}</div>`;
      section.querySelectorAll("[data-related-evidence]").forEach(button=>button.addEventListener("click",()=>global.GraviEvidenceManager.openViewer(rows,Number(button.dataset.relatedEvidence))));
    }catch(error){console.error("[GraviEvidenceRelations]",error);section.innerHTML='<h3>Evidencia relacionada</h3><p>No fue posible consultar la evidencia. Reintenta al recuperar la conexion.</p>';}
  }

  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>void render());}
  document.addEventListener("click",event=>{const target=event.target.closest?.("[data-open],[data-edit],[data-daily-date]");if(!target)return;const id=target.dataset.open||target.dataset.edit||target.dataset.dailyDate;const record=(global.GraviSystemContext?.getRecords?.()||[]).find(item=>item.id===id);lastSource=record?{module:record.type==="incident"?"incident":"inspection",id:record.id}:target.dataset.edit?{module:"work_permit",id}:target.dataset.dailyDate?{module:"daily_report",id}:null;},true);
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  global.addEventListener("online",schedule);
  global.GraviEvidenceRelations=Object.freeze({render});
})(window);
