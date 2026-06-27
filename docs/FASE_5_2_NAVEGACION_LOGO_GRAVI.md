# Fase 5.2 - Navegación, barra lateral y logotipo GRAVI

Fecha: 20 de junio de 2026

## Resumen

La intervención se limitó a navegación, barra lateral, flujo inicial e identidad visual. No se modificó la lógica funcional de obras, trabajadores, contratistas, asistencia, reportes, inspecciones, cumplimiento ni históricos.

## Cambios realizados

### Logotipo oficial

- Se sustituyó el logotipo recreado de la barra lateral por la imagen oficial adjunta `GRAVI constructora`.
- El archivo se copió sin edición, recorte, filtros ni cambio de color.
- Se conservaron sus proporciones originales de 1536 × 1024 píxeles.
- Se verificó que el archivo integrado y el adjunto tienen el mismo hash SHA-256.
- No se utiliza una letra G, GVC ni texto recreado como sustituto en la barra lateral.

Activo integrado:

`assets/gravi-constructora-oficial.jpeg`

### Barra lateral

- Fondo grafito oscuro.
- Verde corporativo como color de selección e interacción.
- Gris metálico para elementos secundarios.
- Blanco para textos principales.
- Gris claro para iconos y textos secundarios.
- Eliminación del azul genérico en estados activos de la barra.
- Iconos vectoriales visibles en todos los estados.

### Menú retráctil de escritorio

- Ancho desplegado: 232 px.
- Ancho contraído: 76 px.
- Al contraer se ocultan etiquetas y encabezados, pero permanecen los iconos.
- El logotipo oficial permanece visible de forma proporcional.
- El contenido principal y la barra superior expanden su área automáticamente.
- El estado se guarda en `localStorage` con la clave `gvc-sidebar-collapsed-v1`.
- La preferencia se conserva al navegar y al recargar la aplicación.

### Menú móvil

- Mantiene el comportamiento de panel superpuesto.
- El botón de hamburguesa abre y cierra el panel.
- El fondo oscuro cierra el menú al tocarlo.
- La preferencia de escritorio no reduce el ancho del panel móvil.
- Se verificó que no existe desbordamiento horizontal de la página.

## Flujo de navegación

El sistema ahora separa claramente cuatro niveles:

`Inicio del sistema > Desarrollo > Obra > Dashboard de obra`

### Inicio

Muestra tarjetas creadas dinámicamente a partir de los desarrollos existentes. Cada tarjeta presenta:

- Obras activas.
- Trabajadores activos.
- Contratistas activos.
- Estado del desarrollo.
- Botón `Ver obras`.

### Desarrollo

Muestra únicamente las obras del desarrollo seleccionado. Cada obra presenta:

- Nombre y ubicación.
- Estatus.
- Fecha de inicio.
- Trabajadores.
- Contratistas.
- Botón `Entrar a obra`.

### Obra

Al entrar se conserva la obra activa existente y se abre el dashboard sin alterar sus indicadores ni módulos.

El selector de obra de la barra superior permite regresar al desarrollo. La selección de contexto se guarda en `gvc-work-context-v1` para conservar la obra al recargar.

## Menú según contexto

### Antes de entrar a una obra

- Inicio.
- Desarrollos.
- Obras.
- Históricos generales.
- Administración.

`Históricos generales` abre los filtros existentes con todas las obras seleccionadas. `Administración` conserva la pantalla existente para crear, editar, cerrar, eliminar lógicamente o recuperar obras.

### Dentro de una obra

- Dashboard.
- Contratistas.
- Trabajadores.
- Visitantes.
- Asistencia.
- Fuerza de trabajo.
- Reporte diario.
- Inspecciones.
- Accidentes.
- Incidentes.
- Gafetes.
- Cumplimiento normativo.
- Matriz de cumplimiento.
- Reporte mensual.
- Históricos de la obra.

El acceso `Incidentes` reutiliza los reportes existentes de tipo incidente y muestra un estado vacío cuando no hay registros. El acceso `Reporte mensual` reutiliza la programación y generación mensual implementada en Fase 5.

## Ruta visual

Se incorporó un breadcrumb persistente sobre todas las vistas.

Ejemplos:

- `Inicio > Obras`
- `Desarrollos > Residencial Norte`
- `Residencial Norte > Obra QA-001 > Dashboard`
- `Residencial Norte > Obra QA-001 > Cumplimiento normativo`

Los niveles Desarrollo y Obra son interactivos y permiten regresar sin perder datos.

## Archivos modificados

- `index.html`: logotipo, menús contextuales, iconos, breadcrumb y vistas de navegación.
- `system.js`: contexto de navegación, agrupación por desarrollo, rutas y persistencia del menú.
- `LEEME.txt`: referencia de esta fase.

## Archivos agregados

- `phase5-2.css`: paleta, barra retráctil, tarjetas de desarrollo y comportamiento adaptable.
- `assets/gravi-constructora-oficial.jpeg`: copia exacta del logotipo entregado.
- `FASE_5_2_NAVEGACION_LOGO_GRAVI.md`: documentación de la implementación.

## Cómo probar el menú retráctil

1. Abra `index.html` en Chrome o Edge con un ancho mayor a 800 px.
2. Pulse el botón `☰`.
3. Confirme que la barra se reduce, desaparecen los textos y permanecen los iconos.
4. Navegue a otro módulo y confirme que continúa contraída.
5. Recargue la página y confirme que conserva el estado.
6. Pulse nuevamente `☰` y confirme que se restaura el ancho y el logotipo completo.
7. Reduzca la ventana a menos de 800 px.
8. Confirme que `☰` abre el panel superpuesto y que el fondo oscuro lo cierra.

## Cómo probar Inicio > Desarrollo > Obra

1. Desde una obra, pulse el selector de obra en la barra superior para salir al desarrollo.
2. Pulse `Desarrollos` para consultar todas las tarjetas.
3. Seleccione `Ver obras` en un desarrollo.
4. Confirme que sólo aparecen sus obras.
5. Pulse `Entrar a obra`.
6. Confirme que abre el dashboard de esa obra.
7. Abra Cumplimiento normativo u otro módulo.
8. Confirme la ruta `Desarrollo > Obra > Módulo actual`.

## Validación realizada

- Carga del logotipo a resolución original.
- Menú global y menú de obra.
- Agrupación dinámica de desarrollos.
- Entrada y salida de obra.
- Menú contraído con iconos visibles.
- Persistencia después de recarga.
- Expansión del área principal.
- Overlay móvil y cierre por fondo oscuro.
- Históricos generales sin obra preseleccionada.
- Incidentes sin registros.
- Acceso contextual al reporte mensual.
- Breadcrumb de desarrollo, obra y módulo.
- Consola del navegador sin errores de aplicación.
