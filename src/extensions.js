(function(){
  const modules=new Map(),documentTypes=new Map(),listeners=new Map();
  function register(collection,definition){if(!definition?.id)throw new Error("La extensión requiere un id");collection.set(definition.id,Object.freeze({...definition}));emit("registry:change",definition);return definition.id;}
  function emit(event,payload){(listeners.get(event)||[]).forEach(handler=>handler(payload));}
  window.GvcExtensions={
    version:1,
    registerModule:definition=>register(modules,definition),
    registerDocumentType:definition=>register(documentTypes,definition),
    getModules:()=>[...modules.values()],
    getDocumentTypes:()=>[...documentTypes.values()],
    on(event,handler){if(!listeners.has(event))listeners.set(event,[]);listeners.get(event).push(handler);return()=>listeners.set(event,(listeners.get(event)||[]).filter(x=>x!==handler));},
    slots:Object.freeze(["dashboard","work-menu","document-history","worker-profile"]),
    planned:Object.freeze(["nom-compliance","document-control","compliance-matrix","training","ppe","brigades","civil-protection"])
  };
  document.documentElement.dataset.extensionRegistryVersion="1";
})();
