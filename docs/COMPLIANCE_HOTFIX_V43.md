# Compliance Hotfix V43

## Alcance y problema corregido

V43 recupera la actualización repetida de criterios y resúmenes de NOM. Corrige el éxito anticipado de la UI, el `PATCH` sobre una fila global inexistente, la sincronización sin `await`, el cálculo que trataba criterios nuevos como “No aplica”, la auditoría con usuario fijo y el crecimiento de `localStorage` por copias Base64 en el historial.

No rediseña pantallas, no cambia el catálogo ni los textos de criterios, no normaliza el modelo y no modifica Centro de Captura, permisos de trabajo, firmas, Registro Diario, dashboard ejecutivo ni documentos. Las evidencias existentes en cada criterio/NOM se conservan.

## Archivos

- Cliente y flujo: `src/supabase.js`, `src/system.js`.
- PWA/build: `index.html`, `src/bootstrap.js`, `service-worker.js`, `scripts/validate-build.js`.
- Base de datos: `database/compliance_hotfix_v43.sql`, `database/verify_compliance_hotfix_v43.sql`.
- Pruebas: `tests/compliance-hotfix.test.js`, `tests/evidence-recovery.test.js`, `package.json`.

## Guardado atómico y fallback

`gravi_save_compliance_entry_v43` es `SECURITY INVOKER`, valida `compliance.edit`, crea la fila `global` si falta, la bloquea con `FOR UPDATE` y fusiona únicamente la obra, NOM y `criterion.id` recibidos. Conserva las demás obras, NOM, criterios, `complianceMatrix` y claves del payload. La auditoría se deduplica por ID, se ordena en forma descendente y se limita a 500 eventos.

El cliente espera el RPC antes de mostrar éxito. Si el RPC todavía no está instalado (404, PGRST202 o función no encontrada), emite una advertencia visible en consola y usa un `upsert` global verificado con `return=representation`. Si no hay conexión, deja el mismo `upsert` en la cola offline y muestra estado pendiente. Errores RLS/permisos se lanzan y provocan rollback; no entran a la cola.

## Evidencia y almacenamiento local

La carga de evidencia nueva queda temporalmente deshabilitada en los formularios de criterio y resumen NOM, con aviso explícito. V43 no crea Base64 nuevo. `compactComplianceAuditV43()` elimina solamente copias Base64 de `complianceAudit[].evidence`, conserva conteos y metadatos, limita el historial a 500 y nunca toca `item.evidence`. Ante cuota llena se compacta y se reintenta una vez; un segundo fallo cancela y revierte.

## Aplicación recomendada

No ejecutar automáticamente desde el navegador ni usar `service_role`.

1. Respaldar la fila completa:

   ```sql
   select * from public.cumplimiento_estado where id = 'global';
   ```

2. En Supabase SQL Editor, ejecutar exactamente el archivo `database/compliance_hotfix_v43.sql` completo.
3. En Supabase SQL Editor, ejecutar exactamente `database/verify_compliance_hotfix_v43.sql`; las 15 filas deben ser `PASS`.
4. Desplegar el código de la rama/commit aprobado por el proceso habitual.
5. Limpiar caché/datos del service worker o recargar hasta activar `gravi-sst-v2-shell-v43-v38`.
6. Ejecutar la prueba manual con Melina usando un perfil Supervisor SST.

## Prueba manual de aceptación

En una obra activa, abrir NOM-030 o NOM-031 y un criterio previamente revisado. Cambiarlo y guardar sucesivamente como Parcial, No cumple y Cumple, recargando después de los dos primeros cambios. Tras el tercero, cerrar e iniciar sesión; verificar Cumple, tres eventos con usuario/fecha/transiciones correctas, ausencia de criterio duplicado y ninguna modificación en otra NOM. Abrir en incógnito u otro dispositivo para confirmar el último estado. Confirmar también que una NOM con criterios sin revisión no muestre 100 %.

## Rollback

Código: volver al commit anterior mediante un commit de reversión del commit V43 y desplegar ese nuevo commit; después limpiar la caché PWA. No borrar evaluaciones ni evidencias.

SQL: la función es aditiva. Para retirar únicamente el RPC, después de haber revertido el cliente, ejecutar:

```sql
begin;
revoke all on function public.gravi_save_compliance_entry_v43(text,text,jsonb,jsonb,jsonb) from public, anon, authenticated;
drop function public.gravi_save_compliance_entry_v43(text,text,jsonb,jsonb,jsonb);
commit;
```

Restaurar la fila `global` desde el respaldo solo si una revisión de datos demuestra corrupción; no es parte del rollback normal y nunca debe hacerse sin respaldo actualizado.

## Riesgo residual

El modelo continúa temporalmente en una única fila JSON global. V43 serializa y fusiona atómicamente cambios de criterio, pero no sustituye la futura normalización de requisitos maestros ni la correlación normativa. La captura de evidencia nueva en cumplimiento permanece deshabilitada hasta completar la estabilización.
