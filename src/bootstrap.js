(async function startGraviApplication(){
  "use strict";

  const scripts = ["./src/app.js","./src/corporate-documents.js","./src/extensions.js?v=2","./src/system.js?v=2026-07-09-work-dashboard","./src/pwa.js"];
  const loginForm = document.querySelector("#loginForm");
  const authMessage = document.querySelector("#authMessage");
  const setPasswordForm = document.querySelector("#setPasswordForm");
  const setPasswordMessage = document.querySelector("#setPasswordMessage");
  const isSetPasswordRoute = location.pathname.replace(/\/$/, "") === "/set-password";
  let modulesLoaded = false;
  let mobileNavigationReady = false;

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

  function installMobileNavigation() {
    if (mobileNavigationReady) return;
    mobileNavigationReady = true;
    const nav = document.querySelector("#mobileBottomNav");
    const profileSheet = document.querySelector("#mobileProfileSheet");
    const profileTitle = document.querySelector("#mobileProfileTitle");
    const profileRole = document.querySelector("#mobileProfileRole");
    const mobileUsersButton = document.querySelector("#mobileUsersButton");
    const closeProfile = document.querySelector("#mobileCloseProfile");
    if (!nav) return;
    const closeSheet = () => {
      if (profileSheet) profileSheet.hidden = true;
      nav.querySelector('[data-mobile-nav="profile"]')?.classList.remove("active");
    };
    const setActive = target => {
      nav.querySelectorAll("[data-mobile-nav]").forEach(button => button.classList.toggle("active", button.dataset.mobileNav === target));
    };
    const clickFirst = selector => {
      const target = document.querySelector(selector);
      if (target) {
        closeSheet();
        target.click();
        return true;
      }
      return false;
    };
    nav.querySelectorAll("[data-mobile-nav]").forEach(button => {
      button.addEventListener("click", () => {
        const target = button.dataset.mobileNav;
        setActive(target);
        if (target === "home") {
          if (document.body.classList.contains("has-work-context")) clickFirst('[data-phase3-nav="dashboard"]');
          else clickFirst('[data-nav52="home"]');
        }
        if (target === "works") clickFirst('[data-nav52="developments"]');
        if (target === "register") {
          closeSheet();
          if (document.body.classList.contains("has-work-context") && window.GraviCaptureCenter?.open) window.GraviCaptureCenter.open();
          else clickFirst('[data-nav52="developments"]');
        }
        if (target === "reports") {
          if (document.body.classList.contains("has-work-context")) {
            if (!clickFirst('[data-nav52="monthly"]') && !clickFirst('[data-phase3-nav="histories"]')) clickFirst('[data-nav52="generalHistory"]');
          } else clickFirst('[data-nav52="generalHistory"]');
        }
        if (target === "profile" && profileSheet) {
          const canManageUsers = !document.querySelector("#userManagementButton")?.hidden;
          profileTitle.textContent = document.querySelector("#currentUserName")?.textContent || "Usuario";
          profileRole.textContent = document.querySelector("#currentUserRole")?.textContent || "";
          mobileUsersButton.hidden = !canManageUsers;
          profileSheet.hidden = !profileSheet.hidden;
        }
      });
    });
    mobileUsersButton?.addEventListener("click", () => {
      closeSheet();
      document.querySelector("#userManagementButton")?.click();
    });
    closeProfile?.addEventListener("click", closeSheet);
    window.addEventListener("gvc:auth-ready", () => setActive(document.body.classList.contains("has-work-context") ? "home" : "works"));
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
    usersButton.hidden = !(window.GraviSupabase.can("admin-write") || window.GraviSupabase.canPermission?.("users.invite") || window.GraviSupabase.canPermission?.("users.edit") || window.GraviSupabase.canPermission?.("users.manage_permissions"));
    await loadModules();
    installMobileNavigation();
    window.dispatchEvent(new CustomEvent("gvc:auth-ready", {detail:{user,profile}}));
  }

  function showAuthLoading() {
    document.body.classList.remove("auth-login", "auth-locked", "app-loading", "set-password");
    document.body.classList.add("auth-loading");
    authMessage.textContent = "";
    if (setPasswordMessage) setPasswordMessage.textContent = "";
  }

  function showAppLoading() {
    document.body.classList.remove("auth-loading", "auth-login", "auth-locked", "set-password");
    document.body.classList.add("app-loading");
    authMessage.textContent = "";
    if (setPasswordMessage) setPasswordMessage.textContent = "";
  }

  function showLogin(message="") {
    document.body.classList.remove("auth-loading", "app-loading", "set-password");
    document.body.classList.add("auth-locked", "auth-login");
    loginForm.hidden = false;
    setPasswordForm.hidden = true;
    document.querySelector("#authTitle").textContent = "Bienvenido";
    document.querySelector(".auth-copy p").textContent = "Inicia sesi\u00f3n para continuar";
    authMessage.textContent = message;
    loginForm.elements.email.focus();
  }

  function showSetPassword(message="") {
    document.body.classList.remove("auth-loading", "app-loading", "auth-login");
    document.body.classList.add("auth-locked", "set-password");
    loginForm.hidden = true;
    setPasswordForm.hidden = false;
    document.querySelector("#authTitle").textContent = "Crear contrase\u00f1a";
    document.querySelector(".auth-copy p").textContent = "Define tu acceso para entrar a GRAVI SST v2.";
    setPasswordMessage.textContent = message;
    setPasswordForm.elements.password.focus();
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
      authMessage.textContent = error.message || "No fue posible iniciar sesi\u00f3n.";
    } finally {
      button.disabled = false;
      button.textContent = "Iniciar sesi\u00f3n";
    }
  });

  setPasswordForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = setPasswordForm.querySelector("button[type=submit]");
    const fields = new FormData(setPasswordForm);
    const password = String(fields.get("password") || "");
    const confirmPassword = String(fields.get("confirmPassword") || "");
    setPasswordMessage.textContent = "";
    if (password.length < 8) {
      setPasswordMessage.textContent = "La contrase\u00f1a debe tener al menos 8 caracteres.";
      return;
    }
    if (password !== confirmPassword) {
      setPasswordMessage.textContent = "Las contrase\u00f1as no coinciden.";
      return;
    }
    button.disabled = true;
    button.textContent = "Guardando...";
    try {
      await window.GraviSupabase.updatePassword(password);
      setPasswordForm.reset();
      setPasswordMessage.textContent = "Contrase\u00f1a creada correctamente. Entrando a GRAVI SST...";
      window.GraviSupabase.clearAuthRedirectUrl("/");
      showAppLoading();
      await enterApplication();
    } catch (error) {
      setPasswordMessage.textContent = error.message || "No fue posible guardar la contrase\u00f1a. Solicita una nueva invitaci\u00f3n.";
    } finally {
      button.disabled = false;
      button.textContent = "Guardar contrase\u00f1a";
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
  const inviteForm = document.querySelector("#inviteUserForm");
  const CRITICAL_SELF_PERMISSIONS = new Set(["users.manage_permissions","users.change_roles","users.deactivate"]);
  let loadedProfiles = [];
  let invitePermissionSettings = rolePermissionSettings(inviteForm.elements.role.value);

  function permissionGroups() {
    return window.GraviSupabase.permissionGroups ? window.GraviSupabase.permissionGroups() : [];
  }

  function rolePermissionSettings(role) {
    return {permissions_mode:"role-default", custom_permissions:window.GraviSupabase.roleDefaultPermissions(role)};
  }

  function profilePermissionSettings(profile) {
    return window.GraviSupabase.getProfilePermissions(profile).settings;
  }

  function hasCustomPermissions(profile) {
    return profilePermissionSettings(profile).permissions_mode === "custom";
  }

  function activeAdminCount(profiles=loadedProfiles) {
    return profiles.filter(profile => profile.role === "Administrador" && profile.active).length;
  }

  function protectSelfCriticalPermissions(profile, permissions) {
    const currentUser = window.GraviSupabase.getUser();
    if (profile?.user_id !== currentUser?.id) return permissions;
    const protectedPermissions = {...permissions};
    CRITICAL_SELF_PERMISSIONS.forEach(key => protectedPermissions[key] = true);
    return protectedPermissions;
  }

  function protectRolePermissions(role, profile, permissions) {
    const protectedPermissions = role === "Administrador" ? window.GraviSupabase.roleDefaultPermissions("Administrador") : {...permissions};
    return protectSelfCriticalPermissions(profile, protectedPermissions);
  }

  function ensurePermissionPanel() {
    let panel = document.querySelector("#userPermissionPanel");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "userPermissionPanel";
    panel.className = "user-permission-panel";
    panel.hidden = true;
    modal.querySelector(".user-admin-card").appendChild(panel);
    return panel;
  }

  function renderPermissionPanel({title, subtitle, role, settings, onSave, profile=null}) {
    const panel = ensurePermissionPanel();
    const defaults = window.GraviSupabase.roleDefaultPermissions(role);
    const current = settings.permissions_mode === "custom" ? {...defaults, ...settings.custom_permissions} : {...defaults};
    const isSelf = profile?.user_id === window.GraviSupabase.getUser()?.id;
    const isAdministratorRole = role === "Administrador";
    panel.hidden = false;
    panel.innerHTML = `
      <div class="permission-panel-head">
        <div><p class="eyebrow">PERMISOS PERSONALIZADOS</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}</p></div>
        <button class="ghost" id="closePermissionPanel" type="button">Cerrar</button>
      </div>
      <div class="permission-info-notice">Los permisos personalizados se guardan en el perfil del usuario y se aplican junto con el rol base.</div>
      <div class="permission-actions">
        <button class="secondary" id="useRolePermissions" type="button">Usar permisos del rol</button>
        <button class="secondary" id="selectAllPermissions" type="button">Seleccionar todos</button>
        <button class="secondary" id="clearPermissions" type="button">Quitar todos</button>
        <button class="primary" id="savePermissions" type="button">Guardar permisos</button>
      </div>
      <div class="permission-grid">${permissionGroups().map(group => `
        <fieldset class="permission-group">
          <legend>${escapeHtml(group.label)}</legend>
          ${group.permissions.map(([key,label]) => {
            const locked = isAdministratorRole || (isSelf && CRITICAL_SELF_PERMISSIONS.has(key));
            return `<label class="${locked ? "permission-locked" : ""}"><input type="checkbox" data-permission-key="${key}" ${isAdministratorRole || current[key] ? "checked" : ""} ${locked ? "disabled" : ""}> <span>${escapeHtml(label)}</span></label>`;
          }).join("")}
        </fieldset>`).join("")}</div>`;
    const collect = mode => {
      const values = Object.fromEntries([...panel.querySelectorAll("[data-permission-key]")].map(input => [input.dataset.permissionKey, input.checked]));
      return {permissions_mode:mode, custom_permissions:protectRolePermissions(role, profile, values)};
    };
    const setAll = value => panel.querySelectorAll("[data-permission-key]:not(:disabled)").forEach(input => input.checked = value);
    panel.querySelector("#closePermissionPanel").onclick = () => panel.hidden = true;
    panel.querySelector("#useRolePermissions").onclick = () => { panel.hidden = true; onSave(rolePermissionSettings(role)); };
    panel.querySelector("#selectAllPermissions").onclick = () => setAll(true);
    panel.querySelector("#clearPermissions").onclick = () => setAll(false);
    panel.querySelector("#savePermissions").onclick = () => { panel.hidden = true; onSave(collect("custom")); };
  }

  function updateInvitePermissionSummary() {
    const summary = document.querySelector("#invitePermissionSummary");
    if (summary) summary.textContent = invitePermissionSettings.permissions_mode === "custom" ? "Personalizado" : "Predeterminados del rol";
  }

  function configureInvitePermissions() {
    renderPermissionPanel({
      title:"Permisos de la invitacion",
      subtitle:"Revisa o ajusta los accesos antes de enviar la invitacion.",
      role:inviteForm.elements.role.value,
      settings:invitePermissionSettings,
      onSave:settings => {
        invitePermissionSettings = settings;
        updateInvitePermissionSummary();
      }
    });
  }

  async function renderUsers() {
    adminMessage.textContent = "Cargando usuarios...";
    try {
      const profiles = await window.GraviSupabase.listProfiles();
      loadedProfiles = profiles;
      const canEditUsers = window.GraviSupabase.can("admin-write") || window.GraviSupabase.canPermission?.("users.edit");
      const canChangeRoles = window.GraviSupabase.can("admin-write") || window.GraviSupabase.canPermission?.("users.change_roles");
      const canManagePermissions = window.GraviSupabase.can("admin-write") || window.GraviSupabase.canPermission?.("users.manage_permissions");
      const canDeactivateUsers = window.GraviSupabase.can("admin-write") || window.GraviSupabase.canPermission?.("users.deactivate");
      adminList.innerHTML = profiles.length ? profiles.map(profile => `
        <article class="user-admin-row" data-user-row="${profile.user_id}">
          <div><b>${escapeHtml(profile.full_name || "Sin nombre")}</b><small>${profile.active ? "Usuario activo" : "Acceso suspendido"} · ${hasCustomPermissions(profile) ? "Personalizados" : "Predeterminados del rol"}</small></div>
          <span>${escapeHtml(profile.email || "Correo no disponible")}</span>
          <select data-user-role ${canChangeRoles ? "" : "disabled"}><option ${profile.role==="Administrador"?"selected":""}>Administrador</option><option ${profile.role==="Supervisor SST"?"selected":""}>Supervisor SST</option><option ${profile.role==="Consulta"?"selected":""}>Consulta</option></select>
          <label><input type="checkbox" data-user-active ${profile.active?"checked":""} ${canDeactivateUsers ? "" : "disabled"}> Activo</label>
          <div class="user-admin-actions"><button class="secondary" type="button" data-user-permissions ${canManagePermissions ? "" : "disabled"}>Permisos</button><button class="secondary" type="button" data-save-user ${canEditUsers ? "" : "disabled"}>Guardar</button></div>
        </article>`).join("") : '<div class="empty-management">No hay perfiles registrados.</div>';
      adminMessage.textContent = "";
      adminList.querySelectorAll("[data-user-role]").forEach(select => {
        select.onchange = () => {
          const profile = profiles.find(item => item.user_id === select.closest("[data-user-row]").dataset.userRow);
          if (profile) profile.__permissionDraft = rolePermissionSettings(select.value);
        };
      });
      adminList.querySelectorAll("[data-user-permissions]").forEach(button => button.onclick = () => {
        const row = button.closest("[data-user-row]");
        const profile = profiles.find(item => item.user_id === row.dataset.userRow);
        const role = row.querySelector("[data-user-role]").value;
        renderPermissionPanel({
          title:profile.full_name || profile.email || "Usuario",
          subtitle:"Permisos personalizados del usuario activo.",
          role,
          profile,
          settings:profile.__permissionDraft || profilePermissionSettings(profile),
          onSave:settings => {
            profile.__permissionDraft = settings;
            row.querySelector("small").textContent = `${profile.active ? "Usuario activo" : "Acceso suspendido"} · ${settings.permissions_mode === "custom" ? "Personalizados" : "Predeterminados del rol"}`;
          }
        });
      });
      adminList.querySelectorAll("[data-save-user]").forEach(button => button.onclick = async () => {
        const row = button.closest("[data-user-row]");
        button.disabled = true;
        try {
          const profile = profiles.find(item => item.user_id === row.dataset.userRow);
          const role = row.querySelector("[data-user-role]").value;
          const active = row.querySelector("[data-user-active]").checked;
          if (profile?.role === "Administrador" && profile.active && (role !== "Administrador" || !active) && activeAdminCount(profiles) <= 1) throw new Error("No puedes desactivar o degradar al ultimo Administrador activo.");
          const canManagePermissions = window.GraviSupabase.can("admin-write") || window.GraviSupabase.canPermission?.("users.manage_permissions");
          const permissionSettings = canManagePermissions ? (profile?.__permissionDraft || profilePermissionSettings(profile || {})) : null;
          await window.GraviSupabase.updateProfile(row.dataset.userRow, role, active, permissionSettings);
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
  const canConfigureInvitePermissions = window.GraviSupabase.can("admin-write") || window.GraviSupabase.canPermission?.("users.manage_permissions");
  inviteForm.insertAdjacentHTML("beforeend", `<button class="secondary" id="configureInvitePermissions" type="button" ${canConfigureInvitePermissions ? "" : "disabled"}>Configurar permisos</button><small id="invitePermissionSummary" class="permission-summary">Predeterminados del rol</small>`);
  inviteForm.elements.role.addEventListener("change", () => {
    invitePermissionSettings = rolePermissionSettings(inviteForm.elements.role.value);
    updateInvitePermissionSummary();
  });
  document.querySelector("#configureInvitePermissions").onclick = configureInvitePermissions;
  inviteForm.addEventListener("submit", async event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    adminMessage.textContent = "Enviando invitaci\u00f3n...";
    try {
      await window.GraviSupabase.inviteUser({email:fields.get("email"),fullName:fields.get("fullName"),role:fields.get("role"),permissions:invitePermissionSettings});
      event.currentTarget.reset();
      invitePermissionSettings = rolePermissionSettings(inviteForm.elements.role.value);
      updateInvitePermissionSummary();
      adminMessage.textContent = "Invitaci\u00f3n enviada. El usuario recibir\u00e1 un enlace para crear su contrase\u00f1a.";
      await renderUsers();
    } catch (error) {
      adminMessage.textContent = error.message;
    } finally { button.disabled = false; }
  });

  try {
    showAuthLoading();
    if (isSetPasswordRoute || window.GraviSupabase.hasAuthRedirect()) {
      try {
        await window.GraviSupabase.processAuthRedirect();
        window.GraviSupabase.clearAuthRedirectUrl("/set-password");
        showSetPassword();
      } catch (error) {
        console.error("No fue posible procesar la invitacion.", error);
        showSetPassword(error.message || "El enlace de invitaci\u00f3n no es v\u00e1lido o ya expir\u00f3.");
      }
    } else {
      const state = await window.GraviSupabase.bootstrap();
      if (state.authenticated) {
        showAppLoading();
        await enterApplication();
      } else showLogin(state.configured ? "" : "Supabase no esta configurado en este despliegue.");
    }
  } catch (error) {
    console.error("No fue posible preparar el acceso a GRAVI SST.", error);
    showLogin("No fue posible conectar con el servicio de acceso.");
  }
})().catch(error => {
  console.error("No fue posible iniciar GRAVI SST.", error);
  const message = document.querySelector("#authMessage");
  if (message) message.textContent = "No fue posible iniciar la aplicacion. Recarga la pagina.";
});
