# Arquitectura funcional GRAVI SST 3.0

## Fase 0: congelacion de contratos actuales

Este documento congela el estado funcional y de almacenamiento actual de GRAVI SST 2.x para preparar la transicion a GRAVI SST 3.0 sin modificar logica, interfaz, base de datos ni datos existentes.

La regla base de GRAVI SST 3.0 es que cada dato debe tener una sola fuente de verdad. Los reportes, historicos y documentos emitidos pueden conservar snapshots para trazabilidad, pero no deben convertirse en la fuente editable del dato operativo.

## 1. Principios funcionales de GRAVI SST 3.0

1. Una entidad, una fuente maestra.
2. El Dashboard es una vista ejecutiva; no captura ni modifica datos.
3. Los modulos operativos capturan eventos o movimientos, no redefinen catalogos maestros.
4. Los reportes son salidas de informacion; no son fuente de verdad.
5. Los documentos emitidos conservan snapshots historicos, pero no reemplazan a las entidades maestras.
6. Las evidencias deben ser una entidad reutilizable asociada a registros, no arreglos aislados dentro de cada payload.
7. Los formatos dinamicos deben integrarse mediante contratos publicos y no mediante acceso directo al cliente Supabase.
8. La auditoria debe registrar cambios relevantes de forma automatica y no editable por usuarios operativos.
9. La compatibilidad offline debe mantenerse durante toda la transicion.
10. Toda migracion futura debe ser reversible o compatible con datos heredados.
11. Operaciones funcionara como motor de procesos: concentra la captura de inspecciones, checklists, permisos, auditorias, equipos, vehiculos, botiquines, extintores y formatos dinamicos.
12. Dashboard, Reportes, Documentos, Historicos e Indicadores pertenecen a la capa de Inteligencia y no deben capturar informacion operativa.

## 1.1 Vision funcional por capas

GRAVI SST 3.0 se organiza en tres capas funcionales. Cada capa tiene responsabilidades distintas y no debe invadir la funcion de las otras.

### Capa 1: Catalogos Maestros

La capa de Catalogos Maestros define las entidades base sobre las que operan los demas modulos. Sus datos son estables, referenciables y administrados con permisos controlados.

- Empresa.
- Desarrollos.
- Obras.
- Contratistas.
- Trabajadores.
- Usuarios.

Regla principal: si la informacion identifica a una entidad base, se crea y edita en Catalogos Maestros. Los modulos operativos deben referenciarla por ID y no duplicarla como texto libre, salvo snapshot historico.

### Capa 2: Operacion

La capa de Operacion registra lo que ocurre en campo. Es el motor de procesos del sistema.

- Asistencia.
- Operaciones:
  - Inspecciones.
  - Checklists.
  - Formatos dinamicos.
  - Permisos.
  - Auditorias.
  - Equipos.
  - Vehiculos.
  - Botiquines.
  - Extintores.
- Incidencias.
- Cumplimiento.
- Acciones Correctivas.
- Evidencias.

Regla principal: si la informacion nace de una actividad diaria, una revision, un evento, una accion o una evidencia, pertenece a Operacion. Operacion puede crear registros transaccionales, pero no debe redefinir catalogos maestros.

### Capa 3: Inteligencia

La capa de Inteligencia transforma datos existentes en lectura, trazabilidad y salidas.

- Dashboard.
- Reportes.
- Documentos.
- Historicos.
- Indicadores.
- Auditoria.

Regla principal: Inteligencia consulta, agrupa, calcula, visualiza o emite salidas. No captura informacion operativa, no modifica catalogos y no reemplaza la fuente de verdad.

## 1.2 Flujo operativo diario de un Supervisor SST

1. Selecciona la obra activa desde Obras / Desarrollos.
2. Consulta el Dashboard para revisar estado general, alertas, asistencia, cumplimiento e incidencias pendientes.
3. Verifica Fuerza de trabajo: contratistas activos, trabajadores disponibles y visitantes esperados.
4. Registra Asistencia diaria de trabajadores y visitantes.
5. Ejecuta Operaciones de campo segun programa:
   - inspecciones;
   - checklists;
   - revision de equipos;
   - revision de vehiculos;
   - botiquines;
   - extintores;
   - permisos;
   - auditorias;
   - formatos dinamicos.
6. Adjunta Evidencias a cada registro operativo cuando corresponda.
7. Registra Incidencias o Accidentes si ocurre un evento no rutinario.
8. Genera o actualiza Acciones Correctivas derivadas de inspecciones, incidencias, auditorias o cumplimiento.
9. Actualiza Cumplimiento cuando una evidencia o revision impacta una NOM, criterio o requisito.
10. Consulta Inteligencia: Dashboard, Indicadores, Historicos, Documentos y Reportes.
11. Emite Reportes PDF/Excel solo como salida de informacion, sin editar datos fuente.
12. La Auditoria registra automaticamente las acciones relevantes.

