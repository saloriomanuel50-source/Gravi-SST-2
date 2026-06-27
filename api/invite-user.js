module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  if (request.method !== "POST") return response.status(405).json({error:"Método no permitido."});

  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !anonKey || !serviceKey) return response.status(503).json({error:"Faltan variables de Supabase en Vercel."});

  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return response.status(401).json({error:"Sesión requerida."});

  try {
    const userResponse = await fetch(`${url}/auth/v1/user`, {headers:{apikey:anonKey,Authorization:`Bearer ${token}`}});
    if (!userResponse.ok) return response.status(401).json({error:"Sesión inválida."});
    const caller = await userResponse.json();

    const profileResponse = await fetch(`${url}/rest/v1/perfiles_usuario?user_id=eq.${encodeURIComponent(caller.id)}&select=role,active`, {headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
    const profiles = profileResponse.ok ? await profileResponse.json() : [];
    if (profiles[0]?.role !== "Administrador" || !profiles[0]?.active) return response.status(403).json({error:"Solo un Administrador puede invitar usuarios."});

    const {email,fullName,role} = request.body || {};
    const roles = ["Administrador","Supervisor SST","Consulta"];
    if (!email || !fullName || !roles.includes(role)) return response.status(400).json({error:"Nombre, correo y rol válido son obligatorios."});

    const inviteResponse = await fetch(`${url}/auth/v1/invite`, {
      method:"POST",
      headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({email:String(email).trim(),data:{full_name:String(fullName).trim()},redirect_to:process.env.SITE_URL || undefined})
    });
    const invited = await inviteResponse.json();
    if (!inviteResponse.ok) return response.status(inviteResponse.status).json({error:invited.msg || invited.message || "No fue posible invitar al usuario."});

    const userId = invited.id || invited.user?.id;
    await fetch(`${url}/rest/v1/perfiles_usuario?on_conflict=user_id`, {
      method:"POST",
      headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify([{user_id:userId,email:String(email).trim(),full_name:String(fullName).trim(),role,active:true,updated_at:new Date().toISOString()}])
    });
    return response.status(200).json({ok:true,userId});
  } catch (error) {
    console.error("Error al invitar usuario.", error);
    return response.status(500).json({error:"Error interno al enviar la invitación."});
  }
};
