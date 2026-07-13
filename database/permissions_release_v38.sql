-- GRAVI SST v2 · liberación diferencial de permisos v38.
-- ÚNICA migración de permisos a ejecutar sobre producción existente.
begin;

create or replace function public.role_has_default_permission(p_role text,p_key text)
returns boolean language sql immutable set search_path=pg_catalog,public as $$
 select case
 when p_role='Administrador' then p_key=any(array[
 'works.view','developments.create','developments.edit','developments.archive','works.create','works.edit','works.archive','contractors.view','contractors.create','contractors.edit','contractors.archive','workers.view','workers.create','workers.edit','workers.archive','visitors.view','visitors.register','visitors.edit','operations.view','attendance.view','attendance.register','attendance.edit','inspections.view','inspections.create','inspections.edit','incidents.view','incidents.create','incidents.edit','daily_reports.view','daily_reports.edit','daily_reports.close','daily_reports.validate','daily_reports.reopen','permits.view','permits.create','permits.edit','permits.review','permits.authorize','permits.suspend','permits.cancel','permits.close','permits.export','evidence.view','evidence.upload','evidence.delete','compliance.view','compliance.edit','compliance.monthly_report','compliance.nom_matrix','documents.view','documents.generate','documents.manage','reports.view','reports.generate','histories.global','histories.work','audit.view','signatures.view','signatures.capture','signatures.invalidate','signatures.export','users.view','users.invite','users.edit','users.change_roles','users.manage_permissions','users.deactivate'])
 when p_role='Supervisor SST' then p_key=any(array[
 'works.view','contractors.view','contractors.create','contractors.edit','workers.view','workers.create','workers.edit','visitors.view','visitors.register','visitors.edit','operations.view','attendance.view','attendance.register','attendance.edit','inspections.view','inspections.create','inspections.edit','incidents.view','incidents.create','incidents.edit','daily_reports.view','daily_reports.edit','daily_reports.close','daily_reports.validate','permits.view','permits.create','permits.edit','permits.review','permits.authorize','permits.suspend','permits.cancel','permits.close','permits.export','evidence.view','evidence.upload','compliance.view','compliance.edit','compliance.monthly_report','documents.view','documents.generate','reports.view','reports.generate','histories.work','audit.view','signatures.view','signatures.capture','signatures.invalidate','signatures.export'])
 when p_role='Consulta' then p_key=any(array['works.view','contractors.view','workers.view','visitors.view','operations.view','attendance.view','inspections.view','incidents.view','daily_reports.view','permits.view','evidence.view','compliance.view','documents.view','reports.view','histories.global','histories.work','audit.view','signatures.view'])
 else false end;
$$;

create or replace function public.has_gravi_permission(p_key text)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce((select case
  when not p.active then false
  when p.role='Administrador' then public.role_has_default_permission('Administrador',p_key)
  when coalesce(p.permissions_mode,'role-default')='custom' and coalesce(p.custom_permissions,'{}'::jsonb) ? p_key then coalesce((p.custom_permissions->>p_key)::boolean,false)
  else public.role_has_default_permission(p.role,p_key) end
 from public.perfiles_usuario p where p.user_id=auth.uid() limit 1),false);
$$;

create or replace function public.is_gravi_admin()
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce((select p.active and p.role='Administrador' from public.perfiles_usuario p where p.user_id=auth.uid() limit 1),false);
$$;

create or replace function public.gravi_record_permission(p_payload jsonb,p_record_type text,p_operation text)
returns boolean language sql stable set search_path=pg_catalog,public as $$
 select case
 when lower(coalesce(p_record_type,p_payload->>'type',''))=any(array['incident','incidente','accident','accidente'])
  then public.has_gravi_permission(case p_operation when 'select' then 'incidents.view' when 'insert' then 'incidents.create' when 'update' then 'incidents.edit' else '' end)
 when lower(coalesce(p_record_type,p_payload->>'type',''))=any(array['inspection','inspeccion','extinguisher','extintores','firstaid','first_aid','botiquin','botiquín','tablesaw','table_saw','grinder','extensioncord','extension_cord'])
  then public.has_gravi_permission(case p_operation when 'select' then 'inspections.view' when 'insert' then 'inspections.create' when 'update' then 'inspections.edit' else '' end)
 else false end;
$$;

