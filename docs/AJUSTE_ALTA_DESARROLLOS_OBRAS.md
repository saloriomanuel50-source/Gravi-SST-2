# Ajuste de alta de desarrollos y obras

## Cambios realizados

- Se agregó un catálogo persistente de desarrollos compatible con las obras existentes.
- Los nombres de desarrollo ya presentes en las obras se incorporan automáticamente al catálogo sin modificar sus datos.
- Un desarrollo nuevo puede existir y mostrarse aunque todavía no tenga obras.
- Se agregó el botón `+ Nuevo desarrollo` en Inicio y Desarrollos.
- Se agregó `+ Nueva obra` en Inicio, en cada pantalla de desarrollo y en la administración general de obras.
- El formulario de obra permite seleccionar un desarrollo existente o escribir el nombre de uno nuevo.
- Se agregó la vista `Obras ocultas, eliminadas y heredadas`.
- Las obras eliminadas lógicamente pueden recuperarse sin perder registros relacionados.
- La obra legacy se identifica por separado y nunca sustituye a obras reales en Inicio.
- Los registros que vuelvan a quedar asociados a `legacy` pueden reasignarse manualmente aunque ya haya existido una migración anterior.
- No se eliminan obras, documentos ni registros almacenados.

## Archivos modificados

- `index.html`
- `system.js`
- `phase5-2.css`
- `AJUSTE_ALTA_DESARROLLOS_OBRAS.md`

## Cómo agregar un desarrollo

1. Entrar a `Inicio` o `Desarrollos`.
2. Pulsar `+ Nuevo desarrollo`.
3. Capturar nombre, ubicación general, cliente y observaciones.
4. Pulsar `Guardar desarrollo`.
5. El desarrollo aparecerá inmediatamente, incluso con cero obras.

## Cómo agregar una obra

1. Pulsar `+ Nueva obra` desde Inicio, desde un desarrollo o desde Administración de obras.
2. En `Desarrollo existente o nuevo`, seleccionar una sugerencia o escribir un nombre nuevo.
3. Completar los datos generales y oficiales de la obra.
4. Guardar la obra.

Cuando el alta inicia dentro de un desarrollo, el nombre queda precargado en el formulario.

## Cómo recuperar obras ocultas

1. Pulsar `Obras ocultas` desde Inicio, un desarrollo o Administración.
2. Revisar las tarjetas de diagnóstico.
3. En una obra eliminada, pulsar `Recuperar obra`.
4. La obra vuelve con estatus `Inactiva`, conservando sus documentos e históricos.

Las obras cerradas o inactivas no se consideran ocultas y continúan visibles en la lista general.

## Cómo reasignar registros heredados

1. Abrir `Obras ocultas`.
2. Localizar la tarjeta `Obra heredada`.
3. Si existen registros pendientes, pulsar `Reasignar registros`.
4. Seleccionar una obra real en el aviso superior.
5. Pulsar `Asignar registros` y confirmar la operación.

La reasignación conserva documentos e historiales, no sobrescribe marcas de asistencia existentes y registra una actividad de auditoría.

## Revisión de la obra faltante

- No existe una rutina que migre obras reales hacia `Obra general`; la migración solo reasigna registros cuyo `workId` es `legacy`.
- Las obras cerradas e inactivas permanecen visibles.
- Las obras con `deletedAt` aparecen en la nueva vista de recuperación.
- Las obras asociadas a otro desarrollo aparecen en la vista general `Obras` y pueden corregirse con `Editar` desde Administración.
- La aplicación almacena los datos localmente en cada navegador. La vista de diagnóstico muestra lo disponible en el dispositivo donde se abre.

## Validación realizada

- `system.js` y `app.js` superaron la validación de sintaxis.
- El documento HTML no contiene identificadores duplicados.
- Se verificó la presencia estructural de los botones, formularios, catálogo, vista de recuperación y enlaces de navegación.
- La prueba interactiva automatizada no pudo completarse en esta sesión porque el navegador integrado no estableció conexión con el servidor local. Debe hacerse una prueba operativa en el dispositivo que contiene la obra faltante para revisar sus datos locales reales.
