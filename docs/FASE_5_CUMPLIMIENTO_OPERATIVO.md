# Fase 5 - Cumplimiento normativo operativo y programación automática

Fecha: 19 de junio de 2026  
Matriz de referencia: `GVC-SSH-MAT-001`

## Resumen

La Fase 5 amplía exclusivamente el cumplimiento normativo y la programación de actividades. No se rediseñaron dashboard, obras, históricos, contratistas, trabajadores, visitantes ni asistencia. Las integraciones realizadas en dashboard e históricos reutilizan sus mecanismos existentes.

El esquema de almacenamiento fue elevado de forma aditiva a versión 6. Los porcentajes y documentos anteriores se conservan.

## Cambios realizados

### Criterios verificables

- Catálogo inicial de 136 criterios operativos para las 13 NOM de la matriz GRAVI.
- Vista individual de criterios por NOM.
- Estados: Cumple, Parcial, No cumple y No aplica.
- Fecha de revisión, responsable, observaciones y evidencia por criterio.
- Acción pendiente y fecha compromiso para seguimiento.
- Cálculo automático por criterios aplicables.
- Peso de cálculo: Cumple = 100%, Parcial = 50%, No cumple = 0%; No aplica se excluye.
- Los resúmenes de Fase 4 continúan vigentes hasta la primera evaluación operativa de cada NOM.

### Historial auditable

Cada revisión agrega una entrada inmutable con:

- Fecha y hora local.
- Usuario.
- NOM y criterio.
- Estado anterior.
- Estado nuevo.
- Comentario del cambio.
- Evidencia agregada.
- Instantánea de responsable, observaciones, acción y compromiso.

Las revisiones posteriores no reemplazan las entradas anteriores. Los reportes generales guardan una copia profunda de criterios y evidencias para impedir que cambios futuros alteren documentos históricos.

### Programación automática

- Inspección de botiquines mensual.
- Inspección de extintores mensual.
- Creación automática por obra para el mes anterior, actual y siguiente.
- Creación al consultar cualquier otro mes del calendario.
- Vinculación automática con el registro finalizado de la inspección correspondiente.
- Visualización dentro de Programación, alertas del dashboard y reporte mensual.

### Reporte mensual

- Generación automática del mes anterior al abrir la aplicación por primera vez en el nuevo periodo.
- Generación manual de cualquier mes desde Programación.
- Instantánea histórica sin sobrescritura.
- Cumplimiento global y por NOM.
- Conteos de Cumple, Parcial, No cumple y No aplica.
- Hallazgos y acciones pendientes.
- Acciones vencidas.
- Inspecciones de botiquines y extintores.
- Comparación con el mes anterior.
- Variación en puntos y tendencia ascendente, descendente o sin cambio.
- Folio `CMC-AAAA-0000` e identidad corporativa GRAVI.

## Criterios implementados

| NOM | Criterios operativos | Alcance principal |
|---|---:|---|
| NOM-002-STPS | 12 | Incendios, extintores, evacuación, brigadas y emergencias |
| NOM-004-STPS | 10 | Maquinaria, guardas, bloqueo y mantenimiento |
| NOM-009-STPS | 11 | Alturas, anticaídas, andamios, escaleras y rescate |
| NOM-010-STPS | 10 | Agentes químicos, exposición, controles y salud |
| NOM-011-STPS | 10 | Ruido, evaluación, controles y conservación auditiva |
| NOM-017-STPS | 10 | Selección, entrega, uso y mantenimiento de EPP |
| NOM-019-STPS | 10 | Comisión, recorridos, actas y seguimiento |
| NOM-024-STPS | 10 | Vibraciones, evaluación, controles y vigilancia médica |
| NOM-025-STPS | 9 | Iluminación, niveles, mantenimiento y acciones |
| NOM-026-STPS | 9 | Colores, señales, tuberías y rutas |
| NOM-029-STPS | 12 | Seguridad eléctrica, bloqueo, permisos y emergencias |
| NOM-030-STPS | 10 | Diagnóstico, programa preventivo y seguimiento |
| NOM-031-STPS | 13 | Seguridad integral en construcción |
| **Total** | **136** | Catálogo operativo inicial |

NOM-009-STPS incluye expresamente:

1. Procedimiento para trabajos en altura.
2. Análisis de riesgos.
3. Personal autorizado.
4. Capacitación y autorización vigente.
5. Sistemas personales anticaídas.
6. Líneas de vida.
7. Puntos de anclaje.
8. Andamios y plataformas.
9. Escaleras portátiles.
10. Plan de rescate.
11. Evidencia documental.

