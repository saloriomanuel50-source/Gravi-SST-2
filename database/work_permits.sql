-- GRAVI SST · Permiso General de Trabajo · GVC-SSH-FMT-002
-- Idempotente. Ejecutar en Supabase SQL Editor como propietario del esquema.
create extension if not exists pgcrypto;

do $$ begin
  create type public.work_permit_status as enum ('draft','pending_review','authorized','active','rejected','suspended','cancelled','expired','closed');
exception when duplicate_object then null; end $$;

create table if not exists public.work_permits (
  id uuid primary key default gen_random_uuid(), folio text not null unique,
  development_id uuid, work_id uuid, contractor_id uuid, resident_user_id uuid, ats_id uuid,
  development_name text not null default '', work_name text not null default '', contractor_name text not null default '',
  resident_name text not null default '', requester_name text not null default '', activity text not null default '',
  description text not null default '', execution_area text not null default '', worker_count integer not null default 0 check(worker_count >= 0),
  prepared_at timestamptz not null default now(), starts_at timestamptz, ends_at timestamptz,
  workflow_mode text not null default 'supervisor_direct' check(workflow_mode in ('supervisor_direct','contractor_request')),
  contractor_responsible text not null default '', contractor_role text not null default '', prepared_by_supervisor text not null default '', authorized_by_supervisor text not null default '',
  contractor_user_id uuid, contractor_acknowledgement jsonb, contractor_signature text, contractor_signed_at timestamptz, contractor_request_status text,
  status public.work_permit_status not null default 'draft', max_risk_level text not null default 'minimum' check(max_risk_level in ('minimum','medium','high','critical')), max_residual_risk_level text not null default 'minimum' check(max_residual_risk_level in ('minimum','medium','high','critical')),
  work_types jsonb not null default '[]', activity_controls jsonb not null default '{}', hazards jsonb not null default '[]',
  ppe jsonb not null default '[]', additional_equipment jsonb not null default '[]', preventive_measures jsonb not null default '[]',
  participants jsonb not null default '[]', additional_requirements text not null default '', validity jsonb not null default '{}', extensions jsonb not null default '[]',
  closure jsonb not null default '{}', document_code text not null default 'GVC-SSH-FMT-002', form_version text not null default '00', revision integer not null default 1,
  authorized_snapshot jsonb, pdf_url text, authorized_at timestamptz, authorized_by uuid,
  created_by uuid not null default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), client_mutation_id uuid unique
);
alter table public.work_permits add column if not exists workflow_mode text not null default 'supervisor_direct';
alter table public.work_permits add column if not exists contractor_responsible text not null default '';
alter table public.work_permits add column if not exists contractor_role text not null default '';
alter table public.work_permits add column if not exists prepared_by_supervisor text not null default '';
alter table public.work_permits add column if not exists authorized_by_supervisor text not null default '';
alter table public.work_permits add column if not exists contractor_user_id uuid;
alter table public.work_permits add column if not exists contractor_acknowledgement jsonb;
alter table public.work_permits add column if not exists contractor_signature text;
alter table public.work_permits add column if not exists contractor_signed_at timestamptz;
alter table public.work_permits add column if not exists contractor_request_status text;
alter table public.work_permits add column if not exists max_residual_risk_level text not null default 'minimum';
create index if not exists work_permits_work_status_idx on public.work_permits(work_id,status);
create index if not exists work_permits_dates_idx on public.work_permits(starts_at,ends_at);
create index if not exists work_permits_contractor_idx on public.work_permits(contractor_id);

create table if not exists public.work_permit_approvals (
  id uuid primary key default gen_random_uuid(), permit_id uuid not null references public.work_permits(id) on delete cascade,
  stage text not null check(stage in ('request','review','authorization','extension','suspension','reactivation','cancellation','closure')),
  decision text not null, user_id uuid not null default auth.uid(), user_name text not null, user_role text not null default '', observations text not null default '',
  signature_data text, created_at timestamptz not null default now()
);
create index if not exists work_permit_approvals_permit_idx on public.work_permit_approvals(permit_id,created_at);

