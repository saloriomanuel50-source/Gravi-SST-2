(function createEvidenceSyncCoordinator(global){
  "use strict";

  let activeSync=null;

  function currentWorkId(){
    return global.GraviSystemContext?.getActiveWork?.()?.id||localStorage.getItem("gvc-active-work-id")||"";
  }

  async function refreshMetadata(workId){
    if(!workId)return{controls:0,evidence:0};
    const controls=await global.GraviRepositories?.preventiveControls?.refreshRemote?.(workId)||[];
    let evidence=0;
    for(const control of controls){
      const rows=await global.GraviEvidenceManager?.listByRecord?.("preventive_control",control.id)||[];
      evidence+=rows.length;
    }
    const workRows=await global.GraviSupabase?.workEvidence?.list?.(workId)||[];
    global.GraviRepositories?.workEvidence?.cache?.(workRows);
    return{controls:controls.length,evidence:evidence+workRows.length};
  }

  function synchronize(options={}){
    if(activeSync)return activeSync;
    activeSync=(async()=>{
      await global.GraviOfflineEvidenceQueue?.open?.();
      await global.GraviOfflineEvidenceQueue?.recoverAbandoned?.(120000);
      const controls=await global.GraviRepositories?.preventiveControls?.syncPending?.()||{synced:0,pending:0};
      const uploads=await global.GraviEvidenceManager?.uploadPendingDirect?.()||{synced:0,failed:0,pending:true};
      let metadata={controls:0,evidence:0};
      if(global.navigator?.onLine&&global.GraviSupabase?.isAuthenticated?.())metadata=await refreshMetadata(options.workId||currentWorkId());
      return{controls,uploads,metadata,reason:options.reason||"manual"};
    })().catch(error=>{
      console.error("[GraviEvidenceSyncCoordinator]",error);
      return{controls:{synced:0,pending:0},uploads:{synced:0,failed:1,pending:true},metadata:{controls:0,evidence:0},error};
    }).finally(()=>{activeSync=null;});
    return activeSync;
  }

  const trigger=reason=>{void synchronize({reason});};
  global.addEventListener("online",()=>trigger("online"));
  global.addEventListener("gvc:auth-ready",()=>trigger("auth-ready"));
  global.GraviOfflineEvidenceQueue?.open?.().then(()=>global.GraviOfflineEvidenceQueue?.recoverAbandoned?.(120000)).catch(error=>console.error("[GraviEvidenceSyncCoordinator:init]",error));
  global.GraviEvidenceSyncCoordinator=Object.freeze({synchronize,refreshMetadata,isRunning:()=>Boolean(activeSync)});
})(window);
