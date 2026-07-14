(function () {
  "use strict";

  const DOCUMENT_ASSETS = {
    corporateLogo: "/assets/documents/gravi-constructora-documentos.jpg"
  };

  const codes = {
    "INSPECCIÓN DE EXTINTOR": "GVC-SSH-FMT-009",
    "INSPECCIÓN DE BOTIQUÍN": "GVC-SSH-FMT-006",
    "INSPECCIÓN DE SIERRA DE BANCO": "GVC-SSH-FMT-005",
    "INSPECCIÓN DE ESMERIL": "GVC-SSH-FMT-007",
    "INSPECCIÓN DE EXTENSIÓN ELÉCTRICA": "GVC-SSH-FMT-008",
    "LISTA DE ASISTENCIA SEMANAL": "GVC-CON-REG-036-F11",
    "GAFETE DE IDENTIFICACIÓN": "GVC-SEG-REG-039-F01",
    "INVESTIGACIÓN DE ACCIDENTE": "GVC-SSH-INV-001",
    "REPORTE DE SEGURIDAD DE OBRA": "RSO"
  };

  const logoUrl = new URL(DOCUMENT_ASSETS.corporateLogo, window.location.origin).href;

  function inferCode(root) {
    const text = (root.querySelector("h1")?.textContent || "").trim().toUpperCase();
    return Object.entries(codes).find(([name]) => text.includes(name))?.[1] || "GVC-SSH";
  }

  function escapeText(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    }[character]));
  }

  function documentTitle(root, payload) {
    return payload.reportTitle || root.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() || "Documento SST";
  }

  function userName() {
    return window.GraviSupabase?.getProfile?.()?.full_name || window.GraviSupabase?.getUser?.()?.email || "Usuario GRAVI SST";
  }

  function generatedAt() {
    return new Date().toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
  }

  function attendancePeriod(payload, legacyTitle) {
    const legacy = legacyTitle?.querySelector("p")?.textContent?.split(" · ").pop()?.trim();
    if (legacy) return legacy;
    if (payload.weekStart && payload.date) return `${payload.weekStart} al ${payload.date}`;
    return payload.weekStart || payload.date || "Periodo no especificado";
  }

  function createAttendanceHeader(root, payload, signature) {
    const work = payload.work || {};
    const active = document.querySelector("#activeWorkButton")?.textContent || "Obra activa";
    const legacyTitle = root.querySelector(".week-title");
    const header = document.createElement("header");
    header.className = "document-header document-header--attendance document-corporate-header";
    header.dataset.signature = signature;
    header.innerHTML = `
      <div class="document-header__logo"><img src="${logoUrl}" alt="GRAVI Constructora"></div>
      <div class="document-header__identity">
        <div class="document-company">GRAN VISIÓN CONSTRUCCIÓN · ${escapeText(payload.revision || "Rev. 02")}</div>
        <h1 class="document-title">LISTA DE ASISTENCIA SEMANAL</h1>
        <div class="document-project">${escapeText(work.development || "Desarrollo no especificado")} · ${escapeText(work.name || active)}</div>
        <div class="document-period">${escapeText(attendancePeriod(payload, legacyTitle))}</div>
      </div>
      <div class="document-header__metadata">
        <span><b>FECHA</b>${escapeText(payload.date || "Sin fecha")}</span>
        <span><b>RESPONSABLE</b>${escapeText(userName())}</span>
      </div>`;
    legacyTitle?.remove();
    return header;
  }

  function groupAttendanceTables(root) {
    root.querySelectorAll(":scope > .attendance-contractor").forEach(title => {
      const table = title.nextElementSibling;
      if (!table?.matches("table.report-table")) return;
      const group = document.createElement("section");
      group.className = "attendance-group";
      title.before(group);
      title.className = "attendance-group__title";
      table.classList.add("attendance-table");
      group.append(title, table);
      const rowCount = table.tBodies[0]?.rows.length || 0;
      if (rowCount <= 6) group.classList.add("attendance-group--compact");
    });
  }

  function decorateAttendance(root, payload, signature) {
    root.classList.add("gravi-document--weekly-attendance");
    const header = createAttendanceHeader(root, payload, signature);
    root.prepend(header);
    const generalData = root.querySelector(":scope > .official-meta");
    generalData?.classList.add("document-general-data");
    groupAttendanceTables(root);
    root.querySelectorAll(":scope > table.report-table").forEach(table => table.classList.add("attendance-table"));

    const total = [...root.querySelectorAll(".attendance-group .attendance-table tbody tr")].length;
    const footer = document.createElement("footer");
    footer.className = "document-footer-summary";
    footer.dataset.signature = signature;
    footer.innerHTML = `<span><b>Abreviaturas:</b> P = Presente · A = Ausente · - = Sin registro</span><span><b>Total general:</b> ${total} trabajadores</span>`;
    root.appendChild(footer);
  }

  function decorate(root, payload = {}) {
    if (!root || !root.innerHTML.trim()) return;
    root.classList.add("corporate-document", "gravi-document");
    const work = payload.work || {};
    const active = document.querySelector("#activeWorkButton")?.textContent || "Obra activa";
    const code = payload.code || inferCode(root);
    const revision = payload.revision || "Rev. 01";
    const title = documentTitle(root, payload);
    const date = payload.date || payload.weekStart || "";
    const signature = [code, revision, work.name || active, title, date].join("|");
    const isAttendance = payload.type === "attendance" || Boolean(root.querySelector(":scope > .week-report"));
    const documentRoot = root.querySelector(":scope > .week-report") || root;
    const currentHeader = documentRoot.querySelector(":scope > .document-corporate-header");
    const currentFooter = documentRoot.querySelector(":scope > .document-page-footer, :scope > .document-footer-summary");
    if (currentFooter?.dataset.signature === signature && currentHeader?.dataset.signature === signature) return;
    currentHeader?.remove();
    currentFooter?.remove();

    if (isAttendance) {
      documentRoot.classList.add("corporate-document", "gravi-document");
      decorateAttendance(documentRoot, payload, signature);
      return;
    }

    const header = document.createElement("header");
    header.className = "document-corporate-header";
    header.dataset.signature = signature;
    header.innerHTML = `<div class="document-logo-box"><img src="${logoUrl}" alt="GRAVI Constructora"></div><div><b>GRAVI SST</b><h2>${escapeText(title)}</h2><p>${escapeText(work.development || "Desarrollo no especificado")} · ${escapeText(work.name || active)}</p></div><div class="document-header-meta"><span><b>Fecha</b>${escapeText(date || "Sin fecha")}</span><span><b>Responsable</b>${escapeText(userName())}</span></div>`;
    root.prepend(header);
    const footer = document.createElement("footer");
    footer.className = "document-page-footer";
    footer.dataset.signature = signature;
    footer.innerHTML = `<span>Generado automáticamente por GRAVI SST</span><span>${escapeText(code)} · ${escapeText(revision)}</span><span>${escapeText(generatedAt())}</span>`;
    root.appendChild(footer);
  }

  window.GvcDocuments = { DOCUMENT_ASSETS, decorate };
  const root = document.querySelector("#printReport");
  if (root) {
    new MutationObserver(() => queueMicrotask(() => decorate(root, window.systemDownloadData || {})))
      .observe(root, { childList: true });
  }
})();
