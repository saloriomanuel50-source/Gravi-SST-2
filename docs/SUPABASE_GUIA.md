# Conexión GRAVI SST con Supabase

## Resultado

La aplicación carga primero la información compartida desde Supabase y conserva una copia en `localStorage` para arranque y contingencia. Las altas y cambios se reflejan inmediatamente en pantalla y se sincronizan en segundo plano.

Se cubren:

- Desarrollos.
- Obras.
- Contratistas.
- Trabajadores.
- Visitantes.
- Asistencia.
- Investigaciones.
- Historial documental.
- Reportes diarios e inspecciones.
- Cumplimiento, auditoría y programación mediante estado extensible.

## Variables de entorno

Configurar en Vercel:

```text
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_ANON_KEY=TU_CLAVE_ANON_PUBLICA
SUPABASE_SERVICE_ROLE_KEY=TU_CLAVE_SERVICE_ROLE_PRIVADA
SITE_URL=https://tu-dominio.vercel.app
```

La clave `anon` es pública por diseño. `SUPABASE_SERVICE_ROLE_KEY` se utiliza exclusivamente dentro de la función segura `api/invite-user.js`; nunca se entrega al navegador.

La función `api/supabase-config.js` lee las variables en Vercel y entrega la configuración pública a `supabase.js`. Para otra plataforma puede definirse antes de cargar `supabase.js`:

```html
<script>
window.GRAVI_SUPABASE_CONFIG = {
  url: "https://TU-PROYECTO.supabase.co",
  anonKey: "TU_CLAVE_ANON_PUBLICA"
};
</script>
```

## SQL generado

Ejecutar completo en `Supabase > SQL Editor`:

```text
supabase/schema.sql
```

El script crea las tablas, índices, permisos y políticas RLS requeridas.

## Migración inicial

1. Ejecutar `supabase/schema.sql`.
2. Configurar las variables de entorno.
3. Publicar la aplicación.
4. Abrir desde el navegador que contiene los datos actuales.
5. Si Supabase está vacío, la aplicación subirá automáticamente la caché local existente.
6. Confirmar el mensaje `Datos locales migrados a Supabase`.

No borrar `localStorage` antes de verificar las tablas. El proceso es idempotente: los registros usan `upsert` por identificador.

## Comportamiento sin conexión

- Las operaciones se conservan en las claves de caché actuales.
- Los cambios pendientes se guardan en `gvc-supabase-pending-v1`.
- En el siguiente arranque con conexión se vacía primero la cola y luego se descargan los datos compartidos.
- `gvc-active-work-id`, el estado del menú y los borradores permanecen locales porque representan contexto temporal del dispositivo.

## Archivos agregados

- `supabase.js`
- `bootstrap.js`
- `api/supabase-config.js`
- `supabase/schema.sql`
- `.env.example`
- `vercel.json`
- `SUPABASE_GUIA.md`

## Archivos modificados

- `index.html`
- `app.js`
- `system.js`
- `phase5-2.css`
- `service-worker.js`

## Despliegue en Vercel

1. Subir la carpeta `app-inspecciones` a un repositorio de GitHub.
2. Importar el repositorio en Vercel.
3. Configurar `app-inspecciones` como `Root Directory` si el repositorio contiene otras carpetas.
4. No definir comando de compilación.
5. Agregar `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `SITE_URL` en `Settings > Environment Variables`.
6. Desplegar nuevamente después de guardar las variables.
7. Abrir `/api/supabase-config` y confirmar que responde `configured: true`.
8. Abrir la aplicación y comprobar el indicador `Sincronizado con Supabase`.

## Seguridad

La aplicación usa Supabase Auth y RLS. El rol `anon` no tiene acceso a las tablas. Las acciones se autorizan mediante `perfiles_usuario` y las funciones de rol del SQL. Consulta `AUTH_SUPABASE_GUIA.md` para crear el primer Administrador y probar permisos.

## Validación pendiente

Las variables no están configuradas en el entorno local recibido, por lo que no fue posible ejecutar operaciones reales contra un proyecto Supabase. Debe validarse la migración sobre una copia de los datos antes de usarla en obra.
