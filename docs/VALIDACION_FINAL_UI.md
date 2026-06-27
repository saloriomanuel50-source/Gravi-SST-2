# Validación final de interfaz y migración

## Funcionalidades ya implementadas

- Navegación `Inicio > Desarrollo > Obra > Dashboard`.
- Menú global antes de seleccionar obra y menú contextual dentro de una obra.
- Barra lateral retráctil con iconos visibles y ampliación del área de trabajo.
- Persistencia del menú mediante `localStorage` y recuperación después de recargar.
- Panel lateral superpuesto en móvil.
- Logotipo oficial GRAVI sin alteraciones, integrado sobre fondo grafito.
- Exclusión visual de `Obra general` cuando existen obras reales.

## Ajustes realizados

- Se identifican claramente `Registros existentes` y `Obra general` como desarrollo y obra heredados cuando son los únicos disponibles.
- Cuando existen obras reales, la obra heredada no aparece como desarrollo, obra principal ni tarjeta administrativa.
- Si quedan registros heredados, se muestra un aviso de migración con el total de elementos pendientes y un selector de obra destino.
- La asignación requiere selección explícita y confirmación antes de modificar datos.
- La fusión reasigna reportes, inspecciones, contratistas, trabajadores, visitantes, asistencias, investigaciones, históricos, actividad y auditoría normativa.
- Las marcas de asistencia existentes en la obra destino tienen prioridad para evitar sobrescrituras.
- Se conservan las instantáneas documentales históricas y se registra la migración con fecha, usuario, destino y cantidad.
- La obra heredada queda marcada como migrada y fuera de la navegación después de completar el proceso.
- Las tareas automáticas pertenecientes al contenedor heredado se retiran; la obra real mantiene su propia programación.
- Se conservó el ajuste visual compacto del logotipo y el comportamiento validado del menú hamburguesa.

## Validación funcional

1. Abrir la aplicación con registros heredados y al menos una obra real.
2. Confirmar que Inicio muestra primero los desarrollos reales y no muestra `Obra general` como tarjeta principal.
3. Seleccionar una obra en el aviso de migración y pulsar `Asignar registros`.
4. Confirmar la operación y verificar que el dashboard abierto corresponda a la obra destino.
5. Revisar sus históricos, personal y documentos para confirmar la reasignación.
6. Pulsar `☰`, comprobar 232 px > 76 px, recargar y confirmar que se mantiene contraído.
7. Pulsar nuevamente `☰` y comprobar la restauración de textos y ancho.
8. En móvil, comprobar que el panel abra a 280 px y cierre mediante el fondo oscuro.

## Elementos pendientes

- No hay pendientes funcionales dentro del alcance solicitado.
- Antes del despliegue general debe realizarse una migración de prueba con una copia de los datos reales del dispositivo de obra y revisar el conteo resultante.
