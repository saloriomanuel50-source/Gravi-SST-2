# Mejoras Operativas: Contratistas y Trabajadores

## Objetivo

Se implementaron mejoras puntuales sobre la administracion de contratistas y trabajadores sin modificar la arquitectura existente de Supabase, Vercel, Auth, roles ni sincronizacion offline.

## Cambios realizados

### Contratistas

- Se agrego edicion de contratistas existentes.
- Se conservan los campos operativos: nombre, responsable, telefono, correo, especialidad o actividad y estado.
- Se mantiene baja logica mediante estado `Activo` / `Inactivo`.
- No se agrego eliminacion fisica.
- Los contratistas inactivos permanecen visibles en historicos y listados, pero no aparecen como opcion principal al registrar un trabajador nuevo.
- Se agrego conteo de trabajadores por contratista, separando total y activos.
- Se agregaron mensajes claros al guardar, actualizar, activar o inactivar.

### Trabajadores

- Se agrego edicion de trabajadores existentes.
- Se permite modificar nombre, contratista, puesto, telefono, NSS/identificacion y estado.
- Se permite cambiar trabajador de contratista.
- Se agrego estado `Baja` como baja logica sin eliminar historicos.
- Los trabajadores con estado distinto de `Activo` no cuentan como presentes en indicadores operativos.
- Se conservan campos ampliados ya existentes para gafete, asistencia e investigacion de accidentes.
- Se agregaron mensajes claros al guardar, actualizar, activar, inactivar o marcar baja.

### Organizacion visual

- El modulo de trabajadores ahora agrupa el personal por contratista.
- Cada grupo muestra total de trabajadores y trabajadores activos.
- Los grupos usan secciones expandibles/contraibles mediante `details`.
- La tabla se mantiene compatible con escritorio y movil.

### Roles

- `Administrador`: puede crear, editar, activar e inactivar contratistas y trabajadores.
- `Supervisor SST`: puede crear, editar y cambiar estado de trabajadores.
- `Consulta`: solo visualiza; no puede guardar cambios.
- No se modificaron las politicas RLS ni la arquitectura de roles.

### Validaciones

- Se evita guardar contratistas o trabajadores con nombre vacio.
- Se mantiene validacion de duplicados evidentes:
  - Contratista por nombre dentro de la obra.
  - Trabajador por NSS/identificacion o por nombre + contratista.
- La validacion fue ajustada para permitir editar el mismo registro sin detectarlo como duplicado de si mismo.

## Archivos modificados

- `system.js`
- `system.css`
- `service-worker.js`

## SQL adicional

No requiere SQL adicional.

Las tablas existentes `contratistas` y `trabajadores` ya guardan los datos completos en `payload`, y los campos clave `name`, `status` y `contractor_id` siguen sincronizandose con Supabase.

## Pruebas realizadas

- Validacion de sintaxis JavaScript:
  - `system.js`
  - `supabase.js`
  - `service-worker.js`
- Revision de compatibilidad con permisos existentes:
  - Acciones de contratistas permanecen como administracion.
  - Acciones de trabajadores permanecen como captura operativa.
- Revision de compatibilidad con almacenamiento:
  - Los cambios usan `save()`, por lo que mantienen localStorage, cola offline y sincronizacion Supabase existente.

## Pendientes recomendados

- Probar con usuarios reales de cada rol en Supabase.
- Validar en obra la nomenclatura final de estados: `Inactivo` vs `Baja`.
- En una fase posterior, agregar bitacora formal de cambios de contratistas/trabajadores si se requiere auditoria avanzada.
