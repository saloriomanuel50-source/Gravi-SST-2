module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  if (request.method !== "POST") return response.status(405).json({error:"Metodo no permitido."});

  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !anonKey || !serviceKey) return response.status(503).json({error:"Faltan variables de Supabase en Vercel."});

  const requestHost = request.headers["x-forwarded-host"] || request.headers.host || "";
  const requestProtocol = request.headers["x-forwarded-proto"] || (String(requestHost).includes("localhost") ? "http" : "https");
  const requestOrigin = requestHost ? `${requestProtocol}://${requestHost}` : "";
  const appUrl = String(process.env.GRAVI_APP_URL || requestOrigin || "http://localhost:3000").replace(/\/$/, "");
  const redirectTo = `${appUrl}/set-password`;
  const supabase = {
    auth:{
      admin:{
        inviteUserByEmail:async (email, options={}) => {
          const inviteResponse = await fetch(`${url}/auth/v1/invite`, {
            method:"POST",
            headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json"},
            body:JSON.stringify({email:String(email).trim(),data:options.data || {},redirect_to:options.redirectTo})
          });
          const data = await inviteResponse.json().catch(() => ({}));
          return inviteResponse.ok
            ? {data,error:null}
            : {data:null,error:{status:inviteResponse.status,message:data.msg || data.message || data.error_description || "No fue posible invitar al usuario."}};
        }
      }
    }
  };

  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return response.status(401).json({error:"Sesion requerida."});

  try {
    const userResponse = await fetch(`${url}/auth/v1/user`, {headers:{apikey:anonKey,Authorization:`Bearer ${token}`}});
    if (!userResponse.ok) return response.status(401).json({error:"Sesion invalida."});
    const caller = await userResponse.json();

    const callerProfileResponse = await fetch(`${url}/rest/v1/perfiles_usuario?user_id=eq.${encodeURIComponent(caller.id)}&select=role,active,permissions_mode,custom_permissions`, {headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
    const profiles = callerProfileResponse.ok ? await callerProfileResponse.json() : [];
    const callerProfile = profiles[0] || {};
    const callerCanInvite = callerProfile.role === "Administrador" || (callerProfile.permissions_mode === "custom" && callerProfile.custom_permissions?.["users.invite"] === true);
    if (!callerProfile.active || !callerCanInvite) return response.status(403).json({error:"Tu perfil no permite invitar usuarios."});

    const {email,fullName,role,permissions={}} = request.body || {};
    const roles = ["Administrador","Supervisor SST","Consulta"];
    if (!email || !fullName || !roles.includes(role)) return response.status(400).json({error:"Nombre, correo y rol valido son obligatorios."});

    const permissionsMode = permissions.permissions_mode === "custom" ? "custom" : "role-default";
    const customPermissions = permissions.custom_permissions && typeof permissions.custom_permissions === "object" && !Array.isArray(permissions.custom_permissions)
      ? permissions.custom_permissions
      : {};

    const {data:invited,error:inviteError} = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data:{
        full_name:String(fullName).trim(),
        role,
        permissions_mode:permissionsMode,
        custom_permissions:customPermissions
      }
    });
    if (inviteError) {
      const message = String(inviteError.message || "");
      const redirectDenied = /redirect|uri|url/i.test(message) && /allow|not allowed|invalid/i.test(message);
      return response.status(inviteError.status || 400).json({
        error:redirectDenied
          ? "La URL de redirecci\u00f3n no est\u00e1 permitida en Supabase. Verifica Authentication > URL Configuration."
          : message || "No fue posible invitar al usuario."
      });
    }

    const userId = invited.id || invited.user?.id;
    if (!userId) {
      console.error("La invitacion de Supabase no devolvio userId.");
      return response.status(502).json({error:"La invitación fue enviada, pero no fue posible identificar al usuario creado."});
    }
    const expectedProfile = {user_id:userId,email:String(email).trim(),full_name:String(fullName).trim(),role,active:true,permissions_mode:permissionsMode,custom_permissions:customPermissions,updated_at:new Date().toISOString()};
    const profileResponse = await fetch(`${url}/rest/v1/perfiles_usuario?on_conflict=user_id`, {
      method:"POST",
      headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=representation"},
      body:JSON.stringify([expectedProfile])
    });
    const profileText = await profileResponse.text();
    let profilePayload;
    try { profilePayload = profileText ? JSON.parse(profileText) : {}; }
    catch { profilePayload = {message:profileText}; }
    if (!profileResponse.ok) {
      console.error("No fue posible configurar perfiles_usuario despues de invitar.", {status:profileResponse.status,message:profilePayload.message || profilePayload.hint || profilePayload.details || profilePayload.code || "Error de Supabase"});
      return response.status(502).json({error:"El usuario de Auth pudo haberse creado, pero su perfil GRAVI no pudo configurarse. Revisa el usuario antes de reenviar la invitación."});
    }
    const configuredProfile = Array.isArray(profilePayload) ? profilePayload[0] : profilePayload;
    const returnedPermissions = configuredProfile?.custom_permissions || {};
    const permissionsConfigured = Object.keys(customPermissions).length === Object.keys(returnedPermissions).length && Object.entries(customPermissions).every(([key,value]) => returnedPermissions[key] === value);
    const profileConfigured = configuredProfile && configuredProfile.user_id === userId && configuredProfile.email === expectedProfile.email && configuredProfile.full_name === expectedProfile.full_name && configuredProfile.role === role && configuredProfile.active === true && configuredProfile.permissions_mode === permissionsMode && permissionsConfigured;
    if (!profileConfigured) {
      console.error("Supabase respondio al upsert sin confirmar todos los campos del perfil.", {userId,status:profileResponse.status});
      return response.status(502).json({error:"El usuario de Auth pudo haberse creado, pero su perfil GRAVI no pudo verificarse. Revisa el usuario antes de reenviar la invitación."});
    }
    return response.status(200).json({ok:true,userId,redirectTo,profileConfigured:true});
  } catch (error) {
    console.error("Error al invitar usuario.", error);
    return response.status(500).json({error:"Error interno al enviar la invitaci\u00f3n."});
  }
};
