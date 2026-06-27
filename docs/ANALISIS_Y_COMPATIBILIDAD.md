# Análisis de arquitectura y compatibilidad

## Arquitectura actual

- `index.html`: vistas y formularios compartidos.
- `app.js`: inspecciones originales, reporte diario, borradores, evidencias e historial base.
- `system.js`: obras, contratistas, trabajadores, visitantes, asistencia, fuerza laboral, investigaciones e históricos por obra.
- `corporate-documents.js`: decoración corporativa común y no destructiva para documentos existentes y futuros.
- `styles.css`, `fixes.css`, `system.css` y `corporate-documents.css`: presentación responsiva e impresión.

## Dependencias principales

- `system.js` reutiliza `showView`, `bindOpenButtons`, `resizeImage`, `incidentForm` y la vista `reportView` de `app.js`.
- Las inspecciones terminadas permanecen en `gvc-extintores-records-v1`.
- La administración por obra permanece en `gvc-ops-system-v1`.
- La obra activa permanece en `gvc-active-work-id`.
- Los borradores mantienen sus claves anteriores, ahora segmentadas por obra cuando corresponde.
- La salida PDF se origina en `reportView` mediante `window.print()`; `openSystemReport()` publica los documentos administrativos en esa misma vista.

## Compatibilidad aplicada

- No se renombraron ni eliminaron claves de almacenamiento.
- Los registros sin `workId` continúan asociados a la obra heredada `legacy`.
- El esquema administrativo se amplió a versión 2 solo con propiedades opcionales.
- Los trabajadores antiguos reciben valores predeterminados para ingreso, clasificación, taller y fotografía.
- Los históricos semanales anteriores siguen siendo legibles; los nuevos cierres guardan una instantánea congelada.
- Los reportes antiguos reciben encabezado, color y pie corporativo sin modificar su contenido almacenado.

## Comparación con formatos oficiales

### Gafete GVC-SEG-REG-039-F01

Integrado: folio consecutivo, revisión, fotografía, nombre, cargo, contratista, fecha de emisión, NSS/IMSS, alergia, tipo de sangre, contacto de emergencia, vigencia y superintendente.

### Asistencia GVC-CON-REG-036-F11

Integrado: semana viernes-jueves, elaboró, lugar, obra, centro de costo, OT, frente, partida, agrupación por contratista, nombre, puesto, NSS, fecha de ingreso, nuevo ingreso, taller/destajista, asistencia diaria, totales y visitantes.

### Investigación de accidentes

Integrado: trabajador reutilizable, empleador/contratista, fecha, hora, lugar, jornada, labor habitual, tiempo previo, tipo de accidente, mortalidad, lesión, parte del cuerpo, agente, acto o condición insegura, atención, testigos, causas, causa raíz, acciones, responsable y fecha compromiso.

El archivo oficial está en formato binario `.xls` con macros y controles heredados. Se recuperaron sus clasificaciones y etiquetas legibles; la equivalencia visual final debe validarse contra una copia abierta y guardada como `.xlsx` por el propietario del formato.

## Duplicación y riesgos detectados

- Los renderizadores de inspección repiten encabezados, firmas, evidencias y tablas. Se conservan por estabilidad y se normalizan mediante la capa corporativa común.
- `app.js` y `system.js` comparten funciones globales; cambiar nombres o el orden de carga rompería dependencias.
- Fotografías en Base64 pueden alcanzar el límite de `localStorage` en dispositivos con muchos registros.
- El sistema es local: no existe concurrencia, control de usuarios, respaldo central ni sincronización entre equipos.
- El cierre automático solo puede ejecutarse cuando la aplicación está abierta. La instantánea se crea al primer acceso posterior al jueves a las 16:30.
- El navegador requiere la acción del usuario para confirmar el guardado físico del PDF.

## Mejoras recomendadas

1. Migrar fotografías y documentos cerrados a IndexedDB o almacenamiento de servidor.
2. Incorporar usuarios, permisos, bitácora de cambios y firmas verificables.
3. Añadir respaldo/importación cifrada por obra.
4. Programar cierres y generación física de PDF en un servicio backend.
5. Convertir el `.xls` oficial de accidentes a `.xlsx` sin macros para una validación visual celda por celda.
