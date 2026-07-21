(function initializeGraviPrint(global) {
  "use strict";

  const PRINT_DOCUMENT_CONFIG = Object.freeze({
    attendance: { paper: "letter", orientation: "landscape" },
    weeklyAttendance: { paper: "letter", orientation: "landscape" },
    compliance: { paper: "letter", orientation: "landscape" },
    complianceMatrix: { paper: "letter", orientation: "landscape" },
    generalDashboard: { paper: "letter", orientation: "landscape" },
    dailyReport: { paper: "letter", orientation: "portrait" },
    "daily-report": { paper: "letter", orientation: "portrait" },
    workPermit: { paper: "letter", orientation: "portrait" },
    permit: { paper: "letter", orientation: "portrait" },
    inspection: { paper: "letter", orientation: "portrait" },
    firstAid: { paper: "letter", orientation: "portrait" },
    extinguisher: { paper: "letter", orientation: "portrait" },
    equipment: { paper: "letter", orientation: "portrait" },
    incident: { paper: "letter", orientation: "portrait" },
    investigation: { paper: "letter", orientation: "portrait" },
    ats: { paper: "letter", orientation: "portrait" },
    suspension: { paper: "letter", orientation: "portrait" },
    eppDelivery: { paper: "letter", orientation: "portrait" },
    executiveReport: { paper: "letter", orientation: "landscape" },
    dynamicFormat: { paper: "letter", orientation: "portrait" },
    default: { paper: "letter", orientation: "portrait" }
  });

  const nextFrame = view => new Promise(resolve => view.requestAnimationFrame(() => resolve()));

  function configFor(documentType, orientation) {
    const configured = PRINT_DOCUMENT_CONFIG[documentType] || PRINT_DOCUMENT_CONFIG.default;
    const selected = orientation || configured.orientation;
    return { ...configured, orientation: selected === "landscape" ? "landscape" : "portrait" };
  }

  function absoluteUrl(value) {
    if (!value || /^(data:|blob:|about:)/i.test(value)) return value;
    try { return new URL(value, document.baseURI).href; } catch { return value; }
  }

  function prepareClone(element) {
    const clone = element.cloneNode(true);
    clone.classList.add("gravi-document");
    clone.querySelectorAll('[data-print-exclude="true"], [data-print-exclude], .screen-only').forEach(node => node.remove());
    const clonedCanvases = clone.querySelectorAll("canvas");
    element.querySelectorAll("canvas").forEach((canvas, index) => {
      const target = clonedCanvases[index];
      if (!target) return;
      try {
        const image = document.createElement("img");
        image.src = canvas.toDataURL("image/png");
        image.alt = canvas.getAttribute("aria-label") || "Contenido gráfico";
        image.className = canvas.className;
        target.replaceWith(image);
      } catch (error) { console.warn("GRAVI Print: no fue posible copiar un canvas.", error); }
    });
    clone.querySelectorAll("img, source, video").forEach(node => {
      for (const attribute of ["src", "poster"]) {
        if (node.hasAttribute(attribute)) node.setAttribute(attribute, absoluteUrl(node.getAttribute(attribute)));
      }
      if (node.hasAttribute("srcset")) {
        node.setAttribute("srcset", node.getAttribute("srcset").split(",").map(item => {
          const parts = item.trim().split(/\s+/); parts[0] = absoluteUrl(parts[0]); return parts.join(" ");
        }).join(", "));
      }
    });
    return clone;
  }

  function waitForImages(printDocument) {
    return Promise.all(Array.from(printDocument.images).map(image => {
      if (image.complete && image.naturalWidth > 0) return image.decode?.().catch(() => undefined) || Promise.resolve();
      return new Promise(resolve => {
        const timer=setTimeout(resolve,12000),done=()=>{clearTimeout(timer);resolve();};
        image.addEventListener("load", done, { once: true });
        image.addEventListener("error", done, { once: true });
      });
    }));
  }

  async function printDocument(options = {}) {
    const element = typeof options.element === "string" ? document.querySelector(options.element) : options.element;
    if (!(element instanceof Element) || !element.innerHTML.trim()) throw new Error("No hay un documento institucional para imprimir.");
    await (global.GraviReportEvidenceReady || Promise.resolve());
    const unresolved=[...element.querySelectorAll(".evidence-report-grid img")].filter(image=>!image.complete||image.naturalWidth===0);
    if(unresolved.length)throw new Error("Las evidencias del reporte todavía no están listas para impresión.");
    const config = configFor(options.documentType, options.orientation || element.dataset.printOrientation);
    const title = String(options.title || "documento-gravi-sst").replace(/[<>:"/\\|?*]+/g, "-");
    const printWindow = global.open("", "_blank");
    if (!printWindow) throw new Error("El navegador bloqueó la ventana de impresión. Habilita ventanas emergentes para GRAVI SST.");
    const clone = prepareClone(element);
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .filter(link => !/unpkg\.com\/leaflet/i.test(link.href) && !/print-documents\.css/i.test(link.href))
      .map(link => `<link rel="stylesheet" href="${absoluteUrl(link.href)}">`).join("");
    const printCssUrl = absoluteUrl("/src/styles/print-documents.css?v=34");
    const orientationStyle = `@page { size: Letter ${config.orientation}; margin: ${config.orientation === "landscape" ? "8mm" : "10mm"}; }`;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="es" data-print-orientation="${config.orientation}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title>${styles}<link rel="stylesheet" href="${printCssUrl}"><style>${orientationStyle}</style></head><body class="gravi-print-document"><main class="gravi-print-root" data-document-type="${options.documentType || "default"}" data-print-orientation="${config.orientation}">${clone.outerHTML}</main></body></html>`);
    printWindow.document.close();
    await new Promise(resolve => printWindow.document.readyState === "complete" ? resolve() : printWindow.addEventListener("load", resolve, { once: true }));
    await (printWindow.document.fonts?.ready || Promise.resolve());
    await waitForImages(printWindow.document);
    await nextFrame(printWindow); await nextFrame(printWindow);
    printWindow.focus(); printWindow.print();
    return printWindow;
  }

  function printCurrentDocument(overrides = {}) {
    const payload = global.systemDownloadData || {};
    const element = overrides.element || document.querySelector("#printReport");
    const inferredType = element?.querySelector(".work-permit-print") ? "workPermit" : element?.querySelector(".week-report") ? "attendance" : "default";
    const type = overrides.documentType || (inferredType !== "default" ? inferredType : payload.documentType || payload.type || inferredType);
    return printDocument({ element, title: overrides.title || payload.downloadName || payload.reportTitle || "documento-gravi-sst", orientation: overrides.orientation, documentType: type });
  }

  global.GraviPrint = Object.freeze({ PRINT_DOCUMENT_CONFIG, printDocument, printCurrentDocument });
  global.print = function graviManagedPrint() {
    return printCurrentDocument().catch(error => {
      console.error("GRAVI Print:", error);
      global.alert(error.message);
    });
  };
})(window);
