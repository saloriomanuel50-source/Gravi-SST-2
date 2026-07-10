-- GRAVI SST - Registro Diario v2
-- Migracion idempotente y no destructiva. Ejecutar manualmente despues de schema.sql
-- y registro_diario.sql. Este archivo NO programa pg_cron.

begin;

alter table public.obras
  add column if not exists timezone text not null default 'America/Mazatlan';

comment on column public.obras.timezone is
  'Zona IANA usada para la fecha operativa y el cierre diario del servidor.';

alter table public.registro_diario
  add column if not exists development_id text,
  add column if not exists shift text not null default 'Matutino',
  add column if not exists timezone text not null default 'America/Mazatlan',
  add column if not exists supervisor_id uuid,
  add column if not exists supervisor_name text not null default '',
  add column if not exists folio text,
  add column if not exists opened_at timestamptz not null default now(),
  add column if not exists close_type text,
  add column if not exists closed_by uuid,
  add column if not exists version integer not null default 1,
  add column if not exists auto_closed boolean not null default false,
  add column if not exists requires_review boolean not null default false,
  add column if not exists validated_by uuid,
  add column if not exists validated_at timestamptz,
  add column if not exists reopened_by uuid,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopen_reason text,
  add column if not exists annulled_by uuid,
  add column if not exists annulled_at timestamptz,
  add column if not exists annul_reason text,
  add column if not exists automatic_data jsonb not null default '{}'::jsonb,
  add column if not exists automatic_snapshot jsonb,
  add column if not exists manual_data jsonb not null default '{}'::jsonb,
  add column if not exists missing_fields jsonb not null default '[]'::jsonb,
  add column if not exists completeness_percentage integer not null default 0,
  add column if not exists completeness_status text not null default 'incomplete',
  add column if not exists closure_note text not null default '',
  add column if not exists legacy_migrated boolean not null default false;

alter table public.registro_diario drop constraint if exists registro_diario_status_check;
alter table public.registro_diario drop constraint if exists registro_diario_work_id_log_date_key;
alter table public.registro_diario drop constraint if exists registro_diario_shift_check;
alter table public.registro_diario drop constraint if exists registro_diario_close_type_check;
alter table public.registro_diario drop constraint if exists registro_diario_completeness_check;

update public.registro_diario
set status = case status
  when 'Borrador' then 'draft'
  when 'Cerrado' then 'closed_manual'
  else status
end,
shift = coalesce(nullif(shift, ''), 'Matutino'),
supervisor_name = coalesce(nullif(supervisor_name, ''), supervisor, ''),
manual_data = case
  when manual_data = '{}'::jsonb then jsonb_build_object(
    'legacy', true,
    'observations', observations,
    'signature', signature,
    'attachments', attachments
  )
  else manual_data
end,
automatic_data = case
  when automatic_data = '{}'::jsonb then jsonb_build_object(
    'legacy', true,
    'metrics', metrics,
    'weather', jsonb_build_object(
      'source', weather,
      'temperature', temperature,
      'wind', wind,
      'sky', sky,
      'heat_level', heat_level
    ),
    'evidence', evidence
  )
  else automatic_data
end,
automatic_snapshot = case
  when status in ('Cerrado', 'closed_manual') and automatic_snapshot is null
    then jsonb_build_object(
      'legacy', true,
      'metrics', metrics,
      'weather', jsonb_build_object(
        'source', weather,
        'temperature', temperature,
        'wind', wind,
        'sky', sky,
        'heat_level', heat_level
      ),
      'evidence', evidence,
      'captured_at', coalesce(closed_at, updated_at, now())
    )
  else automatic_snapshot
end,
requires_review = case
  when status in ('Cerrado', 'closed_manual') and automatic_snapshot is null then true
  else requires_review
end,
legacy_migrated = true;

alter table public.registro_diario
  add constraint registro_diario_status_check
  check (status in ('draft','pending_close','closed_manual','closed_auto','reopened','annulled')) not valid;
alter table public.registro_diario validate constraint registro_diario_status_check;