## 2. Entidades principales del sistema

| Entidad | Representa | Fuente propuesta 3.0 |
|---|---|---|
| Empresa | Organizacion propietaria, cliente o instancia administrativa del sistema. | `empresas` o configuracion corporativa formal. |
| Desarrollo | Agrupador fisico/comercial de una o varias obras. | `desarrollos`. |
| Obra | Unidad operativa donde ocurren actividades SST. | `obras`. |
| Contratista | Empresa externa o cuadrilla participante en una obra. | `contratistas`. |
| Trabajador | Persona operativa registrada en una obra. | `trabajadores`. |
| Visitante | Persona temporal con entrada/salida en obra. | `visitantes`. |
| Usuario | Persona con acceso al sistema y rol asignado. | Supabase Auth + `perfiles_usuario`. |
| Asistencia | Presencia diaria de trabajadores y visitantes. | `asistencia`. |
| Inspeccion | Revision de campo, hallazgos y acciones. | `inspecciones` futura o `registros` tipificado durante transicion. |
| Incidencia / Accidente | Evento no rutinario, investigacion y acciones derivadas. | `incidencias` futura + `investigaciones`. |
| Cumplimiento normativo | Estado por NOM, criterio, evidencia y responsable. | `cumplimiento_normativo` granular futura o `cumplimiento_estado` durante transicion. |
| Documento / Formato | Plantilla, formato dinamico, PDF o documento emitido. | `dynamic_formats`, `format_fields`, `format_records`, documentos emitidos futuros. |
| Evidencia | Archivo, fotografia o soporte relacionado con una entidad. | Storage `evidencias` + indice formal futuro `evidencias`. |
| Reporte | Salida PDF/Excel derivada de datos existentes. | `reportes` o `documentos_emitidos` futuro. |
| Auditoria / Bitacora | Trazabilidad de acciones, usuario, modulo y contexto. | `audit_log` futuro; actualmente `data.auditLog` local. |

## 3. Fuente unica de verdad propuesta

| Tipo de informacion | Fuente unica propuesta | Regla de uso |
|---|---|---|
| Datos corporativos | Empresa / configuracion corporativa | No repetir razon social, logos o codigos en cada reporte salvo snapshot. |
| Desarrollos | `desarrollos` | Las obras referencian `development_id`; evitar depender de texto libre. |
| Obras | `obras` | Todo registro operativo debe referenciar `work_id`. |
| Contratistas | `contratistas` | Incidencias, inspecciones y trabajadores deben referenciar `contractor_id`. |
| Trabajadores | `trabajadores` | Incidencias y asistencia deben referenciar `worker_id`. |
| Visitantes | `visitantes` | No mezclar visitantes con trabajadores. |
| Usuarios y roles | Supabase Auth + `perfiles_usuario` | Los modulos consultan permisos; no duplican roles. |
| Asistencia | `asistencia` | El modulo de asistencia crea marcas; otros modulos solo consultan. |
| Inspecciones | Registro operativo tipificado | Reportes PDF se generan desde la inspeccion, no al reves. |
| Incidencias y accidentes | Registro operativo tipificado + investigaciones | La investigacion debe vincularse a la incidencia origen. |
| Cumplimiento | Estado normativo por obra/NOM/criterio | Inspecciones aportan evidencia o hallazgos, no editan catalogos normativos directamente. |
| Evidencias | Entidad de evidencias | Los modulos crean referencias a evidencia; no copias independientes. |
| Formatos dinamicos | Tablas `dynamic_formats` y contrato `GraviSupabase.dynamicFormats` | No usar `supabase.from(...)` fuera del wrapper. |
| Documentos emitidos | Documento/reporte generado con snapshot | Es historico consultivo, no fuente editable. |
| Auditoria | Bitacora automatica | Ningun modulo operativo debe editarla manualmente. |

## 3.1 Mapa de fuente unica por capas

| Capa | Fuente de verdad | Ejemplos | Regla |
|---|---|---|---|
| Catalogos Maestros | Entidades maestras | Empresa, desarrollos, obras, contratistas, trabajadores, usuarios | Se crean y editan una vez; otros modulos las referencian. |
| Operacion | Registros operativos | Asistencia, inspecciones, checklists, permisos, auditorias, incidencias, cumplimiento, acciones, evidencias | Captura hechos de campo y estados operativos. |
| Inteligencia | Vistas y salidas derivadas | Dashboard, reportes, documentos, historicos, indicadores, auditoria consultiva | Consulta y presenta; no captura operacion. |

## 4. Responsabilidad de cada modulo

### Catalogos Maestros