create or replace function public.gravi_attendance_update_allowed(p_date date)
returns boolean language sql stable set search_path=pg_catalog,public as $$
 select case when p_date=current_date then public.has_gravi_permission('attendance.register') or public.has_gravi_permission('attendance.edit') else public.has_gravi_permission('attendance.edit') end;
$$;

create or replace function public.gravi_compliance_payload_allowed(p_old jsonb,p_new jsonb)
returns boolean language sql stable set search_path=pg_catalog,public as $$
 select
  jsonb_typeof(coalesce(p_new,'{}'::jsonb))='object'
  and coalesce(p_new,'{}'::jsonb)<>'{}'::jsonb
  and (not (coalesce(p_new,'{}'::jsonb)?'complianceMatrix') or public.has_gravi_permission('compliance.nom_matrix'))
  and (not (coalesce(p_new,'{}'::jsonb)?'histories') or public.has_gravi_permission('compliance.monthly_report'))
  and ((coalesce(p_new,'{}'::jsonb)-array['complianceMatrix','histories'])='{}'::jsonb or public.has_gravi_permission('compliance.edit'));
$$;

create or replace function public.gravi_guard_compliance_update()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if not public.gravi_compliance_payload_allowed(old.payload,new.payload) then raise exception 'Permiso insuficiente para el dominio de cumplimiento modificado';end if;
 new.payload:=coalesce(old.payload,'{}'::jsonb)||coalesce(new.payload,'{}'::jsonb);
 return new;
end $$;

create or replace function public.gravi_guard_signature_invalidation()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if (to_jsonb(old)-array['signature_status','invalidated_at','invalidated_by','invalidation_reason','updated_at']) is distinct from (to_jsonb(new)-array['signature_status','invalidated_at','invalidated_by','invalidation_reason','updated_at']) then
 raise exception 'signatures.invalidate no autoriza modificar el contenido firmado';
 end if;
 if new.signature_status::text<>'invalidated' then raise exception 'signatures.invalidate sólo permite el estado invalidated';end if;
 if new.invalidated_by is distinct from auth.uid() then raise exception 'invalidated_by debe coincidir con auth.uid()';end if;
 if new.invalidated_at is null then raise exception 'invalidated_at es obligatorio';end if;
 if nullif(pg_catalog.btrim(new.invalidation_reason),'') is null then raise exception 'invalidation_reason es obligatorio';end if;
 return new;
end $$;

create or replace function public.gravi_work_permit_stage_allowed(p_stage text)
returns boolean language sql stable set search_path=pg_catalog,public as $$
 select public.has_gravi_permission(case lower(coalesce(p_stage,'')) when 'request' then 'permits.review' when 'review' then 'permits.review' when 'authorization' then 'permits.authorize' when 'extension' then 'permits.edit' when 'suspension' then 'permits.suspend' when 'reactivation' then 'permits.authorize' when 'cancellation' then 'permits.cancel' when 'closure' then 'permits.close' else '' end);
$$;

create or replace function public.gravi_guard_archive_update()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare edit_key text:=tg_argv[0];archive_key text:=tg_argv[1];old_row jsonb:=to_jsonb(old);new_row jsonb:=to_jsonb(new);old_payload jsonb:=coalesce(to_jsonb(old)->'payload','{}'::jsonb);new_payload jsonb:=coalesce(to_jsonb(new)->'payload','{}'::jsonb);archive_changed boolean;old_clean jsonb;new_clean jsonb;
begin
 archive_changed:=(old_row->'deleted_at') is distinct from (new_row->'deleted_at') or (old_row->'archived_at') is distinct from (new_row->'archived_at') or (old_payload->'archivedAt') is distinct from (new_payload->'archivedAt') or (old_payload->'deletedAt') is distinct from (new_payload->'deletedAt');
 if not archive_changed then
  if not public.has_gravi_permission(edit_key) then raise exception 'Permiso insuficiente: %',edit_key;end if;
  return new;
 end if;
 if not public.has_gravi_permission(archive_key) then raise exception 'Permiso insuficiente: %',archive_key;end if;
 old_clean:=(old_row-array['updated_at','deleted_at','archived_at','payload'])||jsonb_build_object('payload',old_payload-array['archivedAt','deletedAt']);
 new_clean:=(new_row-array['updated_at','deleted_at','archived_at','payload'])||jsonb_build_object('payload',new_payload-array['archivedAt','deletedAt']);
 if old_clean is distinct from new_clean then raise exception 'El archivado no autoriza modificar otros campos';end if;
 return new;
