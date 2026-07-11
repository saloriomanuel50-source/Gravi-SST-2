# Validación de Supabase — Permisos de trabajo

## Alcance seguro

Use un proyecto Supabase de desarrollo aislado que replique el esquema actual. No use producción. Antes de comenzar exporte el esquema y las tablas `perfiles_usuario`, `obras`, `contratistas`, `trabajadores` y Storage; registre URL, fecha y responsable del respaldo.

## Ejecución e idempotencia

1. Abra SQL Editor en el proyecto de prueba.
2. Copie íntegro `database/work_permits.sql` y ejecute.
3. Conserve el resultado y confirme ausencia de errores.
4. Ejecute exactamente el mismo archivo una segunda vez.
5. Si la segunda ejecución falla, detenga la prueba; no continúe con datos.

Consultas de comprobación:

```sql
select table_name from information_schema.tables
where table_schema='public' and table_name like 'work_permit%';

select indexname from pg_indexes
where schemaname='public' and tablename like 'work_permit%';

select tablename, policyname, cmd from pg_policies
where schemaname='public' and tablename like 'work_permit%'
order by tablename, policyname;

select enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid
where t.typname='work_permit_status' order by enumsortorder;
```

## Datos de prueba y limpieza exclusiva

Use folios con prefijo `TEST-PT-`. Guarde sus UUID antes de probar. Elimine únicamente esos registros —las relaciones usan `ON DELETE CASCADE`—:

```sql
begin;
delete from public.work_permits where folio like 'TEST-PT-%';
select count(*) from public.work_permits where folio like 'TEST-PT-%';
commit;
```

Nunca use `truncate`, `drop`, una condición vacía ni borre catálogos compartidos.

## Roles y RLS

Pruebe con sesiones reales, no con el rol SQL propietario:

- Administrador: view/create/edit/review/authorize/suspend/cancel/close/export.
- Supervisor SST: exactamente los nueve permisos predeterminados actuales.
- Consulta: lectura; todas las mutaciones deben devolver 401/403 o violación RLS.
- Personalizados: pruebe cada permiso aislado y combinaciones; confirme UI y petición REST.

Para cada usuario intente SELECT, INSERT, UPDATE de contenido, cambio de estado, INSERT de aprobación, evidencia e historial. La política actual de `work_permits_update` permite editar con `permits.edit` o `permits.authorize`; antes de producción debe probarse que las transiciones sensibles sólo se realizan mediante una función/RPC que verifique el permiso específico. Esta separación aún no está demostrada por el SQL local.

## Storage, historial e instantánea

El SQL crea metadatos de evidencia, pero no crea bucket ni políticas Storage. En el proyecto de prueba verifique el bucket institucional existente, límites MIME/tamaño, lectura por obra y prohibición de acceso cruzado. Cargue una imagen, relacione `storage_path`, cierre sesión y recupérela con usuario autorizado.

Autorice un permiso y compruebe:

```sql
select folio,status,authorized_at,authorized_by,
       authorized_snapshot is not null as has_snapshot,pdf_url
from public.work_permits where folio like 'TEST-PT-%';
select event_type,from_status,to_status,created_at
from public.work_permit_history where permit_id='<UUID>' order by created_at;
```

Cambie nombres de catálogos sólo en datos de prueba y confirme que `authorized_snapshot` no cambia. Verifique que el PDF histórico conserve su URL y versión.

## Prohibición de producción

No ejecute todavía este SQL en producción. Faltan pruebas remotas de RLS por acción, Storage, sincronización, generación/persistencia del PDF e inmutabilidad efectiva de la instantánea.
