begin;

create table if not exists public.desarrollos (
  id text primary key,
  name text not null,
  location text not null default '',
  client text not null default '',
  observations text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.obras (
  id text primary key,
  development_id text,
  development_name text not null default '',
  name text not null,
  status text not null default 'Activa',
  location text not null default '',
  client text not null default '',
  start_date date,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.contratistas (
  id text primary key,
  work_id text not null,
  name text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trabajadores (
  id text primary key,
  work_id text not null,
  contractor_id text,
  name text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visitantes (
  id text primary key,
  work_id text not null,
  visit_date date,
  name text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asistencia (
  work_id text not null,
  attendance_date date not null,
  marks jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (work_id, attendance_date)
);

create table if not exists public.investigaciones (
  id text primary key,
  work_id text not null,
  folio text,
  event_date date,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.historial (
  id text primary key,
  work_id text not null,
  document_type text,
  document_date date,
  folio text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reportes diarios e inspecciones que antes vivían en gvc-extintores-records-v1.
create table if not exists public.registros (
  id text primary key,
  work_id text not null,
  record_type text not null,
  record_date date,
  status text,
  folio text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Estado extensible: cumplimiento, auditoría, programación y actividad.
create table if not exists public.estado_aplicacion (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.cumplimiento_estado (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.perfiles_usuario (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  role text not null default 'Consulta' check (role in ('Administrador','Supervisor SST','Consulta')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists obras_development_name_idx on public.obras (development_name);
create index if not exists obras_status_idx on public.obras (status);
create index if not exists contratistas_work_id_idx on public.contratistas (work_id);
create index if not exists trabajadores_work_id_idx on public.trabajadores (work_id);
create index if not exists trabajadores_contractor_id_idx on public.trabajadores (contractor_id);
create index if not exists visitantes_work_date_idx on public.visitantes (work_id, visit_date);
create index if not exists investigaciones_work_date_idx on public.investigaciones (work_id, event_date);
create index if not exists historial_work_date_idx on public.historial (work_id, document_date);
create index if not exists registros_work_date_idx on public.registros (work_id, record_date);

alter table public.desarrollos enable row level security;
alter table public.obras enable row level security;
alter table public.contratistas enable row level security;
alter table public.trabajadores enable row level security;
alter table public.visitantes enable row level security;
alter table public.asistencia enable row level security;
alter table public.investigaciones enable row level security;
alter table public.historial enable row level security;
alter table public.registros enable row level security;
alter table public.estado_aplicacion enable row level security;
alter table public.cumplimiento_estado enable row level security;
alter table public.perfiles_usuario enable row level security;

revoke all on public.desarrollos,public.obras,public.contratistas,public.trabajadores,public.visitantes,public.asistencia,public.investigaciones,public.historial,public.registros,public.estado_aplicacion,public.cumplimiento_estado,public.perfiles_usuario from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.desarrollos,public.obras,public.contratistas,public.trabajadores,public.visitantes,public.asistencia,public.investigaciones,public.historial,public.registros,public.estado_aplicacion,public.cumplimiento_estado,public.perfiles_usuario to authenticated;

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path=public
as $$ select role from public.perfiles_usuario where user_id=auth.uid() and active=true limit 1 $$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.perfiles_usuario where user_id=auth.uid() and active=true) $$;

create or replace function public.is_gravi_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.current_user_role()='Administrador',false) $$;

create or replace function public.can_gravi_operate()
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.current_user_role() in ('Administrador','Supervisor SST'),false) $$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_gravi_admin() to authenticated;
grant execute on function public.can_gravi_operate() to authenticated;

create or replace function public.handle_new_gravi_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.perfiles_usuario(user_id,email,full_name,role,active)
  values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''),'Consulta',true)
  on conflict(user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created_gravi on auth.users;
create trigger on_auth_user_created_gravi after insert on auth.users
for each row execute function public.handle_new_gravi_user();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'desarrollos','obras','contratistas','trabajadores','visitantes','asistencia',
    'investigaciones','historial','registros','estado_aplicacion','cumplimiento_estado'
  ] loop
    execute format('drop policy if exists gravi_anon_access on public.%I', table_name);
    execute format('drop policy if exists gravi_read on public.%I', table_name);
    execute format('drop policy if exists gravi_insert on public.%I', table_name);
    execute format('drop policy if exists gravi_update on public.%I', table_name);
    execute format('drop policy if exists gravi_delete on public.%I', table_name);
    execute format('create policy gravi_read on public.%I for select to authenticated using (public.is_active_user())', table_name);
    execute format('create policy gravi_delete on public.%I for delete to authenticated using (public.is_gravi_admin())', table_name);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['desarrollos','obras','contratistas','cumplimiento_estado'] loop
    execute format('create policy gravi_insert on public.%I for insert to authenticated with check (public.is_gravi_admin())', table_name);
    execute format('create policy gravi_update on public.%I for update to authenticated using (public.is_gravi_admin()) with check (public.is_gravi_admin())', table_name);
  end loop;
  foreach table_name in array array['trabajadores','visitantes','asistencia','investigaciones','historial','registros','estado_aplicacion'] loop
    execute format('create policy gravi_insert on public.%I for insert to authenticated with check (public.can_gravi_operate())', table_name);
    execute format('create policy gravi_update on public.%I for update to authenticated using (public.can_gravi_operate()) with check (public.can_gravi_operate())', table_name);
  end loop;
end $$;

drop policy if exists profiles_select on public.perfiles_usuario;
drop policy if exists profiles_update on public.perfiles_usuario;
drop policy if exists profiles_delete on public.perfiles_usuario;
create policy profiles_select on public.perfiles_usuario for select to authenticated using (user_id=auth.uid() or public.is_gravi_admin());
create policy profiles_update on public.perfiles_usuario for update to authenticated using (public.is_gravi_admin()) with check (public.is_gravi_admin());
create policy profiles_delete on public.perfiles_usuario for delete to authenticated using (public.is_gravi_admin());

commit;