alter table public.registro_diario
  add constraint registro_diario_shift_check
  check (shift in ('Matutino','Vespertino','Nocturno','Mixto')) not valid;
alter table public.registro_diario validate constraint registro_diario_shift_check;

alter table public.registro_diario
  add constraint registro_diario_close_type_check
  check (close_type is null or close_type in ('manual','automatic')) not valid;
alter table public.registro_diario validate constraint registro_diario_close_type_check;

alter table public.registro_diario
  add constraint registro_diario_completeness_check
  check (completeness_percentage between 0 and 100) not valid;
alter table public.registro_diario validate constraint registro_diario_completeness_check;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='registro_diario_work_fk') then
    alter table public.registro_diario
      add constraint registro_diario_work_fk
      foreign key (work_id) references public.obras(id) on delete restrict not valid;
  end if;
end $$;

-- Archivo append-only para conservar filas duplicadas antes de imponer la
-- unicidad. Reejecutar esta sección no vuelve a archivar filas ya eliminadas.
create table if not exists public.daily_report_versions (
  id bigint generated always as identity primary key,
  report_id text not null,
  report_version integer not null,
  status text not null,
  automatic_snapshot jsonb,
  manual_data jsonb not null default '{}'::jsonb,
  legacy_row jsonb not null default '{}'::jsonb,
  changed_by uuid,
  change_reason text not null default '',
  created_at timestamptz not null default now(),
  unique (report_id, report_version)
);
alter table public.daily_report_versions
  add column if not exists legacy_row jsonb not null default '{}'::jsonb;

do $$
declare duplicate_row record;
begin
  for duplicate_row in
    select id, work_id, log_date, shift, status, automatic_snapshot,
           manual_data, version, to_jsonb(registro_diario) as legacy_row,
           row_number() over (
             partition by work_id, log_date, shift
             order by created_at asc, id asc
           ) as duplicate_number
    from public.registro_diario
  loop
    if duplicate_row.duplicate_number > 1 then
      insert into public.daily_report_versions(
        report_id, report_version, status, automatic_snapshot, manual_data,
        legacy_row, change_reason
      ) values (
        duplicate_row.id, 0, duplicate_row.status,
        duplicate_row.automatic_snapshot,
        coalesce(duplicate_row.manual_data, '{}'::jsonb),
        duplicate_row.legacy_row,
        'Respaldo de fila duplicada antes de imponer work_id/log_date/shift'
      ) on conflict (report_id, report_version) do nothing;
      delete from public.registro_diario where id=duplicate_row.id;
    end if;
  end loop;
end $$;

create unique index if not exists registro_diario_work_date_shift_uidx
  on public.registro_diario(work_id, log_date, shift);
create unique index if not exists registro_diario_folio_uidx
  on public.registro_diario(folio) where folio is not null;
create index if not exists registro_diario_review_idx
  on public.registro_diario(requires_review, status, log_date desc);

