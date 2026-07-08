-- GRAVI SST - permisos personalizados persistentes por usuario.
-- Script idempotente: no borra datos existentes.

alter table public.perfiles_usuario
  add column if not exists permissions_mode text,
  add column if not exists custom_permissions jsonb;

alter table public.perfiles_usuario
  alter column permissions_mode set default 'role-default',
  alter column custom_permissions set default '{}'::jsonb;

update public.perfiles_usuario
set
  permissions_mode = coalesce(permissions_mode, 'role-default'),
  custom_permissions = coalesce(custom_permissions, '{}'::jsonb)
where permissions_mode is null
   or custom_permissions is null;

alter table public.perfiles_usuario
  alter column permissions_mode set not null,
  alter column custom_permissions set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'perfiles_usuario_permissions_mode_check'
      and conrelid = 'public.perfiles_usuario'::regclass
  ) then
    alter table public.perfiles_usuario
      add constraint perfiles_usuario_permissions_mode_check
      check (permissions_mode in ('role-default', 'custom'));
  end if;
end $$;
