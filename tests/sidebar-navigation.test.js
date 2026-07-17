"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const html=read("index.html"),system=read("src/system.js"),dynamic=read("src/dynamic-formats-bootstrap.js"),sw=read("service-worker.js");

function extractFunction(source,name){
  const start=source.indexOf(`function ${name}(`);
  assert.ok(start>=0,`No se encontró ${name}`);
  const bodyStart=source.indexOf("{",start);
  let depth=0,quote="",escaped=false;
  for(let index=bodyStart;index<source.length;index+=1){
    const char=source[index];
    if(quote){
      if(escaped)escaped=false;
      else if(char==="\\")escaped=true;
      else if(char===quote)quote="";
      continue;
    }
    if(char==='"'||char==="'"||char==='`'){quote=char;continue;}
    if(char==="{")depth+=1;
    if(char==="}"&&--depth===0)return source.slice(start,index+1);
  }
  throw new Error(`No se pudo extraer ${name}`);
}

const globalRoutes=[...html.matchAll(/data-nav52="([^"]+)"/g)].map(match=>match[1]);
const workRoutes=[...html.matchAll(/data-phase3-nav="([^"]+)"/g)].map(match=>match[1]);
const dispatcherSource=extractFunction(system,"dispatchSidebarRoute45");
for(const route of new Set(globalRoutes))assert.ok(dispatcherSource.includes(`"${route}"`),`Ruta global sin implementación central: ${route}`);
for(const route of new Set(workRoutes))assert.ok(dispatcherSource.includes(`"${route}"`),`Ruta de obra sin implementación central: ${route}`);

function createDispatcher(hasWork=true){
  const calls=[];
  const call=name=>(...args)=>{calls.push([name,...args]);return name;};
  const inspectionButton={click:call("inspectionButton.click")};
  const context={
    console,window:{GraviAppState:{},GraviCaptureCenter:{open:call("captureCenter.open")},GraviEvidenceGallery:{open:call("evidenceGallery.open")},GraviDynamicFormatsNavigation:{open:call("dynamicFormats.open")}},
    activeId:"work-1",activeWork:()=>hasWork?{id:"work-1"}:null,closeSidebar45:call("closeSidebar"),leaveExecutiveForRoute45:call("leaveExecutive"),
    requireWorkContext45:()=>{calls.push(["requireWorkContext"]);if(hasWork)return true;calls.push(["renderDevelopments52",false],["toast","Selecciona una obra para abrir este módulo."]);return false;},
    renderExecutiveDashboard55:call("renderExecutiveDashboard55"),renderDevelopments52:call("renderDevelopments52"),renderAllWorks52:call("renderAllWorks52"),
    openGeneralHistory52:call("openGeneralHistory52"),openAdministration52:call("openAdministration52"),renderAuditLog:call("renderAuditLog"),clearWorkContext55:call("clearWorkContext55"),
    renderDailyLog:call("renderDailyLog"),today:()=>"2026-07-17",openCaptureCenter53:call("openCaptureCenter53"),openIncidentHistory52:call("openIncidentHistory52"),
    openMonthly52:call("openMonthly52"),openPreventiveControlsPhase3:call("openPreventiveControlsPhase3"),openQuickObservation53:call("openQuickObservation53"),
    openWorkDashboard55:call("openWorkDashboard55"),openModule:call("openModule"),q:selector=>selector==="#inspectionButton"?inspectionButton:null,
    openComplianceModule:call("openComplianceModule"),toast:call("toast"),showDynamicFormatsView:call("showDynamicFormatsView"),openMatrixCompatibility:call("openMatrixCompatibility")
  };
  vm.createContext(context);vm.runInContext(`${dispatcherSource};this.dispatch=dispatchSidebarRoute45;`,context);
  return {dispatch:context.dispatch,calls};
}

const globalExpectations={
  home:"renderExecutiveDashboard55",generalHome:"renderExecutiveDashboard55",developments:"renderDevelopments52",allWorks:"renderAllWorks52",
  generalHistory:"openGeneralHistory52",administration:"openAdministration52",auditLog:"renderAuditLog",changeWork:"clearWorkContext55",
  dailyLog:"renderDailyLog",captureCenter:"captureCenter.open",incidentHistory:"openIncidentHistory52",monthly:"openMonthly52",
  permitsAts:"openPreventiveControlsPhase3",photoEvidence:"evidenceGallery.open"
};
for(const [route,expected] of Object.entries(globalExpectations)){
  const test=createDispatcher(true);test.dispatch("global",route);
  assert.ok(test.calls.some(call=>call[0]===expected),`${route} no ejecutó ${expected}: ${JSON.stringify(test.calls)}`);
}
const workExpectations={
  dashboard:"openWorkDashboard55",contractors:"openModule",workers:"openModule",visitors:"openModule",attendance:"openModule",workforce:"openModule",
  investigations:"openModule",histories:"openModule",inspections:"inspectionButton.click",incidents:"openIncidentHistory52",compliance:"openComplianceModule",
  dynamicFormats:"dynamicFormats.open",badges:"openModule",matrix:"openMatrixCompatibility"
};
for(const [route,expected] of Object.entries(workExpectations)){
  const test=createDispatcher(true);test.dispatch("work",route);
  assert.ok(test.calls.some(call=>call[0]===expected),`${route} no ejecutó ${expected}: ${JSON.stringify(test.calls)}`);
}
const noContext=createDispatcher(false);noContext.dispatch("work","attendance");
assert.ok(noContext.calls.some(call=>call[0]==="renderDevelopments52"),"Una ruta de obra sin contexto debe regresar al catálogo");
assert.ok(!noContext.calls.some(call=>call[0]==="openModule"),"No debe abrir módulos de obra sin una obra activa");

assert.ok(system.includes('document.addEventListener("click",sidebarNavigationClick45,true)'),"Falta delegación central en fase de captura");
assert.ok(system.indexOf("installNavigationReliability45();")<system.indexOf('const stages=['),"La navegación debe instalarse antes de las demás etapas");
assert.ok(system.includes("safeInitStage45"),"La inicialización no es tolerante a fallos por módulo");
assert.ok(system.includes("window.GraviNavigation=Object.freeze"),"Falta API de diagnóstico de navegación");
assert.ok(dynamic.includes("GraviDynamicFormatsNavigation"),"Formatos dinámicos no exponen navegación confiable");
assert.ok(sw.includes("gravi-sst-v2-shell-v48"),"Service worker no fuerza actualización de runtime v48");
console.log(`PASS sidebar-navigation: ${new Set(globalRoutes).size} rutas globales, ${new Set(workRoutes).size} rutas de obra y despacho funcional verificados.`);
