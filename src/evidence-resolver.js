(function createEvidenceResolver(global){
  "use strict";

  const ownerUrls=new Map(),signedUrls=new Map();
  const isBlob=value=>Boolean(global.Blob&&value instanceof global.Blob||global.File&&value instanceof global.File);
  const identity=item=>typeof item==="string"?item:item?.clientUuid||item?.client_uuid||item?.id||item?.indexedDbRef||"";
  const storagePath=item=>typeof item==="object"&&(item?.storagePath||item?.storage_path||item?.path)||"";
  const directUrl=item=>typeof item==="string"?item:item?.publicUrl||item?.public_url||item?.signedUrl||item?.signed_url||item?.storageUrl||item?.url||item?.objectUrl||item?.src||"";
  function register(owner,url){if(!owner||!url?.startsWith("blob:"))return;const urls=ownerUrls.get(owner)||new Set();urls.add(url);ownerUrls.set(owner,urls);}
  function objectUrl(blob,owner){const url=URL.createObjectURL(blob);register(owner,url);return{url,kind:"indexeddb",temporary:true,reason:""};}
  async function signedUrl(path){const cached=signedUrls.get(path),now=Date.now();if(cached&&cached.expiresAt>now+30000)return cached.url;const url=await global.GraviEvidenceManager?.getSignedUrl?.(path,900);if(!url)throw new Error("La ruta de Storage no devolvió una URL utilizable.");signedUrls.set(path,{url,expiresAt:now+12*60*1000});return url;}
  async function fromStored(stored,owner){if(!stored)return null;if(isBlob(stored.blob))return objectUrl(stored.blob,owner);const path=storagePath(stored);if(path)return{url:await signedUrl(path),kind:"storage",temporary:false,reason:""};const url=directUrl(stored);if(/^https?:/i.test(url))return{url,kind:"remote",temporary:false,reason:""};return null;}
  async function resolveEvidenceSource(evidence,options={}){
    const owner=options.owner||"evidence-view",raw=typeof evidence==="string"?{src:evidence}:evidence||{};
    try{
      if(isBlob(raw))return objectUrl(raw,owner);
      if(isBlob(raw.blob))return objectUrl(raw.blob,owner);
      const id=identity(raw).replace(/^idb-evidence:/,"");
      if(id){const stored=await global.GraviOfflineEvidenceQueue?.get?.(id),resolved=await fromStored(stored,owner);if(resolved)return resolved;}
      const reportId=options.reportId||raw.incidentReportId||raw.reportId||raw.report_id||raw.indexedDbRef;
      if(reportId&&!options.skipReportLookup){const report=await global.GraviOfflineEvidenceQueue?.getReport?.(reportId),references=report?.payload?.evidence||[],reference=references.find(item=>identity(item)===id||identity(item)===identity(raw))||raw.indexedDbRef&&references.length===1&&references[0];if(reference){const resolved=await resolveEvidenceSource(reference,{...options,skipReportLookup:true});if(resolved.url)return resolved;}}
      if(reportId&&id&&global.navigator?.onLine!==false&&global.GraviEvidenceManager?.listBySource){const rows=await global.GraviEvidenceManager.listBySource("incident",reportId),remote=rows.find(item=>identity(item)===id);if(remote){const resolved=await fromStored(remote,owner);if(resolved)return resolved;}}
      const path=storagePath(raw);if(path)return{url:await signedUrl(path),kind:"storage",temporary:false,reason:""};
      const url=directUrl(raw);
      if(/^https?:/i.test(url))return{url,kind:"remote",temporary:false,reason:""};
      if(/^blob:/i.test(url))return{url,kind:"blob",temporary:false,reason:""};
      if(/^data:image\/(jpeg|png|webp);base64,/i.test(url))return{url,kind:"legacy",temporary:false,reason:""};
      return{url:"",kind:"missing",temporary:false,reason:raw.syncStatus==="pending"||raw.status==="pending"?"archivo pendiente de sincronización":id?"referencia no encontrada":"referencia no encontrada"};
    }catch(error){console.error(`[GraviEvidenceResolver:${identity(raw)||"unknown"}]`,error);return{url:"",kind:"error",temporary:false,reason:/formato|mime/i.test(String(error?.message))?"formato no compatible":storagePath(raw)?"error de descarga":"referencia no encontrada",error};}
  }
  function release(owner){const urls=ownerUrls.get(owner);if(!urls)return 0;for(const url of urls)URL.revokeObjectURL(url);const count=urls.size;ownerUrls.delete(owner);return count;}
  function releaseAll(){let count=0;for(const owner of [...ownerUrls.keys()])count+=release(owner);return count;}
  function activeUrls(owner){return owner?[...(ownerUrls.get(owner)||[])]:[...ownerUrls.values()].flatMap(set=>[...set]);}
  global.addEventListener?.("pagehide",releaseAll);
  global.GraviEvidenceResolver=Object.freeze({resolveEvidenceSource,release,releaseAll,activeUrls,identity});
})(window);
