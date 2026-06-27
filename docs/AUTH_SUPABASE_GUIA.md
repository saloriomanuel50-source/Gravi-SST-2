# Acceso y roles con Supabase Auth

## Componentes implementados

- Inicio de sesión con correo y contraseña.
- Restauración y renovación de sesión.
- Bloqueo de la aplicación antes de autenticar.
- Perfil visible con nombre y rol.
- Cierre de sesión con limpieza de datos sensibles locales.
- Roles `Administrador`, `Supervisor SST` y `Consulta`.
- Restricciones visuales y bloqueo de eventos según rol.
- RLS como autoridad final de permisos.
- Panel de usuarios para Administradores.
- Invitaciones mediante una función Vercel que protege la clave `service_role`.

## SQL actualizado

Ejecutar el archivo completo:

```text
supabase/schema.sql
```

El SQL crea `perfiles_usuario`, el disparador para nuevos usuarios, funciones auxiliares de rol y políticas RLS. También elimina la política anónima de la fase anterior.

## Crear el primer Administrador

1. Ejecutar primero `supabase/schema.sql`.
2. Ir a `Supabase > Authentication > Users`.
3. Pulsar `Add user` y crear el usuario con correo y contraseña.
4. Marcar el correo como confirmado si es una cuenta administrativa controlada.
5. Ejecutar en SQL Editor, sustituyendo los valores:

```sql
insert into public.perfiles_usuario(user_id,email,full_name,role,active)
select id,email,'Administrador GRAVI','Administrador',true
from auth.users
where email='administrador@gravi.mx'
on conflict(user_id) do update
set full_name=excluded.full_name,
    role='Administrador',
    active=true,
    updated_at=now();
```

6. Iniciar sesión en GRAVI SST y confirmar que aparece el botón `Usuarios`.

## Invitar o agregar usuarios

Desde la aplicación:

1. Entrar como Administrador.
2. Pulsar `Usuarios`.
3. Capturar nombre, correo y rol.
4. Pulsar `Invitar usuario`.
5. El destinatario abre el correo de Supabase, establece su contraseña e inicia sesión.

Configurar en `Supabase > Authentication > URL Configuration`:

- `Site URL`: la URL productiva de Vercel.
- `Redirect URLs`: la URL productiva y las URLs de vista previa que se vayan a utilizar.

También se puede crear un usuario manualmente en `Authentication > Users`; el disparador le asignará inicialmente el rol `Consulta`. Un Administrador podrá cambiarlo desde la aplicación.

## Variables requeridas en Vercel

```text
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_ANON_KEY=TU_CLAVE_ANON_PUBLICA
SUPABASE_SERVICE_ROLE_KEY=TU_CLAVE_SERVICE_ROLE_PRIVADA
SITE_URL=https://tu-dominio.vercel.app
```

`SUPABASE_SERVICE_ROLE_KEY` nunca debe agregarse a HTML, JavaScript del cliente ni variables con prefijo público.

## Permisos

| Módulo / acción | Administrador | Supervisor SST | Consulta |
|---|---:|---:|---:|
| Visualizar información | Sí | Sí | Sí |
| Desarrollos, obras y contratistas | Crear/editar/eliminar | Solo visualizar | Solo visualizar |
| Trabajadores y visitantes | Crear/editar/eliminar | Crear/editar | Solo visualizar |
| Asistencia, reportes e inspecciones | Crear/editar/eliminar | Crear/editar | Solo visualizar |
| Accidentes e incidentes | Crear/editar/eliminar | Crear/editar | Solo visualizar |
| Cumplimiento normativo | Crear/editar/eliminar | Solo visualizar | Solo visualizar |
| Usuarios | Administrar | No | No |

Las eliminaciones en Supabase solo están autorizadas para Administrador. La aplicación conserva eliminación lógica de obras.

## Cómo probar los roles

1. Crear tres usuarios de prueba, uno por rol.
2. Abrir cada usuario en un perfil de navegador distinto.
3. Administrador: crear un desarrollo, editar una obra y abrir el panel de usuarios.
4. Supervisor SST: registrar asistencia, trabajador, visitante e inspección; comprobar que no aparecen altas de obra ni edición de cumplimiento.
5. Consulta: navegar por dashboards e históricos; comprobar que no aparecen botones de captura.
6. Intentar una escritura REST con el token de Consulta y confirmar respuesta `403` de RLS.
7. Cerrar sesión y comprobar que ya no se muestran datos y que las claves de caché fueron eliminadas.

## Caché y sesión

La caché de operación se lee solamente después de validar una sesión. Si hay una interrupción de red, puede usarse mientras el token y el perfil guardado continúen vigentes. Al cerrar sesión se eliminan sistema, registros, cola, obra activa y borradores del dispositivo.

## Validación realizada

- Se validó la sintaxis de los módulos de autenticación, sincronización, interfaz, API y service worker.
- Se probaron con datos simulados los permisos de Administrador, Supervisor SST y Consulta.
- Se verificó en navegador que, sin sesión, solo cargan la pantalla de acceso y los módulos de autenticación; el sistema principal permanece oculto y sin ejecutar.
- La prueba contra un proyecto Supabase real debe realizarse después de ejecutar el SQL y configurar las variables del despliegue.
