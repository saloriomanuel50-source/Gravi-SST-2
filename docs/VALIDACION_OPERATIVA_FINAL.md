# Validación operativa final - Fase 4

Fecha: 19 de junio de 2026  
Referencia normativa: `GVC-SSH-MAT-001 (3).xlsx`

## 1. Estado general del sistema

El sistema queda en condición **estable para pruebas reales controladas en obra**. Se conservó la arquitectura existente, las claves de almacenamiento y los formatos de datos anteriores. La migración de Fase 4 es aditiva y eleva el esquema interno a versión 5 sin eliminar propiedades ni registros.

No se identificaron bloqueadores funcionales en los recorridos ejecutados. Para operación multiusuario, respaldo central y despliegue comercial aún se requiere una capa de servidor.

## 2. Errores encontrados

1. El acceso “Matriz de cumplimiento” sólo mostraba un mensaje de fase futura y no abría un módulo funcional.
2. El módulo normativo incluía 8 NOM, mientras que la matriz GRAVI contiene 13.
3. El porcentaje normativo era manual y promediaba todas las NOM por igual; no representaba la estructura Cumple / N/A de la matriz.
4. El reporte de cumplimiento no mostraba trazabilidad de criterios cumplidos, no aplicables y pendientes.
5. Existía una colisión de estilos entre Fase 2 y Fase 3 que comprimía los paneles ejecutivos del dashboard en escritorio.
6. Obras, contratistas y trabajadores podían registrarse de forma duplicada.
7. Los guardados administrativos no siempre daban confirmación visible al usuario.
8. Una obra eliminada podía reutilizar su número antes de recuperarse, creando una posible colisión futura.

## 3. Correcciones realizadas

- Se convirtió el acceso de matriz en una vista funcional de referencia y compatibilidad.
- Se incorporaron las cinco NOM faltantes: NOM-010, NOM-011, NOM-024, NOM-025 y NOM-029-STPS.
- Se añadieron código oficial, número de apartados y número de criterios para las 13 NOM.
- La evaluación resumida ahora captura Total, Cumple y N/A; los criterios restantes se consideran pendientes.
- El porcentaje se calcula como `Cumple / (Total - N/A)`.
- El cumplimiento general se pondera por criterios aplicables, no por promedio simple de NOM.
- Los registros previos conservan estado y porcentaje. Se marcan como “resumen anterior” hasta su siguiente evaluación compatible.
- El reporte normativo ahora incluye estado, porcentaje y conteo `Cumple / N.A. / Pendiente`.
- Se corrigió la distribución del dashboard para que los paneles ejecutivos ocupen el ancho disponible.
- Se añadieron controles de duplicidad para obras, contratistas y trabajadores.
- La validación de obras incluye también las eliminadas recuperables para evitar números duplicados.
- Se añadieron mensajes de éxito y mensajes de error más específicos.
- Se registraron Cumplimiento NOM, Matriz de cumplimiento y el documento de cumplimiento en el catálogo de extensiones.

## 4. Compatibilidad con la matriz GRAVI

La hoja `INSPECCIONES` contiene 939 filas y 25 columnas. La estructura principal utiliza:

- Una columna de NOM.
- Una columna de puntos de inspección.
- Pares de columnas `Cumple / N/A` por obra o contratista.
- Criterio sin marcar en ambas columnas como pendiente o incumplimiento.

La aplicación no replica las 939 filas. Conserva un resumen escalable por NOM y deja preparado el modelo para migrar criterios individuales posteriormente.

| NOM | Apartados | Criterios |
|---|---:|---:|
| NOM-002-STPS-2010 | 14 | 67 |
| NOM-004-STPS-1999 | 13 | 56 |
| NOM-009-STPS-2011 | 15 | 72 |
| NOM-010-STPS-2014 | 9 | 34 |
| NOM-011-STPS-2001 | 12 | 49 |
| NOM-017-STPS-2008 | 13 | 61 |
| NOM-019-STPS-2011 | 12 | 55 |
| NOM-024-STPS-2001 | 11 | 51 |
| NOM-025-STPS-2008 | 13 | 54 |
| NOM-026-STPS-2008 | 13 | 61 |
| NOM-029-STPS-2011 | 15 | 62 |
| NOM-030-STPS | 12 | 54 |
| NOM-031-STPS-2011 | 20 | 80 |
| **Total** | **169** | **756** |

Estados derivados:

- `No aplica`: no existen criterios aplicables.
- `Cumple`: 100% de los criterios aplicables cumplen.
- `Parcial`: cumplimiento mayor a 0% y menor a 100%.
- `No cumple`: existen criterios aplicables y ninguno cumple.

## 5. Validación operativa ejecutada

### Obras

