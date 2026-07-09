# Guia de invitacion de usuarios

## Variable de entorno

Configura la URL publica de GRAVI SST v2 en Vercel:

```text
GRAVI_APP_URL=https://URL-CORRECTA-DE-GRAVI-SST-V2.vercel.app
```

La API de invitacion construye el enlace de retorno con:

```text
${GRAVI_APP_URL}/set-password
```

En entorno local, si `GRAVI_APP_URL` no existe, la API usa el origen de la solicitud o `http://localhost:3000/set-password` como fallback.

## Vercel

1. En Project Settings > Environment Variables, agrega `GRAVI_APP_URL` con la URL publica de GRAVI SST v2.
2. Mantén `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` configuradas.
3. `SUPABASE_SERVICE_ROLE_KEY` debe existir solo en Vercel/API. Nunca debe exponerse en frontend.
4. El despliegue debe conservar el rewrite `/set-password -> /index.html` para que el link del correo abra la SPA.

## Supabase

En Authentication > URL Configuration:

```text
Site URL = https://URL-CORRECTA-DE-GRAVI-SST-V2.vercel.app
Redirect URLs = https://URL-CORRECTA-DE-GRAVI-SST-V2.vercel.app/set-password
```

Para pruebas locales, agrega tambien el redirect local que corresponda:

```text
http://localhost:3000/set-password
```

Si Supabase rechaza el redirect, la app mostrara:

```text
La URL de redirección no está permitida en Supabase. Verifica Authentication > URL Configuration.
```

## Flujo de prueba

1. Inicia sesion como Administrador o usuario con permiso `users.invite`.
2. Abre Usuarios y permisos.
3. Invita un usuario nuevo con rol y permisos personalizados si aplica.
4. Confirma el mensaje: "Invitación enviada. El usuario recibirá un enlace para crear su contraseña."
5. Abre el correo de invitacion.
6. Verifica que el enlace abra GRAVI SST v2 en `/set-password`, no la version anterior.
7. Captura una contrasena de minimo 8 caracteres y confirma la misma contrasena.
8. Guarda la contrasena.
9. Verifica que la app inicia sesion y carga el perfil del usuario.
10. Revisa que el rol, `permissions_mode` y `custom_permissions` se mantienen en `perfiles_usuario`.
11. Confirma que la URL ya no conserva tokens visibles despues de guardar la contrasena.
