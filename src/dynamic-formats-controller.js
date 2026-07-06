/**
 * Controlador de eventos para el módulo de Formatos Dinámicos
 * Maneja todas las interacciones de la UI
 */

(function initDynamicFormatsUI(global) {
  "use strict";

  let dynamicFormats = null;
  let currentAnalysis = null;
  let currentFormat = null;

  /**
   * Inicializa todos los eventos y controles
   */
  async function init(formats) {
    dynamicFormats = formats;

    setupEventListeners();
    setupDragAndDrop();
    loadFormatsList();

    console.log("[DynamicFormatsUI] Interfaz inicializada");
  }

  /**
   * Configura todos los event listeners
   */
  function setupEventListeners() {
    // Botón principal de carga
    const uploadBtn = document.getElementById("uploadFormatButton");
    if (uploadBtn) {
      uploadBtn.addEventListener("click", () => {
        document.getElementById("uploadFormatModal").showModal();
      });
    }

    // Input de archivo
    const fileInput = document.getElementById("excelFileInput");
    if (fileInput) {
      fileInput.addEventListener("change", handleFileSelect);
    }

    // Búsqueda y filtros
    const searchInput = document.getElementById("formatSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", filterFormats);
    }

    const categoryFilter = document.getElementById("formatCategoryFilter");
    if (categoryFilter) {
      categoryFilter.addEventListener("change", filterFormats);
    }

    const statusFilter = document.getElementById("formatStatusFilter");
    if (statusFilter) {
      statusFilter.addEventListener("change", filterFormats);
    }

    // Botones de flujo modal de carga
    const proceedBtn = document.getElementById("proceedToPreviewBtn");
    if (proceedBtn) {
      proceedBtn.addEventListener("click", showPreviewModal);
    }

    const saveFormatBtn = document.getElementById("saveFormatBtn");
    if (saveFormatBtn) {
      saveFormatBtn.addEventListener("click", handleSaveFormat);
    }

    const confirmPreviewBtn = document.getElementById("confirmPreviewBtn");
    if (confirmPreviewBtn) {
      confirmPreviewBtn.addEventListener("click", handleConfirmPreview);
    }

    const addFieldBtn = document.getElementById("addFieldBtn");
    if (addFieldBtn) {
      addFieldBtn.addEventListener("click", addNewField);
    }
  }

  /**
   * Configura drag and drop para carga de archivos
   */
  function setupDragAndDrop() {
    const uploadZone = document.getElementById("excelUploadZone");
    if (!uploadZone) return;

    uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadZone.classList.add("dragover");
    });

    uploadZone.addEventListener("dragleave", () => {
      uploadZone.classList.remove("dragover");
    });

    uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadZone.classList.remove("dragover");

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const fileInput = document.getElementById("excelFileInput");
        fileInput.files = files;

        const event = new Event("change", { bubbles: true });
        fileInput.dispatchEvent(event);
      }
    });

    uploadZone.addEventListener("click", () => {
      document.getElementById("excelFileInput").click();
    });
  }

  /**
   * Maneja la selección de archivo
   */
  async function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    const file = files[0];
    const progressDiv = document.getElementById("uploadProgress");
    const analysisDiv = document.getElementById("analysisResult");

    // Mostrar progreso
    progressDiv.hidden = false;
    analysisDiv.hidden = true;

    try {
      // Simular progreso
      updateProgress(30);

      // Analizar archivo
      const result = await dynamicFormats.analyzeExcelFile(file);
      updateProgress(70);

      if (!result.success) {
        showError(result.error || "Error al analizar el archivo");
        progressDiv.hidden = true;
        return;
      }

      currentAnalysis = result.data;
      updateProgress(100);

      // Mostrar resultados del análisis
      setTimeout(() => {
        progressDiv.hidden = true;
        showAnalysisResults(result.data);
        analysisDiv.hidden = false;

        // Pre-llenar formulario con metadata detectada
        document.getElementById("formatName").value = result.data.metadata.formatName || "";
        document.getElementById("formatCode").value = result.data.metadata.formatCode || "";
        document.getElementById("formatVersion").value = result.data.metadata.version || "1.0";

        if (result.data.suggestedCategory) {
          document.getElementById("formatCategory").value = result.data.suggestedCategory;
        }
      }, 500);
    } catch (error) {
      showError(error.message || "Error procesando archivo");
      progressDiv.hidden = true;
    }
  }

  /**
   * Actualiza la barra de progreso
   */
  function updateProgress(percent) {
    const fill = document.querySelector(".progress-fill");
    const status = document.getElementById("uploadStatus");

    if (fill) fill.style.width = percent + "%";
    if (status) {
      status.textContent = percent < 100
        ? `Leyendo archivo... ${percent}%`
        : "Análisis completado";
    }
  }

  /**
   * Muestra resultados del análisis
   */
  function showAnalysisResults(analysis) {
    // Información del archivo
    document.getElementById("analysiFileName").textContent = analysis.fileName;
    document.getElementById("analysisSheets").textContent = analysis.sheets.join(", ");
    document.getElementById("analysisRows").textContent = analysis.rows;
    document.getElementById("analysisScore").textContent = analysis.validations.score;

    // Mensajes de validación
    const errorsDiv = document.getElementById("validationErrors");
    const warningsDiv = document.getElementById("validationWarnings");

    errorsDiv.innerHTML = analysis.validations.errors
      .map(e => `<div class="error">⚠️ Error: ${e}</div>`)
      .join("");

    warningsDiv.innerHTML = analysis.validations.warnings
      .map(w => `<div class="warning">ℹ️ Advertencia: ${w}</div>`)
      .join("");

    // Campos detectados
    if (analysis.detectedFields && analysis.detectedFields.length > 0) {
      const fieldsDiv = document.getElementById("detectedFields");
      const fieldsList = document.getElementById("detectedFieldsList");

      fieldsList.innerHTML = analysis.detectedFields
        .map(f => `<li><strong>${f.name}</strong> (${f.type})</li>`)
        .join("");

      fieldsDiv.hidden = false;
    }

    // Mostrar botón para continuar
    document.getElementById("proceedToPreviewBtn").hidden = false;
  }

  /**
   * Muestra el modal de vista previa
   */
  async function showPreviewModal() {
    const modal = document.getElementById("previewFormatModal");

    // Generar editor de campos
    renderFieldsEditor(currentAnalysis.detectedFields || []);

    // Generar preview del formulario
    renderFormatPreview(currentAnalysis.detectedFields || []);

    document.getElementById("uploadFormatModal").close();
    modal.showModal();
  }

  /**
   * Renderiza el editor de campos
   */
  function renderFieldsEditor(fields) {
    const container = document.getElementById("fieldsEditorContainer");
    
    container.innerHTML = fields.map((field, idx) => `
      <div class="field-editor" data-field-id="${field.id}">
        <div class="field-editor-row">
          <input type="text" class="field-name" value="${field.name}" placeholder="Nombre del campo">
          <select class="field-type">
            <option value="Texto corto" ${field.type === "Texto corto" ? "selected" : ""}>Texto corto</option>
            <option value="Texto largo" ${field.type === "Texto largo" ? "selected" : ""}>Texto largo</option>
            <option value="Fecha" ${field.type === "Fecha" ? "selected" : ""}>Fecha</option>
            <option value="Hora" ${field.type === "Hora" ? "selected" : ""}>Hora</option>
            <option value="Número" ${field.type === "Número" ? "selected" : ""}>Número</option>
            <option value="Selección de obra" ${field.type === "Selección de obra" ? "selected" : ""}>Selección de obra</option>
            <option value="Selección de contratista" ${field.type === "Selección de contratista" ? "selected" : ""}>Selección de contratista</option>
            <option value="Selección de trabajador" ${field.type === "Selección de trabajador" ? "selected" : ""}>Selección de trabajador</option>
            <option value="Firma" ${field.type === "Firma" ? "selected" : ""}>Firma</option>
            <option value="Evidencia fotográfica" ${field.type === "Evidencia fotográfica" ? "selected" : ""}>Evidencia fotográfica</option>
          </select>
        </div>
        <div class="field-editor-row">
          <input type="checkbox" class="field-required" ${field.required ? "checked" : ""}> 
          <label>Obligatorio</label>
        </div>
        <button type="button" class="secondary small" onclick="removeField('${field.id}')">Eliminar</button>
      </div>
    `).join("");
  }

  /**
   * Renderiza preview del formulario
   */
  function renderFormatPreview(fields) {
    const form = document.getElementById("formatPreviewForm");

    form.innerHTML = fields.map(field => {
      const fieldId = field.id || `field_${Math.random().toString(36).substr(2, 9)}`;

      switch (field.type) {
        case "Fecha":
          return `<label>
            ${field.name}
            <input type="date" name="${fieldId}" ${field.required ? "required" : ""}>
          </label>`;

        case "Hora":
          return `<label>
            ${field.name}
            <input type="time" name="${fieldId}" ${field.required ? "required" : ""}>
          </label>`;

        case "Número":
          return `<label>
            ${field.name}
            <input type="number" name="${fieldId}" ${field.required ? "required" : ""}>
          </label>`;

        case "Texto largo":
          return `<label>
            ${field.name}
            <textarea name="${fieldId}" rows="3" ${field.required ? "required" : ""}></textarea>
          </label>`;

        case "Firma":
          return `<label>
            ${field.name}
            <div class="signature-box" style="border: 1px solid #ddd; height: 100px; border-radius: 4px; background: #f9f9f9;"></div>
          </label>`;

        case "Evidencia fotográfica":
          return `<label>
            ${field.name}
            <input type="file" accept="image/*" multiple ${field.required ? "required" : ""}>
          </label>`;

        case "Selección de obra":
        case "Selección de contratista":
        case "Selección de trabajador":
          return `<label>
            ${field.name}
            <select name="${fieldId}" ${field.required ? "required" : ""}>
              <option value="">-- Seleccione --</option>
            </select>
          </label>`;

        default:
          return `<label>
            ${field.name}
            <input type="text" name="${fieldId}" ${field.required ? "required" : ""}>
          </label>`;
      }
    }).join("");
  }

  /**
   * Agrega nuevo campo al editor
   */
  function addNewField() {
    const newField = {
      id: `field_${Date.now()}`,
      name: "Nuevo campo",
      type: "Texto corto",
      required: false,
      detected: false
    };

    if (!currentAnalysis.detectedFields) {
      currentAnalysis.detectedFields = [];
    }

    currentAnalysis.detectedFields.push(newField);
    renderFieldsEditor(currentAnalysis.detectedFields);
    renderFormatPreview(currentAnalysis.detectedFields);
  }

  /**
   * Elimina un campo
   */
  function removeField(fieldId) {
    if (currentAnalysis.detectedFields) {
      currentAnalysis.detectedFields = currentAnalysis.detectedFields.filter(f => f.id !== fieldId);
      renderFieldsEditor(currentAnalysis.detectedFields);
      renderFormatPreview(currentAnalysis.detectedFields);
    }
  }

  /**
   * Confirma la vista previa y guarda el formato
   */
  async function handleConfirmPreview() {
    // Recolectar campos editados
    const fieldEditors = document.querySelectorAll(".field-editor");
    const fields = [];

    fieldEditors.forEach(editor => {
      const nameInput = editor.querySelector(".field-name");
      const typeSelect = editor.querySelector(".field-type");
      const requiredCheckbox = editor.querySelector(".field-required");

      fields.push({
        name: nameInput.value,
        type: typeSelect.value,
        required: requiredCheckbox.checked,
        label: nameInput.value
      });
    });

    currentAnalysis.detectedFields = fields;

    // Preparar datos del formato
    const formatData = {
      name: document.getElementById("formatName").value,
      description: document.getElementById("formatDescription").value,
      category: document.getElementById("formatCategory").value,
      formatCode: document.getElementById("formatCode").value,
      formatType: document.getElementById("formatType").value,
      version: document.getElementById("formatVersion").value,
      status: document.getElementById("formatStatus").value,
      vigencyStart: document.getElementById("vigencyStart").value,
      vigencyEnd: document.getElementById("vigencyEnd").value,
      originalFilename: currentAnalysis.fileName,
      excelStructure: currentAnalysis,
      metadata: currentAnalysis.metadata,
      fields: fields
    };

    // Validar
    const validation = { errors: [], warnings: [] };
    if (!formatData.name) validation.errors.push("Nombre requerido");
    if (!formatData.category) validation.errors.push("Categoría requerida");
    if (fields.length === 0) validation.errors.push("Al menos un campo requerido");

    if (validation.errors.length > 0) {
      showError(validation.errors.join("\n"));
      return;
    }

    // Guardar
    try {
      const result = await dynamicFormats.saveFormat(formatData);

      if (result.success) {
        showSuccess(`Formato "${formatData.name}" guardado exitosamente`);

        // Cerrar modal y recargar lista
        document.getElementById("previewFormatModal").close();
        loadFormatsList();

        // Limpiar formulario
        document.getElementById("uploadFormatModal").close();
        document.getElementById("excelFileInput").value = "";
      } else {
        showError(result.error || "Error guardando formato");
      }
    } catch (error) {
      showError(error.message);
    }
  }

  /**
   * Maneja el flujo antiguo de guardar formato (para compatibilidad)
   */
  async function handleSaveFormat() {
    await handleConfirmPreview();
  }

  /**
   * Carga la lista de formatos
   */
  async function loadFormatsList() {
    try {
      const result = await dynamicFormats.listFormats();

      if (result.success) {
        renderFormatsList(result.data || []);
      }
    } catch (error) {
      console.error("Error cargando formatos:", error);
    }
  }

  /**
   * Renderiza la lista de formatos
   */
  function renderFormatsList(formats) {
    const container = document.getElementById("formatsList");

    if (formats.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #999;">
          <p style="font-size: 18px; margin: 0 0 10px 0;">📋 No hay formatos cargados</p>
          <p>Comienza cargando tu primer formato en Excel</p>
        </div>
      `;
      return;
    }

    container.innerHTML = formats.map(format => `
      <div class="format-card">
        <div class="format-card-header">
          <div class="format-card-title">${format.name}</div>
          <span class="format-card-badge ${format.status?.toLowerCase() || 'draft'}">
            ${format.status || 'Borrador'}
          </span>
        </div>
        <div class="format-card-category">${format.format_categories?.name || 'Sin categoría'}</div>
        <div class="format-card-meta">
          <span>v${format.version || '1.0'}</span>
          <span>${new Date(format.created_at).toLocaleDateString()}</span>
        </div>
        <div class="format-card-actions">
          <button type="button" class="btn-primary" onclick="viewFormatDetails('${format.id}')">Ver</button>
          <button type="button" class="btn-secondary" onclick="createRecordFromFormat('${format.id}')">Usar</button>
        </div>
      </div>
    `).join("");
  }

  /**
   * Aplica filtros a la lista de formatos
   */
  async function filterFormats() {
    const searchText = (document.getElementById("formatSearchInput")?.value || "").toLowerCase();
    const category = document.getElementById("formatCategoryFilter")?.value || "";
    const status = document.getElementById("formatStatusFilter")?.value || "";

    const result = await dynamicFormats.listFormats({ category, status });

    if (result.success) {
      let filtered = result.data || [];

      if (searchText) {
        filtered = filtered.filter(f =>
          f.name.toLowerCase().includes(searchText) ||
          f.format_categories?.name?.toLowerCase().includes(searchText)
        );
      }

      renderFormatsList(filtered);
    }
  }

  /**
   * Ve los detalles de un formato
   */
  async function viewFormatDetails(formatId) {
    try {
      const result = await dynamicFormats.getFormat(formatId);

      if (!result.success) {
        showError(result.error);
        return;
      }

      const format = result.data;
      currentFormat = format;

      // Llenar modal con detalles
      document.getElementById("detailsFormatName").textContent = format.name;
      document.getElementById("detailsCategory").textContent = format.format_categories?.name || "-";
      document.getElementById("detailsVersion").textContent = format.version || "1.0";
      document.getElementById("detailsStatus").textContent = format.status || "Borrador";
      document.getElementById("detailsCode").textContent = format.format_code || "-";

      const vigency = format.vigency_start || format.vigency_end
        ? `${format.vigency_start || "Indefinida"} - ${format.vigency_end || "Indefinida"}`
        : "Sin especificar";
      document.getElementById("detailsVigency").textContent = vigency;

      document.getElementById("detailsCreatedAt").textContent = new Date(format.created_at).toLocaleString();

      // Llenar tabla de campos
      const fieldsList = document.getElementById("detailsFieldsList");
      fieldsList.innerHTML = (format.format_fields || []).map(field => `
        <tr>
          <td>${field.field_name}</td>
          <td>${field.field_type}</td>
          <td>${field.required ? '✓' : '-'}</td>
          <td>
            <button type="button" class="secondary small" onclick="editField('${field.id}')">Editar</button>
          </td>
        </tr>
      `).join("");

      // Botones de acción
      document.getElementById("editFormatBtn").onclick = () => editFormat(formatId);
      document.getElementById("duplicateFormatBtn").onclick = () => duplicateFormat(formatId);
      document.getElementById("deleteFormatBtn").onclick = () => deleteFormat(formatId);

      // Mostrar modal
      document.getElementById("formatDetailsModal").showModal();
    } catch (error) {
      showError(error.message);
    }
  }

  /**
   * Abre el formulario para crear un registro desde un formato
   */
  async function createRecordFromFormat(formatId) {
    const result = await dynamicFormats.getFormat(formatId);

    if (!result.success) {
      showError(result.error);
      return;
    }

    const format = result.data;
    currentFormat = format;

    // Generar formulario dinámico
    const form = document.getElementById("dynamicRecordForm");
    form.innerHTML = (format.format_fields || []).map(field => {
      const fieldId = field.id;

      switch (field.field_type) {
        case "Fecha":
          return `<label>
            ${field.field_label || field.field_name} ${field.required ? "*" : ""}
            <input type="date" name="${fieldId}" ${field.required ? "required" : ""}>
          </label>`;

        case "Hora":
          return `<label>
            ${field.field_label || field.field_name} ${field.required ? "*" : ""}
            <input type="time" name="${fieldId}" ${field.required ? "required" : ""}>
          </label>`;

        case "Número":
          return `<label>
            ${field.field_label || field.field_name} ${field.required ? "*" : ""}
            <input type="number" name="${fieldId}" ${field.required ? "required" : ""}>
          </label>`;

        case "Texto largo":
          return `<label>
            ${field.field_label || field.field_name} ${field.required ? "*" : ""}
            <textarea name="${fieldId}" rows="3" ${field.required ? "required" : ""}></textarea>
          </label>`;

        case "Firma":
          return `<label>
            ${field.field_label || field.field_name} ${field.required ? "*" : ""}
            <div class="signature-box" style="border: 1px solid #ddd; height: 150px; border-radius: 4px;"></div>
          </label>`;

        case "Evidencia fotográfica":
          return `<label>
            ${field.field_label || field.field_name} ${field.required ? "*" : ""}
            <input type="file" name="${fieldId}" accept="image/*" multiple ${field.required ? "required" : ""}>
          </label>`;

        default:
          return `<label>
            ${field.field_label || field.field_name} ${field.required ? "*" : ""}
            <input type="text" name="${fieldId}" ${field.required ? "required" : ""} placeholder="${field.placeholder || ""}">
          </label>`;
      }
    }).join("");

    // Mostrar modal
    document.getElementById("createRecordModal").showModal();

    // Configurar botones
    document.getElementById("saveDraftBtn").onclick = () => saveRecordDraft(formatId);
    document.getElementById("submitRecordBtn").onclick = () => submitRecord(formatId);
  }

  /**
   * Guarda un registro como borrador
   */
  async function saveRecordDraft(formatId) {
    const form = document.getElementById("dynamicRecordForm");
    const formData = new FormData(form);
    const capturedData = Object.fromEntries(formData);

    try {
      const result = await dynamicFormats.createRecord(
        formatId,
        capturedData,
        localStorage.getItem("gvc-active-work-id")
      );

      if (result.success) {
        showSuccess("Registro guardado como borrador");
        document.getElementById("createRecordModal").close();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError(error.message);
    }
  }

  /**
   * Envía (completa) un registro
   */
  async function submitRecord(formatId) {
    const form = document.getElementById("dynamicRecordForm");

    if (!form.checkValidity()) {
      showError("Por favor, completa todos los campos obligatorios");
      return;
    }

    const formData = new FormData(form);
    const capturedData = Object.fromEntries(formData);

    try {
      const result = await dynamicFormats.createRecord(
        formatId,
        capturedData,
        localStorage.getItem("gvc-active-work-id")
      );

      if (result.success) {
        // Actualizar estado a "Completo"
        await dynamicFormats.updateRecord(result.recordId, {
          status: "Completo"
        });

        showSuccess("Registro creado exitosamente");
        document.getElementById("createRecordModal").close();
        loadFormatsList();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError(error.message);
    }
  }

  /**
   * Funciones de utilidad para mostrar mensajes
   */
  function showError(message) {
    const toast = document.createElement("div");
    toast.className = "toast error";
    toast.textContent = "❌ " + message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f8d7da;
      color: #721c24;
      padding: 15px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 10000;
      max-width: 400px;
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
  }

  function showSuccess(message) {
    const toast = document.createElement("div");
    toast.className = "toast success";
    toast.textContent = "✓ " + message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #d4edda;
      color: #155724;
      padding: 15px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 10000;
      max-width: 400px;
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  /**
   * Stub functions para acciones futuras
   */
  function editFormat(formatId) {
    showSuccess("Función de edición en desarrollo");
  }

  function duplicateFormat(formatId) {
    showSuccess("Función de duplicación en desarrollo");
  }

  async function deleteFormat(formatId) {
    if (!confirm("¿Eliminar este formato? Esta acción no se puede deshacer.")) return;

    try {
      const result = await dynamicFormats.deleteFormat(formatId);

      if (result.success) {
        showSuccess("Formato eliminado");
        document.getElementById("formatDetailsModal").close();
        loadFormatsList();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError(error.message);
    }
  }

  function editField(fieldId) {
    showSuccess("Edición de campos en desarrollo");
  }

  // Exportar API
  global.GraviDynamicFormatsUI = {
    init,
    viewFormatDetails,
    createRecordFromFormat,
    removeField
  };

  console.log("[DynamicFormatsUI] Controlador cargado");

})(window);