create table if not exists public.work_permit_evidence (
  id uuid primary key default gen_random_uuid(), permit_id uuid not null references public.work_permits(id) on delete cascade,
  control_key text, evidence_type text not null, storage_path text not null, caption text not null default '', metadata jsonb not null default '{}',
  created_by uuid not null default auth.uid(), created_at timestamptz not null default now()
);
create table if not exists public.work_permit_history (
  id bigint generated always as identity primary key, permit_id uuid not null references public.work_permits(id) on delete cascade,
  event_type text not null, from_status public.work_permit_status, to_status public.work_permit_status, details jsonb not null default '{}',
  user_id uuid default auth.uid(), created_at timestamptz not null default now()
);
create index if not exists work_permit_history_permit_idx on public.work_permit_history(permit_id,created_at);

create or replace function public.touch_work_permit() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists work_permits_touch on public.work_permits;
create trigger work_permits_touch before update on public.work_permits for each row execute function public.touch_work_permit();

create or replace function public.validate_work_permit_update() returns trigger language plpgsql security definer set search_path=public as $$
declare required_permission text;
begin
  if old.authorized_snapshot is not null and new.authorized_snapshot is distinct from old.authorized_snapshot then
    raise exception 'La instantánea autorizada es inalterable';
  end if;
  if new.status is distinct from old.status then
    if not ((old.workflow_mode='supervisor_direct' and old.status='draft' and new.status='authorized') or
      (old.status='draft' and new.status='pending_review') or (old.status='rejected' and new.status='pending_review') or
      (old.status='pending_review' and new.status in ('authorized','rejected')) or (old.status='authorized' and new.status='active') or
      (old.status='active' and new.status in ('suspended','cancelled','expired','closed')) or (old.status='suspended' and new.status in ('active','cancelled'))) then
      raise exception 'Transición de permiso inválida: % -> %',old.status,new.status;
    end if;
    required_permission := case
      when new.status in ('pending_review','rejected') then 'permits.review'
      when new.status in ('authorized','active') then 'permits.authorize'
      when new.status='suspended' or (old.status='suspended' and new.status='active') then 'permits.suspend'
      when new.status in ('cancelled','expired') then 'permits.cancel'
      when new.status='closed' then 'permits.close' end;
    if not public.has_work_permit_permission(required_permission) then raise exception 'Permiso insuficiente: %',required_permission; end if;
    if new.status='authorized' and new.max_residual_risk_level='critical' then raise exception 'No se puede autorizar un permiso con riesgo residual crítico'; end if;
  elsif not public.has_work_permit_permission('permits.edit') then
    raise exception 'Permiso insuficiente: permits.edit';
  end if;
  return new;
end $$;
drop trigger if exists work_permits_validate_update on public.work_permits;
create trigger work_permits_validate_update before update on public.work_permits for each row execute function public.validate_work_permit_update();

alter table public.work_permits enable row level security;
alter table public.work_permit_approvals enable row level security;
alter table public.work_permit_evidence enable row level security;
alter table public.work_permit_history enable row level security;

-- La función consulta permisos personalizados y conserva compatibilidad con roles existentes.
create or replace function public.has_work_permit_permission(p_key text) returns boolean stable security definer set search_path=public language sql as $$
  select exists(select 1 from public.perfiles_usuario p where p.user_id=auth.uid() and p.active and (
    p.role='Administrador' or
    (p.role='Supervisor SST' and p_key=any(array['permits.view','permits.create','permits.edit','permits.review','permits.authorize','permits.suspend','permits.cancel','permits.close','permits.export'])) or
    (p.role='Consulta' and p_key='permits.view') or
    (coalesce(p.permissions_mode,'role-default')='custom' and coalesce((p.custom_permissions->>p_key)::boolean,false))
  ));
$$;

drop policy if exists work_permits_select on public.work_permits;
create policy work_permits_select on public.work_permits for select using(public.has_work_permit_permission('permits.view'));
drop policy if exists work_permits_insert on public.work_permits;
create policy work_permits_insert on public.work_permits for insert with check(public.has_work_permit_permission('permits.create') and created_by=auth.uid());
drop policy if exists work_permits_update on public.work_permits;
create policy work_permits_update on public.work_permits for update using(
  public.has_work_permit_permission('permits.edit') or public.has_work_permit_permission('permits.review') or
  public.has_work_permit_permission('permits.authorize') or public.has_work_permit_permission('permits.suspend') or
  public.has_work_permit_permission('permits.cancel') or public.has_work_permit_permission('permits.close')) with check(
  public.has_work_permit_permission('permits.edit') or public.has_work_permit_permission('permits.review') or
  public.has_work_permit_permission('permits.authorize') or public.has_work_permit_permission('permits.suspend') or
  public.has_work_permit_permission('permits.cancel') or public.has_work_permit_permission('permits.close'));

