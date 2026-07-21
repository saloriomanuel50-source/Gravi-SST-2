# Almacenamiento de incidencias V50

## Causa corregida

Los elementos de `incidentEvidence` guardaban la propiedad `src` como una data URL JPEG (`data:image/jpeg;base64,...`). El autoguardado incluía el arreglo completo en `gvc-reporte-seguridad-draft-v1-<obra>` y el cierre volvía a incluirlo en `gvc-extintores-records-v1`. Seis imágenes comprimidas de 900 KB representan aproximadamente 5.4 MB binarios y 7.2 MB al codificarse en Base64, sin contar JSON; esto supera la cuota habitual de `localStorage`.

## Arquitectura V50

- `localStorage`: puntero, ID del borrador, obra, folio, fecha, estado, texto breve, referencias de evidencia y estado de sincronización. Límite preventivo: 64 KiB serializados.
- IndexedDB `gravi-evidence-v1`, versión 2:
  - `evidenceFiles`: Blob y metadatos de cada evidencia.
  - `evidenceQueue`: únicamente evidencias pendientes; una evidencia sincronizada se retira de esta cola.
  - `incidentReports`: payload completo del borrador o reporte pendiente, con ID estable.
- Supabase: continúa usando las tablas y Storage existentes; no se modificaron esquema, RLS, roles ni permisos.

## Migración y limpieza

La migración `gvc-incident-storage-migration-v50` recorre defensivamente `gvc-reporte-seguridad-draft-v1-*` y los reportes de incidencias históricos. Convierte data URLs existentes a Blob, conserva el payload completo en IndexedDB y reemplaza el valor local por una referencia ligera. El marcador también se registra en IndexedDB para que una cuota llena no provoque ejecuciones repetidas.

La limpieza elimina entradas ya sincronizadas de `evidenceQueue` y purga, después de siete días, únicamente evidencias marcadas como eliminadas o huérfanas sin registro asociado. No toca borradores activos, pendientes ni datos de otros módulos.

## Service worker

Cache único: `gravi-sst-v2-shell-v50`. Durante `activate` se eliminan los cachés anteriores. Las rutas API, REST, Storage y solicitudes con autorización no se almacenan en caché.
