# Pruebas de firmas manuscritas

## Ejecutadas

- Sintaxis de `signatures.js`, `work-permits.js` y `supabase.js`.
- Build y validación general.
- Pruebas de permisos existentes.
- `test:signatures`: Pointer Events, DPR, PNG Blob, IndexedDB, consentimiento, slots, SQL, invalidación y guardas sincronizadas.

## Pendientes interactivos/remotos

- Dedo, lápiz, mouse y tableta digitalizadora reales.
- Rotación, DPR y móvil 390×844 visual.
- Primera y segunda ejecución SQL en Supabase de prueba.
- RLS de Supervisor, Administrador, Consulta y personalizados.
- Storage privado, URL firmada, duplicados y reintentos.
- Invalidación remota y eventos auditables.
- Firma visible en PDF persistido; la generación PDF continúa pendiente en el proyecto.

El harness manual está en `tests/signatures-harness.html`. El navegador automatizado rechazó el acceso a localhost; no se eludió esa restricción. No se declara listo para producción.
