(function(global){
"use strict";

function applyMark(attendance,key,workerId,status){
  if(!attendance||!key||!workerId||!["P","A"].includes(status))return false;
  attendance[key]||={};
  if(attendance[key][workerId]===status)return false;
  attendance[key][workerId]=status;
  return true;
}

function summarize(staff,marks){
  const rows=Array.isArray(staff)?staff:[],record=marks||{};
  const present=rows.filter(worker=>record[worker.id]==="P").length;
  return {total:rows.length,present,absent:rows.length-present};
}

function createSyncCoordinator({sync,onState=()=>{},onError=()=>{}}={}){
  const chains=new Map(),states=new Map(),latestByWorker=new Map();
  let sequence=0;
  const identity=(key,workerId)=>`${key}::${workerId}`;
  const publish=(key,workerId,phase,saving,error="")=>{
    const state={key,workerId,phase,saving,error};
    states.set(identity(key,workerId),state);onState(state);return state;
  };
  const enqueue=({key,workerId,payload})=>{
    const workerKey=identity(key,workerId),version=++sequence;
    latestByWorker.set(workerKey,version);publish(key,workerId,"syncing",true);
    const previous=chains.get(key)||Promise.resolve();
    const operation=previous.catch(()=>{}).then(async()=>{
      try{
        const result=await sync(payload);
        if(latestByWorker.get(workerKey)===version)publish(key,workerId,result?.pending?"pending":"synced",false,result?.error?.message||"");
        return result;
      }catch(error){
        if(latestByWorker.get(workerKey)===version)publish(key,workerId,"pending",false,error?.message||"Error de sincronización");
        onError(error,{key,workerId,payload});return {success:false,pending:true,error};
      }finally{if(chains.get(key)===operation)chains.delete(key);}
    });
    chains.set(key,operation);return operation;
  };
  return Object.freeze({enqueue,get:(key,workerId)=>states.get(identity(key,workerId))||{phase:"idle",saving:false},isIdle:()=>chains.size===0});
}

global.GraviAttendance=Object.freeze({applyMark,summarize,createSyncCoordinator});
})(typeof window!=="undefined"?window:globalThis);