## Reglas de cálculo de cumplimiento

Se consideran únicamente criterios aplicables:

`Porcentaje = (Cumple + Parcial × 0.5) / Criterios aplicables × 100`

- Si todos los criterios están en No aplica, la NOM queda en No aplica.
- Si todos los aplicables cumplen, la NOM queda en Cumple.
- Si existe algún Parcial o No cumple, la NOM queda en Parcial.
- El indicador global se pondera por el número de criterios aplicables de cada NOM.

## Reglas de programación

1. Cada obra recibe dos actividades por mes: botiquines y extintores.
2. La fecha base es el día 1 del mes.
3. Si el día 1 es domingo, se programa el día 2.
4. Los sábados se consideran laborables conforme a la regla solicitada.
5. Las tareas son únicas por obra, mes y tipo de inspección.
6. Una inspección finalizada se enlaza con la tarea pendiente del mismo tipo, obra y mes.

Validación ejecutada: el 1 de noviembre de 2026 cae en domingo y ambas actividades se programan el 2 de noviembre de 2026.

## Reglas de atraso

- `Programada`: faltan más de tres días laborables.
- `Próxima a vencer`: restan tres días laborables o menos.
- `En tiempo`: fue ejecutada sin días laborables posteriores a la fecha programada.
- `Vencida`: permanece pendiente o fue ejecutada después de la fecha programada.
- `Días de atraso`: días transcurridos después de la fecha programada, excluyendo domingos.

Si una fecha de vencimiento fuera domingo, el primer día contabilizado es el siguiente día laborable.

Validación ejecutada: del 1 al 19 de junio de 2026 se calculan 16 días de atraso al excluir los domingos 7 y 14.

## Compatibilidad con la matriz

- Se mantiene `GVC-SSH-MAT-001` como referencia principal.
- Se conservan las 13 NOM y los metadatos de sus 756 criterios de referencia.
- El catálogo operativo usa identificadores estables por NOM y criterio.
- La aplicación no duplica las 939 filas de la hoja de cálculo.
- El modelo admite incorporar posteriormente número de fila, clave de requisito y texto completo de cada criterio.
- Los estados de la aplicación son compatibles con Cumple / N/A de la matriz; Parcial y No cumple aportan seguimiento operativo adicional.

## Archivos modificados

- `index.html`: carga de estilos de Fase 5.
- `app.js`: emisión de evento al finalizar una inspección para vincular la programación.
- `system.js`: criterios, auditoría, programación, atrasos, reportes e integraciones existentes.

## Archivos agregados

- `phase5.css`: interfaz de criterios, historial y programación.
- `FASE_5_CUMPLIMIENTO_OPERATIVO.md`: documentación de la fase.

## Validación realizada

- Carga y migración con datos de fases anteriores.
- Apertura de las 13 NOM y sus criterios.
- Dos cambios consecutivos sobre el mismo criterio sin pérdida histórica.
- Fecha y hora local en auditoría.
- Cálculo de NOM-009 con un criterio Parcial y posteriormente Cumple.
- Programación del primer día laborable y ajuste de domingo.
- Cálculo de atraso excluyendo domingos.
- Tareas vencidas visibles en alertas del dashboard.
- Reporte mensual con 13 NOM, tres tablas, comparativo y pie corporativo.
- Reporte general con criterios operativos y copia histórica independiente.
- Inclusión del reporte mensual en históricos.
- Revisión móvil sin desbordamiento horizontal del módulo de criterios.
- Validación sintáctica y consola sin errores de aplicación.

## Recomendaciones futuras

1. Definir y versionar las claves oficiales de los 756 criterios antes de una migración completa.
2. Agregar usuarios autenticados para sustituir el usuario local genérico de auditoría.
3. Mover evidencias a almacenamiento central para evitar límites de `localStorage`.
4. Incorporar notificaciones push o correo para tareas próximas y vencidas.
5. Permitir asignar responsables distintos a cada actividad programada.
6. Incorporar firmas verificables y cierre formal del reporte mensual.
7. Añadir pruebas automatizadas para calendario, zonas horarias y cambios de mes.

## Riesgos vigentes

- La auditoría es local y puede ser alterada por alguien con acceso directo al almacenamiento del navegador.
- Las evidencias incrementan rápidamente el tamaño de los datos locales.
- La programación se materializa cuando la aplicación se abre; no existe un servicio de fondo con el navegador cerrado.
- Los folios aún no son consecutivos entre dispositivos.