create or replace function public.transition_work_permit(p_permit_id uuid,p_to_status public.work_permit_status,p_observations text default '')
returns public.work_permits language plpgsql security invoker set search_path=public as $$
declare before_row public.work_permits; after_row public.work_permits;
begin
  select * into before_row from public.work_permits where id=p_permit_id for update;
  if before_row.id is null then raise exception 'Permiso no encontrado'; end if;
  update public.work_permits set status=p_to_status,
    authorized_at=case when p_to_status='authorized' then now() else authorized_at end,
    authorized_by=case when p_to_status='authorized' then auth.uid() else authorized_by end,
    authorized_snapshot=case when p_to_status='authorized' and authorized_snapshot is null then to_jsonb(before_row)||jsonb_build_object('status','authorized','authorized_at',now(),'authorized_by',auth.uid()) else authorized_snapshot end
  where id=p_permit_id returning * into after_row;
  insert into public.work_permit_history(permit_id,event_type,from_status,to_status,details,user_id)
  values(p_permit_id,'status_transition',before_row.status,p_to_status,jsonb_build_object('observations',coalesce(p_observations,'')),auth.uid());
  return after_row;
end $$;
revoke all on function public.transition_work_permit(uuid,public.work_permit_status,text) from public;
grant execute on function public.transition_work_permit(uuid,public.work_permit_status,text) to authenticated;

do $$ declare t text; begin foreach t in array array['work_permit_approvals','work_permit_evidence','work_permit_history'] loop
  execute format('drop policy if exists %I on public.%I',t||'_select',t);
  execute format('create policy %I on public.%I for select using(public.has_work_permit_permission(''permits.view''))',t||'_select',t);
end loop; end $$;
drop policy if exists work_permit_approvals_insert on public.work_permit_approvals;
create policy work_permit_approvals_insert on public.work_permit_approvals for insert with check(user_id=auth.uid() and (public.has_work_permit_permission('permits.review') or public.has_work_permit_permission('permits.authorize') or public.has_work_permit_permission('permits.close')));
drop policy if exists work_permit_evidence_insert on public.work_permit_evidence;
create policy work_permit_evidence_insert on public.work_permit_evidence for insert with check(created_by=auth.uid() and public.has_work_permit_permission('permits.edit'));
drop policy if exists work_permit_evidence_delete on public.work_permit_evidence;
create policy work_permit_evidence_delete on public.work_permit_evidence for delete using(created_by=auth.uid() and public.has_work_permit_permission('permits.edit'));
drop policy if exists work_permit_history_insert on public.work_permit_history;
create policy work_permit_history_insert on public.work_permit_history for insert with check(user_id=auth.uid());

comment on table public.work_permits is 'Permiso General de Trabajo GVC-SSH-FMT-002; columnas consultables más contenido dinámico JSONB.';
comment on column public.work_permits.authorized_snapshot is 'Copia inalterable de los datos al autorizar; no debe actualizarse después de creada.';

-- Reutiliza el bucket institucional evidencias. La ruta debe iniciar con work-permits/.
drop policy if exists work_permits_storage_select on storage.objects;
create policy work_permits_storage_select on storage.objects for select to authenticated using(bucket_id='evidencias' and name like 'work-permits/%' and public.has_work_permit_permission('permits.view'));
drop policy if exists work_permits_storage_insert on storage.objects;
create policy work_permits_storage_insert on storage.objects for insert to authenticated with check(bucket_id='evidencias' and name like 'work-permits/%' and public.has_work_permit_permission('permits.edit'));
drop policy if exists work_permits_storage_delete on storage.objects;
create policy work_permits_storage_delete on storage.objects for delete to authenticated using(bucket_id='evidencias' and name like 'work-permits/%' and owner_id=auth.uid()::text and public.has_work_permit_permission('permits.edit'));
