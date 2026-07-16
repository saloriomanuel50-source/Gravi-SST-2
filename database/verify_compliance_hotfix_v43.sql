-- Verificador V43 de solo lectura. Devuelve una fila PASS/FAIL por control.
with fn as (
  select p.oid, p.prosecdef, pg_get_functiondef(p.oid) as definition,
         coalesce(array_to_string(p.proconfig, ','), '') as settings
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='gravi_save_compliance_entry_v43'
), checks(test, passed, detail) as (
  values
    ('01 cumplimiento_estado existe', to_regclass('public.cumplimiento_estado') is not null, 'tabla public.cumplimiento_estado'),
    ('02 RPC existe', to_regprocedure('public.gravi_save_compliance_entry_v43(text,text,jsonb,jsonb,jsonb)') is not null, 'firma V43'),
    ('03 SECURITY INVOKER', coalesce((select not prosecdef from fn),false), 'prosecdef=false'),
    ('04 search_path seguro', coalesce((select settings like '%search_path=pg_catalog, public%' or settings like '%search_path=pg_catalog,public%' from fn),false), 'pg_catalog, public'),
    ('05 authenticated EXECUTE', coalesce(has_function_privilege('authenticated',to_regprocedure('public.gravi_save_compliance_entry_v43(text,text,jsonb,jsonb,jsonb)'),'EXECUTE'),false), 'authenticated'),
    ('06 anon sin EXECUTE', not coalesce(has_function_privilege('anon',to_regprocedure('public.gravi_save_compliance_entry_v43(text,text,jsonb,jsonb,jsonb)'),'EXECUTE'),true), 'anon'),
    ('07 RLS activado', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.cumplimiento_estado')),false), 'relrowsecurity=true'),
    ('08 política SELECT', exists(select 1 from pg_policies where schemaname='public' and tablename='cumplimiento_estado' and cmd='SELECT'), 'pg_policies'),
    ('09 política INSERT', exists(select 1 from pg_policies where schemaname='public' and tablename='cumplimiento_estado' and cmd='INSERT'), 'pg_policies'),
    ('10 política UPDATE', exists(select 1 from pg_policies where schemaname='public' and tablename='cumplimiento_estado' and cmd='UPDATE'), 'pg_policies'),
    ('11 exige compliance.edit', coalesce((select definition like '%has_gravi_permission(''compliance.edit'')%' from fn),false), 'permiso explícito'),
    ('12 utiliza FOR UPDATE', coalesce((select upper(definition) like '%FOR UPDATE%' from fn),false), 'bloqueo de fila'),
    ('13 guard V38 conservado', exists(select 1 from pg_trigger where tgname='gravi_v38_compliance_guard' and not tgisinternal and tgrelid=to_regclass('public.cumplimiento_estado')), 'trigger V38'),
    ('14 Supervisor conserva compliance.edit', public.role_has_default_permission('Supervisor SST','compliance.edit'), 'contrato V38'),
    ('15 sin service_role ni RLS off', coalesce((select definition not ilike '%service_role%' and definition not ilike '%disable row level security%' from fn),false), 'seguridad'),
    ('16 no escribe payload completo', coalesce((select definition not ilike '%set payload = v_payload%' from fn),false), 'UPDATE no usa v_payload'),
    ('17 crea parche compliance', coalesce((select definition ilike '%v_patch := jsonb_build_object(%' and definition ilike '%''compliance''%' from fn),false), 'v_patch con compliance'),
    ('18 parche sin complianceMatrix', coalesce((select definition not ilike '%complianceMatrix%' from fn),false), 'v_patch no expone matriz'),
    ('19 guard V38 activo', exists(select 1 from pg_trigger where tgname='gravi_v38_compliance_guard' and not tgisinternal and tgenabled <> 'D' and tgrelid=to_regclass('public.cumplimiento_estado')), 'trigger habilitado'),
    ('20 contrato Supervisor limitado', public.role_has_default_permission('Supervisor SST','compliance.edit') and not public.role_has_default_permission('Supervisor SST','compliance.nom_matrix'), 'edit=true, nom_matrix=false')
)
select test, case when passed then 'PASS' else 'FAIL' end as result, detail
from checks
order by test;
