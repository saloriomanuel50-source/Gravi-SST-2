-- Endurecimiento V41.1 del bucket privado "evidencias".
-- Ejecutar manualmente despues de storage_evidencias.sql y de las asignaciones.
-- No modifica las politicas independientes de work-permits/.
begin;

drop policy if exists evidencias_select_authenticated on storage.objects;
drop policy if exists evidencias_insert_operational on storage.objects;
drop policy if exists evidencias_update_operational on storage.objects;
drop policy if exists evidencias_delete_admin on storage.objects;

create policy evidencias_select_authenticated
on storage.objects for select to authenticated using (
  bucket_id='evidencias'
  and (storage.foldername(name))[1] in ('preventive-controls','work-evidence')
  and public.has_gravi_permission('evidence.view')
  and (
    public.is_gravi_admin()
    or exists (
      select 1 from public.work_user_assignments a
      where a.work_id=(storage.foldername(name))[2]
        and a.user_id=auth.uid() and a.active
    )
  )
);

create policy evidencias_insert_operational
on storage.objects for insert to authenticated with check (
  bucket_id='evidencias'
  and (storage.foldername(name))[1] in ('preventive-controls','work-evidence')
  and public.has_gravi_permission('evidence.upload')
  and (
    public.is_gravi_admin()
    or exists (
      select 1 from public.work_user_assignments a
      where a.work_id=(storage.foldername(name))[2]
        and a.user_id=auth.uid() and a.active
    )
  )
);

create policy evidencias_update_operational
on storage.objects for update to authenticated using (
  bucket_id='evidencias'
  and (storage.foldername(name))[1] in ('preventive-controls','work-evidence')
  and public.has_gravi_permission('evidence.upload')
  and (public.is_gravi_admin() or owner_id=auth.uid()::text)
  and (
    public.is_gravi_admin()
    or exists (
      select 1 from public.work_user_assignments a
      where a.work_id=(storage.foldername(name))[2]
        and a.user_id=auth.uid() and a.active
    )
  )
) with check (
  bucket_id='evidencias'
  and (storage.foldername(name))[1] in ('preventive-controls','work-evidence')
  and public.has_gravi_permission('evidence.upload')
  and (public.is_gravi_admin() or owner_id=auth.uid()::text)
  and (
    public.is_gravi_admin()
    or exists (
      select 1 from public.work_user_assignments a
      where a.work_id=(storage.foldername(name))[2]
        and a.user_id=auth.uid() and a.active
    )
  )
);

create policy evidencias_delete_admin
on storage.objects for delete to authenticated using (
  bucket_id='evidencias'
  and (storage.foldername(name))[1] in ('preventive-controls','work-evidence')
  and (public.is_gravi_admin() or public.has_gravi_permission('evidence.delete'))
  and (
    public.is_gravi_admin()
    or exists (
      select 1 from public.work_user_assignments a
      where a.work_id=(storage.foldername(name))[2]
        and a.user_id=auth.uid() and a.active
    )
  )
);

commit;
