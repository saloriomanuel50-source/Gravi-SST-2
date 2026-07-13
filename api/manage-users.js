"use strict";
const {ALL_PERMISSION_KEYS,CRITICAL_ADMIN_PERMISSIONS,hasPermission,validateCustomPermissions}=require("./permissions-contract");

module.exports=async function handler(request,response){
  response.setHeader("Cache-Control","no-store, max-age=0");
  if(!["GET","PATCH"].includes(request.method))return response.status(405).json({error:"M\u00e9todo no permitido."});
  const url=(process.env.SUPABASE_URL||"").replace(/\/$/,""),anonKey=process.env.SUPABASE_ANON_KEY||"",serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
  if(!url||!anonKey||!serviceKey)return response.status(503).json({error:"Faltan variables de Supabase en Vercel."});
  const token=String(request.headers.authorization||"").replace(/^Bearer\s+/i,"");
  const serviceHeaders={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json"};
  try{
    const authResponse=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anonKey,Authorization:`Bearer ${token}`}});
    if(!authResponse.ok)return response.status(401).json({error:"Sesi\u00f3n inv\u00e1lida."});
    const caller=await authResponse.json(),profileResponse=await fetch(`${url}/rest/v1/perfiles_usuario?user_id=eq.${encodeURIComponent(caller.id)}&select=*`,{headers:serviceHeaders});
    const callerProfile=(profileResponse.ok?await profileResponse.json():[])[0];
    if(!callerProfile?.active)return response.status(403).json({error:"Perfil inactivo o no configurado."});
    if(request.method==="GET"){
      if(!hasPermission(callerProfile,"users.view"))return response.status(403).json({error:"Tu perfil no permite consultar usuarios."});
      const list=await fetch(`${url}/rest/v1/perfiles_usuario?select=user_id,email,full_name,role,active,permissions_mode,custom_permissions,created_at,updated_at&order=full_name.asc`,{headers:serviceHeaders});
      return response.status(list.status).json(list.ok?await list.json():{error:"No fue posible consultar usuarios."});
    }
    const {userId,full_name,role,active,permissions_mode,custom_permissions}=request.body||{};
    if(!userId)return response.status(400).json({error:"userId es obligatorio."});
    const targetResponse=await fetch(`${url}/rest/v1/perfiles_usuario?user_id=eq.${encodeURIComponent(userId)}&select=*`,{headers:serviceHeaders}),target=(targetResponse.ok?await targetResponse.json():[])[0];
    if(!target)return response.status(404).json({error:"Usuario no encontrado."});
    const patch={updated_at:new Date().toISOString()};
    if(full_name!==undefined){if(!hasPermission(callerProfile,"users.edit"))return response.status(403).json({error:"Falta users.edit."});patch.full_name=String(full_name).trim();}
    if(role!==undefined){if(!hasPermission(callerProfile,"users.change_roles"))return response.status(403).json({error:"Falta users.change_roles."});if(!["Administrador","Supervisor SST","Consulta"].includes(role))return response.status(400).json({error:"Rol inv\u00e1lido."});if(role==="Administrador"&&callerProfile.role!=="Administrador")return response.status(403).json({error:"S\u00f3lo un Administrador puede asignar ese rol."});patch.role=role;}
    if(active!==undefined){if(!hasPermission(callerProfile,"users.deactivate"))return response.status(403).json({error:"Falta users.deactivate."});patch.active=active===true;}
    if(permissions_mode!==undefined||custom_permissions!==undefined){
      if(!hasPermission(callerProfile,"users.manage_permissions"))return response.status(403).json({error:"Falta users.manage_permissions."});
      const custom=validateCustomPermissions(custom_permissions||{});
      if(callerProfile.role!=="Administrador")for(const [key,enabled] of Object.entries(custom))if(enabled&&(!hasPermission(callerProfile,key)||CRITICAL_ADMIN_PERMISSIONS.includes(key)))return response.status(403).json({error:`No puedes conceder ${key}.`});
      patch.permissions_mode=permissions_mode==="custom"?"custom":"role-default";patch.custom_permissions=custom;
    }
    const removesActiveAdmin=target.role==="Administrador"&&target.active&&(patch.active===false||patch.role&&patch.role!=="Administrador");
    if(removesActiveAdmin){const admins=await fetch(`${url}/rest/v1/perfiles_usuario?role=eq.Administrador&active=eq.true&select=user_id`,{headers:serviceHeaders}),rows=admins.ok?await admins.json():[];if(rows.length<=1)return response.status(409).json({error:"No se puede desactivar o degradar al \u00faltimo Administrador activo."});}
    if(userId===caller.id&&callerProfile.role==="Administrador"&&(patch.active===false||patch.role&&patch.role!=="Administrador"||Object.entries(patch.custom_permissions||{}).some(([key,value])=>CRITICAL_ADMIN_PERMISSIONS.includes(key)&&value===false)))return response.status(409).json({error:"No puedes retirar tu propio acceso administrativo cr\u00edtico."});
    const updated=await fetch(`${url}/rest/v1/perfiles_usuario?user_id=eq.${encodeURIComponent(userId)}`,{method:"PATCH",headers:{...serviceHeaders,Prefer:"return=representation"},body:JSON.stringify(patch)}),payload=await updated.json().catch(()=>({}));
    return response.status(updated.status).json(updated.ok?{ok:true,profile:Array.isArray(payload)?payload[0]:payload}:{error:payload.message||"No fue posible actualizar el usuario."});
  }catch(error){console.error("Error seguro de administraci\u00f3n de usuarios.",{message:error.message});return response.status(500).json({error:"Error interno al administrar usuarios."});}
};