end $$;

do $$ declare r record; targets text[]:=array['desarrollos','obras','contratistas','trabajadores','visitantes','asistencia','registros','investigaciones','historial','cumplimiento_estado','estado_aplicacion','perfiles_usuario','registro_diario','work_user_assignments','daily_report_versions','daily_report_closure_log','work_permits','work_permit_approvals','work_permit_evidence','work_permit_history','document_signatures','document_signature_events','format_categories','dynamic_formats','format_fields','format_records','format_versions','format_field_templates'];begin
 for r in select schemaname,tablename,policyname from pg_catalog.pg_policies where schemaname='public' and tablename=any(targets) loop execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename);end loop;
end $$;

do $$ declare item record;begin for item in select * from (values
 ('desarrollos','works.view','developments.create','developments.edit','developments.archive'),('obras','works.view','works.create','works.edit','works.archive'),('contratistas','contractors.view','contractors.create','contractors.edit','contractors.archive'),('trabajadores','workers.view','workers.create','workers.edit','workers.archive'),('visitantes','visitors.view','visitors.register','visitors.edit',null),('investigaciones','incidents.view','incidents.create','incidents.edit',null),('historial','histories.work','documents.generate','documents.generate',null)
 ) as x(tbl,read_key,create_key,edit_key,archive_key) loop if to_regclass('public.'||item.tbl) is not null then
  execute format('alter table public.%I enable row level security',item.tbl);
  execute format('create policy gravi_v38_select on public.%I for select to authenticated using(public.has_gravi_permission(%L))',item.tbl,item.read_key);
  execute format('create policy gravi_v38_insert on public.%I for insert to authenticated with check(public.has_gravi_permission(%L))',item.tbl,item.create_key);
  execute format('create policy gravi_v38_update on public.%I for update to authenticated using(public.has_gravi_permission(%L)%s) with check(public.has_gravi_permission(%L)%s)',item.tbl,item.edit_key,case when item.archive_key is null then '' else format(' or public.has_gravi_permission(%L)',item.archive_key) end,item.edit_key,case when item.archive_key is null then '' else format(' or public.has_gravi_permission(%L)',item.archive_key) end);
  execute format('create policy gravi_v38_delete on public.%I for delete to authenticated using(public.is_gravi_admin())',item.tbl);
  execute format('revoke all on table public.%I from anon',item.tbl);
  if item.archive_key is not null then execute format('drop trigger if exists gravi_v38_archive_guard on public.%I',item.tbl);execute format('create trigger gravi_v38_archive_guard before update on public.%I for each row execute function public.gravi_guard_archive_update(%L,%L)',item.tbl,item.edit_key,item.archive_key);end if;
 end if;end loop;end $$;

alter table public.asistencia enable row level security;
create policy gravi_v38_select on public.asistencia for select to authenticated using(public.has_gravi_permission('attendance.view'));
create policy gravi_v38_insert on public.asistencia for insert to authenticated with check(attendance_date=current_date and public.has_gravi_permission('attendance.register'));
create policy gravi_v38_update on public.asistencia for update to authenticated using(public.gravi_attendance_update_allowed(attendance_date)) with check(public.gravi_attendance_update_allowed(attendance_date));
create policy gravi_v38_delete on public.asistencia for delete to authenticated using(public.is_gravi_admin());

alter table public.registros enable row level security;
create policy gravi_v38_select on public.registros for select to authenticated using(public.gravi_record_permission(payload,record_type,'select'));
create policy gravi_v38_insert on public.registros for insert to authenticated with check(public.gravi_record_permission(payload,record_type,'insert'));
create policy gravi_v38_update on public.registros for update to authenticated using(public.gravi_record_permission(payload,record_type,'update')) with check(public.gravi_record_permission(payload,record_type,'update'));
create policy gravi_v38_delete on public.registros for delete to authenticated using(public.is_gravi_admin());

