# Sistema de Formatos Dinámicos en Excel - GRAVI SST

## Estado: FASE 1 COMPLETADA ✓

### Cambios Implementados

#### 1. Infraestructura de Base de Datos (Supabase)
Archivo: `database/dynamic_formats.sql`

**Tablas creadas:**
- `format_categories` - Categorías de formatos (Inspección, Investigación, etc.)
- `dynamic_formats` - Metadatos principales de formatos
- `format_fields` - Definición de campos individuales
- `format_records` - Registros generados desde formatos
- `format_versions` - Historial de versiones
- `format_field_templates` - Plantillas de campos predefinidos

**Índices:** Optimizados para consultas rápidas por work_id, categoria, estado, etc.

#### 2. Módulo Core de JavaScript
Archivo: `src/dynamic-formats.js`

**API Exportada (GraviDynamicFormats):**
```javascript
// Inicializar
const api = GraviDynamicFormats.init(supabaseClient, session);

// Métodos principales
await api.loadFormats(workId, filters);
await api.uploadFormat(file);
await api.analyzeExcelFile(file);
await api.validateFormat(formatData);
await api.saveFormat(formatData);
await api.getFormat(formatId);
await api.listFormats(filters);
await api.deleteFormat(formatId);
await api.createRecord(formatId, capturedData, workId);
await api.updateRecord(recordId, updates);
await api.exportRecordToPDF(recordId);
```

#### 3. Interfaz de Usuario
Archivo: `src/dynamic-formats-ui.html`

**Componentes incluidos:**
- Lista de formatos con filtros (búsqueda, categoría, estado)
- Modal de carga de Excel con drag-and-drop
- Análisis automático del archivo con validación
- Vista previa de campos detectados
- Editor manual de campos
- Detalles del formato con tabla de campos
- Modal para crear registros dinámicos
- Gestión de versiones y estados

#### 4. Controlador de Eventos
Archivo: `src/dynamic-formats-controller.js`

**Funcionalidades:**
- Manejo de carga de archivos
- Análisis y detección de campos
- Validación de formatos
- Renderizado dinámico de formularios
- Filtrado y búsqueda de formatos
- CRUD de registros desde formatos

#### 5. Bootstrap de Inicialización
Archivo: `src/dynamic-formats-bootstrap.js`

**Responsabilidades:**
- Inyección de UI HTML dinámicamente
- Inicialización del módulo con Supabase
- Integración con sistema de navegación
- Configuración de eventos

#### 6. Integración en Index
Archivo: `index.html` (modificado)

**Cambios:**
- ✓ Añadida librería XLSX para lectura de Excel
- ✓ Botón de navegación "Formatos dinámicos" en barra lateral (sección FORMATOS)
- ✓ Contenedor para inyección de UI
- ✓ Scripts del módulo encolados al final

---

## INSTRUCCIONES DE IMPLEMENTACIÓN

### Paso 1: Ejecutar Script SQL en Supabase

1. Ir a Supabase Console → SQL Editor
2. Crear nueva consulta
3. Copiar y ejecutar contenido de `database/dynamic_formats.sql`
4. Verificar que todas las tablas se creen correctamente

**Validación:** Debería haber 7 tablas nuevas + categorías e iniciales precargadas

### Paso 2: Configurar Permisos en Supabase (RLS)

En SQL Editor, ejecutar:
```sql
-- Permitir usuarios autenticados leer/escribir en sus propios formatos
ALTER TABLE public.dynamic_formats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view formats of their work"
  ON public.dynamic_formats FOR SELECT
  USING (work_id IS NULL OR work_id IN (
    SELECT id FROM obras WHERE id IN (
      SELECT work_id FROM registros WHERE created_by = auth.uid()
    )
  ));

CREATE POLICY "Admins can manage formats"
  ON public.dynamic_formats FOR ALL
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM perfiles_usuario 
    WHERE user_id = auth.uid() AND role = 'Administrador'
  ));

-- Similar para otras tablas...
```

### Paso 3: Pruebas en Desarrollo

1. Abrir la aplicación en navegador
2. Ir a Inicio → Administración de Obra → **Formatos dinámicos**
3. Hacer clic en "Cargar nuevo formato"
4. Seleccionar un archivo Excel de prueba

**Archivo de prueba mínimo recomendado:**
- Hoja llamada "FORMATO"
- Primera sección con: Nombre, Código, Versión, Fecha, Obra
- Segunda sección con tabla de campos

Ejemplo estructura:
```
| Nombre del formato | Inspección de Extintores |
| Código            | GVC-SSH-FMT-001          |
| Versión           | 1.0                      |
| Fecha             | 2025-01-01               |
| ----              | ----                     |
| Fecha             | [___]                    |
| Obra              | [___]                    |
| Extintor ID       | [___]                    |
| Condición         | [___]                    |
```

### Paso 4: Validar Funcionalidades

✓ **Carga de archivo:**
- Puede seleccionar/arrastrar Excel
- Se analiza estructura
- Se muestran errores/advertencias

✓ **Detección de campos:**
- Identifica columnas comunes
- Sugiere tipos (Fecha, Texto, Número, etc.)
- Permite edición manual

✓ **Guardado:**
- Valida antes de guardar
- Guarda metadatos y estructura
- Crea versión inicial

✓ **Listado:**
- Muestra formatos creados
- Filtra por categoría/estado
- Busca por nombre

