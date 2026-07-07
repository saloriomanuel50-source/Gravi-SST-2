(function createDynamicFormatsModule(global) {
  "use strict";

  const FORMATS_CACHE_KEY = "gvc-dynamic-formats-v1";
  const FORMATS_PENDING_KEY = "gvc-dynamic-formats-pending-v1";
  
  // Tipos de campos soportados
  const FIELD_TYPES = {
    TEXT_SHORT: "Texto corto",
    TEXT_LONG: "Texto largo",
    DATE: "Fecha",
    TIME: "Hora",
    NUMBER: "NÃºmero",
    DROPDOWN: "Lista desplegable",
    CHECKBOX: "Casilla de verificaciÃ³n",
    SIGNATURE: "Firma",
    EVIDENCE: "Evidencia fotogrÃ¡fica",
    WORK_SELECT: "SelecciÃ³n de obra",
    CONTRACTOR_SELECT: "SelecciÃ³n de contratista",
    WORKER_SELECT: "SelecciÃ³n de trabajador",
    RESPONSIBLE: "Responsable",
    OBSERVATIONS: "Observaciones"
  };

  // CategorÃ­as de formatos
  const FORMAT_CATEGORIES = {
    INSPECTION: "insp",
    ACCIDENT_INVESTIGATION: "acc",
    WORK_PERMIT: "permit",
    CHECKLIST: "check",
    LOGBOOK: "bitac",
    EPP_DELIVERY: "epp",
    TRAINING: "train",
    ATTENDANCE: "attend",
    DAILY_REPORT: "daily",
    PHOTO_REPORT: "photo",
    DOCUMENT_CONTROL: "doc",
    OTHER: "other"
  };

  // Estados de formato
  const FORMAT_STATUS = {
    ACTIVE: "Activo",
    INACTIVE: "Inactivo",
    DRAFT: "Borrador"
  };

  // Estados de registro
  const RECORD_STATUS = {
    COMPLETE: "Completo",
    DRAFT: "Borrador",
    SENT: "Enviado"
  };

  let storage = null;
  const legacyStorage = null;
  let formatCache = [];

  /**
   * Inicializa el mÃ³dulo con instancia de Supabase
   */
  function init(options = {}) {
    storage = options.storage || options;
    console.log("[DynamicFormats] MÃ³dulo inicializado");
    return {
      loadFormats,
      uploadFormat,
      analyzeExcelFile,
      validateFormat,
      saveFormat,
      getFormat,
      listFormats,
      deleteFormat,
      createRecord,
      getRecord,
      updateRecord,
      exportRecordToPDF,
      getFieldTypes: () => FIELD_TYPES,
      getCategories: () => FORMAT_CATEGORIES,
      getStatuses: () => FORMAT_STATUS
    };
  }

  /**
   * Carga los formatos disponibles desde Supabase
   */
  async function loadFormats(workId = null, filters = {}) {
    return listFormats({...filters, workId});
  }

  async function legacyLoadFormats(workId = null, filters = {}) {
    if (!legacyStorage) throw new Error("MÃ³dulo no inicializado");
    
    try {
      let query = legacyStorage
        .from("dynamic_formats")
        .select("*, format_categories(name, description), format_fields(*)")
        .neq("deleted_at", null)
        .order("created_at", { ascending: false });

      if (workId) {
        query = query.or(`work_id.eq.${workId},work_id.is.null`);
      }

      if (filters.category) {
        query = query.eq("category_id", filters.category);
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      formatCache = data || [];
      return { success: true, data: formatCache };
    } catch (error) {
      console.error("[DynamicFormats] Error cargando formatos:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Procesa un archivo Excel cargado
   * Retorna estructura, campos detectados y validaciones
   */
  async function analyzeExcelFile(file) {
    if (!file) throw new Error("No se proporcionÃ³ archivo");
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      throw new Error("Solo se aceptan archivos Excel (.xlsx, .xls)");
    }

    try {
      // Verificar que XLSX estÃ© disponible
      if (typeof XLSX === "undefined") {
        throw new Error("LibrerÃ­a XLSX no cargada. Agregue: <script src=\"https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js\"></script>");
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      
      // Verificar que exista la hoja "FORMATO"
      const formatoSheet = workbook.SheetNames.includes("FORMATO");
      const mainSheet = formatoSheet ? "FORMATO" : workbook.SheetNames[0];
      
      if (!mainSheet) {
        throw new Error("El archivo Excel no contiene hojas vÃ¡lidas");
      }

      const worksheet = workbook.Sheets[mainSheet];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!data || data.length === 0) {
        throw new Error("El archivo Excel estÃ¡ vacÃ­o");
      }

      // Analizar estructura
      const analysis = {
        fileName: file.name,
        fileSize: file.size,
        sheets: workbook.SheetNames,
        mainSheet: mainSheet,
        rows: data.length,
        columns: Math.max(...data.map(row => row ? row.length : 0)),
        rawData: data.slice(0, 50), // Primeras 50 filas para preview
        detectedFields: detectFields(data),
        suggestedCategory: suggestCategory(data),
        metadata: extractMetadata(data),
        validations: performInitialValidation(data, file.name)
      };

      return { success: true, data: analysis };
    } catch (error) {
      console.error("[DynamicFormats] Error analizando Excel:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detecta campos capturables en el Excel
   */
  function detectFields(data) {
    const fields = [];
    const commonFieldNames = {
      fecha: "Fecha",
      date: "Fecha",
      obra: "Obra",
      work: "Obra",
      contratista: "Contratista",
      contractor: "Contratista",
      trabajador: "Trabajador",
      worker: "Trabajador",
      responsable: "Responsable",
      responsible: "Responsable",
      actividad: "Actividad",
      activity: "Actividad",
      hallazgo: "Hallazgo",
      finding: "Hallazgo",
      acciÃ³n: "AcciÃ³n correctiva",
      action: "AcciÃ³n correctiva",
      evidencia: "Evidencia",
      evidence: "Evidencia",
      firma: "Firma",
      signature: "Firma",
      observaciones: "Observaciones",
      observations: "Observaciones",
      hora: "Hora",
      time: "Hora",
      nombre: "Nombre",
      name: "Nombre"
    };

    // Buscar en encabezados (primeras 5 filas)
    for (let rowIdx = 0; rowIdx < Math.min(5, data.length); rowIdx++) {
      const row = data[rowIdx];
      if (!row) continue;

      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cell = row[colIdx];
        if (!cell) continue;

        const cellStr = String(cell).trim().toLowerCase();
        const fieldName = commonFieldNames[cellStr] || String(cell).trim();

        if (fieldName && !fields.find(f => f.name === fieldName)) {
          fields.push({
            id: `field_${fields.length}`,
            name: fieldName,
            type: inferFieldType(cellStr, cell),
            row: rowIdx,
            col: colIdx,
            required: false,
            detected: true
          });
        }
      }
    }

    return fields;
  }

  /**
   * Infiere el tipo de campo basado en el contenido
   */
  function inferFieldType(cellStr, cellValue) {
    if (cellStr.includes("fecha") || cellStr.includes("date")) return FIELD_TYPES.DATE;
    if (cellStr.includes("hora") || cellStr.includes("time")) return FIELD_TYPES.TIME;
    if (cellStr.includes("firma") || cellStr.includes("signature")) return FIELD_TYPES.SIGNATURE;
    if (cellStr.includes("evidencia") || cellStr.includes("photo")) return FIELD_TYPES.EVIDENCE;
    if (cellStr.includes("obra") || cellStr.includes("work")) return FIELD_TYPES.WORK_SELECT;
    if (cellStr.includes("contratista") || cellStr.includes("contractor")) return FIELD_TYPES.CONTRACTOR_SELECT;
    if (cellStr.includes("trabajador") || cellStr.includes("worker")) return FIELD_TYPES.WORKER_SELECT;
    if (cellStr.includes("responsable") || cellStr.includes("responsible")) return FIELD_TYPES.RESPONSIBLE;
    if (cellStr.includes("observaciÃ³n") || cellStr.includes("observation")) return FIELD_TYPES.OBSERVATIONS;
    if (typeof cellValue === "number") return FIELD_TYPES.NUMBER;
    if (String(cellValue).length > 50) return FIELD_TYPES.TEXT_LONG;
    return FIELD_TYPES.TEXT_SHORT;
  }

  /**
   * Sugiere categorÃ­a basada en contenido del Excel
   */
  function suggestCategory(data) {
    const content = data.slice(0, 10).flat().join(" ").toLowerCase();
    
    if (content.includes("inspecciÃ³n") || content.includes("inspection")) return FORMAT_CATEGORIES.INSPECTION;
    if (content.includes("accidente") || content.includes("accident")) return FORMAT_CATEGORIES.ACCIDENT_INVESTIGATION;
    if (content.includes("permiso") || content.includes("permit")) return FORMAT_CATEGORIES.WORK_PERMIT;
    if (content.includes("checklist") || content.includes("verificaciÃ³n")) return FORMAT_CATEGORIES.CHECKLIST;
    if (content.includes("bitÃ¡cora") || content.includes("logbook")) return FORMAT_CATEGORIES.LOGBOOK;
    if (content.includes("epp") || content.includes("protecciÃ³n")) return FORMAT_CATEGORIES.EPP_DELIVERY;
    if (content.includes("capacitaciÃ³n") || content.includes("training")) return FORMAT_CATEGORIES.TRAINING;
    if (content.includes("asistencia") || content.includes("attendance")) return FORMAT_CATEGORIES.ATTENDANCE;
    if (content.includes("reporte diario") || content.includes("daily report")) return FORMAT_CATEGORIES.DAILY_REPORT;
    if (content.includes("fotogrÃ¡fico") || content.includes("photo")) return FORMAT_CATEGORIES.PHOTO_REPORT;
    
    return FORMAT_CATEGORIES.OTHER;
  }

  /**
   * Extrae metadata del Excel (nombre, versiÃ³n, responsable, etc)
   */
  function extractMetadata(data) {
    const metadata = {
      formatName: "",
      formatCode: "",
      version: "",
      date: new Date().toISOString().split("T")[0],
      responsible: "",
      work: "",
      observations: ""
    };

    // Buscar en primeras 10 filas
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      const rowStr = row.join(" ").toLowerCase();
      
      if (rowStr.includes("nombre") || rowStr.includes("format")) {
        metadata.formatName = String(row[1] || "").trim();
      }
      if (rowStr.includes("cÃ³digo") || rowStr.includes("code")) {
        metadata.formatCode = String(row[1] || "").trim();
      }
      if (rowStr.includes("versiÃ³n") || rowStr.includes("version")) {
        metadata.version = String(row[1] || "").trim();
      }
      if (rowStr.includes("responsable") || rowStr.includes("responsible")) {
        metadata.responsible = String(row[1] || "").trim();
      }
      if (rowStr.includes("obra") || rowStr.includes("work")) {
        metadata.work = String(row[1] || "").trim();
      }
    }

    return metadata;
  }

  /**
   * Realiza validaciones iniciales del Excel
   */
  function performInitialValidation(data, fileName) {
    const validation = {
      errors: [],
      warnings: [],
      score: 100
    };

    // Validar que no estÃ© vacÃ­o
    if (!data || data.length === 0) {
      validation.errors.push("Archivo Excel vacÃ­o");
      validation.score = 0;
      return validation;
    }

    // Validar cantidad mÃ­nima de filas
    if (data.length < 3) {
      validation.warnings.push("El formato tiene muy pocas filas. Se recomienda al menos 3 filas.");
      validation.score -= 10;
    }

    // Validar si tiene encabezados claros
    const firstRow = data[0] || [];
    if (firstRow.length === 0) {
      validation.errors.push("Primera fila vacÃ­a - se esperan encabezados");
      validation.score -= 30;
    }

    // Advertencias sobre diseÃ±o
    let mergedCells = 0;
    let emptyColumns = 0;
    
    for (let col = 0; col < Math.max(...data.map(r => r ? r.length : 0)); col++) {
      let hasContent = false;
      for (let row = 0; row < data.length; row++) {
        if (data[row] && data[row][col]) {
          hasContent = true;
          break;
        }
      }
      if (!hasContent) emptyColumns++;
    }

    if (emptyColumns > 0) {
      validation.warnings.push(`Se detectaron ${emptyColumns} columna(s) vacÃ­a(s). Considere eliminarlas.`);
      validation.score -= 5;
    }

    // Validar que tenga al menos un campo
    const nonEmptyCells = data.flat().filter(cell => cell && String(cell).trim().length > 0).length;
    if (nonEmptyCells < 3) {
      validation.errors.push("Formato con muy pocos campos vÃ¡lidos");
      validation.score -= 40;
    }

    validation.score = Math.max(0, validation.score);
    return validation;
  }

  /**
   * Valida un formato completo antes de guardar
   */
  function uploadFormat(formatData) { return saveFormat(formatData); }

  function validateFormat(formatData) {
    const errors = [];
    const warnings = [];

    if (!formatData.name || formatData.name.trim().length === 0) {
      errors.push("El nombre del formato es obligatorio");
    }

    if (!formatData.category) {
      errors.push("La categorÃ­a del formato es obligatoria");
    }

    if (!formatData.fields || formatData.fields.length === 0) {
      errors.push("El formato debe tener al menos un campo");
    }

    if (formatData.fields && formatData.fields.length > 0) {
      const requiredFields = formatData.fields.filter(f => f.required);
      if (requiredFields.length === 0) {
        warnings.push("Se recomienda tener al menos un campo obligatorio");
      }
    }

    if (!formatData.version || formatData.version.trim().length === 0) {
      warnings.push("Se recomienda especificar una versiÃ³n para el formato");
    }

    const uniqueFieldNames = new Set(formatData.fields.map(f => f.name));
    if (uniqueFieldNames.size < formatData.fields.length) {
      warnings.push("Se detectaron campos con nombres duplicados");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Guarda un nuevo formato en Supabase
   */
  async function saveFormat(formatData) {
    if (!storage?.saveFormat) return {success:false,error:"Almacenamiento de formatos no disponible."};
    const validation = validateFormat(formatData);
    if (!validation.isValid) return { success:false, errors:validation.errors };
    return storage.saveFormat({...formatData, validationWarnings:validation.warnings});
  }

  async function legacySaveFormat(formatData) {
    if (!legacyStorage) throw new Error("MÃ³dulo no inicializado");
    
    // Validar
    const validation = validateFormat(formatData);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const formatId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Guardar formato
      const { error: formatError } = await legacyStorage
        .from("dynamic_formats")
        .insert({
          id: formatId,
          name: formatData.name,
          description: formatData.description || "",
          category_id: formatData.category,
          format_code: formatData.formatCode || "",
          format_type: formatData.formatType || "EstÃ¡ndar",
          version: formatData.version || "1.0",
          status: formatData.status || FORMAT_STATUS.DRAFT,
          vigency_start: formatData.vigencyStart || new Date().toISOString().split("T")[0],
          vigency_end: formatData.vigencyEnd || null,
          created_by: "system",
          work_id: formatData.workId || null,
          original_filename: formatData.originalFilename || "",
          excel_structure: formatData.excelStructure || {},
          metadata: formatData.metadata || {},
          validation_errors: validation.errors,
          validation_warnings: validation.warnings
        });

      if (formatError) throw formatError;

      // Guardar campos
      if (formatData.fields && formatData.fields.length > 0) {
        const fieldsToInsert = formatData.fields.map((field, idx) => ({
          id: crypto.randomUUID(),
          format_id: formatId,
          field_order: idx,
          field_name: field.name,
          field_type: field.type,
          field_label: field.label || field.name,
          placeholder: field.placeholder || "",
          required: field.required || false,
          validation_pattern: field.validationPattern || null,
          options: field.options || null,
          sheet_reference: field.sheetReference || null,
          cell_row: field.row || null,
          cell_col: field.col || null,
          max_length: field.maxLength || null,
          min_value: field.minValue || null,
          max_value: field.maxValue || null,
          help_text: field.helpText || "",
          metadata: field.metadata || {}
        }));

        const { error: fieldsError } = await legacyStorage
          .from("format_fields")
          .insert(fieldsToInsert);

        if (fieldsError) throw fieldsError;
      }

      // Crear versiÃ³n inicial
      await legacyStorage
        .from("format_versions")
        .insert({
          id: crypto.randomUUID(),
          format_id: formatId,
          version_number: formatData.version || "1.0",
          version_date: new Date().toISOString().split("T")[0],
          changelog: "VersiÃ³n inicial",
          changed_by: "system",
          payload: formatData
        });

      console.log("[DynamicFormats] Formato guardado:", formatId);
      return { success: true, formatId, warnings: validation.warnings };
    } catch (error) {
      console.error("[DynamicFormats] Error guardando formato:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene un formato especÃ­fico
   */
  async function getFormat(formatId) {
    if (!storage?.getFormat) return {success:true,data:null,source:"unavailable"};
    return storage.getFormat(formatId);
  }

  async function legacyGetFormat(formatId) {
    if (!legacyStorage) throw new Error("MÃ³dulo no inicializado");

    try {
      const { data, error } = await legacyStorage
        .from("dynamic_formats")
        .select("*, format_fields(*)")
        .eq("id", formatId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("[DynamicFormats] Error obteniendo formato:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista formatos con filtros
   */
  async function listFormats(filters = {}) {
    if (!storage?.listFormats) return {success:true,data:[],source:"unavailable"};
    const result = await storage.listFormats(filters);
    if (result.success) formatCache = result.data || [];
    return result;
  }

  async function legacyListFormats(filters = {}) {
    if (!legacyStorage) throw new Error("MÃ³dulo no inicializado");

    try {
      let query = legacyStorage
        .from("dynamic_formats")
        .select("id, name, category_id, version, status, created_at, format_categories(name)");

      if (filters.workId) {
        query = query.or(`work_id.eq.${filters.workId},work_id.is.null`);
      }

      if (filters.category) {
        query = query.eq("category_id", filters.category);
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("[DynamicFormats] Error listando formatos:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Elimina un formato (soft delete)
   */
  async function deleteFormat(formatId) {
    if (!storage?.deleteFormat) return {success:false,error:"Almacenamiento de formatos no disponible."};
    return storage.deleteFormat(formatId);
  }

  async function legacyDeleteFormat(formatId) {
    if (!legacyStorage) throw new Error("MÃ³dulo no inicializado");

    try {
      const { error } = await legacyStorage
        .from("dynamic_formats")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", formatId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("[DynamicFormats] Error eliminando formato:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Crea un nuevo registro desde un formato
   */
  async function createRecord(formatId, capturedData, workId) {
    if (!storage?.createRecord) return {success:false,error:"Almacenamiento de formatos no disponible."};
    return storage.createRecord({formatId, capturedData, workId, status:RECORD_STATUS.DRAFT});
  }

  async function legacyCreateRecord(formatId, capturedData, workId) {
    if (!legacyStorage) throw new Error("MÃ³dulo no inicializado");

    try {
      const recordId = crypto.randomUUID();
      const { error } = await legacyStorage
        .from("format_records")
        .insert({
          id: recordId,
          format_id: formatId,
          work_id: workId,
          captured_data: capturedData,
          created_by: "system",
          status: RECORD_STATUS.DRAFT
        });

      if (error) throw error;
      return { success: true, recordId };
    } catch (error) {
      console.error("[DynamicFormats] Error creando registro:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene un registro
   */
  async function getRecord(recordId) {
    return {success:false,error:"Consulta de registros dinámicos no implementada en Fase 1.",recordId};
  }

  async function legacyGetRecord(recordId) {
    if (!legacyStorage) throw new Error("MÃ³dulo no inicializado");

    try {
      const { data, error } = await legacyStorage
        .from("format_records")
        .select("*")
        .eq("id", recordId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("[DynamicFormats] Error obteniendo registro:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualiza un registro
   */
  async function updateRecord(recordId, updates) {
    if (!storage?.updateRecord) return {success:false,error:"Almacenamiento de formatos no disponible."};
    return storage.updateRecord(recordId, updates);
  }

  async function legacyUpdateRecord(recordId, updates) {
    if (!legacyStorage) throw new Error("MÃ³dulo no inicializado");

    try {
      const { error } = await legacyStorage
        .from("format_records")
        .update({
          ...updates,
          updated_by: "system",
          updated_at: new Date().toISOString()
        })
        .eq("id", recordId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("[DynamicFormats] Error actualizando registro:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Exporta un registro a PDF (bÃ¡sico - requiere librerÃ­a adicional)
   */
  async function exportRecordToPDF(recordId) {
    return {success:false,error:"Exportación PDF de formatos dinámicos no implementada en Fase 1.",recordId};
  }

  async function legacyExportRecordToPDF(recordId) {
    try {
      const result = await getRecord(recordId);
      if (!result.success) throw new Error(result.error);

      const record = result.data;
      const formatResult = await getFormat(record.format_id);
      if (!formatResult.success) throw new Error(formatResult.error);

      const format = formatResult.data;

      // Estructura bÃ¡sica para PDF (requiere librerÃ­a jsPDF o similar)
      const pdfData = {
        formatName: format.name,
        formatVersion: format.version,
        recordDate: record.record_date,
        capturedData: record.captured_data,
        fields: format.format_fields
      };

      console.log("[DynamicFormats] Registro listo para exportar a PDF:", pdfData);
      return { success: true, pdfData };
    } catch (error) {
      console.error("[DynamicFormats] Error exportando a PDF:", error);
      return { success: false, error: error.message };
    }
  }

  // Exportar API pÃºblica
  global.GraviDynamicFormats = {
    init,
    FIELD_TYPES,
    FORMAT_CATEGORIES,
    FORMAT_STATUS,
    RECORD_STATUS
  };

  console.log("[DynamicFormats] MÃ³dulo cargado. Use GraviDynamicFormats.init() para inicializar.");

})(window);
