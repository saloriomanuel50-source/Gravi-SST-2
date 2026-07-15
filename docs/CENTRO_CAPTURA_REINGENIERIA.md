# Reingeniería del Centro de Captura

## Problema original

El menú ofrecía 15 rutas, varias duplicadas o sin implementación. `handleCaptureOption53` era reemplazado posteriormente por una segunda función, por lo que el comportamiento dependía de la última asignación. Condiciones, actos, incidentes y fotografías terminaban en un formulario genérico. Una fotografía de `quickObservations` se comprimía como Data URL, se guardaba dentro del snapshot de `localStorage`, se contabilizaba por ser un valor truthy y no tenía detalle ni visor posterior.

## Arquitectura

La solución conserva JavaScript sin framework e IIFE. `system.js` expone `GraviSystemContext`, una API limitada que devuelve copias y concentra las escrituras históricas. Los módulos se cargan en orden determinista:

1. `system.js` y servicios existentes.
2. `offline-evidence-queue.js`.
3. `evidence-manager.js`.
4. `legacy-capture-adapter.js`.
5. `preventive-observations.js`.
6. `evidence-gallery.js`.
7. `work-permits.js` y módulos existentes requeridos.
8. `capture-center.js`.

No se usan temporizadores para resolver dependencias.

## Centro de Captura final

- Observación preventiva: formulario dedicado de condiciones inseguras, actos inseguros, buenas prácticas y desviaciones.
- Incidente o accidente: abre el wizard real de eventos de seguridad.
- Inspección: abre el menú real de inspecciones.
- Permiso / ATS: abre el permiso de trabajo existente. ATS no se muestra internamente porque no tiene formulario completo.
- Visitante: abre el formulario real de visitantes.
- Evidencia rápida: exige destino y registro relacionado, o utiliza evidencia general de obra.

Se retiraron del menú trabajador, contratista, clima, equipo/maquinaria, documento, observación genérica, accidente separado, acto separado y condición separada. Las funciones siguen disponibles en sus módulos propietarios.

## Observaciones preventivas

`GraviPreventiveObservations` ofrece formulario, listado, detalle y acciones. Usa tipos, prioridades y estados canónicos; obliga a registrar obra, tipo, fecha, área, descripción, prioridad y acción inmediata. Guarda el control antes de encolar fotografías. El detalle muestra folio, estado, responsable, compromiso, sincronización, evidencia e historial, con acciones condicionadas por permiso y estado.

El listado consulta caché local y refresca desde Supabase cuando existe sesión/conexión. Integra los registros históricos compatibles sin reescribirlos.

## Evidencias y offline

`GraviEvidenceManager` valida JPEG/PNG/WebP mediante firma de archivo, limita a seis imágenes y 12 MiB, corrige orientación mediante `createImageBitmap`, limita el lado mayor a 1600 px y comprime a calidad 0.80. Las vistas previas usan Object URL y las liberan al eliminar o guardar.

`GraviOfflineEvidenceQueue` usa IndexedDB `gravi-evidence-v1` con stores `evidenceFiles` y `evidenceQueue`. Conserva blob, MIME, nombre, obra, registro, etapa, intentos, error y estado. El registro principal se guarda primero; después se encolan y suben archivos. `client_uuid` y los índices únicos evitan duplicados. Se reintenta al recuperar conexión, iniciar sesión y abrir detalles, sin sondeo agresivo.

Storage permanece privado. Las rutas son:

- `preventive-controls/{workId}/{controlId}/{clientUuid}.{ext}`
- `work-evidence/{workId}/{recordId}/{clientUuid}.{ext}`

Solo se guarda `storage_path`; el visor solicita URL firmada temporal.

## Legado

`GraviLegacyCaptureAdapter` conserva la lectura de `data.quickObservations`, valida Data URL histórica, muestra la fotografía existente y avisa cuando el archivo falta. No elimina ni vuelve a guardar `photo`. La migración es manual, requiere sesión/conexión, convierte Data URL a Blob, usa IndexedDB y guarda únicamente `migratedControlId`, fecha y origen para impedir repeticiones.

## Galería y evidencia rápida

La galería reúne evidencia disponible de observaciones, incidentes/inspecciones, permisos, Registro Diario, evidencia general y capturas históricas. Incluye filtros por fecha, módulo, sincronización, usuario y estado del registro. Una referencia sin archivo no muestra miniatura falsa.

Evidencia rápida nunca guarda una foto sin clasificación. Si el destino no es evidencia general, exige seleccionar un registro existente. Si no existe, indica que debe crearse primero en su módulo.

## Supabase y SQL manual

`database/preventive_controls_evidence_v2.sql` es idempotente y no destructivo. Agrega columnas de flujo y sincronización a `preventive_controls`, crea `preventive_control_evidence` y `work_evidence`, índices y RLS. Reutiliza `incidents.*` y `evidence.*`, exige usuario asignado a obra y no concede acceso a `anon`.

Orden manual de despliegue SQL:

1. `database/preventive_controls_v1.sql` si aún no existe la tabla.
2. `database/storage_evidencias.sql` si aún no existe el bucket/políticas base.
3. `database/preventive_controls_evidence_v2.sql`.

Ninguno fue ejecutado por esta implementación.

## PWA

El shell usa `gravi-sst-v2-shell-v41`. Incluye los nuevos scripts y estilos; la activación elimina cachés anteriores y conserva la estrategia existente network-first con fallback al shell.

## Pruebas

Se agregaron `tests/capture-center.test.js` y `tests/evidence-manager.test.js`, además de sus comandos en `package.json`. Validan las seis rutas, ausencia de controlador duplicado/formulario genérico, clasificación preventiva, entrada múltiple, límite, MIME, UUID, no Base64 nuevo en localStorage, orden registro-evidencia, APIs, SQL y RLS. También se ejecutan todas las suites anteriores.

## Limitaciones y pasos pendientes

- La migración SQL debe ejecutarse manualmente en Supabase.
- Las pruebas reales de URL firmada, RLS, reconexión entre dispositivos y carga remota requieren un proyecto Supabase configurado.
- ATS permanece oculto hasta que exista un formulario operativo completo.
- Las evidencias históricas cuyo Base64 ya no existe se conservan como texto, pero el archivo no puede recuperarse.