alter table public.cumplimiento_estado enable row level security;
create policy gravi_v38_select on public.cumplimiento_estado for select to authenticated using(public.has_gravi_permission('compliance.view'));
create policy gravi_v38_insert on public.cumplimiento_estado for insert to authenticated with check(public.gravi_compliance_payload_allowed('{}'::jsonb,payload));
create policy gravi_v38_update on public.cumplimiento_estado for update to authenticated using(public.has_gravi_permission('compliance.edit') or public.has_gravi_permission('compliance.nom_matrix') or public.has_gravi_permission('compliance.monthly_report')) with check(public.has_gravi_permission('compliance.edit') or public.has_gravi_permission('compliance.nom_matrix') or public.has_gravi_permission('compliance.monthly_report'));
create policy gravi_v38_delete on public.cumplimiento_estado for delete to authenticated using(public.is_gravi_admin());
drop trigger if exists gravi_v38_compliance_guard on public.cumplimiento_estado;
create trigger gravi_v38_compliance_guard before update on public.cumplimiento_estado for each row execute function public.gravi_guard_compliance_update();

alter table public.estado_aplicacion enable row level security;
create policy gravi_v38_select on public.estado_aplicacion for select to authenticated using(public.has_gravi_permission('works.view'));
create policy gravi_v38_write on public.estado_aplicacion for all to authenticated using(public.is_gravi_admin()) with check(public.is_gravi_admin());

alter table public.perfiles_usuario enable row level security;
revoke insert,update,delete on table public.perfiles_usuario from authenticated;
grant select on table public.perfiles_usuario to authenticated;
revoke all on table public.perfiles_usuario from anon;
create policy gravi_v38_profile_self_select on public.perfiles_usuario for select to authenticated using(user_id=auth.uid());

create or replace function public.can_access_daily_report(p_work_id text,p_action text default 'read') returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(public.is_gravi_admin() or (public.has_gravi_permission(case p_action when 'read' then 'daily_reports.view' when 'edit' then 'daily_reports.edit' when 'close' then 'daily_reports.close' when 'validate' then 'daily_reports.validate' when 'reopen' then 'daily_reports.reopen' else '' end) and exists(select 1 from public.work_user_assignments a where a.work_id=p_work_id and a.user_id=auth.uid() and a.active and case p_action when 'read' then true when 'edit' then a.can_edit when 'close' then a.can_close when 'validate' then a.can_validate_auto when 'reopen' then a.can_reopen else false end)),false);
$$;
do $$begin if to_regclass('public.registro_diario') is not null then
 alter table public.registro_diario enable row level security;
 create policy gravi_v38_daily_select on public.registro_diario for select to authenticated using(public.can_access_daily_report(work_id,'read'));
 revoke insert,update,delete on table public.registro_diario from authenticated;
 grant select on table public.registro_diario to authenticated;
end if;end $$;

do $$begin
 if to_regclass('public.work_user_assignments') is not null then
  alter table public.work_user_assignments enable row level security;
  create policy gravi_v38_assignment_select on public.work_user_assignments for select to authenticated using(user_id=auth.uid() or public.is_gravi_admin());
  create policy gravi_v38_assignment_insert on public.work_user_assignments for insert to authenticated with check(public.is_gravi_admin());
  create policy gravi_v38_assignment_update on public.work_user_assignments for update to authenticated using(public.is_gravi_admin()) with check(public.is_gravi_admin());
  create policy gravi_v38_assignment_delete on public.work_user_assignments for delete to authenticated using(public.is_gravi_admin());
 end if;
 if to_regclass('public.daily_report_versions') is not null then
  alter table public.daily_report_versions enable row level security;
  create policy gravi_v38_daily_versions_select on public.daily_report_versions for select to authenticated using(exists(select 1 from public.registro_diario r where r.id=report_id and public.can_access_daily_report(r.work_id,'read')));
 end if;
 if to_regclass('public.daily_report_closure_log') is not null then
  alter table public.daily_report_closure_log enable row level security;
  create policy gravi_v38_daily_log_select on public.daily_report_closure_log for select to authenticated using(public.can_access_daily_report(work_id,'read'));
 end if;
end $$;

