-- GRAVI SST · Firmas manuscritas capturadas en dispositivo. Idempotente; no ejecutar en producción sin validación.
create extension if not exists pgcrypto;
do $$ begin create type public.document_signature_status as enum('valid','invalidated','superseded','pending_sync','deleted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.document_signer_type as enum('authenticated_user','external_person','worker','contractor_responsible','witness','instructor','attendee','inspector','area_responsible','other'); exception when duplicate_object then null; end $$;

create table if not exists public.document_signatures(
 id uuid primary key default gen_random_uuid(),client_uuid uuid not null unique,document_type text not null,document_id uuid not null,document_version text not null,signature_slot text not null,
 signer_type public.document_signer_type not null,signer_user_id uuid,signer_person_id uuid,signer_name text not null,signer_position text not null,signer_company text not null default '',signer_role_label text not null,
 signature_storage_path text,signature_preview_path text,strokes_data jsonb,acceptance_text text not null,acceptance_confirmed boolean not null default false,
 signed_at timestamptz not null,captured_by_user_id uuid not null default auth.uid(),captured_in_presence_of_user_id uuid,document_content_hash text not null,document_status_at_signing text not null,
 signature_status public.document_signature_status not null default 'pending_sync',invalidated_at timestamptz,invalidated_by uuid,invalidation_reason text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(acceptance_confirmed),check((signature_status<>'invalidated') or (invalidated_at is not null and invalidation_reason is not null))
);
create unique index if not exists document_signatures_valid_slot_uidx on public.document_signatures(document_type,document_id,document_version,signature_slot) where signature_status='valid';
create index if not exists document_signatures_document_idx on public.document_signatures(document_type,document_id,document_version);
create index if not exists document_signatures_signer_idx on public.document_signatures(signer_user_id,signed_at);

create table if not exists public.document_signature_events(
 id bigint generated always as identity primary key,signature_id uuid not null references public.document_signatures(id) on delete cascade,
 event_type text not null check(event_type in('signature_started','signature_accepted','signature_uploaded','signature_invalidated','signature_replaced','sync_failed','sync_completed')),
 details jsonb not null default '{}',actor_user_id uuid default auth.uid(),created_at timestamptz not null default now()
);
create index if not exists document_signature_events_signature_idx on public.document_signature_events(signature_id,created_at);
create or replace function public.touch_document_signature() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
drop trigger if exists document_signatures_touch on public.document_signatures;
create trigger document_signatures_touch before update on public.document_signatures for each row execute function public.touch_document_signature();

alter table public.document_signatures enable row level security;alter table public.document_signature_events enable row level security;
drop policy if exists document_signatures_select on public.document_signatures;
create policy document_signatures_select on public.document_signatures for select to authenticated using(public.has_gravi_permission('signatures.view'));
drop policy if exists document_signatures_insert on public.document_signatures;
create policy document_signatures_insert on public.document_signatures for insert to authenticated with check(captured_by_user_id=auth.uid() and public.has_gravi_permission('signatures.capture'));
drop policy if exists document_signatures_update on public.document_signatures;
create policy document_signatures_update on public.document_signatures for update to authenticated using(public.has_gravi_permission('signatures.invalidate')) with check(public.has_gravi_permission('signatures.invalidate'));
drop policy if exists document_signature_events_select on public.document_signature_events;
create policy document_signature_events_select on public.document_signature_events for select to authenticated using(public.has_gravi_permission('signatures.view'));
drop policy if exists document_signature_events_insert on public.document_signature_events;
create policy document_signature_events_insert on public.document_signature_events for insert to authenticated with check(actor_user_id=auth.uid());

insert into storage.buckets(id,name,public) values('document-signatures','document-signatures',false) on conflict(id) do update set public=false;
drop policy if exists document_signatures_storage_select on storage.objects;
create policy document_signatures_storage_select on storage.objects for select to authenticated using(bucket_id='document-signatures' and public.has_gravi_permission('signatures.view'));
drop policy if exists document_signatures_storage_insert on storage.objects;
create policy document_signatures_storage_insert on storage.objects for insert to authenticated with check(bucket_id='document-signatures' and public.has_gravi_permission('signatures.capture'));
drop policy if exists document_signatures_storage_delete on storage.objects;
create policy document_signatures_storage_delete on storage.objects for delete to authenticated using(bucket_id='document-signatures' and public.has_gravi_permission('signatures.invalidate'));

create or replace function public.invalidate_document_signatures(p_document_type text,p_document_id uuid,p_document_version text,p_reason text)
returns integer language plpgsql security invoker set search_path=public as $$ declare affected integer;begin
 if not public.has_gravi_permission('signatures.invalidate') then raise exception 'Permiso insuficiente: signatures.invalidate';end if;
 update public.document_signatures set signature_status='invalidated',invalidated_at=now(),invalidated_by=auth.uid(),invalidation_reason=p_reason
 where document_type=p_document_type and document_id=p_document_id and document_version=p_document_version and signature_status='valid';get diagnostics affected=row_count;
 insert into public.document_signature_events(signature_id,event_type,details,actor_user_id) select id,'signature_invalidated',jsonb_build_object('reason',p_reason),auth.uid() from public.document_signatures where document_type=p_document_type and document_id=p_document_id and document_version=p_document_version and invalidated_at>=statement_timestamp();return affected;end $$;
grant execute on function public.invalidate_document_signatures(text,uuid,text,text) to authenticated;
comment on table public.document_signatures is 'Firma manuscrita exclusiva de un documento, versión, slot y firmante; no es firma electrónica avanzada.';
