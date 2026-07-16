-- GRAVI SST V43: hotfix temporal para evitar sobrescribir a ciegas el JSON global.
-- Mantiene el modelo actual de una fila hasta la futura normalización de requisitos.
begin;

create or replace function public.gravi_save_compliance_entry_v43(
  p_work_id text,
  p_nom_code text,
  p_entry jsonb,
  p_criterion jsonb default null,
  p_audit jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_payload jsonb;
  v_patch jsonb;
  v_entry jsonb;
  v_summary jsonb;
  v_criteria jsonb;
  v_found boolean := false;
  v_audit jsonb;
begin
  if not public.has_gravi_permission('compliance.edit') then
    raise exception 'Permiso insuficiente: compliance.edit' using errcode = '42501';
  end if;
  if nullif(p_work_id, '') is null or nullif(p_nom_code, '') is null or jsonb_typeof(p_entry) <> 'object' then
    raise exception 'Parámetros de cumplimiento inválidos' using errcode = '22023';
  end if;

  -- El objeto compliance vacío satisface la política INSERT V38 sin alterar datos funcionales.
  insert into public.cumplimiento_estado(id, payload, updated_at)
  values ('global', jsonb_build_object('compliance', '{}'::jsonb), pg_catalog.now())
  on conflict (id) do nothing;

  select payload into v_payload
  from public.cumplimiento_estado
  where id = 'global'
  for update;

  v_payload := coalesce(v_payload, '{}'::jsonb);
  v_entry := coalesce(v_payload #> array['compliance', p_work_id, p_nom_code], '{}'::jsonb);
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
    into v_summary
  from jsonb_each(p_entry)
  where key = any(array[
    'status','percentage','operationalAligned','operationalCounts','updatedAt','title',
    'officialCode','criteriaTotal','criteriaCompliant','criteriaNotApplicable',
    'responsible','reviewDate','observations'
  ]);
  v_entry := v_entry || v_summary;

  if p_criterion is not null then
    if jsonb_typeof(p_criterion) <> 'object' or nullif(p_criterion->>'id', '') is null then
      raise exception 'El criterio requiere un id válido' using errcode = '22023';
    end if;
    v_criteria := case when jsonb_typeof(v_entry->'criteria') = 'array' then v_entry->'criteria' else '[]'::jsonb end;
    select coalesce(jsonb_agg(case when criterion->>'id' = p_criterion->>'id' then p_criterion else criterion end), '[]'::jsonb),
           coalesce(bool_or(criterion->>'id' = p_criterion->>'id'), false)
      into v_criteria, v_found
    from jsonb_array_elements(v_criteria) as criterion;
    if not v_found then v_criteria := v_criteria || jsonb_build_array(p_criterion); end if;
    v_entry := jsonb_set(v_entry, '{criteria}', v_criteria, true);
  end if;

  v_payload := jsonb_set(v_payload, '{compliance}', coalesce(v_payload->'compliance', '{}'::jsonb), true);
  v_payload := jsonb_set(v_payload, array['compliance', p_work_id], coalesce(v_payload #> array['compliance', p_work_id], '{}'::jsonb), true);
  v_payload := jsonb_set(v_payload, array['compliance', p_work_id, p_nom_code], v_entry, true);

  if p_audit is not null then
    if jsonb_typeof(p_audit) <> 'object' or nullif(p_audit->>'id', '') is null then
      raise exception 'El evento de auditoría requiere un id válido' using errcode = '22023';
    end if;
    v_audit := case when jsonb_typeof(v_payload->'complianceAudit') = 'array' then v_payload->'complianceAudit' else '[]'::jsonb end;
    select coalesce(jsonb_agg(event order by coalesce(event->>'at', event->>'createdAt', '') desc), '[]'::jsonb)
      into v_audit
    from (
      select event
      from (
        select distinct on (event->>'id') event, ordinal
        from jsonb_array_elements(jsonb_build_array(p_audit) || v_audit) with ordinality as source(event, ordinal)
        order by event->>'id', ordinal
      ) deduplicated
      order by coalesce(event->>'at', event->>'createdAt', '') desc
      limit 500
    ) newest;
    v_payload := jsonb_set(v_payload, '{complianceAudit}', v_audit, true);
  end if;

  -- El guard V38 debe evaluar únicamente el dominio autorizado por compliance.edit.
  -- El trigger fusionará este parche con old.payload y conservará los demás dominios.
  v_patch := jsonb_build_object(
    'compliance',
    coalesce(v_payload->'compliance', '{}'::jsonb)
  );
  if p_audit is not null then
    v_patch := v_patch || jsonb_build_object(
      'complianceAudit',
      coalesce(v_payload->'complianceAudit', '[]'::jsonb)
    );
  end if;

  update public.cumplimiento_estado
  set payload = v_patch, updated_at = pg_catalog.now()
  where id = 'global';

  return v_payload;
end;
$$;

comment on function public.gravi_save_compliance_entry_v43(text,text,jsonb,jsonb,jsonb)
is 'Hotfix temporal V43: fusiona atómicamente una NOM/criterio dentro del JSON global sin reemplazar la matriz completa.';

revoke all on function public.gravi_save_compliance_entry_v43(text,text,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.gravi_save_compliance_entry_v43(text,text,jsonb,jsonb,jsonb) to authenticated;

commit;
