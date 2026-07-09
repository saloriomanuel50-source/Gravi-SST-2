begin;

create table if not exists public.registro_diario (
  id text primary key,
  work_id text not null,
  log_date date not null,
  status text not null default 'Borrador' check (status in ('Borrador','Cerrado')),
  supervisor text not null default '',
  weather text not null default '',
  temperature text not null default '',
  wind text not null default '',
  sky text not null default '',
  heat_level text not null default '',
  metrics jsonb not null default '{}'::jsonb,
  observations text not null default '',
  evidence jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  signature text not null default '',
  payload jsonb not null default '{}'::jsonb,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_id, log_date)
);

create index if not exists registro_diario_work_date_idx on public.registro_diario (work_id, log_date desc);
create index if not exists registro_diario_status_idx on public.registro_diario (status);

alter table public.registro_diario enable row level security;

revoke all on public.registro_diario from anon;
grant select, insert, update, delete on public.registro_diario to authenticated;

drop policy if exists registro_diario_read on public.registro_diario;
drop policy if exists registro_diario_insert on public.registro_diario;
drop policy if exists registro_diario_update on public.registro_diario;
drop policy if exists registro_diario_delete on public.registro_diario;

create policy registro_diario_read on public.registro_diario
  for select to authenticated
  using (public.is_active_user());

create policy registro_diario_insert on public.registro_diario
  for insert to authenticated
  with check (public.can_gravi_operate());

create policy registro_diario_update on public.registro_diario
  for update to authenticated
  using (public.can_gravi_operate())
  with check (public.can_gravi_operate());

create policy registro_diario_delete on public.registro_diario
  for delete to authenticated
  using (public.is_gravi_admin());

commit;