- Funcion principal: administrar las entidades base del sistema.
- Crea: empresa, desarrollos, obras, contratistas, trabajadores y usuarios.
- Modifica: datos maestros, estatus, asignaciones y permisos segun rol.
- Consulta: informacion operativa relacionada para contexto.
- No debe contener: captura diaria de asistencia, inspecciones, incidencias, cumplimiento transaccional o reportes como fuente.

### Operaciones

- Funcion principal: operar como motor de procesos de campo.
- Crea: inspecciones, checklists, formatos dinamicos capturados, permisos, auditorias operativas, revisiones de equipos, vehiculos, botiquines y extintores.
- Modifica: registros operativos abiertos, hallazgos, avances y acciones derivadas.
- Consulta: catalogos maestros, cumplimiento, evidencias e historicos relacionados.
- No debe contener: alta definitiva de obras, contratistas, trabajadores o usuarios.
- Regla especial: todo proceso operativo debe declarar su entidad destino antes de implementarse. Un formato dinamico no debe crear datos paralelos si en realidad corresponde a inspeccion, permiso, auditoria, equipo, vehiculo, botiquin o extintor.

### Inteligencia

- Funcion principal: convertir datos existentes en indicadores, documentos, historicos, auditoria consultiva y reportes.
- Crea: salidas documentales o snapshots de emision.
- Modifica: nada del dato fuente.
- Consulta: todas las capas segun permisos.
- No debe contener: formularios de captura operativa ni edicion de catalogos maestros.

### Dashboard

- Funcion principal: vista ejecutiva y de indicadores.
- Crea: nada.
- Modifica: nada.
- Consulta: obras, asistencia, inspecciones, incidencias, cumplimiento, reportes y auditoria resumida.
- No debe contener: captura operativa, edicion de catalogos o generacion de datos maestros.

### Obras / Desarrollos

- Funcion principal: administrar la estructura fisica del proyecto.
- Crea: desarrollos y obras.
- Modifica: datos maestros de desarrollo y obra.
- Consulta: conteos operativos asociados.
- No debe contener: asistencia, inspecciones, incidencias o cumplimiento como payload propio.

### Fuerza de trabajo

- Funcion principal: administrar contratistas, trabajadores y visitantes.
- Crea: contratistas, trabajadores, visitantes y gafetes como documento derivado.
- Modifica: datos y estatus de contratistas, trabajadores y visitantes.
- Consulta: asistencia e incidencias relacionadas.
- No debe contener: asistencia diaria como fuente propia.

### Asistencia

- Funcion principal: registrar presencia diaria.
- Crea: marcas de asistencia.
- Modifica: marcas abiertas segun reglas de cierre.
- Consulta: trabajadores activos, visitantes del dia y obra activa.
- No debe contener: alta definitiva de trabajadores o contratistas.

### Inspecciones

- Funcion principal: registrar revisiones de campo, hallazgos y acciones.
- Crea: inspecciones, hallazgos, acciones y evidencias.
- Modifica: inspecciones abiertas y acciones derivadas.
- Consulta: obra, contratista, trabajador, cumplimiento y formatos.
- No debe contener: catalogos maestros de obra, contratista o trabajador.

### Checklists

- Funcion principal: capturar listas de verificacion estructuradas.
- Crea: respuestas, hallazgos, evidencias y acciones derivadas.
- Modifica: checklists abiertos o en borrador.
- Consulta: obra, contratista, trabajador, formatos y cumplimiento.
- No debe contener: definicion de catalogos maestros.

### Formatos dinamicos

- Funcion principal: permitir captura controlada desde plantillas configurables.
- Crea: registros dinamicos con destino funcional definido.
- Modifica: registros en borrador o formatos en version editable.
- Consulta: catalogos, evidencias, documentos y procesos operativos relacionados.
- No debe contener: acceso directo a Supabase ni creacion de datos paralelos sin clasificacion.

### Permisos

- Funcion principal: gestionar autorizaciones operativas de trabajo.
- Crea: permisos, responsables, vigencias, condiciones y evidencias.
- Modifica: permisos abiertos, suspendidos o cerrados.
- Consulta: trabajadores, contratistas, obra, equipos y cumplimiento.
- No debe contener: reportes ejecutivos como fuente de captura.

### Auditorias operativas

- Funcion principal: registrar revisiones o auditorias de campo.
- Crea: auditorias, hallazgos, evidencias y acciones correctivas.
- Modifica: auditorias abiertas y seguimiento.
- Consulta: cumplimiento, operaciones, evidencias y catalogos.
- No debe confundirse con: Auditoria / Bitacora de sistema en la capa de Inteligencia.

### Equipos y vehiculos

