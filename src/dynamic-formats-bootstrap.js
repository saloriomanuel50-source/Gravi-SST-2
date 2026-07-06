/**
 * Bootstrap del módulo de Formatos Dinámicos
 * Se ejecuta después de la carga de bootstrap.js y cuando Supabase está listo
 */

(function initDynamicFormatsBootstrap(global) {
  "use strict";

  // Esperar a que GraviSupabase esté disponible
  const checkSupabase = setInterval(() => {
    if (!global.GraviSupabase) return;

    clearInterval(checkSupabase);
    bootstrapDynamicFormats();
  }, 100);

  async function bootstrapDynamicFormats() {
    try {
      // Obtener instancia de Supabase
      const supabase = global.GraviSupabase.getSupabaseClient?.() || global.supabaseClient;
      const session = global.GraviSupabase.getCurrentSession?.();

      if (!supabase || !session) {
        console.log("[DynamicFormats] Esperando autenticación...");
        return;
      }

      // Inicializar módulo
      if (!global.GraviDynamicFormats) {
        console.error("[DynamicFormats] Módulo no cargado");
        return;
      }

      const dynamicFormatsAPI = global.GraviDynamicFormats.init(supabase, session);

      // Inyectar UI HTML
      await injectDynamicFormatsUI();

      // Inicializar interfaz
      if (global.GraviDynamicFormatsUI) {
        global.GraviDynamicFormatsUI.init(dynamicFormatsAPI);
      }

      // Configurar evento de navegación
      setupNavigation();

      console.log("[DynamicFormats] Bootstrap completado");
    } catch (error) {
      console.error("[DynamicFormats] Error en bootstrap:", error);
    }
  }

  /**
   * Inyecta el HTML de la UI de formatos dinámicos
   */
  async function injectDynamicFormatsUI() {
    const container = document.getElementById("dynamicFormatsContainer");
    if (!container) {
      console.warn("[DynamicFormats] Contenedor no encontrado");
      return;
    }

    try {
      const response = await fetch("./src/dynamic-formats-ui.html");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      container.innerHTML = html;

      console.log("[DynamicFormats] UI inyectada");
    } catch (error) {
      console.error("[DynamicFormats] Error inyectando UI:", error);
    }
  }

  /**
   * Configura el evento de navegación para mostrar la vista de formatos
   */
  function setupNavigation() {
    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-phase3-nav]");
      if (!target || target.dataset.phase3Nav !== "dynamicFormats") return;

      e.preventDefault();
      showDynamicFormatsView();
    });
  }

  /**
   * Muestra la vista de formatos dinámicos
   */
  function showDynamicFormatsView() {
    // Ocultar otras vistas
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.querySelectorAll(".view.admin-only, .view.work-only").forEach(v => v.hidden = true);

    // Mostrar vista de formatos
    const view = document.getElementById("dynamicFormatsView");
    if (view) {
      view.hidden = false;
      view.classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Exportar referencia a función de navegación
  global.showDynamicFormatsView = showDynamicFormatsView;

})(window);
