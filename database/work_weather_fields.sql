-- Optional weather/location fields for GRAVI SST works.
-- Idempotent: safe to run more than once. Not executed automatically by the app.

alter table public.obras
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;

comment on column public.obras.latitude is 'Optional latitude used for weather autocomplete in Registro Diario.';
comment on column public.obras.longitude is 'Optional longitude used for weather autocomplete in Registro Diario.';