- Funcion principal: registrar revision, estado, permisos y hallazgos de activos operativos.
- Crea: inspecciones o registros de equipos y vehiculos.
- Modifica: estado operativo y acciones derivadas.
- Consulta: obra, contratista, responsable, evidencia y cumplimiento.
- No debe contener: catalogo maestro de contratistas o trabajadores.

### Botiquines y extintores

- Funcion principal: registrar revision periodica de botiquines y extintores.
- Crea: inspecciones, evidencias, hallazgos y acciones.
- Modifica: registros abiertos y acciones pendientes.
- Consulta: obra, ubicacion, responsable y cumplimiento.
- No debe contener: logica documental separada del registro operativo.

### Incidencias / Accidentes

- Funcion principal: registrar eventos no rutinarios e investigaciones.
- Crea: incidencias, accidentes, investigaciones, acciones correctivas y evidencias.
- Modifica: estatus y acciones de investigacion.
- Consulta: trabajadores, contratistas, asistencia, obra y evidencias.
- No debe contener: edicion directa de datos maestros.

### Cumplimiento normativo

- Funcion principal: administrar estatus NOM, criterios, evidencias y responsables.
- Crea: evaluaciones, revisiones, acciones y reportes normativos.
- Modifica: estado normativo por obra/NOM/criterio.
- Consulta: inspecciones, incidencias, documentos y evidencias.
- No debe contener: reportes como fuente editable.

### Documentos / Formatos

- Funcion principal: administrar plantillas, formatos dinamicos, versiones y documentos emitidos.
- Crea: formatos, versiones y documentos derivados.
- Modifica: formatos en borrador o nuevas versiones.
- Consulta: entidades origen y evidencias.
- No debe contener: captura operativa final sin clasificar el destino del dato.

### Reportes

- Funcion principal: generar salidas PDF/Excel.
- Crea: salidas y snapshots de emision.
- Modifica: nada del dato fuente.
- Consulta: entidades segun filtros y permisos.
- No debe contener: formularios de captura o edicion.

### Historicos

- Funcion principal: consultar documentos emitidos y registros cerrados.
- Crea: nada de operacion.
- Modifica: nada del dato fuente.
- Consulta: reportes, documentos emitidos, inspecciones cerradas, asistencia cerrada, incidencias e investigaciones.
- No debe contener: captura operativa ni edicion de registros vivos.

### Indicadores

- Funcion principal: calcular y presentar metricas.
- Crea: nada operativo.
- Modifica: nada del dato fuente.
- Consulta: asistencia, inspecciones, incidencias, cumplimiento, acciones y evidencias.
- No debe contener: formularios de captura ni correcciones manuales de resultados.

### Configuracion

- Funcion principal: usuarios, roles, catalogos y parametros.
- Crea: usuarios, roles y catalogos globales.
- Modifica: permisos, parametros y catalogos controlados.
- Consulta: auditoria y sincronizacion.
- No debe contener: operacion diaria de obra.

## 5. Menu final propuesto

### Catalogos Maestros

1. Empresa.
2. Desarrollos.
3. Obras.
4. Contratistas.
5. Trabajadores.
6. Usuarios.

### Operacion

1. Asistencia.
   - Captura diaria.
   - Semana actual.
   - Cierres semanales.
2. Operaciones.
   - Inspecciones.
   - Checklists.
   - Formatos dinamicos.
   - Permisos.
   - Auditorias.
   - Equipos.
   - Vehiculos.
   - Botiquines.
   - Extintores.
3. Incidencias.
   - Reporte de incidencia.
   - Accidentes.
   - Investigaciones.
4. Cumplimiento.
   - Matriz NOM.
   - Evaluaciones.
   - Evidencias normativas.
5. Acciones Correctivas.
6. Evidencias.

### Inteligencia

1. Dashboard.
2. Reportes.
   - PDF.
   - Excel.
   - Reportes ejecutivos.
   - Exportaciones.
3. Documentos.
   - Plantillas.
   - Documentos emitidos.
   - Historial documental.
4. Historicos.
5. Indicadores.
6. Auditoria.

### Configuracion transversal

1. Roles y permisos.
2. Catalogos auxiliares.
3. Parametros.
4. Sincronizacion.

## 6. Reglas de captura vs consulta