create table if not exists public.work_user_assignments (
  work_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  responsibility text not null default 'Consulta',
  can_edit boolean not null default false,
  can_close boolean not null default false,
  can_validate_auto boolean not null default false,
  can_reopen boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (work_id, user_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname='work_user_assignments_work_fk') then
    alter table public.work_user_assignments
      add constraint work_user_assignments_work_fk
      foreign key (work_id) references public.obras(id) on delete cascade not valid;
  end if;
end $$;

create index if not exists work_user_assignments_user_idx
  on public.work_user_assignments(user_id);
create index if not exists work_user_assignments_work_idx
  on public.work_user_assignments(work_id);

create table if not exists public.daily_report_closure_log (
  id bigint generated always as identity primary key,
  executed_at timestamptz not null default now(),
  work_id text,
  report_id text,
  previous_status text,
  new_status text,
  result text not null,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.work_user_assignments enable row level security;
alter table public.daily_report_versions enable row level security;
alter table public.daily_report_closure_log enable row level security;

revoke all on public.registro_diario, public.work_user_assignments,
  public.daily_report_versions, public.daily_report_closure_log from anon;
grant select, insert, update on public.registro_diario to authenticated;
grant select on public.work_user_assignments, public.daily_report_versions,
  public.daily_report_closure_log to authenticated;
grant insert, update, delete on public.work_user_assignments to authenticated;

create or replace function public.can_access_daily_report(
  p_work_id text,
  p_action text default 'read'
) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    public.is_gravi_admin()
    or exists (
      select 1
      from public.work_user_assignments a
      where a.work_id = p_work_id
        and a.user_id = auth.uid()
        and a.active
        and case p_action
          when 'read' then true
          when 'edit' then a.can_edit
          when 'close' then a.can_close
          when 'validate' then a.can_validate_auto
          when 'reopen' then a.can_reopen
          else false
        end
    ), false
  )
$$;

revoke all on function public.can_access_daily_report(text,text) from public, anon;
grant execute on function public.can_access_daily_report(text,text) to authenticated;

drop policy if exists registro_diario_read on public.registro_diario;
drop policy if exists registro_diario_insert on public.registro_diario;
drop policy if exists registro_diario_update on public.registro_diario;
drop policy if exists registro_diario_delete on public.registro_diario;
drop policy if exists daily_report_read on public.registro_diario;
drop policy if exists daily_report_insert on public.registro_diario;
drop policy if exists daily_report_update on public.registro_diario;

create policy daily_report_read on public.registro_diario
  for select to authenticated
  using (public.can_access_daily_report(work_id, 'read'));
create policy daily_report_insert on public.registro_diario
  for insert to authenticated
  with check (
    status in ('draft','reopened')
    and public.can_access_daily_report(work_id, 'edit')
  );
create policy daily_report_update on public.registro_diario
  for update to authenticated
  using (
    status in ('draft','reopened')
    and public.can_access_daily_report(work_id, 'edit')
  )
  with check (
    status in ('draft','reopened')
    and public.can_access_daily_report(work_id, 'edit')
  );

drop policy if exists work_assignments_read on public.work_user_assignments;
drop policy if exists work_assignments_admin on public.work_user_assignments;
create policy work_assignments_read on public.work_user_assignments
  for select to authenticated
  using (user_id = auth.uid() or public.is_gravi_admin());
create policy work_assignments_admin on public.work_user_assignments
  for all to authenticated
  using (public.is_gravi_admin()) with check (public.is_gravi_admin());

drop policy if exists daily_report_versions_read on public.daily_report_versions;
create policy daily_report_versions_read on public.daily_report_versions
  for select to authenticated
  using (exists (
    select 1 from public.registro_diario r
    where r.id = report_id and public.can_access_daily_report(r.work_id, 'read')
  ));

drop policy if exists daily_report_closure_log_read on public.daily_report_closure_log;
create policy daily_report_closure_log_read on public.daily_report_closure_log
  for select to authenticated
  using (
    public.is_gravi_admin()
    or (work_id is not null and public.can_access_daily_report(work_id, 'read'))
  );

create or replace function public.build_daily_report_snapshot(p_report_id text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  r public.registro_diario%rowtype;
  v_attendance jsonb;
  v_contractors jsonb;
  v_visitors jsonb;
  v_inspections jsonb;
  v_incidents jsonb;
  v_accidents jsonb;
  v_compliance jsonb;
begin
  select * into r from public.registro_diario where id = p_report_id;
  if not found then raise exception 'Registro diario no encontrado'; end if;

  select coalesce(jsonb_build_object(
    'marks', a.marks,
    'registered', (select count(*) from public.trabajadores t where t.work_id=r.work_id and coalesce(t.status,'Activo')='Activo'),
    'present', (select count(*) from jsonb_each_text(coalesce(a.marks,'{}'::jsonb)) m where m.value='P'),
    'absent', (select count(*) from jsonb_each_text(coalesce(a.marks,'{}'::jsonb)) m where m.value='A'),
    'source_updated_at', a.updated_at
  ), jsonb_build_object('marks','{}'::jsonb,'registered',0,'present',0,'absent',0))
  into v_attendance from public.asistencia a
  where a.work_id=r.work_id and a.attendance_date=r.log_date;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'status', c.status,
    'present', (select count(*) from public.trabajadores t
      where t.work_id=r.work_id and t.contractor_id=c.id
      and coalesce((select a.marks->>t.id from public.asistencia a where a.work_id=r.work_id and a.attendance_date=r.log_date),'A')='P')
  ) order by c.name), '[]'::jsonb) into v_contractors
  from public.contratistas c where c.work_id=r.work_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', v.id, 'name', v.name, 'entry', v.payload->>'entry', 'exit', v.payload->>'exit'
  ) order by v.created_at), '[]'::jsonb) into v_visitors
  from public.visitantes v where v.work_id=r.work_id and v.visit_date=r.log_date;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', x.id, 'type', x.record_type, 'status', x.status, 'folio', x.folio
  ) order by x.created_at), '[]'::jsonb) into v_inspections
  from public.registros x
  where x.work_id=r.work_id and x.record_date=r.log_date and x.record_type<>'incident';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', x.id, 'status', x.status, 'folio', x.folio
  ) order by x.created_at), '[]'::jsonb) into v_incidents
  from public.registros x
  where x.work_id=r.work_id and x.record_date=r.log_date and x.record_type='incident';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'folio', i.folio, 'payload', jsonb_build_object(
      'responsible', i.payload->>'responsible', 'dueDate', i.payload->>'dueDate'
    )
  ) order by i.created_at), '[]'::jsonb) into v_accidents
  from public.investigaciones i where i.work_id=r.work_id and i.event_date=r.log_date;

  select coalesce(payload, '{}'::jsonb) into v_compliance
  from public.cumplimiento_estado where id='global';

  return jsonb_build_object(
    'workforce', coalesce(v_attendance,'{}'::jsonb),
    'contractors', coalesce(v_contractors,'[]'::jsonb),
    'visitors', coalesce(v_visitors,'[]'::jsonb),
    'weather', coalesce(r.automatic_data->'weather','{}'::jsonb),
    'inspections', coalesce(v_inspections,'[]'::jsonb),
    'incidents', coalesce(v_incidents,'[]'::jsonb),
    'accidents', coalesce(v_accidents,'[]'::jsonb),
    'permits', jsonb_build_object('source_available',false,'items','[]'::jsonb),
    'ats', jsonb_build_object('source_available',false,'items','[]'::jsonb),
    'compliance', coalesce(v_compliance,'{}'::jsonb),
    'evidence', coalesce(r.automatic_data->'evidence','[]'::jsonb),
    'manual_data', coalesce(r.manual_data,'{}'::jsonb),
    'source_timestamps', jsonb_build_object('captured_at',now(),'report_updated_at',r.updated_at)
  );
