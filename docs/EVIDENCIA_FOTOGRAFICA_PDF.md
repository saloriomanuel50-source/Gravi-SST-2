# Evidencia Fotografica y PDF Corporativo

## Objetivo

Se fortalecio la captura de evidencia fotografica y la presentacion de los PDF generados automaticamente, sin modificar la arquitectura existente de Supabase, Vercel, Auth, roles ni sincronizacion offline.

## Cambios realizados

### Evidencia fotografica

- Las inspecciones y reportes aplicables mantienen captura de multiples fotografias.
- Los campos de imagen aceptan fotografias tomadas desde camara o seleccionadas desde galeria en telefono.
- Se agrego vista previa enriquecida por fotografia.
- Se permite eliminar cada fotografia antes de guardar.
- Se agrego comentario breve por fotografia.
- Se comprimen las imagenes antes de guardarlas.
- Se valida que el archivo sea imagen.
- Se limita el tamano original maximo por imagen a 12 MB.
- Se conserva compatibilidad con registros anteriores que guardaban evidencias como texto base64 simple.
- Las evidencias nuevas se guardan como objetos con:
  - `src`
  - `comment`
  - `syncStatus`
  - `storagePath`
  - metadatos basicos de creacion/sincronizacion

### Funcionamiento offline

- Si no hay internet o Supabase no esta disponible, las fotos quedan guardadas localmente junto con el registro.
- Si la sincronizacion falla, el registro permanece en cola de sincronizacion.
- Si Storage no esta configurado, las fotos quedan marcadas como pendientes y se conserva la informacion local.
- No se considera modo incognito como escenario soportado para persistencia offline.

### Supabase Storage

- Se agrego soporte opcional para subir evidencias al bucket `evidencias`.
- Si el bucket existe y las politicas lo permiten, la app sube las fotos comprimidas.
- Si Storage falla, no se pierde la imagen; se mantiene en el registro y queda pendiente de reintento.
- El bucket recomendado es privado, no publico.
- Se agrego SQL de configuracion en:
  - `supabase/storage_evidencias.sql`

### PDF

- Se agrego encabezado corporativo automatico con:
  - Logo oficial GRAVI.
  - Tipo de documento.
  - Desarrollo.
  - Obra.
  - Fecha.
  - Usuario responsable.
- Se mejoro la distribucion de fotografias:
  - Dos fotografias por fila cuando el espacio lo permite.
  - Comentario debajo de cada fotografia.
- Se agrego pie de pagina con:
  - Generado automaticamente por GRAVI SST.
  - Codigo y revision del documento.
  - Fecha y hora de generacion.
  - Indicador basico de pagina.
- Se mejoraron margenes, legibilidad y distribucion visual sin cambiar la informacion capturada.

## Roles

- Administrador y Supervisor SST pueden adjuntar fotografias porque usan permisos operativos existentes.
- Consulta solo visualiza registros y PDF; no puede adjuntar ni modificar evidencias.

## Archivos modificados

- `app.js`
- `styles.css`
- `corporate-documents.js`
- `corporate-documents.css`
- `supabase.js`
- `service-worker.js`

## Archivos agregados

- `supabase/storage_evidencias.sql`
- `EVIDENCIA_FOTOGRAFICA_PDF.md`

## SQL o configuracion requerida

No se requieren cambios en tablas existentes.

Para usar Supabase Storage se recomienda ejecutar:

```sql
supabase/storage_evidencias.sql
```

Ese script crea/configura el bucket privado `evidencias` y agrega politicas para:

- Lectura: usuarios autenticados activos.
- Alta/edicion: Administrador y Supervisor SST.
- Eliminacion: solo Administrador.

## Pruebas realizadas

- Validacion de sintaxis JavaScript:
  - `app.js`
  - `corporate-documents.js`
  - `supabase.js`
  - `service-worker.js`
- Prueba local desde servidor web en `127.0.0.1`.
- Se verifico que la aplicacion carga en pantalla segura de inicio de sesion.
- Se verifico que no aparecen errores de consola de la aplicacion en carga inicial.
- Prueba online real con Supabase Storage: pendiente de credenciales y bucket activo.
- Prueba offline real con datos de obra autenticados: pendiente de ambiente operativo con sesion/cache real.

## Recomendaciones

- Ejecutar `supabase/storage_evidencias.sql` antes de pruebas productivas con fotografias.
- Probar desde celular Android/iOS la seleccion desde camara y galeria.
- Verificar cuota de Storage y definir politica de retencion de evidencias antes de uso comercial.
- En una fase posterior, reemplazar imagenes base64 historicas por rutas firmadas de Storage para reducir peso del payload.