| Regla | Aplicacion |
|---|---|
| Dashboard solo consulta | No debe tener botones que creen registros operativos. |
| Reportes solo emite salidas | No debe modificar entidades fuente. |
| Historicos solo consulta documentos emitidos | No debe mezclar registros vivos con documentos finales sin distinguir origen. |
| Modulos maestros editan catalogos | Obras y Fuerza de trabajo son responsables de datos base. |
| Modulos operativos referencian catalogos | Inspecciones, asistencia e incidencias usan IDs de obra, contratista y trabajador. |
| Snapshots no son fuente maestra | Un PDF puede guardar nombre de trabajador historico, pero no editar al trabajador. |
| Evidencias se centralizan | Cada modulo relaciona evidencias por ID. |
| Auditoria no se edita manualmente | Se genera por eventos del sistema. |
| Formatos dinamicos no acceden directo a Supabase | Deben usar `GraviSupabase.dynamicFormats`. |
| Inteligencia no captura operacion | Dashboard, Reportes, Documentos, Historicos e Indicadores no deben crear asistencia, inspecciones, incidencias, cumplimiento ni evidencias operativas. |
| Operaciones es motor de procesos | Cualquier revision, permiso, checklist, auditoria operativa o formato capturado debe vivir en Operacion. |
| Catalogos no son eventos | Empresa, desarrollo, obra, contratista, trabajador y usuario no deben almacenar movimientos diarios como parte de su definicion maestra. |

## 6.1 Criterio para clasificar nuevas funciones

Antes de implementar una nueva funcion, debe responderse:

1. Identifica o administra una entidad base estable?
   - Si la respuesta es si, pertenece a Catalogos Maestros.
   - Ejemplos: crear contratista, editar trabajador, activar obra, administrar usuario.
2. Registra algo que ocurrio en campo, un proceso, una revision, una accion o una evidencia?
   - Si la respuesta es si, pertenece a Operacion.
   - Ejemplos: checklist, permiso, inspeccion de vehiculo, revision de botiquin, accion correctiva.
3. Resume, calcula, visualiza, exporta o consulta informacion ya existente?
   - Si la respuesta es si, pertenece a Inteligencia.
   - Ejemplos: dashboard, indicador, reporte PDF, historico, documento emitido.
4. Necesita editar datos fuente para mostrar el resultado?
   - Si la respuesta es si, no pertenece a Inteligencia y debe reclasificarse.
5. Necesita crear un PDF pero tambien captura datos?
   - La captura pertenece a Operacion; el PDF pertenece a Inteligencia como salida.

## 7. Contratos actuales de almacenamiento

### `gvc-ops-system-v1`

Contrato local principal del sistema operativo actual.

Estructura observada:

```json
{
  "works": [],
  "developments": [],
  "contractors": [],
  "workers": [],
  "visitors": [],
  "attendance": {},
  "histories": [],
  "investigations": [],
  "compliance": {},
  "activity": [],
  "auditLog": [],
  "complianceMatrix": {},
  "schemaVersion": 0
}
```

Responsabilidad actual:

- Obras y desarrollos.
- Contratistas.
- Trabajadores.
- Visitantes.
- Asistencia.
- Investigaciones.
- Historiales generados por el modulo de sistema.
- Cumplimiento normativo en estructura local.
- Actividad y bitacora local.

Riesgo actual:

- Mezcla catalogos maestros, eventos operativos, documentos, cumplimiento y auditoria en una sola estructura local.
- Parte de la informacion tambien se sincroniza a tablas Supabase, pero con muchos detalles dentro de `payload`.

### `gvc-extintores-records-v1`

Contrato local historico para registros de inspecciones, reportes diarios e incidentes.

Estructura observada por registro:

```json
{
  "id": "",
  "type": "",
  "workId": "",
  "date": "",
  "status": "",
  "folio": "",
  "createdAt": "",
  "evidence": [],
  "payload_fields": {}
}
```

Tipos actuales asociados:

- `incident`: reporte diario / incidencia.
- `firstAid`: inspeccion de botiquin.
- `extinguisher`: inspeccion de extintores.
- `tableSaw`: sierra de banco.
- `grinder`: esmeril angular.
- `extensionCord`: extension electrica.

Responsabilidad actual:

- Borradores y registros finalizados de inspecciones.
- Reporte diario de seguridad.
- Evidencias embebidas.
- Datos usados por historicos, dashboard y reportes PDF.

Riesgo actual:

- El nombre de obra, contratista, trabajador y ubicacion puede quedar duplicado como texto.
- Evidencias quedan embebidas en cada registro.
- Los reportes se generan desde esta estructura y tambien aparecen como historicos.

### `gvc-dynamic-formats-v1`

Contrato local introducido para la preparacion segura de formatos dinamicos.

Estructura actual:

```json
{
  "formats": [],
  "records": []
}
```

Contrato publico asociado:

```text
GraviSupabase.dynamicFormats.listFormats()
GraviSupabase.dynamicFormats.getFormat(id)
GraviSupabase.dynamicFormats.saveFormat(payload)
GraviSupabase.dynamicFormats.deleteFormat(id)
GraviSupabase.dynamicFormats.createRecord(payload)
GraviSupabase.dynamicFormats.updateRecord(id, updates)
GraviSupabase.dynamicFormats.flushPending()
```

Responsabilidad actual:

- Preparar una fachada publica para formatos dinamicos.
- Mantener compatibilidad offline inicial mediante almacenamiento local.
- Evitar dependencia directa de `supabase.from(...)` desde el subsistema dinamico.

Riesgo actual:

- Aun no esta conectado a persistencia real de `dynamic_formats`, `format_fields` y `format_records`.
- Puede duplicar documentos o registros si se conecta sin definir destino funcional: inspeccion, incidencia, asistencia, cumplimiento o documento simple.

## 8. Riesgos actuales de duplicidad

| Area | Duplicidad actual | Riesgo |
|---|---|---|
| Trabajadores | Catalogo en `workers` y nombres libres en incidentes/investigaciones. | Estadisticas e historiales por persona incompletos. |
| Obras | `works`, campos `project/location` en inspecciones y snapshots en reportes. | Reportes asociados a textos distintos para la misma obra. |
| Contratistas | Catalogo en `contractors` y textos libres en inspecciones/incidencias. | Conteos y responsabilidad por contratista inconsistentes. |
| Evidencias | Arrays por modulo y posibles archivos en Storage. | Archivos no trazables o duplicados. |
| Reportes | Registros operativos, historicos y PDF mezclados. | Un reporte puede interpretarse como dato fuente. |
| Cumplimiento | Estado local, snapshots y evidencias embebidas. | No hay trazabilidad granular por criterio. |
| Historicos | Vista combinada de registros, histories y documentos virtuales. | Dificultad para distinguir documento emitido vs registro vivo. |
| Documentos | Plantillas JS, formatos dinamicos y PDFs generados. | Versiones y codigos documentales dispersos. |

## 9. Mapa de transicion por fases

### Fase 0: congelar contratos actuales

- Documentar contratos locales existentes.
- Establecer reglas de fuente unica de verdad.
- No modificar logica, UI, base de datos ni datos.

### Fase 1: capa de repositorios

- Encapsular acceso a almacenamiento local y Supabase.
- Evitar nuevas lecturas directas dispersas de `localStorage`.
- Mantener compatibilidad con datos actuales.

### Fase 2: fuente unica para catalogos

- Consolidar desarrollos, obras, contratistas, trabajadores y visitantes.
- Cambiar capturas operativas para referenciar IDs y conservar snapshots solo para documentos emitidos.

### Fase 3: evidencias como entidad

- Crear indice unico de evidencias.
- Asociar evidencias por entidad y `entity_id`.
- Mantener lectura de arrays heredados.

### Fase 4: separar registros operativos

- Formalizar inspecciones, incidencias, investigaciones y asistencia.
- Mantener `registros` como puente si es necesario.

### Fase 5: documentos y reportes

- Convertir historicos en vista documental.
- Crear documentos emitidos con snapshot.
- Separar reporte de dato operativo.

### Fase 6: cumplimiento granular

- Pasar de estado global a obra/NOM/criterio.
- Relacionar criterios con evidencias, inspecciones y acciones.

### Fase 7: formatos dinamicos integrados

- Integrar `dynamic_formats` mediante wrapper.
- Definir destino funcional de cada formato dinamico.
- Evitar que formatos dinamicos creen datos paralelos.

### Fase 8: auditoria formal

- Persistir auditoria como entidad formal.
- Registrar usuario, accion, modulo, entidad, obra y contexto.

### Fase 9: limpieza final

- Retirar rutas heredadas.
- Eliminar duplicidad de funciones.
- Convertir dashboard e historicos en vistas consultivas puras.

## 10. Reglas para futuros cambios

1. Ningun cambio nuevo debe escribir directamente en mas de una fuente para el mismo dato.
2. Si un modulo necesita datos de otra entidad, debe referenciar el ID maestro.
3. Los campos de texto duplicados solo se permiten como snapshot historico en documentos emitidos.
4. Todo nuevo almacenamiento local debe tener contrato documentado antes de implementarse.
5. Todo nuevo acceso remoto debe pasar por un wrapper publico, no por cliente Supabase expuesto.
6. Las evidencias deben asociarse a entidades, no duplicarse por modulo.
7. Los reportes PDF/Excel no deben modificar registros fuente.
8. Los historicos deben distinguir `registro operativo`, `documento emitido`, `snapshot` y `vista virtual`.
9. Las migraciones deben preservar lectura de datos heredados.
10. Todo modulo nuevo debe declarar si crea, modifica o solo consulta cada entidad.
11. La UI no debe mezclar captura y consulta ejecutiva en el mismo flujo si pertenecen a responsabilidades distintas.
12. Antes de tocar base de datos, debe existir un mapa entre contrato actual, entidad destino y estrategia de compatibilidad offline.

## 11. Modelo futuro de Evidencias como Entidad Transversal

