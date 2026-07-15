(function createCaptureCenter(global){
  "use strict";

  const ICONS=Object.freeze({preventiveObservation:"nav-shield",safetyEvent:"nav-alert",inspection:"nav-check",permitAts:"nav-file",visitor:"nav-user",quickEvidence:"nav-grid"});
  const ROUTES=Object.freeze({
    preventiveObservation:Object.freeze({label:"Observación preventiva",description:"Condiciones, actos, buenas prácticas y desviaciones.",permission:"incidents.create",available:()=>Boolean(global.GraviPreventiveObservations?.openForm),action:()=>global.GraviPreventiveObservations.openForm()}),
    safetyEvent:Object.freeze({label:"Incidente o accidente",description:"Eventos, lesiones, daños o casi accidentes.",permission:"incidents.create",available:()=>Boolean(global.GraviSystemContext?.openSafetyEvent),action:()=>global.GraviSystemContext.openSafetyEvent()}),
    inspection:Object.freeze({label:"Inspección",description:"Revisiones de áreas, equipos e instalaciones.",permission:"inspections.create",available:()=>Boolean(global.GraviSystemContext?.openInspection),action:()=>global.GraviSystemContext.openInspection()}),
    permitAts:Object.freeze({label:"Permiso / ATS",description:"Controles previos para trabajos de riesgo.",permission:"permits.create",available:()=>Boolean(global.GraviWorkPermits?.openForm),action:()=>global.GraviSystemContext.openWorkPermit()}),
    visitor:Object.freeze({label:"Visitante",description:"Registro de ingreso, inducción y salida.",permission:"visitors.register",available:()=>Boolean(global.GraviSystemContext?.openVisitor),action:()=>global.GraviSystemContext.openVisitor()}),
    quickEvidence:Object.freeze({label:"Evidencia rápida",description:"Fotografía vinculada a un registro o actividad.",permission:"evidence.upload",available:()=>Boolean(global.GraviEvidenceGallery?.openQuickEvidence),action:()=>global.GraviEvidenceGallery.openQuickEvidence()})
  });
  let lastFocus=null;

  const icon=key=>`<svg aria-hidden="true"><use href="#${ICONS[key]}"></use></svg>`;
  const context=()=>global.GraviSystemContext;
  const can=permission=>!global.GraviSupabase?.canPermission||global.GraviSupabase.canPermission(permission);
  function unavailable(key){const message="Esta función no está disponible en esta versión.";console.error(`[GraviCaptureCenter:${key}] ${message}`);context()?.showToast?.(message);return false;}
  function visibleRoutes(){return Object.entries(ROUTES).filter(([,route])=>route.available()&&can(route.permission));}
  function ensureDialog(){
    let root=document.querySelector("#captureCenterDialog");if(root)return root;
    root=document.createElement("section");root.id="captureCenterDialog";root.className="capture-center-dialog";root.hidden=true;root.innerHTML=`<div class="capture-center-backdrop" data-capture-close></div><div class="capture-center-panel" role="dialog" aria-modal="true" aria-labelledby="captureCenterTitle"><header><div><p class="eyebrow">CENTRO DE CAPTURA</p><h2 id="captureCenterTitle">Crear registro</h2><p data-capture-work></p></div><button type="button" class="capture-center-close" data-capture-close aria-label="Cerrar Centro de Captura">Cerrar</button></header><div class="capture-center-grid" role="list"></div><p class="capture-center-status" aria-live="polite"></p></div>`;
    root.addEventListener("click",event=>{if(event.target.closest("[data-capture-close]"))close();const card=event.target.closest("[data-capture-route]");if(card)activate(card.dataset.captureRoute);});
    root.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();close();return;}if(event.key!=="Tab")return;const focusable=[...root.querySelectorAll('button:not([disabled]),[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')];if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
    document.body.append(root);return root;
  }
  function open(){
    const work=context()?.getActiveWork?.();if(!work){context()?.showToast?.("Selecciona una obra antes de registrar.");return false;}
    const root=ensureDialog(),routes=visibleRoutes();lastFocus=document.activeElement;root.querySelector("[data-capture-work]").textContent=work.name||"Obra activa";root.querySelector(".capture-center-grid").innerHTML=routes.map(([key,route])=>`<button type="button" class="capture-center-card" data-capture-route="${key}" role="listitem" aria-label="${route.label}: ${route.description}"><span class="capture-center-icon">${icon(key)}</span><strong>${route.label}</strong><small>${route.description}</small><span aria-hidden="true">→</span></button>`).join("");root.hidden=false;document.body.classList.add("capture-center-open");root.querySelector("[data-capture-route]")?.focus();return true;
  }
  function close(){const root=document.querySelector("#captureCenterDialog");if(root)root.hidden=true;document.body.classList.remove("capture-center-open");lastFocus?.focus?.();lastFocus=null;}
  function activate(key){const route=ROUTES[key];if(!route||!route.available())return unavailable(key);if(!can(route.permission)){context()?.showToast?.("Tu perfil no permite crear este registro.");return false;}close();try{const result=route.action();if(result===false)return unavailable(key);return result??true;}catch(error){console.error(`[GraviCaptureCenter:${key}]`,error);context()?.showToast?.(error?.message||"No fue posible abrir esta función.");return false;}}

  global.GraviCaptureCenter=Object.freeze({open,close,activate,routes:ROUTES,getVisibleRoutes:visibleRoutes});
})(window);