create or replace function public.has_work_permit_permission(p_key text) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$select public.has_gravi_permission(p_key)$$;
create or replace function public.validate_work_permit_update()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare required_permission text;required_signatures integer;allowed_fields text[]:=array['status','updated_at','revision'];
begin
 if old.authorized_snapshot is not null and new.authorized_snapshot is distinct from old.authorized_snapshot then raise exception 'La instantánea autorizada es inalterable';end if;
 if new.status is not distinct from old.status then
  if new.authorized_snapshot is distinct from old.authorized_snapshot then raise exception 'La instantánea sólo puede establecerse al autorizar';end if;
  if not public.has_work_permit_permission('permits.edit') then raise exception 'Permiso insuficiente: permits.edit';end if;
  return new;
 end if;
 if not ((old.workflow_mode='supervisor_direct' and old.status='draft' and new.status='authorized') or
  (old.status='draft' and new.status='pending_review') or (old.status='rejected' and new.status='pending_review') or
  (old.status='pending_review' and new.status in ('authorized','rejected')) or (old.status='authorized' and new.status='active') or
  (old.status='active' and new.status in ('suspended','cancelled','expired','closed')) or (old.status='suspended' and new.status in ('active','cancelled'))) then
  raise exception 'Transición de permiso inválida: % -> %',old.status,new.status;
 end if;
 required_permission:=case when new.status in('pending_review','rejected') then 'permits.review' when new.status in('authorized','active') then 'permits.authorize' when new.status='suspended' or (old.status='suspended' and new.status='active') then 'permits.suspend' when new.status in('cancelled','expired') then 'permits.cancel' when new.status='closed' then 'permits.close' end;
 if not public.has_work_permit_permission(required_permission) then raise exception 'Permiso insuficiente: %',required_permission;end if;
 if new.status='authorized' then allowed_fields:=allowed_fields||array['authorized_at','authorized_by','authorized_by_supervisor','authorized_snapshot'];end if;
 if (to_jsonb(old)-allowed_fields) is distinct from (to_jsonb(new)-allowed_fields) then raise exception 'La transición no autoriza modificar campos ordinarios; guarda la edición antes de cambiar el estado';end if;
 if new.authorized_snapshot is distinct from old.authorized_snapshot and new.status<>'authorized' then raise exception 'La instantánea sólo puede establecerse al autorizar';end if;
 if new.status='authorized' and new.max_residual_risk_level='critical' then raise exception 'No se puede autorizar un permiso con riesgo residual crítico';end if;
 if new.status in('authorized','active') and to_regclass('public.document_signatures') is not null then
  select count(*) into required_signatures from public.document_signatures where document_type='work_permit' and document_id=new.id and signature_status='valid' and (signature_slot='sst_supervisor' or (new.status='active' and signature_slot='contractor_responsible'));
  if (new.status='authorized' and required_signatures<1) or (new.status='active' and required_signatures<2) then raise exception 'Faltan firmas manuscritas vigentes y sincronizadas';end if;
 end if;
 return new;
end $$;
do $$begin if to_regclass('public.work_permits') is not null then
 drop trigger if exists work_permits_validate_update on public.work_permits;
 create trigger work_permits_validate_update before update on public.work_permits for each row execute function public.validate_work_permit_update();
end if;end $$;
do $$begin if to_regclass('public.work_permits') is not null then alter table public.work_permits enable row level security;
 create policy gravi_v38_permit_select on public.work_permits for select to authenticated using(public.has_gravi_permission('permits.view'));
 create policy gravi_v38_permit_insert on public.work_permits for insert to authenticated with check(public.has_gravi_permission('permits.create') and created_by=auth.uid());
 create policy gravi_v38_permit_update on public.work_permits for update to authenticated using(public.has_gravi_permission('permits.edit') or public.has_gravi_permission('permits.review') or public.has_gravi_permission('permits.authorize') or public.has_gravi_permission('permits.suspend') or public.has_gravi_permission('permits.cancel') or public.has_gravi_permission('permits.close')) with check(public.has_gravi_permission('permits.edit') or public.has_gravi_permission('permits.review') or public.has_gravi_permission('permits.authorize') or public.has_gravi_permission('permits.suspend') or public.has_gravi_permission('permits.cancel') or public.has_gravi_permission('permits.close'));
 create policy gravi_v38_permit_delete on public.work_permits for delete to authenticated using(public.is_gravi_admin());end if;end $$;

