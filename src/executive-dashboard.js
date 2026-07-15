(function createGraviExecutiveDashboard(global){
  "use strict";
  const q=(selector,root=document)=>root.querySelector(selector);
  const kpis=["Desarrollos","Obras","Trabajadores presentes hoy","Cumplimiento promedio","Incidencias del mes","Pendientes críticos","Días sin accidentes","Índice de riesgo general"];
  function card(title,body=""){return `<section class="executive-card"><h2>${title}</h2>${body||'<div class="executive-empty">Preparando datos reales…</div>'}</section>`;}
  function render(){
    global.GraviExecutiveDashboardBridge?.showView?.();
    const host=q("#developmentsGrid");if(!host)return;
    q("#developmentsTitle").textContent="Reporte ejecutivo de inicio";
    q("#developmentsSubtitle").textContent="Vista ejecutiva general de GRAVI SST. Indicadores consolidados y alertas críticas.";
    host.className="gravi-executive-dashboard";
    host.innerHTML=`<header class="executive-page-head"><div><h1>Reporte ejecutivo de inicio</h1><p>Vista ejecutiva general de GRAVI SST. Indicadores consolidados y alertas críticas.</p></div><button class="executive-export" type="button" data-executive-export>Exportar PDF</button></header>
      <section class="executive-kpi-grid" aria-label="Indicadores ejecutivos">${kpis.map((label,index)=>`<article class="executive-kpi executive-kpi-${index+1}"><span class="executive-kpi-title">${label}</span><strong>—</strong><small>Cargando información</small></article>`).join("")}</section>
      <div class="executive-dashboard-layout"><div class="executive-main-column">
        <div class="executive-control-row">${card("Filtrar por desarrollo:",'<label class="executive-filter-label"><span>Desarrollo</span><select disabled><option>Todos</option></select></label>')}${card("Atención inmediata",'<div class="executive-priority-grid"><div class="executive-empty">No hay obras evaluadas todavía.</div></div>')}</div>
        <div class="executive-chart-grid">${card("Cumplimiento por obra")}${card("Incidentes últimos 12 meses")}${card("Estado documental")}</div>
        ${card("Resumen por obra",'<div class="executive-table-wrap"><table><thead><tr><th>Obra</th><th>Desarrollo</th><th>Asistencia</th><th>Cumplimiento</th><th>Documentos</th><th>Incidencias</th><th>Pendientes</th><th>Nivel de riesgo</th><th>Acciones</th></tr></thead><tbody><tr><td colspan="9">Preparando datos reales…</td></tr></tbody></table></div>')}
      </div><aside class="executive-side-column">${card('Alertas críticas <small>(ordenadas por urgencia)</small>')}${card("Actividad reciente")}</aside></div>
      <footer class="executive-update-note">ⓘ Los datos mostrados se actualizan automáticamente.</footer>`;
    q("[data-executive-export]",host)?.addEventListener("click",()=>global.GraviExecutiveDashboardBridge?.exportReport?.());
  }
  global.GraviExecutiveDashboard={render};
})(window);
