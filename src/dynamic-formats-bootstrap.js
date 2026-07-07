/**
 * Bootstrap del modulo de Formatos Dinamicos.
 * Fase 1: usa el contrato publico GraviSupabase.dynamicFormats.
 */

(function initDynamicFormatsBootstrap(global) {
  "use strict";

  let bootstrapped = false;
  let navigationBound = false;

  function dynamicFormatsReady() {
    return Boolean(
      global.GraviSupabase?.isAuthenticated?.() &&
      global.GraviSupabase?.dynamicFormats &&
      global.GraviDynamicFormats &&
      global.GraviDynamicFormatsUI
    );
  }

  async function bootstrapDynamicFormats() {
    if (bootstrapped || !dynamicFormatsReady()) return false;

    try {
      const dynamicFormatsAPI = global.GraviDynamicFormats.init({
        storage: global.GraviSupabase.dynamicFormats,
        can: global.GraviSupabase.can,
        getUser: global.GraviSupabase.getUser,
        getProfile: global.GraviSupabase.getProfile
      });

      await injectDynamicFormatsUI();
      global.GraviDynamicFormatsUI.init(dynamicFormatsAPI);
      bootstrapped = true;
      return true;
    } catch (error) {
      console.error("[DynamicFormats] Error en bootstrap:", error);
      return false;
    }
  }

  async function injectDynamicFormatsUI() {
    const container = document.getElementById("dynamicFormatsContainer");
    if (!container || container.dataset.loaded === "1") return;

    const response = await fetch("./src/dynamic-formats-ui.html");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    container.innerHTML = await response.text();
    container.dataset.loaded = "1";
  }

  function bindNavigation() {
    if (navigationBound) return;
    navigationBound = true;

    document.addEventListener("click", async event => {
      const target = event.target.closest("[data-phase3-nav]");
      if (!target || target.dataset.phase3Nav !== "dynamicFormats") return;

      const ready = await bootstrapDynamicFormats();
      if (!ready) {
        console.warn("[DynamicFormats] Modulo aun no disponible.");
        return;
      }

      event.preventDefault();
      showDynamicFormatsView();
    });
  }

  function showDynamicFormatsView() {
    const view = document.getElementById("dynamicFormatsView");
    if (!view) return;

    document.querySelectorAll(".view").forEach(item => item.classList.remove("active"));
    view.hidden = false;
    view.classList.add("active");
    window.scrollTo({top:0, behavior:"smooth"});
  }

  bindNavigation();
  global.addEventListener("gvc:auth-ready", () => { bootstrapDynamicFormats(); });
  global.showDynamicFormatsView = showDynamicFormatsView;
})(window);