Las evidencias deben evolucionar de arreglos embebidos dentro de cada payload a una entidad transversal reutilizable. La transicion no debe romper reportes, historicos ni registros actuales; por eso la regla obligatoria es mantener lectura dual entre arrays heredados y la entidad centralizada futura durante todo el periodo de migracion.

### 11.1 Modelo propuesto de entidad evidencia

La entidad `evidencia` representa cualquier archivo, fotografia, imagen, documento o soporte asociado a un registro operativo, documental o normativo.

Responsabilidades de la entidad:

- Identificar de forma unica cada evidencia.
- Relacionar la evidencia con la obra y con la entidad origen.
- Separar el archivo fisico de la referencia funcional.
- Mantener estado de sincronizacion offline/remoto.
- Permitir snapshots en documentos emitidos sin duplicar el archivo.

### 11.2 Campos minimos

| Campo | Descripcion |
|---|---|
| `id` | Identificador unico de la evidencia. |
| `work_id` | Obra relacionada. |
| `entity_type` | Tipo de entidad origen: inspeccion, incidencia, cumplimiento, documento, formato dinamico, etc. |
| `entity_id` | Identificador del registro origen. |
| `module` | Modulo funcional que genero o vinculo la evidencia. |
| `file_name` | Nombre original o normalizado del archivo. |
| `file_type` | Tipo general: imagen, pdf, documento, otro. |
| `mime_type` | Tipo MIME del archivo. |
| `storage_path` | Ruta futura en Supabase Storage. |
| `public_url` / `signed_url` | URL de acceso cuando aplique. |
| `thumbnail_path` | Ruta de miniatura si se genera. |
| `comment` | Comentario operativo de la evidencia. |
| `status` | Estado funcional de la evidencia. |
| `sync_status` | Estado de sincronizacion offline/remoto. |
| `created_by` | Usuario que agrego la evidencia. |
| `created_at` | Fecha de creacion. |
| `updated_at` | Fecha de ultima actualizacion. |
| `metadata` | Datos adicionales: ubicacion, criterio NOM, campo dinamico, version, etc. |

### 11.3 Estados sugeridos

Estados funcionales:

- `active`: evidencia vigente.
- `linked`: evidencia asociada a una entidad origen.
- `archived`: evidencia conservada por historico/documento.
- `deleted`: baja logica; no eliminar fisicamente salvo regla administrativa.

Estados de sincronizacion:

- `local`: existe solo en el dispositivo.
- `pending_upload`: pendiente de subir a Storage.
- `uploaded`: archivo subido correctamente.
- `failed`: fallo de subida o sincronizacion.
- `pending_link`: archivo subido pero relacion pendiente de confirmar.
- `synced`: evidencia y relacion sincronizadas.

### 11.4 Relaciones con modulos

| Modulo | Relacion propuesta |
|---|---|
| Inspecciones | `entity_type=inspection`; multiples evidencias por inspeccion, hallazgo o accion. |
| Incidencias / Accidentes | `entity_type=incident` o `investigation`; fotos, croquis, condiciones, lesionados, acciones inmediatas. |
| Cumplimiento normativo | `entity_type=compliance`; metadata con NOM, criterio, revision y responsable. |
| Documentos | Los documentos emitidos referencian evidencias usadas en el snapshot, sin convertirse en fuente maestra. |
| Formatos dinamicos | Campos tipo evidencia crean referencias a `evidencia`; `captured_data` guarda IDs y snapshot minimo. |

Relaciones recomendadas:

```text
evidencia 1..n -> inspeccion
evidencia 1..n -> incidencia / investigacion
evidencia 1..n -> cumplimiento criterio
evidencia 1..n -> documento emitido como snapshot
evidencia 1..n -> format_record
```

### 11.5 Compatibilidad con arrays heredados

Actualmente existen evidencias embebidas en arreglos como:

```text
evidence
firstAidEvidence
equipmentEvidence
incidentEvidence
entry.evidence
```

Reglas de compatibilidad:

1. No migrar arrays heredados de golpe.
2. No eliminar campos `evidence` existentes.
3. Crear adaptadores que lean ambos formatos:
   - `evidence_ids` si existe entidad centralizada.
   - `evidence` si el registro es heredado.
4. Los reportes historicos deben seguir mostrando evidencias embebidas.
5. Los nuevos registros podran guardar referencias centralizadas y snapshot minimo.
6. Al editar un registro heredado, no sobrescribir su arreglo de evidencias salvo migracion explicita.

Snapshot minimo sugerido:

```json
{
  "evidence_ids": ["ev_001"],
  "evidence_snapshot": [
    {
      "id": "ev_001",
      "comment": "Tablero sin proteccion",
      "created_at": "2026-07-07T00:00:00.000Z"
    }
  ]
}
```

Regla obligatoria: toda lectura de evidencias debe soportar lectura dual entre arrays heredados y entidad centralizada futura hasta que exista una migracion completa validada.

