-- Incidencias / Accidentes V2 - Fase 1
-- Idempotente, no destructivo. No ejecutar automáticamente.
-- Fuente de eventos existente: public.registros con record_type = 'incident'.
-- Fuente de investigaciones existente: public.investigaciones.

alter table if exists public.registros
  add column if not exists event_type text,
  add column if not exists consequence text,
  add column if not exists severity text,
  add column if not exists occurred_at timestamptz,
  add column if not exists area_or_front text,
  add column if not exists activity text,
  add column if not exists immediate_action text,
  add column if not exists work_suspended boolean not null default false,
  add column if not exists area_secured boolean not null default false,
  add column if not exists reporter_id uuid,
  add column if not exists supervisor_id uuid,
  add column if not exists contractor_id text,
  add column if not exists affected_worker_id text,
  add column if not exists requires_investigation boolean not null default false,
  add column if not exists investigation_reason text,
  add column if not exists initial_report_pdf_path text,
  add column if not exists created_by uuid;

create index if not exists registros_incident_work_date_idx
  on public.registros (work_id, record_date) where record_type = 'incident';
create unique index if not exists registros_incident_folio_uidx
  on public.registros (folio) where record_type = 'incident' and folio is not null;

alter table if exists public.investigaciones
  add column if not exists event_id text,
  add column if not exists investigation_folio text,
  add column if not exists status text not null default 'pending_start',
  add column if not exists assigned_to uuid,
  add column if not exists started_at timestamptz,
  add column if not exists due_at timestamptz,
  add column if not exists submitted_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists root_cause text,
  add column if not exists causal_analysis jsonb not null default '{}'::jsonb,
  add column if not exists failed_controls jsonb not null default '[]'::jsonb,
  add column if not exists version integer not null default 1,
  add column if not exists created_by uuid;

create unique index if not exists investigaciones_event_uidx
  on public.investigaciones (event_id) where event_id is not null;
create unique index if not exists investigaciones_folio_uidx
  on public.investigaciones (investigation_folio) where investigation_folio is not null;

