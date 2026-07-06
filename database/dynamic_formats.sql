-- Esquema para Sistema de Formatos Dinámicos en Excel
-- Tabla de categorías de formatos
create table if not exists public.format_categories (
  id text primary key,
  name text not null unique,
  description text,
  icon text,
  is_active boolean not null default true,
  sort_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla principal de formatos
create table if not exists public.dynamic_formats (
  id text primary key,
  work_id text,
  name text not null,
  description text,
  category_id text references public.format_categories(id),
  format_code text,
  format_type text,
  version text,
  status text not null default 'Activo', -- Activo, Inactivo, Borrador
  vigency_start date,
  vigency_end date,
  created_by text,
  updated_by text,
  original_filename text,
  excel_structure jsonb not null default '{}'::jsonb, -- Estructura parseada del Excel
  validation_rules jsonb not null default '{}'::jsonb, -- Reglas de validación
  metadata jsonb not null default '{}'::jsonb, -- Obra, responsable, etc
  validation_errors jsonb not null default '[]'::jsonb, -- Errores encontrados
  validation_warnings jsonb not null default '[]'::jsonb, -- Advertencias
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Tabla de campos del formato
create table if not exists public.format_fields (
  id text primary key,
  format_id text not null references public.dynamic_formats(id) on delete cascade,
  field_order integer not null,
  field_name text not null,
  field_type text not null, -- Texto corto, Texto largo, Fecha, Hora, Número, Lista desplegable, etc
  field_label text,
  placeholder text,
  required boolean not null default false,
  validation_pattern text, -- Regex o regla de validación
  options jsonb, -- Para listas desplegables: [{label, value}, ...]
  sheet_reference text, -- Referencia al Excel: Sheet1!A1:A10
  cell_row integer,
  cell_col integer,
  max_length integer,
  min_value numeric,
  max_value numeric,
  help_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla de registros generados desde formatos
create table if not exists public.format_records (
  id text primary key,
  format_id text not null references public.dynamic_formats(id),
  work_id text not null,
  record_date date not null default current_date,
  status text not null default 'Completo', -- Completo, Borrador, Enviado
  captured_data jsonb not null default '{}'::jsonb, -- Datos capturados
  evidence_ids jsonb not null default '[]'::jsonb, -- IDs de evidencias fotográficas
  created_by text,
  updated_by text,
  signed_by text,
  signature_timestamp timestamptz,
  exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Tabla de versiones de formatos
create table if not exists public.format_versions (
  id text primary key,
  format_id text not null references public.dynamic_formats(id) on delete cascade,
  version_number text not null,
  version_date date not null,
  changelog text,
  changed_by text,
  previous_format_id text, -- Referencia a versión anterior
  payload jsonb not null default '{}'::jsonb, -- Copia completa del formato
  created_at timestamptz not null default now()
);

-- Tabla de campos predefinidos (template)
create table if not exists public.format_field_templates (
  id text primary key,
  field_type text not null,
  field_name text not null,
  field_label text,
  default_placeholder text,
  validation_pattern text,
  help_text text,
  is_common boolean default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Insertar categorías iniciales
insert into public.format_categories (id, name, description, sort_order) values
  ('insp', 'Inspección', 'Inspecciones de seguridad y cumplimiento', 1),
  ('acc', 'Investigación de Accidentes', 'Investigación y análisis de accidentes', 2),
  ('permit', 'Permiso de Trabajo', 'Permisos de trabajo especiales', 3),
  ('check', 'Checklist', 'Listas de verificación', 4),
  ('bitac', 'Bitácora', 'Bitácoras y registros de actividades', 5),
  ('epp', 'Entrega de EPP', 'Control de equipos de protección personal', 6),
  ('train', 'Capacitación', 'Registros de capacitación', 7),
  ('attend', 'Asistencia', 'Control de asistencia', 8),
  ('daily', 'Reporte Diario', 'Reportes diarios de operaciones', 9),
  ('photo', 'Reporte Fotográfico', 'Reportes con evidencia fotográfica', 10),
  ('doc', 'Control Documental', 'Control de documentos', 11),
  ('other', 'Otro', 'Otras categorías', 12)
on conflict do nothing;

-- Insertar campos predefinidos comunes
insert into public.format_field_templates (id, field_type, field_name, field_label, default_placeholder, help_text, is_common) values
  ('tpl_fecha', 'Fecha', 'fecha', 'Fecha', 'dd/mm/yyyy', 'Fecha del registro', true),
  ('tpl_obra', 'Selección de obra', 'obra', 'Obra', 'Seleccione una obra', 'Obra donde se realiza la actividad', true),
  ('tpl_contratista', 'Selección de contratista', 'contratista', 'Contratista', 'Seleccione contratista', 'Contratista responsable', true),
  ('tpl_trabajador', 'Selección de trabajador', 'trabajador', 'Trabajador', 'Seleccione trabajador', 'Trabajador principal', true),
  ('tpl_responsable', 'Responsable', 'responsable', 'Responsable', 'Nombre completo', 'Persona responsable del registro', true),
  ('tpl_observaciones', 'Texto largo', 'observaciones', 'Observaciones', 'Ingrese observaciones...', 'Observaciones o comentarios adicionales', true),
  ('tpl_firma', 'Firma', 'firma', 'Firma', '', 'Firma digital del responsable', true),
  ('tpl_evidencia', 'Evidencia fotográfica', 'evidencia', 'Evidencia Fotográfica', '', 'Adjunte fotografías de apoyo', true)
on conflict do nothing;

-- Índices para mejor rendimiento
create index if not exists idx_dynamic_formats_work_id on public.dynamic_formats(work_id);
create index if not exists idx_dynamic_formats_category_id on public.dynamic_formats(category_id);
create index if not exists idx_dynamic_formats_status on public.dynamic_formats(status);
create index if not exists idx_format_fields_format_id on public.format_fields(format_id);
create index if not exists idx_format_records_format_id on public.format_records(format_id);
create index if not exists idx_format_records_work_id on public.format_records(work_id);
create index if not exists idx_format_records_created_by on public.format_records(created_by);
create index if not exists idx_format_versions_format_id on public.format_versions(format_id);

commit;
