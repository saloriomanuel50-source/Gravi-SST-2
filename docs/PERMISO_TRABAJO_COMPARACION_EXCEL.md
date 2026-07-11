# Comparación celda por celda — GVC-SSH-FMT-002

Autoridad revisada: `docs/referencias/GVC-SSH-FMT-002 Permiso de trabajo.xls`. Área de impresión oficial: `A1:J64`. Hoja auxiliar: `Categorización!B1:H20`. Se revisaron todas las celdas no vacías y las 36 combinaciones visuales de celdas de la hoja principal.

| Sección del Excel | Campo original | Campo digital | Vista PDF | Estado | Corrección |
|---|---|---|---|---|---|
| Encabezado A1:J3 | FORMATO | Metadato documental | Sí | Coincide | Se agregó rótulo exacto |
| Encabezado C1:H3 | Permiso de trabajo | Nombre del módulo | Sí | Coincide | Se sustituyó título no oficial |
| Encabezado I1:J1 | Código GVC-SSH-FMT-002 | `documentCode` | Sí | Coincide | Ninguna |
| Encabezado I2:J2 | Versión 00 | `formVersion` | Sí | Coincide | Se corrigió 01 → 00 |
| Encabezado I3:J3 | Pagina 1 de 1 | Paginación | Sí | Coincide | Texto oficial |
| Fila 5 | FOLIO | `folio` | Sí | Coincide | Se agregó banda independiente |
| Fila 7 | Generales | Sección 1 | Sí | Coincide | Se agregó banda institucional |
| Fila 8 | OBRA | `workName` | Sí | Coincide | Etiqueta corregida |
| Fila 9 | EMPRESA/SUBCONTRATISTA | `contractorName` | Sí | Coincide | Etiqueta corregida |
| Fila 9 | AREA DE EJECUCIÓN | `executionArea` | Sí | Coincide | Etiqueta corregida |
| Fila 11 | RESIDENTE A CARGO | `residentName` | Sí | Coincide | Ninguna |
| Filas 14–24 | 1 ACTIVIDAD A REALIZAR | `activity` | Sí | Coincide | Etiqueta exacta |
| Filas 14–24 | 1.1 DESCRIPCIÓN DEL TRABAJO | `description` | Sí | Coincide | Etiqueta exacta |
| Fila 25 | 2 RIESGOS POTENCIALES IDENTIFICADOS | `hazards` | Sí | Coincide | Título corregido |
| Fila 25 | Nota espacios confinados/alta temperatura | Regla informativa | Sí | Coincide | Agregada a PDF |
| Filas 26–36 | CONDICIONES: 8 conceptos | Catálogo de peligros | Sí | Coincide | Se incorporaron todos |
| Filas 26–36 | EXPOSICIÓN A: 11 conceptos | Catálogo de peligros | Sí | Coincide | Se incorporaron todos |
| Filas 26–36 | LIQ./GAS/VAP.: 10 conceptos | Catálogo de peligros | Sí | Coincide | Se incorporaron todos |
| Filas 26–36 | ATRAPAMIENTO/EVENTOS: 10 conceptos | Catálogo de peligros | Sí | Coincide | Se incorporaron todos |
| Filas 26–36 | EQUIPOS/HRRTAS./GOLPES: 11 conceptos | Catálogo de peligros | Sí | Coincide | Se incorporaron todos |
| Fila 37 | 3 CATEGORIZACIÓN DE RIESGOS | Riesgo inicial/residual/máximo | Sí | Coincide | Matriz corregida |
| Filas 38–43 | LESIONES (5 conceptos) | Peligros/efectos descriptivos | No | Coincide parcialmente | Catálogo digital conserva riesgos; no existe selector separado de lesión |
| Filas 38–43 | CRITICOS (5 conceptos) | Severidad Crítica/Fatal | No | Coincide parcialmente | Se representa por severidad, no por lista separada |
| Filas 38–45 | Celda para categorización | Resultado calculado | Sí | Coincide | Resultado textual y por color |
| Fila 46 | 4 EQUIPO DE PROTECCIÓN PERSONAL | `ppe` | Sí | Coincide | Catálogo reemplazado por el oficial |
| Filas 47–55 | CABEZA/OJOS/CARA: 8 elementos | `ppe` | Sí | Coincide | Denominaciones oficiales |
| Filas 56–61 | MANOS/BRAZOS: 5 elementos | `ppe` | Sí | Coincide | Denominaciones oficiales |
| Filas 47–55 | TORAX/ESPALDA: 9 elementos | `ppe` | Sí | Coincide | Denominaciones oficiales |
| Filas 56–61 | PIERNAS/PIES: 6 elementos | `ppe` | Sí | Coincide | Denominaciones oficiales |
| Fila 46 | 5 EQUIPO ADICIONAL | `equipment`, `otherEquipment` | Sí | Coincide | Lista estructurada, no texto libre único |
| Filas 47–53 | CAÍDAS: 6 elementos | `equipment` | Sí | Coincide | Catálogo oficial |
| Filas 54–60 | PROT. RESPIRATORIA/ROPA ANTI-C: 5 elementos | `equipment` | Sí | Coincide | Catálogo oficial y campo otro |
| Fila 46 | 6 MEDIDAS PREVENTIVAS | `preventive` | Sí | Coincide | Título corregido |
| Filas 47–61 H/J | 24 medidas | `preventive` | Sí | Coincide | Catálogo completo oficial |
| Fila 56 I | OTRAS | `otherEquipment` / anotaciones | Sí | Coincide parcialmente | Campo libre digital disponible |
| Fila 62 | SOLICITA (contratista a cargo) | solicitud/aprobación | Sí | Coincide | Texto exacto |
| Fila 62 | REVISÓ (Seguridad de Gravi) | revisión | Sí | Coincide | Texto exacto |
| Fila 62 | Libera (Residente a cargo) | cierre/liberación | Sí | Coincide | Texto exacto |
| Fila 62 | ANOTACIONES O REQUERIMIENTOS ADICIONALES | `additionalRequirements` | Sí | Coincide | Texto exacto |
| Fila 63 | nombre y firma × 3 | aprobaciones con identidad | Sí | Coincide | Firmas vacías si no existen; no ficticias |
| Hoja Categorización | Frecuencias A–E | `FREQ` | Sí | Coincide | Alejada → Aislada |
| Hoja Categorización | Severidades I–IV | `SEV` | Sí | Coincide | Se eliminó quinta columna inventada |
| Hoja Categorización | 20 equivalencias | `MATRIX` | Sí | Coincide | 20/20 corregidas y probadas |
| Hoja Categorización | Azul/amarillo/rojo | clases de riesgo | Sí | Coincide parcialmente | UI usa tonos accesibles equivalentes; impresión conserva categorías |
| Digital adicional | Tipos de trabajo y controles dinámicos | `workTypes`, `controls` | No aplica | No aplica | Extensión digital documentada |
| Digital adicional | Trabajadores, horarios, extensiones, evidencia e historial | campos digitales/JSONB | Vigencia/extensiones sí | No aplica | Extensión operativa necesaria |

## Diferencias deliberadas

La captura digital añade tipos de trabajo, controles específicos, medidas de control, riesgo residual, participantes, estados, vigencia, extensiones, evidencia, historial e instantánea autorizada. Estos elementos no sustituyen celdas oficiales; soportan el flujo operativo y sólo los datos pertinentes aparecen en la vista institucional.
