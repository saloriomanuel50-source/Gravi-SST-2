# Auditoría del Centro de Captura y evidencias

Fecha: 2026-07-15  
Rama: `fix/centro-captura-evidencias`

## Estado previo

El árbol estaba limpio sobre `ac05a05` antes de crear la rama. La aplicación es JavaScript sin framework, con módulos IIFE cargados dinámicamente desde `src/bootstrap.js` y estado operativo histórico en `gvc-ops-system-v1`.

## Implementación activa encontrada

El Centro de Captura vive íntegramente dentro del IIFE de `src/system.js`:

- `captureOptions53()` devuelve 15 opciones.
- `ensureCaptureSheet53()` crea el diálogo y `openCaptureCenter53()` pinta el menú.
- `handleCaptureOption53(key)` tiene una implementación inicial con un mapa de rutas.
- Más adelante, `handleCaptureOption53 = function(key) { ... }` reemplaza la implementación anterior en tiempo de ejecución.
- La segunda implementación es la efectiva. Omite las claves `equipment` y `weather`, conserva rutas genéricas y usa el propio Centro como fallback silencioso.
- `openQuickObservation53()` crea un formulario genérico para observación, condición insegura, acto inseguro y evidencia.
- `saveQuickObservation53()` comprime una sola imagen como Data URL, la guarda en `data.quickObservations[].photo`, persiste todo el estado en `localStorage` y vuelve automáticamente a `openCaptureCenter53()`.
- `evidenceToday54()` contabiliza cualquier `photo` truthy y no comprueba disponibilidad real.
- `openPreventiveControlsPhase3()` lee `gvc-preventive-controls-v1:${activeId}` desde `localStorage`; su botón de captura solo muestra un mensaje de implementación futura.

No existe detalle ni galería para `quickObservations`. La línea de tiempo sí muestra su texto, pero no ofrece acceso a la fotografía.

## Rutas operativas reales

| Destino | Ruta existente | Permiso real | Observación |
| --- | --- | --- | --- |
| Incidente o accidente | clic en `#incidentButton`, enlazado a `incidentWizardRender63()` | `incidents.create` | Flujo real con reporte, evidencia e investigación. |
| Inspección | clic en `[data-phase3-nav="inspections"]`, que abre `inspectionMenuView` | `inspections.create` | Menú real de tipos de inspección. |
| Permiso de trabajo | `window.GraviWorkPermits.openForm()` / `openList()` | `permits.create` | Implementado en `src/work-permits.js`. ATS no tiene formulario operativo independiente. |
| Visitante | `openModule("visitors")` y `renderVisitors(true)` | `visitors.register` | Formulario y listado existentes. |
| Observación preventiva | no existe frontend remoto operativo | `incidents.create` + evidencia | Debe conectarse a `preventive_controls`. |
| Evidencia rápida | no existe modelo nuevo operativo | `evidence.upload` | Debe exigir clasificación y usar el bucket privado. |

## Datos y servicios disponibles

- `database/preventive_controls_v1.sql` crea `public.preventive_controls` con obra, folio, tipo, descripción, actividad, área, contratista, responsable, compromiso, estado, prioridad, JSON de evidencia y origen.
- Faltan campos explícitos para acción inmediata, suspensión, aseguramiento de área, cierre, validación, compatibilidad de legado, UUID cliente y estado de sincronización.
- La política V1 concede acceso a administrador o usuario activo asignado a la obra; no contempla permisos funcionales de evidencia/incidentología.
- `database/storage_evidencias.sql` mantiene privado el bucket `evidencias`, límite de 12 MiB y MIME JPEG/PNG/WebP. Sus políticas usan `evidence.view`, `evidence.upload` y `evidence.delete` y excluyen las rutas de permisos.
- `src/supabase.js` ya conoce permisos de evidencia, incidentes, inspecciones, visitantes y permisos, pero no expone CRUD de controles preventivos ni evidencias normalizadas.
- `src/repositories.js` solo publica repositorios de lectura generales y `dailyReports`; no existen `preventiveControls`, `preventiveEvidence` ni `workEvidence`.
- `src/work-permits.js` administra su evidencia de manera específica. No debe usarse como implementación transversal.

## Compatibilidad y riesgos

- `data.quickObservations` no se puede eliminar ni reescribir destructivamente porque comparte el snapshot principal de la aplicación.
- Las Data URL históricas deben continuar leyéndose en el lugar original. Las imágenes nuevas no deben entrar a ese objeto.
- El adaptador de legado deberá devolver copias, reconocer Data URL válidas, señalar archivos ausentes y mantener una marca mínima de migración sin duplicar Base64.
- Los blobs nuevos deben residir en IndexedDB y sincronizarse con `client_uuid`; el registro principal no puede depender del éxito de Storage.
- Los nuevos módulos no pueden acceder directamente a `data`, `activeId`, `save()` o `activeWork()` porque son privados del IIFE. Se requiere una API de contexto limitada.
- El orden de scripts deberá ser determinista. No se usarán temporizadores para resolver dependencias.

## Código a consolidar

La extracción conservará wrappers mínimos en `system.js` para llamadas existentes. Se retirarán de ese archivo:

- `captureOptions53()`.
- `ensureCaptureSheet53()` y el HTML del menú.
- ambos mapas internos de `handleCaptureOption53` y su reasignación posterior.
- el formulario y guardado nuevo de `openQuickObservation53()` / `saveQuickObservation53()`.
- la lectura local incompleta de `openPreventiveControlsPhase3()`.

Los nombres antiguos que aún tengan consumidores delegarán en `window.GraviCaptureCenter`, `window.GraviPreventiveObservations`, `window.GraviEvidenceGallery` o `window.GraviEvidenceManager`.

## Plan de integración

1. Extraer el menú de seis rutas y exponer una API de contexto controlada.
2. Añadir lectura/visor de legado y un contador basado en disponibilidad real.
3. Implementar IndexedDB y el administrador central de evidencias.
4. Crear el formulario, listado y detalle de observaciones preventivas y sus repositorios/Supabase.
5. Añadir galería y evidencia rápida clasificada.
6. Actualizar PWA, pruebas, documentación y migración SQL idempotente.

Ningún SQL será ejecutado automáticamente y no se cambiará el bucket a público.
