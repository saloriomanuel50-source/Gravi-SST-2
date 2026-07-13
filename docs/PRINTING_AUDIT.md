# Auditoría transversal de impresión — GRAVI SST v2

## Diagnóstico previo

- La salida institucional dependía de `#printReport` dentro del layout activo de la SPA. Los estilos globales ocultaban `.view`, el shell y otros contenedores durante `@media print`, mientras otros módulos aplicaban reglas incompatibles sobre el mismo árbol.
- `styles.css` forzaba `@page landscape` para todos los documentos. `work-permits.css` forzaba Carta vertical, ocultaba `body *` mediante `visibility:hidden`, reposicionaba el permiso de forma absoluta y le asignaba dimensiones físicas rígidas. El resultado dependía del orden de carga de CSS.
- El botón general llamaba `window.print()` de inmediato. El reporte diario también lo hacía directamente y el expediente de incidente utilizaba `setTimeout(..., 0)`. Ninguno esperaba fuentes, imágenes o ciclos de layout.
- En pantalla existen contenedores con `overflow:auto`, alturas y posiciones fijas/sticky. Al imprimir el árbol activo podían recortar o excluir el contenido desplazable.
- No se encontró una implementación activa que rasterizara documentos largos con `html2canvas`, `html2pdf` o `jsPDF`; sólo existe un comentario conceptual en formatos dinámicos. Se mantiene HTML nativo para conservar texto seleccionable.
- El encabezado corporativo solicitaba `./assets/gravi-constructora-oficial.jpeg`, que no existe. El asset institucional disponible es `/assets/gravi-sst-logo-dark.png`.

## Corrección aplicada

`GraviPrint.printDocument()` clona exclusivamente el documento institucional, elimina controles, convierte canvas a imágenes sin tocar el original, absolutiza recursos, crea un documento independiente, espera fuentes e imágenes y ejecuta la impresión después de dos ciclos de render. La orientación se resuelve mediante una configuración central por tipo documental.

La lista de asistencia semanal usa Carta horizontal; permisos, reportes diarios, inspecciones, incidentes e investigaciones usan Carta vertical; matrices de cumplimiento y reportes ejecutivos tabulares usan Carta horizontal. Los tipos no registrados usan Carta vertical.

## Inventario residual

Las dos llamadas históricas a `window.print()` que permanecen en `system.js` quedan interceptadas por el administrador central cargado antes de los módulos. No existe una ruta activa que invoque el diálogo nativo sobre el layout de la SPA.

## Alcance de validación local

Build, sintaxis y suites existentes pasan. La sesión local muestra “Supabase no está configurado en este despliegue”, por lo que no fue posible abrir registros reales de asistencia ni guardar/abrir un PDF desde el diálogo del sistema sin alterar autenticación o datos. Esa validación manual queda pendiente en un despliegue autenticado.
