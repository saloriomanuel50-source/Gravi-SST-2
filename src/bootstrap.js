(async function startGraviApplication(){
  "use strict";

  const scripts = ["./src/app.js","./src/corporate-documents.js","./src/extensions.js?v=2","./src/system.js","./src/pwa.js"];
  const loginForm = document.querySelector("#loginForm");
  const authMessage = document.querySelector("#authMessage");
  let modulesLoaded = false;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[character]));
  }

  async function loadModules() {
    if (modulesLoaded) return;
    for (const source of scripts) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = source;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`No fue posible cargar ${source}`));
        document.body.appendChild(script);
      });
    }
    modulesLoaded = true;
  }

  function roleClass(role) {
    return `role-${String(role || "consulta").toLocaleLowerCase("es-MX").replaceAll(" ","-")}`;
  }

  async function enterApplication() {
    const profile = window.GraviSupabase.getProfile();
    const user = window.GraviSupabase.getUser();
    document.body.classList.remove("auth-locked","auth-loading","auth-login","app-loading","role-administrador","role-supervisor-sst","role-consulta");
    document.body.classList.add(roleClass(profile.role));
    document.querySelector("#currentUserName").textContent = profile.full_name || user.email || "Usuario";
    document.querySelector("#currentUserRole").textContent = profile.role;
    const usersButton = document.querySelector("#userManagementButton");
    usersButton.hidden = profile.role !== "Administrador";
    await loadModules();
    window.dispatchEvent(new CustomEvent("gvc:auth-ready", {detail:{user,profile}}));
  }

  function showAuthLoading() {
    document.body.classList.remove("auth-login", "auth-locked", "app-loading");
    document.body.classList.add("auth-loading");
    authMessage.textContent = "";
  }

  function showAppLoading() {
    document.body.classList.remove("auth-loading", "auth-login", "auth-locked");
    document.body.classList.add("app-loading");
    authMessage.textContent = "";
  }

  function showLogin(message="") {
    document.body.classList.remove("auth-loading", "app-loading");
    document.body.classList.add("auth-locked", "auth-login");
    authMessage.textContent = message;
    loginForm.elements.email.focus();
  }

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = loginForm.querySelector("button[type=submit]");
    const fields = new FormData(loginForm);
    button.disabled = true;
    button.textContent = "Verificando...";
    authMessage.textContent = "";
    try {
      await window.GraviSupabase.login(fields.get("email"), fields.get("password"));
      loginForm.reset();
      await enterApplication();
    } catch (error) {
      authMessage.textContent = error.message || "No fue posible iniciar sesión.";
    } finally {
      button.disabled = false;
      button.textContent = "Iniciar sesión";
    }
  });

  document.querySelector("#logoutButton").addEventListener("click", async () => {
    window.GraviAudit?.log?.("Cierre de sesion", "Acceso", "", localStorage.getItem("gvc-active-work-id") || "");
    await window.GraviSupabase.logout();
    location.reload();
  });

  const modal = document.querySelector("#userAdminModal");
  const adminMessage = document.querySelector("#userAdminMessage");
  const adminList = document.querySelector("#userAdminList");

  async function renderUsers() {
    adminMessage.textContent = "Cargando usuarios...";
    try {
      const profiles = await window.GraviSupabase.listProfiles();
      adminList.innerHTML = profiles.length ? profiles.map(profile => `
        <article class="user-admin-row" data-user-row="${profile.user_id}">
          <div><b>${escapeHtml(profile.full_name || "Sin nombre")}</b><small>${profile.active ? "Usuario activo" : "Acceso suspendido"}</small></div>
          <span>${escapeHtml(profile.email || "Correo no disponible")}</span>
          <select data-user-role><option ${profile.role==="Administrador"?"selected":""}>Administrador</option><option ${profile.role==="Supervisor SST"?"selected":""}>Supervisor SST</option><option ${profile.role==="Consulta"?"selected":""}>Consulta</option></select>
          <label><input type="checkbox" data-user-active ${profile.active?"checked":""}> Activo</label>
          <button class="secondary" type="button" data-save-user>Guardar</button>
        </article>`).join("") : '<div class="empty-management">No hay perfiles registrados.</div>';
      adminMessage.textContent = "";
      adminList.querySelectorAll("[data-save-user]").forEach(button => button.onclick = async () => {
        const row = button.closest("[data-user-row]");
        button.disabled = true;
        try {
          const role = row.querySelector("[data-user-role]").value;
          const active = row.querySelector("[data-user-active]").checked;
          await window.GraviSupabase.updateProfile(row.dataset.userRow, role, active);
          window.dispatchEvent(new CustomEvent("gvc:user-role-changed", {detail:{userId:row.dataset.userRow,targetRole:role,active}}));
          adminMessage.textContent = "Permisos actualizados.";
          await renderUsers();
        } catch (error) {
          adminMessage.textContent = error.message;
        } finally { button.disabled = false; }
      });
    } catch (error) {
      adminMessage.textContent = error.message;
    }
  }

  document.querySelector("#userManagementButton").addEventListener("click", async () => {
    modal.hidden = false;
    await renderUsers();
  });
  document.querySelector("#closeUserAdmin").addEventListener("click", () => modal.hidden = true);
  document.querySelector("#inviteUserForm").addEventListener("submit", async event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    adminMessage.textContent = "Enviando invitación...";
    try {
      await window.GraviSupabase.inviteUser({email:fields.get("email"),fullName:fields.get("fullName"),role:fields.get("role")});
      event.currentTarget.reset();
      adminMessage.textContent = "Invitación enviada correctamente.";
      await renderUsers();
    } catch (error) {
      adminMessage.textContent = error.message;
    } finally { button.disabled = false; }
  });

  try {
    showAuthLoading();
    const state = await window.GraviSupabase.bootstrap();
    if (state.authenticated) {
      showAppLoading();
      await enterApplication();
    } else showLogin(state.configured ? "" : "Supabase no está configurado en este despliegue.");
  } catch (error) {
    console.error("No fue posible preparar el acceso a GRAVI SST.", error);
    showLogin("No fue posible conectar con el servicio de acceso.");
  }
})().catch(error => {
  console.error("No fue posible iniciar GRAVI SST.", error);
  const message = document.querySelector("#authMessage");
  if (message) message.textContent = "No fue posible iniciar la aplicación. Recarga la página.";
});
