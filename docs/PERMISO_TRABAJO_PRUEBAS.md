# Pruebas del Permiso de Trabajo

## Automatizadas ejecutadas

- `node --check src/work-permits.js`: correcto.
- `npm.cmd run test:permits`: correcto; estructura 5 × 5 y puntos de control.
- `npm.cmd run build`: correcto.

## Casos pendientes de validación interactiva

Requieren sesión Supabase, catálogos reales y navegador: creación/reapertura, combinaciones altura + caliente, bloqueo crítico, permisos por usuario, suspensión, extensiones, cierre con evidencia, impresión carta, móvil, sincronización entre dispositivos y ausencia de errores de consola.

La ejecución SQL doble, RLS real, carga a Storage, generación/almacenamiento de PDF y comparación lado a lado con el Excel no se realizaron porque no se proporcionaron credenciales ni el archivo `.xls`. Estas validaciones son obligatorias antes de declarar terminado el módulo para producción.

## Validación manual exacta

1. Ejecute `database/work_permits.sql` dos veces en un proyecto de prueba.
2. Inicie GRAVI SST con configuración Supabase válida y abra una obra con contratista y trabajadores.
3. Recorra los diez casos de aceptación de la especificación usando Administrador, Supervisor SST, Consulta y un perfil personalizado.
4. Active modo offline en DevTools, edite un borrador, reconecte y confirme una sola mutación.
5. Imprima a Carta, escala 100 %, y compare contra el Excel oficial.
6. Capture listado, formulario, controles dinámicos, formato oficial, móvil y PDF sólo después de aprobar la comparación.
