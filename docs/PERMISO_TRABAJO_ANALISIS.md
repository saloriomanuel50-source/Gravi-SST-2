# Análisis técnico — Permiso General de Trabajo

## Arquitectura encontrada

GRAVI SST es una aplicación web sin framework ni segundo enrutador. `index.html` contiene el shell, `src/bootstrap.js` controla autenticación y carga módulos, `src/system.js` administra navegación y catálogos operativos, y `src/supabase.js` concentra autenticación, permisos, persistencia remota y colas offline. La vista `managementView` es el punto de integración de módulos por obra. La impresión actual reutiliza `reportView`, `#printReport`, `window.print()` y los estilos corporativos.

La información operativa se conserva primero en `localStorage` y se sincroniza con Supabase. La obra activa se identifica con `gvc-active-work-id`. Obras, contratistas y trabajadores ya existen en `gvc-ops-system-v1`. El service worker precachea el shell y elimina versiones anteriores del caché.

## Componentes y patrones reutilizados

- Navegación lateral `Permisos / ATS` y `managementView`.
- Catálogos de obras, contratistas y trabajadores de `src/system.js`.
- Perfil, roles y permisos personalizados de `src/supabase.js`.
- Botones, tarjetas, tablas, modales, avisos y diseño adaptable existentes.
- `reportView`, `#printReport`, estilos corporativos y `window.print()`.
- Almacenamiento local, estado de sincronización y evento `online`.
- Logo real `assets/gravi-sst-logo-dark.png`.

## Archivos previstos

- Nuevos: `src/work-permits.js`, `src/styles/work-permits.css`, `database/work_permits.sql`, documentación y pruebas.
- Modificados: `index.html`, `src/bootstrap.js`, `src/supabase.js`, `src/system.js`, `service-worker.js` y validador de build.

## Modelo de datos propuesto

`work_permits` guardará columnas consultables (folio, relaciones, estado, riesgo, vigencia y responsables) y JSONB para listas dinámicas. `work_permit_approvals`, `work_permit_evidence` y `work_permit_history` conservarán autorizaciones, archivos y trazabilidad. La autorización creará `authorized_snapshot`. Todas las tablas tendrán RLS; las mutaciones sensibles se validarán también en funciones SQL.

## Correspondencia del formato oficial

| Formato GVC-SSH-FMT-002 | Campo digital |
|---|---|
| Obra / desarrollo | `work_id`, `development_id`, instantáneas de nombres |
| Empresa o subcontratista | `contractor_id`, `contractor_name` |
| Residente a cargo | `resident_name`, `resident_user_id` |
| Persona que elabora / solicita | `requester_name`, `created_by` |
| Actividad y descripción | `activity`, `description` |
| Área, trabajadores y horario | `execution_area`, `worker_count`, `starts_at`, `ends_at` |
| Identificación de riesgos | `hazards` JSONB |
| Matriz frecuencia/severidad | riesgo calculado por fila y `max_risk_level` |
| EPP | `ppe` JSONB |
| Equipo adicional | `additional_equipment` JSONB |
| Medidas preventivas | `preventive_measures` JSONB |
| Vigencia y extensiones | fechas normalizadas y `extensions` JSONB |
| Anotaciones | `additional_requirements` |
| Solicitud, revisión y liberación | `work_permit_approvals` |
| Firmas | identidad, cargo, fecha, decisión y firma opcional |
| Código / versión | `document_code`, `form_version`, `revision` |
| Documento autorizado | `authorized_snapshot`, `pdf_url` |

La matriz visible en la referencia usa frecuencias Remota, Alejada, Ocasional, Recurrente y Frecuente; severidades Menor, Moderada, Grave, Crítica y Fatal; y resultados Mínimo, Medio, Elevado y Crítico. La tabla exacta se documentará y probará en la fase de riesgo.

## Riesgos de regresión

- `src/system.js` es monolítico: la implementación se aislará en un módulo nuevo y sólo sustituirá el manejador de Permisos / ATS.
- La caché puede servir archivos antiguos: se incrementará una sola vez al cierre.
- Catálogos históricos pueden cambiar: el permiso autorizado guardará instantáneas inalterables.
- Autorización offline no es segura: sólo se encolarán borradores; las decisiones requieren Supabase.
- El Excel oficial quedó disponible para la validación final y se comparó en `docs/PERMISO_TRABAJO_COMPARACION_EXCEL.md`. La autoridad confirmó versión 00 y matriz 5×4; ambas diferencias fueron corregidas.

## Validación base

La validación se ejecuta con `npm.cmd run build` en Windows porque la política de PowerShell bloquea el wrapper `npm.ps1`.
