# Corrección de envío de incidencias v49

## Causa raíz

El asistente permitía llegar a **Revisión y guardar** sin validar la fecha y hora del evento. La revisión tampoco incluía ese campo, por lo que mostraba **Listo para enviar** aunque el control `dateTime` requerido estuviera vacío. Al pulsar **Enviar reporte**, `reportValidity()` intentaba enfocar un campo ubicado en un paso oculto y el usuario no recibía ninguna explicación visible.

También se detectó que el botón **Siguiente** no validaba el primer paso y que un registro nuevo podía reutilizar el identificador de un expediente abierto anteriormente.

## Corrección

- Fecha y hora local precargadas al abrir el formulario.
- Validación del paso 1 antes de avanzar.
- Revisión coherente con todos los campos obligatorios.
- Navegación automática al primer campo faltante.
- Mensaje visible con los campos pendientes.
- Protección contra doble envío.
- Restablecimiento de `currentRecord` al crear un evento nuevo.
- Caché PWA incrementada a `gravi-sst-v2-shell-v49`.
