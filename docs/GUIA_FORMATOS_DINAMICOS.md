# Guía de Uso: Formatos Dinámicos en Excel - GRAVI SST

## Tabla de Contenidos
1. [Inicio Rápido](#inicio-rápido)
2. [Estructura de Excel Recomendada](#estructura-de-excel-recomendada)
3. [Criterios de Validación](#criterios-de-validación)
4. [Ejemplos Prácticos](#ejemplos-prácticos)
5. [Solución de Problemas](#solución-de-problemas)

---

## Inicio Rápido

### 1. Acceder al Módulo
- Login en GRAVI SST
- Seleccionar una obra
- Menú lateral → **FORMATOS** → **Formatos dinámicos**

### 2. Crear un Nuevo Formato
- Clic en "↓ Cargar nuevo formato"
- Seleccionar o arrastrar archivo Excel
- Sistema analiza automáticamente
- Revisar campos detectados
- Corregir si es necesario
- Completar datos del formato
- Guardar

### 3. Usar un Formato
- Buscar formato en lista
- Clic en "Usar"
- Completar formulario dinámico
- Guardarcomo borrador o crear registro

---

## Estructura de Excel Recomendada

### Requisitos Mínimos

#### 1. Nombre de Hoja
```
La primera hoja (o una hoja llamada "FORMATO") será procesada
Nombre recomendado: "FORMATO"
```

#### 2. Sección de Metadatos (Primeras filas)
Posicionar en columnas A-B, filas 1-10:

| Campo | Valor |
|-------|-------|
| Nombre del Formato | Inspección de Extintores |
| Código | GVC-SSH-FMT-001 |
| Versión | 1.0 |
| Fecha | 01/01/2025 |
| Obra | (Genérica) |
| Responsable | Seguridad Industrial |

#### 3. Sección de Campos Capturables
Comenzar a partir de la fila 12 aproximadamente:

```
DATOS GENERALES
Fecha del reporte: [_______________]
Contratista: [_______________]
Trabajador: [_______________]

INSPECCIÓN
Número de extintor: [_______________]
Ubicación: [_______________]
Última revisión: [_______________]
Condición: [_______________]

OBSERVACIONES
[Área de texto múltiple]
```

#### 4. Tabla de Registros Detallados (Opcional)

| No. | Extintor ID | Ubicación | Presión (PSI) | Vigencia | Observaciones |
|-----|-------------|-----------|---------------|----------|---------------|
| 1   | [___]       | [___]     | [___]         | [___]    | [___]         |
| 2   | [___]       | [___]     | [___]         | [___]    | [___]         |

---

## Criterios de Validación

### El Sistema Detecta Automáticamente ✓

**Errores (bloquean guardado):**
- ❌ Archivo Excel vacío
- ❌ Sin encabezados/primer fila vacía
- ❌ Menos de 3 campos capturables
- ❌ Formato sin nombre especificado
- ❌ Formato sin categoría

**Advertencias (avisos pero permite guardar):**
- ⚠️ Muy pocas filas (< 3)
- ⚠️ Columnas completamente vacías
- ⚠️ Campos duplicados
- ⚠️ Sin versión especificada
- ⚠️ Muchas celdas combinadas

### Calidad de Diseño (Puntuación)
Se calcula basado en:
- Estructura clara
- Encabezados presentes
- Campos bien espaciados
- Rango: 0-100%

---

## Ejemplos Prácticos

### Ejemplo 1: Inspección Simple

**Archivo:** inspección_extintores.xlsx

```
FORMATO DE INSPECCIÓN DE EXTINTORES

Nombre del Formato: Inspección de Extintores
Código: GVC-SSH-FMT-001
Versión: 1.0

---

DATOS GENERALES
Fecha: [___]
Obra: [___]
Inspector: [___]

EXTINTOR 1
ID: [___]
Ubicación: [___]
Capacidad (Lbs): [___]
Presión manómetro: [___]
Seguro y sello: ☐ Sí ☐ No
Etiqueta legible: ☐ Sí ☐ No
Última revisión: [___]

OBSERVACIONES Y RECOMENDACIONES
[Área de texto libre]

FIRMA DEL INSPECTOR
Nombre: [___]
Fecha: [___]
```

### Ejemplo 2: Investigación de Accidentes

**Archivo:** investigación_accidentes.xlsx

```
FORMATO DE INVESTIGACIÓN DE ACCIDENTES

Nombre del Formato: Investigación de Accidentes
Categoría: Investigación de Accidentes
Versión: 2.0

---

INFORMACIÓN DEL EVENTO
Fecha del incidente: [___]
Hora: [___]
Obra: [___]
Contratista: [___]

PERSONA AFECTADA
Nombre: [___]
Cargo: [___]
Empresa: [___]
Área de trabajo: [___]

DESCRIPCIÓN DEL EVENTO
Descripción concisa: [Texto largo]
Acto inseguro: [___]
Condición insegura: [___]

CAUSAS RAÍZ
Causa directa: [___]
Causa raíz 1: [___]
Causa raíz 2: [___]

ACCIONES CORRECTIVAS
Acción: [___]
Responsable: [___]
Fecha límite: [___]
Seguimiento: [___]

EVIDENCIA FOTOGRÁFICA
[Se adjuntan en la aplicación]

FIRMAS
Investigador: [___]
Supervisor: [___]
```

### Ejemplo 3: Checklist de Área

**Archivo:** checklist_área.xlsx

```
CHECKLIST DIARIO - ÁREA DE TRABAJO

Nombre del Formato: Checklist Diario
Categoría: Checklist
Versión: 1.0

---

INFORMACIÓN GENERAL
Fecha: [___]
Área: [___]
Responsable: [___]

ELEMENTOS A VERIFICAR

| Ítem | Cumple | Observaciones |
|------|--------|---------------|
| Orden y limpieza | ☐ | [___] |
| Iluminación adecuada | ☐ | [___] |
| Señalización visible | ☐ | [___] |
| Equipo de primeros auxilios | ☐ | [___] |
| Extintores accesibles | ☐ | [___] |
| Vías de evacuación libres | ☐ | [___] |
| Herramientas guardadas | ☐ | [___] |
| Pasillos sin obstáculos | ☐ | [___] |

HALLAZGOS Y ACCIONES
No conformidades: [Texto largo]
Acciones inmediatas: [Texto largo]
Observaciones: [Texto largo]

FIRMA
Responsable: [___]
```

---

## Solución de Problemas

### P: No detecta mis campos
**R:** Asegúrate que:
- Los campos estén en la primera hoja o en hoja llamada "FORMATO"
- Haya encabezados en la fila 1
- Los nombres incluyan palabras clave (Fecha, Obra, Contratista, etc.)

### P: Me muestra error "muy pocos campos"
**R:** 
- Necesitas mínimo 3 campos detectables
- Usa nombres estándar: Fecha, Obra, Nombre, etc.
- Revisa que no haya columnas vacías entre campos

### P: ¿Puedo tener múltiples tablas?
**R:** Sí, pero:
- La primera tabla será la principal
- Intenta tener encabezados claros
- Evita celdas combinadas en tablas

### P: ¿Cómo agrego opciones a un desplegable?
**R:**
- En la vista previa, edita el campo
- Selecciona tipo "Lista desplegable"
- En siguiente fase podrás definir opciones manualmente

### P: ¿Puedo editar un formato después?
**R:** Sí (próximas fases):
- Opción "Editar" (en desarrollo)
- Sistema automáticamente crea nueva versión
- Historial se mantiene intacto

---

## Nombres de Campos Reconocidos

El sistema reconoce automáticamente estos nombres (sin importar mayúsculas):

| Nombre | Tipo Sugerido | Ejemplo |
|--------|---------------|---------|
| Fecha | Fecha | Fecha de inspección |
| Hora | Hora | Hora de inicio |
| Obra | Selección de obra | Obra |
| Contratista | Selección contratista | Contratista |
| Trabajador | Selección trabajador | Trabajador principal |
| Responsable | Responsable | Responsable del área |
| Actividad | Texto corto | Actividad realizada |
| Hallazgo | Texto corto | Hallazgo |
| Acción | Acción correctiva | Acción requerida |
| Observaciones | Observaciones | Observaciones generales |
| Evidencia | Evidencia fotográfica | Evidencia fotográfica |
| Firma | Firma | Firma del responsable |

---

## Mejores Prácticas

### ✓ Hazlo Así

```
✓ Usa la hoja "FORMATO" como principal
✓ Encabezados claros en primera fila
✓ Sección de metadatos en primeras filas
✓ Campos bien espaciados
✓ Nombres descriptivos
✓ Una tabla principal clara
✓ Máximo 20-30 campos (para usabilidad)
✓ Versionado consistente (1.0, 1.1, 2.0)
```

### ✗ Evita

```
✗ Múltiples hojas con datos a capturar
✗ Celdas combinadas en áreas de captura
✗ Nombres genéricos ("Campo1", "Dato")
✗ Fórmulas complejas en celdas de captura
✗ Imágenes como texto
✗ Colores como único indicador
✗ Más de 3 niveles de anidamiento
✗ Campos sin etiqueta clara
```

---

## Flujo Completo de Ejemplo

### Paso 1: Preparar Excel
Crear archivo: `inspección_seguridad.xlsx`
```
[Estructura recomendada]
[Validación correcta]
[12KB aprox]
```

### Paso 2: Cargar en GRAVI
1. FORMATOS DINÁMICOS → Cargar nuevo
2. Seleccionar archivo
3. Sistema analiza (2-3 segundos)

### Paso 3: Revisar Análisis
```
Archivo: inspección_seguridad.xlsx
Hojas: 1 (FORMATO)
Filas: 35
Calidad: 85%
Campos detectados: 12
Errores: 0
Advertencias: 1
Categoría sugerida: Inspección
```

### Paso 4: Completar Metadata
- Nombre: "Inspección de Seguridad en Obra"
- Categoría: "Inspección"
- Código: "GVC-SSH-FMT-001"
- Versión: "1.0"
- Estado: "Activo"

### Paso 5: Guardar
Sistema:
- Valida todos los datos
- Guarda en Supabase
- Crea versión inicial
- Genera ID único

### Paso 6: Usar Formato
- Lista de formatos → Tu formato
- Clic "Usar"
- Rellenar formulario dinámico
- Guardar registro

---

## Contacto y Soporte

Para reportar errores o sugerencias:
- Revisar logs de navegador (F12)
- Verificar estado de Supabase
- Consultar documentación de implementación

**Versión:** 1.0  
**Última actualización:** 2025-01-06
