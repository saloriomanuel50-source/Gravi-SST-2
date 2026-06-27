# Reingenieria GRAVI SST v2.0

## Objetivo

Crear una nueva version denominada `GRAVI SST v2.0` a partir de la version estable v1.4, sin modificar la version anterior y sin cambiar la logica de negocio.

## Resultado

Se creo una estructura profesional:

- `api/`
- `assets/`
- `database/`
- `docs/`
- `src/`
- `src/styles/`
- `tests/`
- `backups/`

Tambien se agregaron:

- `package.json`
- `package-lock.json`
- `scripts/validate-build.js`

Estos archivos permiten que Vercel ejecute `npm install` y `npm run build` antes de publicar el sitio.

## Movimientos realizados

- JavaScript de cliente movido a `src/`.
- CSS movido a `src/styles/`.
- Imagenes, logo e iconos PWA conservados en `assets/`.
- SQL de Supabase movido de `supabase/` a `database/`.
- Documentacion `.md` y `.txt` movida a `docs/`.
- APIs serverless conservadas en `api/`.
- `index.html`, `manifest.json`, `service-worker.js` y `vercel.json` conservados en raiz por compatibilidad web/PWA/Vercel.

## Duplicados detectados y excluidos

La version estable contenia copias anidadas del paquete:

- `app-inspecciones/app-inspecciones/`
- `app-inspecciones/app-inspecciones/app-inspecciones/`

Tambien contenia paquetes ZIP internos:

- `app.zip`
- `app-inspecciones.zip` fuera del proyecto fuente

Estos elementos no se copiaron como archivos activos a v2.0 porque no son referenciados por `index.html`, `manifest.json`, `service-worker.js` ni por la carga dinamica de scripts.

## Rutas actualizadas

- `index.html` carga CSS desde `src/styles/`.
- `index.html` carga `supabase.js` y `bootstrap.js` desde `src/`.
- `bootstrap.js` carga los modulos operativos desde `src/`.
- `service-worker.js` precachea recursos desde la nueva estructura.
- `database/storage_evidencias.sql` referencia `database/schema.sql`.

## Compatibilidad conservada

- Supabase Auth.
- Roles y permisos.
- APIs de Vercel.
- Service worker y PWA.
- Modo offline.
- Cache local.
- PDF por impresion.
- Evidencias fotograficas.
- Historicos y documentos.

## Validaciones

- Build local validado con `scripts/validate-build.js`.
- Se valido el script de build mediante gestor de paquetes disponible en el entorno local.
- El entorno local de Codex no tenia `npm` instalado en PATH; Vercel si proporciona `npm` durante el despliegue Node.
- Pendiente de prueba funcional con credenciales reales de Supabase.
- Se recomienda validar en servidor local y despues en Vercel.
