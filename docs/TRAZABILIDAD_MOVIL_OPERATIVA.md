# Trazabilidad, lectura operativa y experiencia movil

## Cambios realizados

- Se agrego una bitacora automatica interna en el estado sincronizado de la aplicacion (`data.auditLog`).
- Se registran eventos de acceso, salida, creacion/edicion operativa, asistencia, inspecciones/reportes, PDF, fotografias y cambios de rol/estado de usuario.
- Se agrego la vista `Bitacora` al menu contextual y general, con filtros por busqueda, modulo y fecha.
- Se integro un buscador operativo en la barra superior para localizar obras, contratistas, trabajadores, inspecciones, reportes e historicos.
- Se agregaron semaforos visuales para estados activos/inactivos, sincronizacion, evidencia y actividad.
- Se mejoro la experiencia movil con botones mas grandes, mejor separacion, formularios a una columna, acciones con mayor area tactil y barra superior mas flexible.

## Archivos modificados

- `index.html`
- `system.js`
- `app.js`
- `bootstrap.js`
- `phase5-2.css`
- `service-worker.js`

## Bitacora

Cada evento guarda:

- Fecha y hora.
- Usuario.
- Rol.
- Accion.
- Modulo.
- Registro relacionado cuando existe.
- Desarrollo y obra cuando aplica.
- Contexto basico del dispositivo: conexion, dimensiones, plataforma y user agent.

La bitacora respeta el esquema de roles existente:

- Administrador: puede ver toda la actividad.
- Supervisor SST: ve su actividad y la actividad de la obra activa cuando existe contexto.
- Consulta: ve solo su propia actividad permitida.

## Semaforos visuales

Se aplicaron indicadores:

- Verde: estado activo, correcto o sincronizado.
- Amarillo: evidencia o informacion pendiente de sincronizar.
- Naranja: obra cerrada, atencion o modulo estructural.
- Rojo: cambios sensibles como usuarios/roles o errores de sincronizacion.
- Gris: sin informacion, inactivo o estado neutro.

## Buscador operativo

El buscador localiza:

- Obras.
- Contratistas.
- Trabajadores.
- Registros de inspeccion.
- Reportes.
- Documentos historicos.

En resultados relacionados con otra obra, la aplicacion conserva el flujo actual y entra al contexto de la obra correspondiente.

## SQL adicional

No se requiere SQL adicional en esta fase.

La bitacora se almacena dentro del estado sincronizado existente de la aplicacion para no modificar la arquitectura base de Supabase, Auth, roles ni sincronizacion offline.

## Pruebas recomendadas

1. Iniciar sesion y confirmar que aparece un registro en Bitacora.
2. Cerrar sesion y confirmar que el evento queda registrado antes de limpiar la sesion.
3. Crear o editar un trabajador y validar que aparece en Bitacora.
4. Registrar asistencia y validar el evento.
5. Guardar una inspeccion con fotografias y validar eventos de evidencia e inspeccion.
6. Imprimir o guardar PDF y validar el evento de PDF.
7. Probar el buscador en escritorio y telefono.
8. Confirmar que Consulta no pueda realizar acciones restringidas y solo visualice informacion permitida.

## Elementos pendientes recomendados

- Migrar la bitacora a una tabla dedicada cuando se quiera auditoria legal con retencion y consultas avanzadas.
- Agregar exportacion CSV/PDF de bitacora para auditorias.
- Incorporar filtros por obra/desarrollo y rango de fechas cuando aumente el volumen de registros.
- Agregar trazabilidad mas granular de sincronizacion offline por fotografia individual.
