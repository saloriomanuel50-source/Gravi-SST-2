-- Configuracion opcional de Supabase Storage para evidencias fotograficas.
-- Ejecutar despues de database/schema.sql.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidencias',
  'evidencias',
  false,
  12582912,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists evidencias_select_authenticated on storage.objects;
drop policy if exists evidencias_insert_operational on storage.objects;
drop policy if exists evidencias_update_operational on storage.objects;
drop policy if exists evidencias_delete_admin on storage.objects;

create policy evidencias_select_authenticated
on storage.objects for select
to authenticated
using (bucket_id = 'evidencias' and name not like 'work-permits/%' and public.has_gravi_permission('evidence.view'));

create policy evidencias_insert_operational
on storage.objects for insert
to authenticated
with check (bucket_id = 'evidencias' and name not like 'work-permits/%' and public.has_gravi_permission('evidence.upload'));

create policy evidencias_update_operational
on storage.objects for update
to authenticated
using (bucket_id = 'evidencias' and name not like 'work-permits/%' and public.has_gravi_permission('evidence.upload'))
with check (bucket_id = 'evidencias' and name not like 'work-permits/%' and public.has_gravi_permission('evidence.upload'));

create policy evidencias_delete_admin
on storage.objects for delete
to authenticated
using (bucket_id = 'evidencias' and name not like 'work-permits/%' and (public.has_gravi_permission('evidence.delete') or public.is_gravi_admin()));

commit;
