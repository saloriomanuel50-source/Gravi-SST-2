-- GRAVI SST v2 · cierre integral de permisos. Ejecutar después de core_permissions_v2.sql.
begin;

create or replace function public.role_has_default_permission(p_role text,p_key text)
returns boolean language sql immutable as $$
  select case
    when p_role='Administrador' then p_key=any(array[
      'works.view','developments.create','developments.edit','developments.archive','works.create','works.edit','works.archive','contractors.view','contractors.create','contractors.edit','contractors.archive','workers.view','workers.create','workers.edit','workers.archive','visitors.view','visitors.register','visitors.edit','operations.view','attendance.view','attendance.register','attendance.edit','inspections.view','inspections.create','inspections.edit','incidents.view','incidents.create','incidents.edit','daily_reports.view','daily_reports.edit','daily_reports.close','daily_reports.validate','daily_reports.reopen','permits.view','permits.create','permits.edit','permits.review','permits.authorize','permits.suspend','permits.cancel','permits.close','permits.export','evidence.view','evidence.upload','evidence.delete','compliance.view','compliance.edit','compliance.monthly_report','compliance.nom_matrix','documents.view','documents.generate','documents.manage','reports.view','reports.generate','histories.global','histories.work','audit.view','signatures.view','signatures.capture','signatures.invalidate','signatures.export','users.view','users.invite','users.edit','users.change_roles','users.manage_permissions','users.deactivate'])
    when p_role='Supervisor SST' then p_key=any(array[
      'works.view','contractors.view','contractors.create','contractors.edit','workers.view','workers.create','workers.edit','visitors.view','visitors.register','visitors.edit','operations.view','attendance.view','attendance.register','attendance.edit','inspections.view','inspections.create','inspections.edit','incidents.view','incidents.create','incidents.edit','daily_reports.view','daily_reports.edit','daily_reports.close','daily_reports.validate','permits.view','permits.create','permits.edit','permits.review','permits.authorize','permits.suspend','permits.cancel','permits.close','permits.export','evidence.view','evidence.upload','compliance.view','compliance.edit','compliance.monthly_report','documents.view','documents.generate','reports.view','reports.generate','histories.work','audit.view','signatures.view','signatures.capture','signatures.invalidate','signatures.export'])
    when p_role='Consulta' then p_key=any(array['works.view','contractors.view','workers.view','visitors.view','operations.view','attendance.view','inspections.view','incidents.view','daily_reports.view','permits.view','evidence.view','compliance.view','documents.view','reports.view','histories.global','histories.work','audit.view','signatures.view'])
    else false end;
$$;

create or replace function public.has_gravi_permission(p_key text)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select case
    when not p.active then false
    when p.role='Administrador' then public.role_has_default_permission('Administrador',p_key)
    when coalesce(p.permissions_mode,'role-default')='custom' and coalesce(p.custom_permissions,'{}'::jsonb) ? p_key
      then coalesce((p.custom_permissions->>p_key)::boolean,false)
    else public.role_has_default_permission(p.role,p_key) end
  from public.perfiles_usuario p where p.user_id=auth.uid() limit 1),false);
$$;

create or replace function public.record_permission(p_payload jsonb,p_record_type text,p_operation text)
returns boolean language sql stable as $$
  select case lower(coalesce(p_record_type,p_payload->>'type',''))
    when 'incident' then public.has_gravi_permission(case when p_operation='select' then 'incidents.view' when p_operation='insert' then 'incidents.create' else 'incidents.edit' end)
    when 'incidente' then public.has_gravi_permission(case when p_operation='select' then 'incidents.view' when p_operation='insert' then 'incidents.create' else 'incidents.edit' end)
    when 'inspection' then public.has_gravi_permission(case when p_operation='select' then 'inspections.view' when p_operation='insert' then 'inspections.create' else 'inspections.edit' end)
    when 'inspeccion' then public.has_gravi_permission(case when p_operation='select' then 'inspections.view' when p_operation='insert' then 'inspections.create' else 'inspections.edit' end)
    else false end;
$$;

