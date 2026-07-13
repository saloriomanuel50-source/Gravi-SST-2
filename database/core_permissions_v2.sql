begin;

alter table public.perfiles_usuario
  add column if not exists permissions_mode text not null default 'role-default',
  add column if not exists custom_permissions jsonb not null default '{}'::jsonb;

create or replace function public.role_has_default_permission(p_role text, p_key text)
returns boolean
language sql
immutable
as $$
  select case
    when p_role = 'Administrador' then true
    when p_role = 'Supervisor SST' then p_key = any(array[
      'works.view','contractors.view','contractors.create','contractors.edit',
      'workers.view','workers.create','workers.edit','visitors.view','visitors.register',
      'attendance.view','attendance.register','attendance.edit','operations.view',
      'inspections.create','inspections.edit','incidents.view','incidents.create','incidents.edit',
      'permits.view','permits.create','permits.edit','permits.review','permits.authorize',
      'permits.suspend','permits.cancel','permits.close','permits.export',
      'signatures.view','signatures.capture','signatures.invalidate','signatures.export',
      'compliance.view','compliance.edit','compliance.monthly_report',
      'documents.view','documents.generate','reports.view','reports.generate',
      'histories.work','audit.view'
    ])
    when p_role = 'Consulta' then p_key like '%.view'
      or p_key like 'histories.%'
      or p_key = 'audit.view'
      or p_key = 'works.view'
    else false
  end;
$$;

create or replace function public.has_gravi_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce((
    select case
      when profile.role = 'Administrador' then true
      when profile.permissions_mode = 'custom' and profile.custom_permissions ? p_key
        then coalesce((profile.custom_permissions ->> p_key)::boolean, false)
      else public.role_has_default_permission(profile.role, p_key)
    end
    from public.perfiles_usuario profile
    where profile.user_id = auth.uid() and profile.active = true
    limit 1
  ), false);
$$;

grant execute on function public.role_has_default_permission(text,text) to authenticated;
grant execute on function public.has_gravi_permission(text) to authenticated;

drop policy if exists gravi_read on public.contratistas;
drop policy if exists gravi_insert on public.contratistas;
drop policy if exists gravi_update on public.contratistas;
drop policy if exists gravi_delete on public.contratistas;
create policy gravi_read on public.contratistas for select to authenticated using (public.has_gravi_permission('contractors.view'));
create policy gravi_insert on public.contratistas for insert to authenticated with check (public.has_gravi_permission('contractors.create'));
create policy gravi_update on public.contratistas for update to authenticated using (public.has_gravi_permission('contractors.edit')) with check (public.has_gravi_permission('contractors.edit'));
create policy gravi_delete on public.contratistas for delete to authenticated using (public.is_gravi_admin());

drop policy if exists gravi_read on public.trabajadores;
drop policy if exists gravi_insert on public.trabajadores;
drop policy if exists gravi_update on public.trabajadores;
drop policy if exists gravi_delete on public.trabajadores;
create policy gravi_read on public.trabajadores for select to authenticated using (public.has_gravi_permission('workers.view'));
create policy gravi_insert on public.trabajadores for insert to authenticated with check (public.has_gravi_permission('workers.create'));
create policy gravi_update on public.trabajadores for update to authenticated using (public.has_gravi_permission('workers.edit')) with check (public.has_gravi_permission('workers.edit'));
create policy gravi_delete on public.trabajadores for delete to authenticated using (public.is_gravi_admin());

commit;