end $$;

revoke all on function public.build_daily_report_snapshot(text) from public, anon, authenticated;

create or replace function public.daily_report_completeness(
  p_manual_data jsonb,
  p_snapshot jsonb
) returns jsonb
language sql immutable set search_path = ''
as $$
  with missing as (
    select array_remove(array[
      case when coalesce(p_manual_data->>'dayStatus','')='' then 'day_status' end,
      case when coalesce(p_manual_data->>'activitySummary','')='' then 'activity_summary' end,
      case when coalesce(p_manual_data->>'finalObservation','')='' then 'final_observation' end
    ], null) fields
  )
  select jsonb_build_object(
    'missing_fields', to_jsonb(fields),
    'percentage', round((1 - cardinality(fields)::numeric / 3) * 100)::integer,
    'status', case when cardinality(fields)=0 then 'complete' else 'incomplete' end
  ) from missing
$$;

revoke all on function public.daily_report_completeness(jsonb,jsonb) from public, anon, authenticated;

create or replace function public.save_daily_report_draft(
  p_report jsonb,
  p_expected_version integer default null
) returns public.registro_diario
language plpgsql security definer set search_path = ''
as $$
declare
  r public.registro_diario%rowtype;
  v_id text := coalesce(nullif(p_report->>'id',''),
    concat(p_report->>'workId','|',p_report->>'date','|',coalesce(nullif(p_report->>'shift',''),'Matutino')));
  v_work text := p_report->>'workId';
  v_date date := (p_report->>'date')::date;
  v_shift text := coalesce(nullif(p_report->>'shift',''),'Matutino');
