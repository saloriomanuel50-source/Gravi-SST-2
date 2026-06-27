# Preparación para despliegue web y PWA

## Cambios realizados

- Se revisó la estructura estática de la aplicación y su orden de carga.
- Todas las hojas de estilo, scripts, imágenes y recursos PWA usan rutas relativas `./`.
- Se agregó `manifest.json` con nombre, colores, alcance, inicio e iconos instalables.
- Se agregaron iconos PNG de 192 y 512 px en `assets/`, derivados del recurso oficial sin modificar el archivo original.
- Se agregó `service-worker.js` para precachear la estructura principal y responder sin conexión.
- Se agregó `pwa.js` para registrar el service worker después de cargar la aplicación.
- Se agregaron meta tags para tema, instalación móvil y comportamiento en iOS.
- La capa PWA mantiene las mismas rutas y ahora incluye `supabase.js` y `bootstrap.js` dentro del núcleo precacheado.
- `localStorage` permanece como caché y contingencia; la configuración de Supabase se documenta en `SUPABASE_GUIA.md`.

## Archivos agregados

- `manifest.json`
- `service-worker.js`
- `pwa.js`
- `assets/pwa-icon-192.png`
- `assets/pwa-icon-512.png`
- `PWA_PREPARACION.md`

## Archivo modificado

- `index.html`

## Estrategia de caché

El service worker intenta obtener cada recurso desde la red y actualiza la caché cuando hay conexión. Si la red falla, responde con la copia almacenada. Para navegaciones sin conexión utiliza `index.html` como respaldo.

La versión actual de caché es `gravi-sst-shell-v3`. Cuando cambien archivos principales en futuras publicaciones, debe incrementarse este nombre para retirar la caché anterior durante la activación.

## Publicación

La carpeta `app-inspecciones` puede publicarse como sitio estático:

- GitHub Pages: usar la carpeta como raíz del sitio o copiar su contenido al directorio publicado.
- Netlify: seleccionar `app-inspecciones` como directorio de publicación.
- Vercel: configurar `app-inspecciones` como directorio raíz de un proyecto estático.

No se requiere comando de compilación.

## Condiciones para instalación

- Publicar mediante HTTPS. `localhost` también se considera un contexto seguro para pruebas.
- Abrir la aplicación una vez con conexión para instalar el service worker y llenar la caché.
- Utilizar la opción `Instalar aplicación` o `Agregar a pantalla de inicio` del navegador.

## Persistencia actual

Los datos continúan almacenados exclusivamente en `localStorage` del navegador y del dominio donde se abra la aplicación. Publicarla en un dominio nuevo no transfiere automáticamente los datos de otro origen. La migración de almacenamiento queda fuera de esta fase.

## Validación recomendada después de publicar

1. Abrir la URL HTTPS y comprobar que no existan errores de carga.
2. Revisar `Manifest` y `Service Workers` en las herramientas del navegador.
3. Recargar una vez y activar modo sin conexión.
4. Confirmar que Inicio, Desarrollos y los recursos visuales continúen disponibles.
5. Instalar la aplicación en escritorio y celular.

## Validación realizada

- `manifest.json` se analizó correctamente como JSON.
- `app.js`, `system.js`, `supabase.js`, `bootstrap.js`, `extensions.js`, `corporate-documents.js`, `pwa.js` y `service-worker.js` superaron la validación de sintaxis.
- Los iconos fueron verificados con dimensiones reales de 192 x 192 y 512 x 512 px.
- Se levantó un servidor HTTP local y los 20 recursos del núcleo respondieron con estado `200` y tipos MIME correctos.
- El navegador automatizado solicitó `index.html`, el manifiesto, `pwa.js`, `service-worker.js` y todo el núcleo precacheado. La lectura visual de la pestaña agotó el tiempo de la sesión, por lo que la instalación visible y el modo sin conexión deben confirmarse en Chrome o Edge después de publicar o desde `localhost`.