### 11.6 Estrategia offline

Flujo offline propuesto:

1. El usuario adjunta una evidencia desde un modulo operativo.
2. El sistema genera `id` local.
3. El archivo se conserva temporalmente como base64, blob o referencia local compatible con la app actual.
4. Se crea registro local de evidencia con `sync_status=local` o `pending_upload`.
5. El registro operativo guarda `evidence_ids` y snapshot minimo cuando aplique.
6. Al recuperar conexion, la cola sube archivos pendientes.
7. Si la subida funciona, se actualiza `storage_path` y `sync_status=uploaded`.
8. Si la relacion con la entidad origen se confirma, se marca `sync_status=synced`.
9. Si falla, se conserva la evidencia local y se reintenta.

Contratos locales futuros sugeridos:

```text
gvc-evidencias-v1
gvc-evidencias-pending-v1
```

Estos contratos no deben sustituir inmediatamente los arrays actuales. Deben convivir hasta completar migracion y validacion de reportes.

### 11.7 Estrategia futura con Supabase Storage

Bucket recomendado:

```text
evidencias
```

Estructura de rutas:

```text
evidencias/{work_id}/{entity_type}/{entity_id}/{evidence_id}/{filename}
```

Ejemplos:

```text
evidencias/obra_123/inspection/insp_456/ev_789/foto-tablero.jpg
evidencias/obra_123/compliance/nom031/ev_321/evidencia-andamio.jpg
evidencias/obra_123/dynamic_format_record/rec_555/ev_777/firma.jpg
```

Reglas futuras:

- Guardar en base de datos el `storage_path`, no depender solo de URL publica.
- Usar URL firmada cuando el archivo no deba ser publico.
- La eliminacion normal debe ser logica.
- La eliminacion fisica debe reservarse para administradores o politicas de retencion.
- Los documentos emitidos deben conservar snapshot para que el PDF historico no cambie si una evidencia se elimina o actualiza.

Politicas sugeridas:

- Lectura: usuarios autenticados activos.
- Insercion: usuarios con permiso operativo o administrador.
- Actualizacion: usuario responsable, rol operativo autorizado o administrador.
- Eliminacion logica: usuario autorizado o administrador.
- Eliminacion fisica: solo administrador.

### 11.8 Riesgos

| Riesgo | Impacto |
|---|---|
| Duplicidad temporal entre arrays heredados y entidad evidencia | Puede mostrar evidencias duplicadas si no hay adaptador. |
| Evidencias base64 en localStorage | Puede crecer demasiado el almacenamiento local. |
| Evidencias antiguas sin `id` | Requieren normalizacion gradual. |
| Fallos de subida a Storage | El registro operativo puede existir sin archivo remoto. |
| Reportes historicos | Pueden cambiar si consultan archivo vivo en vez de snapshot. |
| Formatos dinamicos | Pueden duplicar archivos si guardan evidencia dentro de `captured_data`. |
| RLS / permisos | Una evidencia visible por error puede exponer informacion sensible. |
| Migracion incompleta | Puede romper inspecciones, incidencias o cumplimiento anteriores. |

### 11.9 Fases de implementacion

#### Fase E1: contrato documental

- Definir entidad evidencia.
- Documentar campos, estados y lectura dual.
- No cambiar codigo ni base de datos.

#### Fase E2: repositorio read-only

- Agregar repositorio futuro `GraviRepositories.evidences`.
- Leer arrays heredados y entidad futura.
- No cambiar escrituras.

#### Fase E3: adaptador de evidencias

- Crear funcion de normalizacion.
- Convertir strings/base64/objetos heredados a una forma comun de lectura.
- Mantener compatibilidad con reportes actuales.

#### Fase E4: captura nueva con entidad evidencia

- Nuevas evidencias se registran con `id`.
- Registros operativos guardan `evidence_ids`.
- Mantener snapshot minimo.

#### Fase E5: cola offline

- Implementar `gvc-evidencias-pending-v1`.
- Reintentar subidas fallidas.
- Mostrar estado de sincronizacion.

#### Fase E6: Supabase Storage

- Crear bucket y politicas.
- Subir archivos desde wrapper seguro.
- Registrar `storage_path`.

#### Fase E7: documentos y reportes

- PDF y Excel consumen evidencias por adaptador.
- Documentos emitidos guardan snapshot.

#### Fase E8: migracion gradual

- Migrar arrays heredados bajo demanda.
- Validar que reportes antiguos sigan mostrando evidencias.
- Retirar lectura heredada solo cuando no existan datos legacy activos.

## Estado de cierre de Fase 0

La Fase 0 queda definida como documentacion tecnica. No incluye cambios funcionales, migraciones, modificaciones visuales ni cambios de base de datos.