begin
  if not public.can_access_daily_report(v_work,'edit') then raise exception 'Sin permiso para editar esta obra'; end if;

  select * into r from public.registro_diario
  where work_id=v_work and log_date=v_date and shift=v_shift for update;

  if found then
    if r.status not in ('draft','reopened') then raise exception 'El registro ya no admite edicion'; end if;
    if p_expected_version is not null and r.version<>p_expected_version then raise exception 'Conflicto de version'; end if;
    update public.registro_diario set
      development_id=nullif(p_report->>'developmentId',''),
      timezone=coalesce(nullif(p_report->>'timezone',''),timezone),
      supervisor_id=coalesce((nullif(p_report->>'supervisorId',''))::uuid,supervisor_id),
      supervisor_name=coalesce(p_report->>'supervisorName',p_report->>'supervisor',supervisor_name),
      automatic_data=coalesce(p_report->'automaticData',p_report->'automatic_data',automatic_data),
      manual_data=coalesce(p_report->'manualData',p_report->'manual_data',p_report,manual_data),
      payload=p_report,
      version=version+1,
      updated_at=now()
    where id=r.id returning * into r;
  else
    insert into public.registro_diario(
      id,work_id,development_id,log_date,shift,timezone,status,
      supervisor_id,supervisor_name,automatic_data,manual_data,payload,opened_at
    ) values (
      v_id,v_work,nullif(p_report->>'developmentId',''),v_date,v_shift,
      coalesce(nullif(p_report->>'timezone',''),'America/Mazatlan'),'draft',
      (nullif(p_report->>'supervisorId',''))::uuid,
      coalesce(p_report->>'supervisorName',p_report->>'supervisor',''),
      coalesce(p_report->'automaticData',p_report->'automatic_data','{}'::jsonb),
      coalesce(p_report->'manualData',p_report->'manual_data',p_report,'{}'::jsonb),
      p_report,coalesce((nullif(p_report->>'openedAt',''))::timestamptz,now())
    ) returning * into r;
  end if;
  return r;
end $$;

revoke all on function public.save_daily_report_draft(jsonb,integer) from public, anon;
grant execute on function public.save_daily_report_draft(jsonb,integer) to authenticated;

create or replace function public.import_legacy_daily_report(p_report jsonb)
returns public.registro_diario
language plpgsql security definer set search_path = ''
as $$
declare
  r public.registro_diario%rowtype;
  v_status text := case when p_report->>'status'='Cerrado' then 'closed_manual' else 'draft' end;
  v_work text := p_report->>'workId';
  v_date date := (p_report->>'date')::date;
begin
  if not public.is_gravi_admin() then raise exception 'Solo un Administrador puede importar registros heredados'; end if;
  insert into public.registro_diario(
    id,work_id,log_date,shift,timezone,status,supervisor_name,manual_data,
    automatic_data,automatic_snapshot,payload,closed_at,close_type,requires_review,legacy_migrated
  ) values (
    concat(v_work,'|',v_date,'|Matutino'),v_work,v_date,'Matutino','America/Mazatlan',v_status,
    coalesce(p_report->>'supervisor',''),
    jsonb_build_object('legacy',true,'observations',p_report->>'observations','signature',p_report->>'signature','source',p_report),
    jsonb_build_object('legacy',true,'metrics',coalesce(p_report->'metrics','{}'::jsonb),'weather',jsonb_build_object(
      'source',p_report->>'weather','temperature',p_report->>'temperature','wind',p_report->>'wind','sky',p_report->>'sky','heat_level',p_report->>'heatLevel'
    ),'evidence',coalesce(p_report->'evidence','[]'::jsonb)),
    case when v_status='closed_manual' then jsonb_build_object('legacy',true,'source',p_report) end,
    p_report,(nullif(p_report->>'closedAt',''))::timestamptz,
    case when v_status='closed_manual' then 'manual' end,
    v_status='closed_manual',true
  ) on conflict (work_id,log_date,shift) do update set
    payload=case when public.registro_diario.legacy_migrated then public.registro_diario.payload else excluded.payload end,
    updated_at=now()
  returning * into r;
  return r;
