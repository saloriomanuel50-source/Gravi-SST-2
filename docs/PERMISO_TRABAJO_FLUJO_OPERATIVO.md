# Flujo operativo temporal del Permiso de Trabajo

## Configuración activa

`WORKFLOW_CONFIG.mode` en `src/work-permits.js` y `workflow_mode` en `work_permits` usan por defecto `supervisor_direct`. Cada permiso conserva su propio modo, por lo que cambiar el valor predeterminado no obliga a migrar permisos históricos.

Para habilitar el flujo futuro cambie la configuración predeterminada a `contractor_request` después de implementar autenticación, RLS y experiencia de contratistas. No elimine estados ni campos reservados.

## Supervisor directo

Flujo principal: `draft → authorized → active → closed`.

Alternos: `active → suspended → active`, `active → cancelled` y `active → expired`. El Supervisor SST elabora, evalúa, autoriza y administra el permiso. No se exige `pending_review`, cuenta, aprobación ni firma digital del contratista.

El responsable del contratista debe identificarse con empresa, nombre y cargo. Su firma se recaba físicamente antes del inicio. El formato conserva líneas vacías y no genera firmas ficticias.

## Alto riesgo

La configuración central incluye altura, caliente, eléctrico, energías peligrosas, espacio confinado, excavación, izaje y demolición. Las recomendaciones también viven en `WORKFLOW_CONFIG` y se combinan con controles incumplidos y riesgo residual.

La autorización muestra razón, recomendaciones y confirmación personal obligatoria. El historial conserva usuario, fecha, razones, recomendaciones, nivel residual y confirmación expresa.

Un riesgo residual `critical` —denominado Grave en el formato oficial— bloquea completamente la autorización en UI y en el trigger SQL. El usuario debe volver a controles y reducirlo.

## Responsabilidades actuales

- Supervisor SST: creación, edición, riesgos, controles, autorización, activación, suspensión, reactivación, cancelación, cierre, formato, evidencia e historial.
- Administrador: monitoreo, filtros, detalle, exportación e intervención según permisos.
- Consulta/Gerencia: consulta, indicadores, PDF/evidencia y exportación sólo cuando esté autorizada.
- Contratista: sin cuenta autenticada; firma física.

## Flujo futuro reservado

`contratista solicita → supervisor revisa → supervisor autoriza → contratista acepta o firma → trabajo activo`.

Se conservan `pending_review`, `rejected`, aprobaciones, historial y los campos nullable `contractor_user_id`, `contractor_acknowledgement`, `contractor_signature`, `contractor_signed_at` y `contractor_request_status`.
