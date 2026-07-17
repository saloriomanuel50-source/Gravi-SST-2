# Estabilidad de sincronización v47

## Motivo del parche

La actualización v46 introdujo una dependencia de ejecución nueva para Asistencia (`attendance-state.js`) y cambió simultáneamente el flujo de sincronización granular. En producción, una carga incompleta o desfasada del helper podía detener `system.js` al iniciar. Además, la sincronización podía hidratar datos remotos mientras existían mutaciones locales pendientes, por lo que algunos cambios se hacían visibles únicamente después de recargar.

## Principios de la corrección

1. La interfaz se actualiza primero desde el estado local.
2. La red nunca bloquea el render inmediato.
3. Las mutaciones pendientes se conservan y se reintentan al recuperar conexión.
4. La hidratación remota no reemplaza asistencia local pendiente.
5. Los módulos aíslan sus errores para no inutilizar la navegación.
6. El runtime crítico no depende de un helper nuevo opcional.
7. El Service Worker utiliza una única versión de caché: `gravi-sst-v2-shell-v47`.

## Alcance

- Asistencia optimista y contadores inmediatos.
- Cola granular offline y reconexión.
- Protección ante respuestas asíncronas fuera de orden.
- Aislamiento de errores al abrir módulos.
- Coordinación de versiones de `index.html`, `bootstrap.js`, `system.js`, `supabase.js` y Service Worker.

No se modifican tablas, políticas RLS, roles, permisos ni estructura de Supabase.

## Validación recomendada antes de producción

1. Ejecutar `npm run build`.
2. Ejecutar `npm run test:attendance`.
3. Ejecutar `npm run test:stability`.
4. Ejecutar `npm run test:navigation`.
5. Abrir localmente Asistencia y cambiar cinco trabajadores sin recargar.
6. Probar una mutación sin conexión y recuperar conexión.
7. Navegar entre módulos y confirmar que la interfaz no queda bloqueada.