- Alta y persistencia de campos oficiales.
- Edición y reflejo de cambios en la tarjeta.
- Activación y desactivación.
- Cierre protegido por confirmación.
- Eliminación lógica con confirmaciones.
- Conservación del registro eliminado.
- Recuperación como obra inactiva.
- Prevención de número o nombre duplicado, incluso si la obra es recuperable.

### Catálogos y personal

- Apertura y controles de Contratistas, Trabajadores y Visitantes.
- Validación de los campos ampliados de trabajador y contratista.
- Prevención de contratista duplicado.
- Prevención de trabajador duplicado por NSS o por nombre y contratista.
- Generación de gafete con folio, vigencia, pie corporativo y datos de emergencia.

### Asistencia y fuerza de trabajo

- Semana viernes a jueves.
- Captura diaria por trabajador.
- Bloqueo previsto para semanas cerradas.
- Documento semanal con trabajadores agrupados y visitantes.
- Fuerza de trabajo por contratista y total en sitio.

### Reportes e inspecciones

- Folio automático y de sólo lectura en reporte diario.
- Formularios de extintores, botiquín, sierra de banco, esmeril y extensión eléctrica.
- Límite efectivo de siete extintores en un reporte.
- Insumos adicionales disponibles en botiquín.
- Evidencias, firmas y cierres presentes en los formularios.
- Vinculación de reporte diario con investigación de accidente.

### Investigación e históricos

- Apertura, captura y reporte de investigación.
- Firma, folio y pie corporativo del documento.
- Históricos de gafetes, visitantes, accidentes y cumplimiento.
- Filtros por obra, tipo, contratista, fechas y búsqueda rápida.
- Búsqueda por folio validada con un único resultado correcto.

### Cumplimiento normativo

- Vista de referencia de 13 NOM y 756 criterios.
- Cálculo compatible validado con 50 Cumple, 7 N/A y 67 totales: resultado 83%.
- Rechazo de conteos que superan el total.
- Reporte de 13 filas, firmas, folio y pie corporativo.
- Integración del documento en históricos.

### Interfaz

- Navegación validada en los 14 accesos laterales.
- Dashboard con 7 indicadores y 13 NOM.
- Corrección de paneles comprimidos en escritorio.
- Menú lateral desplegable en móvil.
- Históricos y dashboard sin desbordamiento horizontal de página en móvil.
- Consola del navegador sin errores de aplicación.

## 6. Validación documental

Se revisaron los generadores de gafete, asistencia semanal, reporte diario, inspecciones, investigación y cumplimiento. Se confirmó:

- Identidad GRAVI y colores corporativos.
- Código y revisión del documento.
- Folios automáticos cuando aplican.
- Tablas, bandas, firmas y pie corporativo.
- Márgenes y reglas de impresión.
- Vista de reporte previa a imprimir o guardar como PDF.

La validación visual directa se ejecutó sobre gafete, asistencia, investigación y cumplimiento. Los generadores de reportes diarios e inspecciones comparten el mismo decorador corporativo existente.

## 7. Archivos modificados

- `index.html`: carga de estilos de Fase 4.
- `system.js`: compatibilidad matricial, cálculo ponderado, validaciones, mensajes y registro de extensiones.

## 8. Archivos agregados

- `phase4.css`: vista de matriz, corrección del dashboard, ajustes móviles y del reporte normativo.
- `VALIDACION_OPERATIVA_FINAL.md`: presente informe.

## 9. Riesgos detectados

- El almacenamiento continúa en `localStorage`; no hay sincronización entre dispositivos.
- Las fotografías en base64 pueden agotar la cuota del navegador.
- No existe autenticación, control de roles ni bitácora inmutable de auditoría.
- Los folios son consecutivos dentro del almacenamiento local, no globales entre obras o equipos.
- El cierre semanal automático necesita que la aplicación se abra después del cierre.
- La matriz fuente sigue siendo el documento maestro para criterios individuales.
- La aplicación no cuenta todavía con una batería automatizada de pruebas de regresión.

## 10. Funcionalidades pendientes

- Captura y migración de los 756 criterios individuales.
- Importación y exportación directa de la matriz Excel.
- Calendario de revisiones y notificaciones normativas.
- Usuarios, permisos, firmas verificables y auditoría.
- API, base de datos y repositorio central de evidencias.
- Modo sin conexión con sincronización posterior.
- Generación PDF centralizada y folios globales.

## 11. Recomendaciones futuras

1. Probar durante una semana en una obra piloto con un responsable SST designado.
2. Respaldar los datos diariamente durante la prueba.
3. Registrar incidencias de uso por módulo y dispositivo.
4. Definir el identificador estable de cada uno de los 756 criterios antes de migrarlos.
5. Crear API y base de datos antes de desplegar en varias obras simultáneas.
6. Incorporar pruebas automatizadas para migraciones, folios, cierres e históricos.
7. Mantener `GVC-SSH-MAT-001` como referencia maestra hasta completar la migración detallada.
