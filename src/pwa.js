(function registerGraviServiceWorker(){
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  const VERSION="2026-07-18-evidence-v51";
  const RELOAD_KEY="gravi-sw-last-controller";
  const hadController=Boolean(navigator.serviceWorker.controller);
  let reloadStarted=false;

  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(!hadController||reloadStarted)return;
    const controllerId=navigator.serviceWorker.controller?.scriptURL||VERSION;
    if(sessionStorage.getItem(RELOAD_KEY)===controllerId)return;
    reloadStarted=true;
    sessionStorage.setItem(RELOAD_KEY,controllerId);
    location.reload();
  });

  async function activateWaitingWorker(registration){
    if(registration.waiting)registration.waiting.postMessage({type:"SKIP_WAITING",version:VERSION});
  }

  async function register(){
    try {
      const registration=await navigator.serviceWorker.register(`./service-worker.js?v=${VERSION}`,{scope:"./",updateViaCache:"none"});
      await activateWaitingWorker(registration);
      registration.addEventListener("updatefound",()=>{
        const worker=registration.installing;if(!worker)return;
        worker.addEventListener("statechange",()=>{if(worker.state==="installed"&&navigator.serviceWorker.controller)activateWaitingWorker(registration);});
      });
      registration.update().catch(error=>console.warn("No fue posible comprobar actualizaciones PWA.",error));
    } catch(error) {
      console.warn("No fue posible registrar el modo sin conexión.",error);
    }
  }

  if(document.readyState==="complete")register();
  else window.addEventListener("load",register,{once:true});
})();