create table if not exists public.investigation_actions (
  id uuid primary key default gen_random_uuid(),
  investigation_id text not null references public.investigaciones(id) on delete restrict,
  action_type text not null default 'corrective',
  description text not null default '',
  priority text not null default 'medium',
  responsible_id uuid,
  due_date date,
  evidence_required boolean not null default false,
  status text not null default 'pending',
  completed_at timestamptz,
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.incident_evidence_links (
  id uuid primary key default gen_random_uuid(),
  event_id text references public.registros(id) on delete restrict,
  investigation_id text references public.investigaciones(id) on delete restrict,
  action_id uuid references public.investigation_actions(id) on delete restrict,
  evidence_id text not null,
  category text not null default 'general',
  created_at timestamptz not null default now(),
  constraint incident_evidence_one_parent_ck check (event_id is not null or investigation_id is not null or action_id is not null)
);

create unique index if not exists incident_evidence_links_uidx
  on public.incident_evidence_links (coalesce(event_id,''), coalesce(investigation_id,''), coalesce(action_id::text,''), evidence_id);

create table if not exists public.incident_documents (
  id uuid primary key default gen_random_uuid(),
  event_id text references public.registros(id) on delete restrict,
  investigation_id text references public.investigaciones(id) on delete restrict,
  document_type text not null,
  storage_path text not null,
  version integer not null default 1,
  immutable boolean not null default true,
  generated_at timestamptz not null default now(),
  generated_by uuid,
  constraint incident_documents_parent_ck check (event_id is not null or investigation_id is not null)
);

create table if not exists public.incident_audit_log (
  id uuid primary key default gen_random_uuid(),
  event_id text references public.registros(id) on delete restrict,
  investigation_id text references public.investigaciones(id) on delete restrict,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  performed_by uuid not null default auth.uid(),
  performed_at timestamptz not null default now()
);

create index if not exists investigation_actions_investigation_idx on public.investigation_actions (investigation_id);
create index if not exists incident_evidence_links_event_idx on public.incident_evidence_links (event_id);
create index if not exists incident_documents_event_idx on public.incident_documents (event_id);
create index if not exists incident_audit_event_idx on public.incident_audit_log (event_id, performed_at desc);

create or replace function public.next_incident_folio()
returns text language plpgsql security definer set search_path = pg_catalog, public
as $$ declare n integer; y text := to_char(current_date,'YYYY'); begin
  select coalesce(max((substring(folio from 10))::integer),0)+1 into n from public.registros where record_type='incident' and folio like 'RSO-'||y||'-%';
  return format('RSO-%s-%s',y,lpad(n::text,4,'0'));
end $$;

create or replace function public.next_investigation_folio()
returns text language plpgsql security definer set search_path = pg_catalog, public
as $$ declare n integer; y text := to_char(current_date,'YYYY'); begin
  select coalesce(max((substring(investigation_folio from 10))::integer),0)+1 into n from public.investigaciones where investigation_folio like 'INV-'||y||'-%';
  return format('INV-%s-%s',y,lpad(n::text,4,'0'));
end $$;

create or replace function public.ensure_accident_investigation(p_event_id text)
returns public.investigaciones language plpgsql security definer set search_path = pg_catalog, public
as $$ declare e public.registros; i public.investigaciones; begin
  select * into e from public.registros where id=p_event_id and record_type='incident' for update;
  if not found then raise exception 'Evento no encontrado'; end if;
  if not public.is_gravi_admin() and not exists (select 1 from public.work_user_assignments a where a.work_id=e.work_id and a.user_id=auth.uid() and a.active) then raise exception 'Obra no asignada'; end if;
  select * into i from public.investigaciones where event_id=e.id limit 1;
  if found then return i; end if;
  insert into public.investigaciones(id,work_id,folio,event_date,event_id,investigation_folio,status,payload,created_by)
    values (gen_random_uuid()::text,e.work_id,e.folio,e.record_date,e.id,public.next_investigation_folio(),'pending_start','{}'::jsonb,auth.uid()) returning * into i;
  update public.registros set requires_investigation=true, investigation_reason=coalesce(investigation_reason,'Accidente con lesión incapacitante'), updated_at=now() where id=e.id;
  insert into public.incident_audit_log(event_id,investigation_id,action,new_value) values(e.id,i.id,'investigation_created',to_jsonb(i));
  return i;
end $$;

alter table public.investigation_actions enable row level security;
alter table public.incident_evidence_links enable row level security;
alter table public.incident_documents enable row level security;
alter table public.incident_audit_log enable row level security;

drop policy if exists investigation_actions_access on public.investigation_actions;
create policy investigation_actions_access on public.investigation_actions for all to authenticated using (
  public.is_gravi_admin() or exists (select 1 from public.investigaciones i join public.work_user_assignments a on a.work_id=i.work_id where i.id=investigation_id and a.user_id=auth.uid() and a.active)
) with check (public.is_gravi_admin() or exists (select 1 from public.investigaciones i join public.work_user_assignments a on a.work_id=i.work_id where i.id=investigation_id and a.user_id=auth.uid() and a.active));

drop policy if exists incident_evidence_links_access on public.incident_evidence_links;
create policy incident_evidence_links_access on public.incident_evidence_links for all to authenticated using (public.is_gravi_admin() or exists (select 1 from public.registros r join public.work_user_assignments a on a.work_id=r.work_id where r.id=event_id and a.user_id=auth.uid() and a.active));
drop policy if exists incident_documents_access on public.incident_documents;
create policy incident_documents_access on public.incident_documents for all to authenticated using (public.is_gravi_admin() or exists (select 1 from public.registros r join public.work_user_assignments a on a.work_id=r.work_id where r.id=event_id and a.user_id=auth.uid() and a.active));
drop policy if exists incident_audit_log_access on public.incident_audit_log;
create policy incident_audit_log_access on public.incident_audit_log for select to authenticated using (public.is_gravi_admin() or exists (select 1 from public.registros r join public.work_user_assignments a on a.work_id=r.work_id where r.id=event_id and a.user_id=auth.uid() and a.active));

revoke all on function public.next_incident_folio() from public, anon, authenticated;
revoke all on function public.next_investigation_folio() from public, anon, authenticated;
revoke all on function public.ensure_accident_investigation(text) from public, anon;
grant execute on function public.ensure_accident_investigation(text) to authenticated;
