# Ajustes finales de navegación

## Ya estaba implementado

- Flujo principal `Inicio > Desarrollo > Obra > Dashboard`.
- Menú global antes de entrar a una obra y menú operativo contextual dentro de ella.
- Barra lateral retráctil en escritorio y panel superpuesto en móvil.
- Persistencia del estado contraído mediante `localStorage`.
- Ruta visual por desarrollo, obra y módulo.
- Logotipo oficial GRAVI integrado como archivo de imagen sin filtros ni alteraciones.

## Correcciones realizadas

- Se consolidó el comportamiento del botón hamburguesa y se sincronizaron sus atributos `aria-expanded` y `aria-label` en escritorio y móvil.
- Al contraer el menú en escritorio se mantienen los iconos, se ocultan textos y el contenido utiliza el ancho liberado.
- El estado de escritorio continúa almacenándose en `gvc-sidebar-collapsed-v1` y se restaura al recargar o navegar.
- Se redujo la altura del bloque del logotipo y se integró sobre el fondo grafito mediante un contenedor discreto. El archivo, los colores y las proporciones del logo no fueron modificados.
- Se redujo también el espacio del logotipo en la vista móvil y en el modo contraído.
- Se corrigió la herencia del ancho contraído: en móvil el panel siempre abre a 280 px aunque en escritorio se haya guardado el estado de 76 px.
- La obra heredada `Obra general` deja de mostrarse en Inicio, Desarrollos y Obras cuando existen obras reales con desarrollo definido.
- La obra heredada y sus registros no se eliminan: se conservan para compatibilidad e históricos.
- Se mantuvo la separación entre menú global y menú contextual de obra.

## Validación

1. Abrir la aplicación en escritorio y pulsar `☰`.
2. Confirmar que la barra pasa de 232 px a 76 px, oculta etiquetas, conserva iconos y amplía el contenido.
3. Recargar la aplicación y comprobar que conserva el estado.
4. Pulsar nuevamente `☰` y confirmar que recupera el ancho y los textos.
5. Abrir en ancho móvil, comprobar la apertura superpuesta y cerrarla con el fondo oscuro.
6. Recorrer `Inicio > Ver obras > Entrar a obra > Dashboard`.
7. Confirmar que antes de entrar se muestra el menú global y dentro de la obra se muestra el menú operativo.
8. Confirmar que la ruta muestra `Desarrollo > Obra > Módulo`.

## Pendiente

- No quedan ajustes funcionales pendientes dentro del alcance solicitado.
- Como validación operativa futura, conviene probar la navegación con la base real de cada dispositivo antes del despliegue general.
