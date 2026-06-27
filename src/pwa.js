(function registerGraviServiceWorker(){
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  function register(){
    navigator.serviceWorker.register("./service-worker.js", {scope:"./"}).catch(function(error){
      console.warn("No fue posible registrar el modo sin conexión.", error);
    });
  }
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, {once:true});
})();