end $$;

revoke all on function public.import_legacy_daily_report(jsonb) from public, anon;
grant execute on function public.import_legacy_daily_report(jsonb) to authenticated;

create or replace function public.close_daily_report_manual(
  p_report_id text,
  p_expected_version integer
) returns public.registro_diario
language plpgsql security definer set search_path = ''
as $$
declare
  r public.registro_diario%rowtype;
  v_snapshot jsonb;
  v_integrity jsonb;
begin
  select * into r from public.registro_diario where id=p_report_id for update;
  if not found then raise exception 'Registro diario no encontrado'; end if;
  if not public.can_access_daily_report(r.work_id,'close') then raise exception 'Sin permiso para cerrar esta obra'; end if;
  if r.status not in ('draft','pending_close','reopened') then raise exception 'El registro ya fue cerrado o anulado'; end if;
  if r.version<>p_expected_version then raise exception 'Conflicto de version'; end if;

  v_snapshot := public.build_daily_report_snapshot(r.id);
  v_integrity := public.daily_report_completeness(r.manual_data,v_snapshot);
  if jsonb_array_length(v_integrity->'missing_fields')>0 then
    raise exception 'El registro no cumple los campos obligatorios para cierre manual';
  end if;

  update public.registro_diario set
    automatic_snapshot=v_snapshot,
    status='closed_manual',close_type='manual',auto_closed=false,
    closed_at=now(),closed_by=auth.uid(),requires_review=false,
    missing_fields=v_integrity->'missing_fields',
    completeness_percentage=(v_integrity->>'percentage')::integer,
    completeness_status=v_integrity->>'status',
    folio=coalesce(folio,concat('RD-',extract(year from log_date)::integer,'-',upper(substr(md5(work_id),1,5)),'-',to_char(log_date,'MMDD'),'-',substr(shift,1,1))),
    version=version+1,updated_at=now()
  where id=r.id returning * into r;

  insert into public.daily_report_closure_log(work_id,report_id,previous_status,new_status,result,metadata)
  values(r.work_id,r.id,'draft','closed_manual','success',jsonb_build_object('actor',auth.uid()));
  return r;
end $$;

revoke all on function public.close_daily_report_manual(text,integer) from public, anon;
grant execute on function public.close_daily_report_manual(text,integer) to authenticated;

create or replace function public.confirm_daily_report_automatic(
  p_report_id text,
  p_expected_version integer
) returns public.registro_diario
language plpgsql security definer set search_path = ''
as $$
declare
  r public.registro_diario%rowtype;
begin
  select * into r from public.registro_diario where id=p_report_id for update;
  if not found then raise exception 'Registro diario no encontrado'; end if;
  if not public.can_access_daily_report(r.work_id,'validate') then raise exception 'Sin permiso para validar esta obra'; end if;
  if r.status <> 'closed_auto' then raise exception 'Solo se pueden validar cierres automáticos'; end if;
  if r.version <> p_expected_version then raise exception 'Conflicto de versión'; end if;
  update public.registro_diario set
    validated_by=auth.uid(),validated_at=now(),requires_review=false,
    version=version+1,updated_at=now()
  where id=r.id returning * into r;
  insert into public.daily_report_closure_log(work_id,report_id,previous_status,new_status,result,metadata)
  values(r.work_id,r.id,'closed_auto','closed_auto','validated',jsonb_build_object('actor',auth.uid(),'validated_at',now()));
  return r;
end $$;

revoke all on function public.confirm_daily_report_automatic(text,integer) from public, anon;
grant execute on function public.confirm_daily_report_automatic(text,integer) to authenticated;

