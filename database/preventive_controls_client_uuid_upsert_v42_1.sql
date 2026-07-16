-- Permite el upsert por client_uuid desde PostgREST.
-- Idempotente y de ejecución manual.

begin;

drop index if exists public.preventive_controls_client_uuid_uidx;

create unique index preventive_controls_client_uuid_uidx
on public.preventive_controls(client_uuid);

commit;