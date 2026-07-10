-- Clasificación/ruteo canónico. Idempotente y no destructivo. No ejecutar automáticamente.
alter table if exists public.registros
  add column if not exists canonical_type text,
  add column if not exists source_module text,
  add column if not exists destination_module text,
  add column if not exists source_entry_id text,
  add column if not exists canonical_id text,
  add column if not exists routed_at timestamptz,
  add column if not exists routed_by uuid,
  add column if not exists legacy_classification text,
  add column if not exists high_potential boolean not null default false,
  add column if not exists requires_follow_up boolean not null default false;

create index if not exists registros_canonical_type_idx on public.registros(work_id, canonical_type);
create index if not exists registros_destination_module_idx on public.registros(work_id, destination_module);

comment on column public.registros.canonical_type is 'Clasificación operativa central; no reemplaza record_type histórico.';
comment on column public.registros.legacy_classification is 'Valor histórico conservado para registros sin clasificación válida.';

-- Las políticas existentes de registros siguen aplicando; no se conceden permisos a anon.