-- Preparada para ser invocada por pg_cron en una fase posterior. Esta función
-- no programa ningún job y es idempotente por la restricción única de jornada.
create or replace function public.close_due_daily_reports(
  p_now timestamptz default now()
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_work record;
  v_date date;
  v_local_time time;
  v_report public.registro_diario%rowtype;
  v_snapshot jsonb;
  v_integrity jsonb;
  v_created integer := 0;
  v_closed integer := 0;
  v_skipped integer := 0;
  v_errors integer := 0;
  v_new boolean;
  v_closure_note text;
begin
  for v_work in
    select id, coalesce(nullif(timezone,''),'America/Mazatlan') as timezone
    from public.obras
    where status = 'Activa' and deleted_at is null
  loop
    begin
      v_new := false;
      v_date := (p_now at time zone v_work.timezone)::date;
      v_local_time := (p_now at time zone v_work.timezone)::time;
      if v_local_time < time '22:00' then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      select * into v_report
      from public.registro_diario
      where work_id=v_work.id and log_date=v_date and shift='Matutino'
      for update;

      if not found then
        insert into public.registro_diario(
          id,work_id,log_date,shift,timezone,status,automatic_data,manual_data,
          missing_fields,completeness_status,requires_review,auto_closed,close_type,
          closed_at,closure_note,version
        ) values (
          concat(v_work.id,'|',v_date,'|Matutino'),v_work.id,v_date,'Matutino',v_work.timezone,
          'closed_auto','{}'::jsonb,'{}'::jsonb,'["attendance","weather","day_status","activity_summary","final_observation"]'::jsonb,
          'incomplete',true,true,'automatic',p_now,
          'Registro cerrado automáticamente a las 22:00. No fue validado por el supervisor responsable.',1
        ) on conflict (work_id,log_date,shift) do nothing
        returning * into v_report;
        if found then
          v_created := v_created + 1;
          v_new := true;
        else
          select * into v_report from public.registro_diario
          where work_id=v_work.id and log_date=v_date and shift='Matutino';
        end if;
      end if;

      if not v_new and v_report.status in ('closed_manual','closed_auto','annulled') then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      v_closure_note := case when v_new
        then U&'Registro creado y cerrado autom\00e1ticamente a las 22:00 sin validaci\00f3n del supervisor.'
        else U&'Registro cerrado autom\00e1ticamente a las 22:00. No fue validado por el supervisor responsable.'
      end;

      v_snapshot := public.build_daily_report_snapshot(v_report.id);
      v_integrity := public.daily_report_completeness(v_report.manual_data,v_snapshot);
      update public.registro_diario set
        automatic_snapshot=v_snapshot,
        status='closed_auto',auto_closed=true,close_type='automatic',closed_at=p_now,
        closed_by=null,requires_review=true,
        missing_fields=coalesce(v_integrity->'missing_fields','[]'::jsonb),
        completeness_percentage=coalesce((v_integrity->>'percentage')::integer,0),
        completeness_status=coalesce(v_integrity->>'status','incomplete'),
        closure_note='Registro cerrado automáticamente a las 22:00. No fue validado por el supervisor responsable.',
        folio=coalesce(v_report.folio,concat('RD-',extract(year from v_report.log_date)::integer,'-',upper(substr(md5(v_report.work_id),1,5)),'-',to_char(v_report.log_date,'MMDD'),'-',substr(v_report.shift,1,1))),
        version=v_report.version+1,updated_at=p_now
      where id=v_report.id;
      update public.registro_diario set closure_note=v_closure_note where id=v_report.id;
      insert into public.daily_report_closure_log(work_id,report_id,previous_status,new_status,result,metadata)
      values(v_report.work_id,v_report.id,v_report.status,'closed_auto','success',jsonb_build_object('source','close_due_daily_reports','evaluated_at',p_now));
      v_closed := v_closed + 1;
    exception when others then
      v_errors := v_errors + 1;
      insert into public.daily_report_closure_log(work_id,report_id,previous_status,new_status,result,error_message,metadata)
      values(v_work.id,v_report.id,v_report.status,'closed_auto','error',sqlerrm,jsonb_build_object('evaluated_at',p_now));
    end;
  end loop;
  return jsonb_build_object('created',v_created,'closed',v_closed,'skipped',v_skipped,'errors',v_errors,'evaluated_at',p_now);
end $$;

revoke all on function public.close_due_daily_reports(timestamptz) from public, anon, authenticated;

commit;
