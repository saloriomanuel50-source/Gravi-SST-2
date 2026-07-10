# Registro Diario v2

## Propósito

Registro Diario es el consolidado oficial de una jornada por obra, fecha operativa y turno. Los módulos operativos siguen siendo la fuente de asistencia, inspecciones, incidentes, clima, cumplimiento y evidencia.

## Datos y estados

Los datos automáticos se muestran como solo lectura. El supervisor captura únicamente estado de jornada, actividades, categorías, trabajos críticos, eventos, impacto climático, pendientes y observación final.

Estados soportados: `draft`, `pending_close`, `closed_manual`, `closed_auto`, `reopened` y `annulled`.

## Cierre manual

La aplicación revisa bloqueos y advertencias, solicita confirmación y llama a `close_daily_report_manual`. El RPC genera el snapshot, folio, integridad, actor y bitácora en una operación atómica. El PDF no participa en el cierre.

## Cierre automático

`public.close_due_daily_reports(p_now)` calcula la hora local usando `obras.timezone` y cierra desde las 22:00. Funciona sin navegador ni dispositivo conectado. Un registro inexistente se crea incompleto, con `requires_review=true` y sin inventar actividad. La función está preparada pero el job no se programa desde el repositorio.

Para programarlo, después de validar en staging:

```sql
select cron.schedule(
  'gravi-close-due-daily-reports',
  '* * * * *',
  'select public.close_due_daily_reports();'
);
```

Para comprobarlo:

```sql
select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'gravi-close-due-daily-reports';
```

Para detenerlo:

```sql
select cron.unschedule('gravi-close-due-daily-reports');
```

## Revisión posterior y reapertura

Los cierres automáticos muestran los campos faltantes y permiten confirmar la revisión con `confirm_daily_report_automatic`, conservando `close_type=automatic`. La solicitud de reapertura requiere autorización administrativa; no existe edición directa de un registro cerrado.

## Evidencia y reporte

El reporte cerrado se genera desde `automatic_snapshot` y `manual_data`, no desde datos vivos. La evidencia se referencia desde sus registros de origen; no se cargan archivos duplicados. La impresión usa la vista consultiva existente y el botón global de impresión/PDF del navegador.

## Permisos y seguridad

RLS limita el acceso a asignaciones activas; el Administrador activo conserva acceso global. Las funciones sensibles usan `SECURITY DEFINER`, `search_path` seguro y no son ejecutables por `anon`. No se expone `service_role` en frontend.

## Monitoreo

```sql
select * from public.daily_report_closure_log
order by executed_at desc;

select id, work_id, log_date, shift, status, requires_review,
       completeness_percentage, missing_fields
from public.registro_diario
where status in ('closed_auto','closed_manual')
order by closed_at desc;
```

## Despliegue y rollback

Ejecutar `database/schema.sql`, `database/registro_diario.sql` y después `database/daily_reports_v2.sql` en staging. Verificar RLS, funciones, folios, snapshots y pruebas con `p_now` antes de producción. El rollback operativo consiste en pausar/eliminar el job Cron; no se borran registros cerrados ni snapshots.

Después de cambios de JS/CSS se incrementan `CACHE_NAME` y los query strings del shell. El service worker activa la nueva versión y elimina cachés anteriores.
