# Estabilidad de runtime y sincronización v48

## Problema corregido

La aplicación podía conservar una combinación de `index.html`, `system.js`, `supabase.js` y Service Worker de versiones distintas. En ese estado, Asistencia u otros módulos podían fallar al abrir y funcionar únicamente después de recargar. Además, el estado de `system.js` se mantenía en memoria aunque Supabase actualizara el caché local.

## Solución

- Ciclo PWA coordinado con `updateViaCache: none`, activación del worker en espera y una recarga controlada al cambiar el controlador.
- Service Worker `gravi-sst-v2-shell-v48`, navegación con `cache: no-store` y eliminación de cachés anteriores.
- Normalización profunda del caché operativo.
- Puente `gvc:data-hydrated` entre Supabase y los módulos cargados.
- Relectura segura de `localStorage` y renderizado agrupado del módulo activo.
- Apertura de módulos con un reintento local controlado.
- Migraciones de arranque que solo persisten cuando realmente modifican datos.
- Asistencia optimista preservada con render agrupado y protección de pendientes.

## Nota de transición

La primera actualización desde v47 puede requerir una recarga manual porque el runtime v47 todavía no contiene el nuevo manejador de actualización. Una vez activo v48, las siguientes versiones podrán tomar control y recargar automáticamente una sola vez.