do $$begin
 if to_regclass('public.work_permit_approvals') is not null then
  alter table public.work_permit_approvals enable row level security;
  create policy gravi_v38_permit_approvals_select on public.work_permit_approvals for select to authenticated using(public.has_gravi_permission('permits.view'));
  create policy gravi_v38_permit_approvals_insert on public.work_permit_approvals for insert to authenticated with check(user_id=auth.uid() and public.gravi_work_permit_stage_allowed(stage));
 end if;
 if to_regclass('public.work_permit_evidence') is not null then
  alter table public.work_permit_evidence enable row level security;
  create policy gravi_v38_permit_evidence_select on public.work_permit_evidence for select to authenticated using(public.has_gravi_permission('permits.view'));
  create policy gravi_v38_permit_evidence_insert on public.work_permit_evidence for insert to authenticated with check(created_by=auth.uid() and public.has_gravi_permission('permits.edit'));
  create policy gravi_v38_permit_evidence_delete on public.work_permit_evidence for delete to authenticated using(public.is_gravi_admin() or (created_by=auth.uid() and public.has_gravi_permission('permits.edit')));
 end if;
 if to_regclass('public.work_permit_history') is not null then
  alter table public.work_permit_history enable row level security;
  create policy gravi_v38_permit_history_select on public.work_permit_history for select to authenticated using(public.has_gravi_permission('permits.view'));
  create policy gravi_v38_permit_history_insert on public.work_permit_history for insert to authenticated with check(user_id=auth.uid() and (public.has_gravi_permission('permits.edit') or public.has_gravi_permission('permits.review') or public.has_gravi_permission('permits.authorize') or public.has_gravi_permission('permits.suspend') or public.has_gravi_permission('permits.cancel') or public.has_gravi_permission('permits.close')));
 end if;
end $$;

do $$begin if to_regclass('public.document_signatures') is not null then alter table public.document_signatures enable row level security;
 create policy gravi_v38_signature_select on public.document_signatures for select to authenticated using(public.has_gravi_permission('signatures.view'));
 create policy gravi_v38_signature_insert on public.document_signatures for insert to authenticated with check(captured_by_user_id=auth.uid() and public.has_gravi_permission('signatures.capture'));
 create policy gravi_v38_signature_update on public.document_signatures for update to authenticated using(public.has_gravi_permission('signatures.invalidate')) with check(public.has_gravi_permission('signatures.invalidate'));
 create policy gravi_v38_signature_delete on public.document_signatures for delete to authenticated using(public.is_gravi_admin());end if;end $$;

do $$begin if to_regclass('public.document_signatures') is not null then
 drop trigger if exists gravi_v38_signature_integrity on public.document_signatures;
 create trigger gravi_v38_signature_integrity before update on public.document_signatures for each row execute function public.gravi_guard_signature_invalidation();
end if;end $$;

do $$begin if to_regclass('public.document_signature_events') is not null then
 alter table public.document_signature_events enable row level security;
 create policy gravi_v38_signature_events_select on public.document_signature_events for select to authenticated using(public.has_gravi_permission('signatures.view'));
 create policy gravi_v38_signature_events_insert on public.document_signature_events for insert to authenticated with check(actor_user_id=auth.uid() and (public.has_gravi_permission('signatures.capture') or public.has_gravi_permission('signatures.invalidate')));
end if;end $$;

do $$declare t text;perm text;begin foreach t in array array['format_categories','dynamic_formats','format_fields','format_versions','format_field_templates','format_records'] loop if to_regclass('public.'||t) is not null then perm:=case when t='format_records' then 'documents.generate' else 'documents.manage' end;execute format('alter table public.%I enable row level security',t);execute format('create policy gravi_v38_documents_select on public.%I for select to authenticated using(public.has_gravi_permission(''documents.view''))',t);execute format('create policy gravi_v38_documents_insert on public.%I for insert to authenticated with check(public.has_gravi_permission(%L))',t,perm);execute format('create policy gravi_v38_documents_update on public.%I for update to authenticated using(public.has_gravi_permission(%L)) with check(public.has_gravi_permission(%L))',t,perm,perm);execute format('create policy gravi_v38_documents_delete on public.%I for delete to authenticated using(public.is_gravi_admin())',t);execute format('revoke all on table public.%I from anon',t);end if;end loop;end $$;

do $$declare policy_name text;known text[]:=array[
 'evidencias_select_authenticated','evidencias_insert_operational','evidencias_update_operational','evidencias_delete_admin',
 'work_permits_storage_select','work_permits_storage_insert','work_permits_storage_update','work_permits_storage_delete',
 'document_signatures_storage_select','document_signatures_storage_insert','document_signatures_storage_update','document_signatures_storage_delete',
 'gravi_v38_evidence_select','gravi_v38_evidence_insert','gravi_v38_evidence_update','gravi_v38_evidence_delete',
 'gravi_v38_permit_storage_select','gravi_v38_permit_storage_insert','gravi_v38_permit_storage_update','gravi_v38_permit_storage_delete',
 'gravi_v38_signature_storage_select','gravi_v38_signature_storage_insert','gravi_v38_signature_storage_update','gravi_v38_signature_storage_delete'];
