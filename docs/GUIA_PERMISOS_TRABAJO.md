# Guía de Permisos de Trabajo

Abra una obra y seleccione **Permisos / ATS**. Use **Nuevo permiso**, complete las nueve secciones y guarde el borrador. Los tipos de trabajo activan controles específicos sin eliminar respuestas al ocultarlos. La matriz calcula el riesgo al cambiar frecuencia o severidad.

Para enviar, complete datos generales, tipo, riesgos, EPP, medidas, vigencia y participantes. Un Supervisor SST o usuario con `permits.authorize` puede autorizar conectado. Desde Activo se puede suspender, cancelar o cerrar. **Vista del formato** guarda cambios y abre el documento carta; use el botón de impresión del sistema para imprimir o guardar PDF.

Permisos: `permits.view`, `create`, `edit`, `review`, `authorize`, `suspend`, `cancel`, `close` y `export`. Administrador recibe todos; Supervisor SST recibe operación completa; Consulta sólo lectura salvo personalización.

Ejecute `database/work_permits.sql` en Supabase SQL Editor dos veces. Después valide localmente con `npm.cmd run build` y `npm.cmd run test:permits`. No autorice permisos hasta aplicar el SQL y confirmar RLS.

Limitaciones: el Excel oficial no estuvo adjunto; la matriz y composición se reconstruyeron desde la imagen. La cola conserva borradores offline, pero la sincronización remota del nuevo recurso requiere aplicar el SQL y probar contra el proyecto Supabase real. La autorización offline está bloqueada.
