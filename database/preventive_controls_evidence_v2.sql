-- Observaciones preventivas y evidencia normalizada V2.
-- Idempotente, no destructivo y de ejecución manual posterior a preventive_controls_v1.sql.
begin;

alter table public.preventive_controls add column if not exists immediate_action text not null default '';
alter table public.preventive_controls add column if not exists work_suspended boolean not null default false;
alter table public.preventive_controls add column if not exists area_secured boolean not null default false;
alter table public.preventive_controls add column if not exists closed_at timestamptz;
alter table public.preventive_controls add column if not exists closed_by uuid;
alter table public.preventive_controls add column if not exists validated_at timestamptz;
alter table public.preventive_controls add column if not exists validated_by uuid;
alter table public.preventive_controls add column if not exists legacy_source text;
alter table public.preventive_controls add column if not exists client_uuid text;
alter table public.preventive_controls add column if not exists sync_status text not null default 'synced';
alter table public.preventive_controls add column if not exists deleted_at timestamptz;

create unique index if not exists preventive_controls_client_uuid_uidx on public.preventive_controls(client_uuid) where client_uuid is not null;
create index if not exists preventive_controls_work_idx on public.preventive_controls(work_id);
create index if not exists preventive_controls_status_idx on public.preventive_controls(status);
create index if not exists preventive_controls_type_idx on public.preventive_controls(control_type);
create index if not exists preventive_controls_priority_idx on public.preventive_controls(priority);
create index if not exists preventive_controls_commitment_idx on public.preventive_controls(commitment_date) where commitment_date is not null;
drop policy if exists preventive_controls_assigned_access on public.preventive_controls;
drop policy if exists preventive_controls_read_v2 on public.preventive_controls;
drop policy if exists preventive_controls_insert_v2 on public.preventive_controls;
drop policy if exists preventive_controls_update_v2 on public.preventive_controls;
create policy preventive_controls_read_v2 on public.preventive_controls for select to authenticated using (
  public.has_gravi_permission('incidents.view') and (public.is_gravi_admin() or exists(select 1 from public.work_user_assignments a where a.work_id=preventive_controls.work_id and a.user_id=auth.uid() and a.active))
);
create policy preventive_controls_insert_v2 on public.preventive_controls for insert to authenticated with check (
  public.has_gravi_permission('incidents.create') and created_by=auth.uid() and (public.is_gravi_admin() or exists(select 1 from public.work_user_assignments a where a.work_id=preventive_controls.work_id and a.user_id=auth.uid() and a.active))
);
create policy preventive_controls_update_v2 on public.preventive_controls for update to authenticated using (
  public.has_gravi_permission('incidents.edit') and (public.is_gravi_admin() or exists(select 1 from public.work_user_assignments a where a.work_id=preventive_controls.work_id and a.user_id=auth.uid() and a.active))
) with check (
  public.has_gravi_permission('incidents.edit') and (public.is_gravi_admin() or exists(select 1 from public.work_user_assignments a where a.work_id=preventive_controls.work_id and a.user_id=auth.uid() and a.active))
);

create table if not exists public.preventive_control_evidence (
  id uuid primary key default gen_random_uuid(),
  client_uuid text not null unique,
  control_id uuid not null references public.preventive_controls(id) on delete restrict,
  evidence_stage text not null default 'general' check (evidence_stage in ('initial','correction','closure','general')),
  storage_path text not null,
  caption text not null default '',
  mime_type text not null,
  size_bytes bigint not null default 0,
  width integer,
  height integer,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists preventive_control_evidence_control_idx on public.preventive_control_evidence(control_id,created_at);
alter table public.preventive_control_evidence enable row level security;
revoke all on public.preventive_control_evidence from anon;
grant select,insert,update on public.preventive_control_evidence to authenticated;

drop policy if exists preventive_control_evidence_read on public.preventive_control_evidence;
create policy preventive_control_evidence_read on public.preventive_control_evidence for select to authenticated using (
  public.has_gravi_permission('evidence.view') and exists (
    select 1 from public.preventive_controls c where c.id=control_id and (
      public.is_gravi_admin() or exists(select 1 from public.work_user_assignments a where a.work_id=c.work_id and a.user_id=auth.uid() and a.active)
    )
  )
);
drop policy if exists preventive_control_evidence_insert on public.preventive_control_evidence;
create policy preventive_control_evidence_insert on public.preventive_control_evidence for insert to authenticated with check (
  public.has_gravi_permission('evidence.upload') and created_by=auth.uid() and exists (
    select 1 from public.preventive_controls c where c.id=control_id and (
      public.is_gravi_admin() or exists(select 1 from public.work_user_assignments a where a.work_id=c.work_id and a.user_id=auth.uid() and a.active)
    )
  )
);
drop policy if exists preventive_control_evidence_update on public.preventive_control_evidence;
create policy preventive_control_evidence_update on public.preventive_control_evidence for update to authenticated using (
  public.is_gravi_admin() or public.has_gravi_permission('evidence.delete') or (created_by=auth.uid() and public.has_gravi_permission('evidence.upload') and deleted_at is null)
) with check (public.is_gravi_admin() or public.has_gravi_permission('evidence.delete') or (created_by=auth.uid() and public.has_gravi_permission('evidence.upload') and deleted_at is null));

create table if not exists public.work_evidence (
  id uuid primary key default gen_random_uuid(), client_uuid text not null unique,
  work_id text not null references public.obras(id) on delete restrict,
  description text not null, evidence_date timestamptz not null default now(), storage_path text not null,
  mime_type text not null, size_bytes bigint not null default 0, created_by uuid,
  status text not null default 'active', source_module text not null default 'general', source_entry_id text,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), deleted_at timestamptz
);
create index if not exists work_evidence_work_date_idx on public.work_evidence(work_id,evidence_date desc);
alter table public.work_evidence enable row level security;
revoke all on public.work_evidence from anon;
grant select,insert,update on public.work_evidence to authenticated;
drop policy if exists work_evidence_read on public.work_evidence;
create policy work_evidence_read on public.work_evidence for select to authenticated using (
  public.has_gravi_permission('evidence.view') and (public.is_gravi_admin() or exists(select 1 from public.work_user_assignments a where a.work_id=work_evidence.work_id and a.user_id=auth.uid() and a.active))
);
drop policy if exists work_evidence_insert on public.work_evidence;
create policy work_evidence_insert on public.work_evidence for insert to authenticated with check (
  public.has_gravi_permission('evidence.upload') and created_by=auth.uid() and (public.is_gravi_admin() or exists(select 1 from public.work_user_assignments a where a.work_id=work_evidence.work_id and a.user_id=auth.uid() and a.active))
);
drop policy if exists work_evidence_update on public.work_evidence;
create policy work_evidence_update on public.work_evidence for update to authenticated using (
  public.is_gravi_admin() or public.has_gravi_permission('evidence.delete') or (created_by=auth.uid() and public.has_gravi_permission('evidence.upload') and deleted_at is null)
) with check (public.is_gravi_admin() or public.has_gravi_permission('evidence.delete') or (created_by=auth.uid() and public.has_gravi_permission('evidence.upload') and deleted_at is null));

commit;