do $$ declare item record; begin
  for item in select * from (values
    ('desarrollos','works.view','developments.create','developments.edit'),('obras','works.view','works.create','works.edit'),
    ('contratistas','contractors.view','contractors.create','contractors.edit'),('trabajadores','workers.view','workers.create','workers.edit'),
    ('visitantes','visitors.view','visitors.register','visitors.edit'),('asistencia','attendance.view','attendance.register','attendance.edit'),
    ('investigaciones','incidents.view','incidents.create','incidents.edit'),('cumplimiento_estado','compliance.view','compliance.edit','compliance.edit'),
    ('historial','histories.work','documents.generate','documents.generate')
  ) as x(tbl,read_key,create_key,edit_key) loop
    if to_regclass('public.'||item.tbl) is not null then
      execute format('alter table public.%I enable row level security',item.tbl);
      execute format('drop policy if exists gravi_permission_select on public.%I',item.tbl);
      execute format('drop policy if exists gravi_permission_insert on public.%I',item.tbl);
      execute format('drop policy if exists gravi_permission_update on public.%I',item.tbl);
      execute format('drop policy if exists gravi_permission_delete on public.%I',item.tbl);
      execute format('create policy gravi_permission_select on public.%I for select to authenticated using(public.has_gravi_permission(%L))',item.tbl,item.read_key);
      execute format('create policy gravi_permission_insert on public.%I for insert to authenticated with check(public.has_gravi_permission(%L))',item.tbl,item.create_key);
      execute format('create policy gravi_permission_update on public.%I for update to authenticated using(public.has_gravi_permission(%L)) with check(public.has_gravi_permission(%L))',item.tbl,item.edit_key,item.edit_key);
      execute format('create policy gravi_permission_delete on public.%I for delete to authenticated using(public.is_gravi_admin())',item.tbl);
      execute format('revoke all on public.%I from anon',item.tbl);
    end if;
  end loop;
end $$;

do $$ begin if to_regclass('public.registros') is not null then
  drop policy if exists gravi_permission_select on public.registros; drop policy if exists gravi_permission_insert on public.registros; drop policy if exists gravi_permission_update on public.registros; drop policy if exists gravi_permission_delete on public.registros;
  create policy gravi_permission_select on public.registros for select to authenticated using(public.record_permission(payload,record_type,'select'));
  create policy gravi_permission_insert on public.registros for insert to authenticated with check(public.record_permission(payload,record_type,'insert'));
  create policy gravi_permission_update on public.registros for update to authenticated using(public.record_permission(payload,record_type,'update')) with check(public.record_permission(payload,record_type,'update'));
  create policy gravi_permission_delete on public.registros for delete to authenticated using(public.is_gravi_admin()); revoke all on public.registros from anon;
end if; end $$;

do $$ declare t text; begin foreach t in array array['format_categories','dynamic_formats','format_fields','format_versions','format_field_templates'] loop if to_regclass('public.'||t) is not null then
  execute format('alter table public.%I enable row level security',t);execute format('drop policy if exists gravi_documents_read on public.%I',t);execute format('drop policy if exists gravi_documents_manage on public.%I',t);
  execute format('create policy gravi_documents_read on public.%I for select to authenticated using(public.has_gravi_permission(''documents.view''))',t);execute format('create policy gravi_documents_manage on public.%I for all to authenticated using(public.has_gravi_permission(''documents.manage'')) with check(public.has_gravi_permission(''documents.manage''))',t);execute format('revoke all on public.%I from anon',t);
end if;end loop;
if to_regclass('public.format_records') is not null then alter table public.format_records enable row level security;drop policy if exists gravi_documents_read on public.format_records;drop policy if exists gravi_documents_generate on public.format_records;create policy gravi_documents_read on public.format_records for select to authenticated using(public.has_gravi_permission('documents.view'));create policy gravi_documents_generate on public.format_records for all to authenticated using(public.has_gravi_permission('documents.generate')) with check(public.has_gravi_permission('documents.generate'));revoke all on public.format_records from anon;end if;
end $$;

do $$ begin if to_regclass('public.estado_aplicacion') is not null then
  drop policy if exists gravi_permission_select on public.estado_aplicacion;drop policy if exists gravi_permission_write on public.estado_aplicacion;
  create policy gravi_permission_select on public.estado_aplicacion for select to authenticated using(public.has_gravi_permission('works.view'));
  create policy gravi_permission_write on public.estado_aplicacion for all to authenticated using(public.is_gravi_admin()) with check(public.is_gravi_admin());revoke all on public.estado_aplicacion from anon;
end if;end $$;

grant execute on function public.role_has_default_permission(text,text),public.has_gravi_permission(text),public.record_permission(jsonb,text,text) to authenticated;
revoke all on function public.has_gravi_permission(text) from anon;
commit;
