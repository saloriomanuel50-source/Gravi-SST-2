begin;

-- Retirar políticas genéricas V38 que permiten acceso demasiado amplio.
drop policy if exists gravi_v38_evidence_select
on storage.objects;

drop policy if exists gravi_v38_evidence_insert
on storage.objects;

drop policy if exists gravi_v38_evidence_update
on storage.objects;

drop policy if exists gravi_v38_evidence_delete
on storage.objects;

-- Limpiar una ejecución anterior de este mismo parche.
drop policy if exists gravi_legacy_evidence_select_assigned_v42
on storage.objects;

drop policy if exists gravi_legacy_evidence_insert_assigned_v42
on storage.objects;

drop policy if exists gravi_legacy_evidence_update_assigned_v42
on storage.objects;

drop policy if exists gravi_legacy_evidence_delete_assigned_v42
on storage.objects;

-- Compatibilidad de lectura para rutas históricas:
-- {workId}/{recordId}/{archivo}
create policy gravi_legacy_evidence_select_assigned_v42
on storage.objects
for select
to authenticated
using (
  bucket_id = 'evidencias'
  and coalesce((storage.foldername(name))[1], '') not in (
    'work-permits',
    'preventive-controls',
    'work-evidence'
  )
  and (
    public.is_gravi_admin()
    or (
      public.has_gravi_permission('evidence.view')
      and exists (
        select 1
        from public.work_user_assignments a
        where a.work_id::text = (storage.foldername(name))[1]
          and a.user_id = auth.uid()
          and a.active
      )
    )
  )
);

-- Compatibilidad de carga para rutas históricas.
create policy gravi_legacy_evidence_insert_assigned_v42
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidencias'
  and coalesce((storage.foldername(name))[1], '') not in (
    'work-permits',
    'preventive-controls',
    'work-evidence'
  )
  and (
    public.is_gravi_admin()
    or (
      public.has_gravi_permission('evidence.upload')
      and exists (
        select 1
        from public.work_user_assignments a
        where a.work_id::text = (storage.foldername(name))[1]
          and a.user_id = auth.uid()
          and a.active
      )
    )
  )
);

-- Compatibilidad de actualización.
create policy gravi_legacy_evidence_update_assigned_v42
on storage.objects
for update
to authenticated
using (
  bucket_id = 'evidencias'
  and coalesce((storage.foldername(name))[1], '') not in (
    'work-permits',
    'preventive-controls',
    'work-evidence'
  )
  and (
    public.is_gravi_admin()
    or (
      owner_id = auth.uid()::text
      and public.has_gravi_permission('evidence.upload')
      and exists (
        select 1
        from public.work_user_assignments a
        where a.work_id::text = (storage.foldername(name))[1]
          and a.user_id = auth.uid()
          and a.active
      )
    )
  )
)
with check (
  bucket_id = 'evidencias'
  and coalesce((storage.foldername(name))[1], '') not in (
    'work-permits',
    'preventive-controls',
    'work-evidence'
  )
  and (
    public.is_gravi_admin()
    or (
      owner_id = auth.uid()::text
      and public.has_gravi_permission('evidence.upload')
      and exists (
        select 1
        from public.work_user_assignments a
        where a.work_id::text = (storage.foldername(name))[1]
          and a.user_id = auth.uid()
          and a.active
      )
    )
  )
);

-- Compatibilidad de eliminación dentro de una obra autorizada.
create policy gravi_legacy_evidence_delete_assigned_v42
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'evidencias'
  and coalesce((storage.foldername(name))[1], '') not in (
    'work-permits',
    'preventive-controls',
    'work-evidence'
  )
  and (
    public.is_gravi_admin()
    or (
      public.has_gravi_permission('evidence.delete')
      and exists (
        select 1
        from public.work_user_assignments a
        where a.work_id::text = (storage.foldername(name))[1]
          and a.user_id = auth.uid()
          and a.active
      )
    )
  )
);

commit;