begin
 foreach policy_name in array known loop execute format('drop policy if exists %I on storage.objects',policy_name);end loop;
 -- Red de seguridad limitada exclusivamente a expresiones de los buckets GRAVI conocidos.
 for policy_name in select policyname from pg_catalog.pg_policies where schemaname='storage' and tablename='objects' and (coalesce(qual,'')||coalesce(with_check,'')) ~ $rx$bucket_id\s*=\s*'(evidencias|document-signatures)'$rx$
 loop execute format('drop policy if exists %I on storage.objects',policy_name);end loop;
end $$;
create policy gravi_v38_evidence_select on storage.objects for select to authenticated using(bucket_id='evidencias' and name not like 'work-permits/%' and public.has_gravi_permission('evidence.view'));
create policy gravi_v38_evidence_insert on storage.objects for insert to authenticated with check(bucket_id='evidencias' and name not like 'work-permits/%' and public.has_gravi_permission('evidence.upload'));
create policy gravi_v38_evidence_update on storage.objects for update to authenticated using(bucket_id='evidencias' and name not like 'work-permits/%' and (public.is_gravi_admin() or (owner_id=auth.uid()::text and public.has_gravi_permission('evidence.upload')))) with check(bucket_id='evidencias' and name not like 'work-permits/%' and (public.is_gravi_admin() or (owner_id=auth.uid()::text and public.has_gravi_permission('evidence.upload'))));
create policy gravi_v38_evidence_delete on storage.objects for delete to authenticated using(bucket_id='evidencias' and name not like 'work-permits/%' and (public.has_gravi_permission('evidence.delete') or public.is_gravi_admin()));
create policy gravi_v38_permit_storage_select on storage.objects for select to authenticated using(bucket_id='evidencias' and name like 'work-permits/%' and public.has_gravi_permission('permits.view'));
create policy gravi_v38_permit_storage_insert on storage.objects for insert to authenticated with check(bucket_id='evidencias' and name like 'work-permits/%' and public.has_gravi_permission('permits.edit'));
create policy gravi_v38_permit_storage_update on storage.objects for update to authenticated using(bucket_id='evidencias' and name like 'work-permits/%' and (public.is_gravi_admin() or (owner_id=auth.uid()::text and public.has_gravi_permission('permits.edit')))) with check(bucket_id='evidencias' and name like 'work-permits/%' and (public.is_gravi_admin() or (owner_id=auth.uid()::text and public.has_gravi_permission('permits.edit'))));
create policy gravi_v38_permit_storage_delete on storage.objects for delete to authenticated using(bucket_id='evidencias' and name like 'work-permits/%' and (public.is_gravi_admin() or (owner_id=auth.uid()::text and public.has_gravi_permission('permits.edit'))));
create policy gravi_v38_signature_storage_select on storage.objects for select to authenticated using(bucket_id='document-signatures' and public.has_gravi_permission('signatures.view'));
create policy gravi_v38_signature_storage_insert on storage.objects for insert to authenticated with check(bucket_id='document-signatures' and public.has_gravi_permission('signatures.capture'));
create policy gravi_v38_signature_storage_delete on storage.objects for delete to authenticated using(bucket_id='document-signatures' and public.is_gravi_admin());
revoke all on table storage.objects from anon;

do $$declare t text;begin
 foreach t in array array['asistencia','registros','cumplimiento_estado','estado_aplicacion','registro_diario','work_user_assignments','daily_report_versions','daily_report_closure_log','work_permits','work_permit_approvals','work_permit_evidence','work_permit_history','document_signatures','document_signature_events','format_categories','dynamic_formats','format_fields','format_records','format_versions','format_field_templates'] loop
  if to_regclass('public.'||t) is not null then execute format('revoke all on table public.%I from anon',t);end if;
 end loop;
end $$;

revoke all on function public.has_gravi_permission(text),public.role_has_default_permission(text,text),public.has_work_permit_permission(text),public.can_access_daily_report(text,text) from public,anon;
grant execute on function public.has_gravi_permission(text),public.role_has_default_permission(text,text),public.has_work_permit_permission(text),public.can_access_daily_report(text,text) to authenticated;
commit;
