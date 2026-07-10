-- Centro preventivo SST. Idempotente y no destructivo. No ejecutar automáticamente.
create table if not exists public.preventive_controls (
  id uuid primary key default gen_random_uuid(), work_id text not null references public.obras(id) on delete restrict,
  development_id text, folio text, control_type text not null, description text not null default '', activity text, area text,
  contractor_id text, responsible_id uuid, commitment_date date, status text not null default 'draft', priority text not null default 'medium',
  evidence jsonb not null default '[]'::jsonb, source_module text default 'Permisos / ATS', source_entry_id text,
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists preventive_controls_folio_uidx on public.preventive_controls(folio) where folio is not null;
create index if not exists preventive_controls_work_type_idx on public.preventive_controls(work_id,control_type,status);
alter table public.preventive_controls enable row level security;
revoke all on public.preventive_controls from anon;
grant select,insert,update on public.preventive_controls to authenticated;
drop policy if exists preventive_controls_assigned_access on public.preventive_controls;
create policy preventive_controls_assigned_access on public.preventive_controls for all to authenticated using (
 public.is_gravi_admin() or exists(select 1 from public.work_user_assignments a where a.work_id=preventive_controls.work_id and a.user_id=auth.uid() and a.active)
) with check (
 public.is_gravi_admin() or exists(select 1 from public.work_user_assignments a where a.work_id=preventive_controls.work_id and a.user_id=auth.uid() and a.active)
);