---

## PRÓXIMAS FASES

### FASE 2: Mejoras de Lectura y Validación
- [ ] Detectar tablas anidadas en Excel
- [ ] Extraer opciones de listas desplegables
- [ ] Validar datos según tipos de campo
- [ ] Advertir sobre celdas combinadas
- [ ] Sugerir campos obligatorios basado en nombre

### FASE 3: Vista Previa Avanzada
- [ ] Preview del formulario dinámico en vivo
- [ ] Reordenar campos con drag-and-drop
- [ ] Agregar/eliminar campos en UI
- [ ] Establecer validaciones por campo
- [ ] Asignar opciones a desplegables manualmente

### FASE 4: Generación de Registros
- [ ] Generar formularios dinámicos desde formato
- [ ] Captura de datos con validación en tiempo real
- [ ] Soporte para firmas digitales
- [ ] Adjuntar evidencias fotográficas
- [ ] Guardar como borrador o enviar

### FASE 5: Exportación y Control
- [ ] Exportar registros a PDF preservando diseño
- [ ] Gestionar versiones de formatos (crear nuevas)
- [ ] Control de formatos activos/inactivos/borrador
- [ ] Historial de cambios en campos
- [ ] Reportes de uso de formatos

### FASE 6: Integración con Módulos Existentes
- [ ] Reemplazar algunos módulos de inspecciones con formatos dinámicos
- [ ] Migrar datos existentes a nueva estructura
- [ ] Unified reports interface
- [ ] Sincronización mejorada

---

## ESTRUCTURA DE ARCHIVOS

```
src/
├── dynamic-formats.js              ← Módulo core (API)
├── dynamic-formats-ui.html         ← Componentes HTML
├── dynamic-formats-controller.js   ← Manejador de eventos
├── dynamic-formats-bootstrap.js    ← Inicialización
└── styles/
    └── (estilos en dynamic-formats-ui.html por ahora)

database/
└── dynamic_formats.sql             ← Schema Supabase
```

---

## NOTAS TÉCNICAS

### Tipos de Campos Soportados
```javascript
TEXT_SHORT: "Texto corto"
TEXT_LONG: "Texto largo"
DATE: "Fecha"
TIME: "Hora"
NUMBER: "Número"
DROPDOWN: "Lista desplegable"
CHECKBOX: "Casilla de verificación"
SIGNATURE: "Firma"
EVIDENCE: "Evidencia fotográfica"
WORK_SELECT: "Selección de obra"
CONTRACTOR_SELECT: "Selección de contratista"
WORKER_SELECT: "Selección de trabajador"
RESPONSIBLE: "Responsable"
OBSERVATIONS: "Observaciones"
```

### Categorías Iniciales
```javascript
INSPECTION: "insp"
ACCIDENT_INVESTIGATION: "acc"
WORK_PERMIT: "permit"
CHECKLIST: "check"
LOGBOOK: "bitac"
EPP_DELIVERY: "epp"
TRAINING: "train"
ATTENDANCE: "attend"
DAILY_REPORT: "daily"
PHOTO_REPORT: "photo"
DOCUMENT_CONTROL: "doc"
OTHER: "other"
```

### Flujo de Datos
1. Usuario carga Excel
2. Sistema analiza con XLSX library
3. Detecta estructura y campos
4. Valida criterios mínimos
5. Usuario confirma/edita campos
6. Sistema guarda en Supabase
7. Formato disponible para generar registros

---

## ARCHIVOS NO MODIFICADOS

El sistema está diseñado para no romper funcionalidad existente:
- ✓ No modifica módulos de inspecciones, incidentes, trabajadores, etc.
- ✓ No altera tablas existentes
- ✓ Nuevas tablas completamente independientes
- ✓ Se integra como funcionalidad adicional
- ✓ Compatible con navegación existente

---

## TESTING MANUAL

### Caso 1: Cargar formato válido
1. Crear Excel con estructura recomendada
2. Cargar en "Formatos dinámicos"
3. Verificar análisis correcto
4. Editar campos si es necesario
5. Guardar formato
6. Buscar y ver detalles

### Caso 2: Crear registro desde formato
1. Ver formato guardado
2. Clic en botón "Usar"
3. Completar formulario dinámico
4. Guardar como borrador o crear registro
5. Verificar en Supabase que se guardó

### Caso 3: Validaciones
1. Intentar guardar sin nombre → Error
2. Intentar guardar sin categoría → Error
3. Intentar guardar sin campos → Error
4. Cargar Excel vacío → Error + advertencia

---

## SOPORTE Y DEBUGGING

### Errores Comunes

**"Librería XLSX no cargada"**
- Verificar que la librería se cargó en index.html
- Revisar console de navegador

**"Módulo no inicializado"**
- Verificar que Supabase está listo
- Revisar autenticación

**"Tabla no encontrada en Supabase"**
- Ejecutar SQL de schema de nuevo
- Verificar permisos RLS

### Logs Disponibles
```javascript
// Ver actividad del módulo
console.log("GraviDynamicFormats inicializado");
console.log("[DynamicFormats] Acción realizada");

// Monitor en tiempo real
window.addEventListener('gvc:formats-updated', () => {
  console.log("Formatos actualizados");
});
```

---

**Versión:** 1.0 - FASE 1  
**Última actualización:** 2025-01-06  
**Estado:** Completado y listo para pruebas
