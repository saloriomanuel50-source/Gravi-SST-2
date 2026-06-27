# GRAVI SST v2.0

Sistema GRAVI SST para gestion de seguridad, salud, inspecciones, cumplimiento normativo, evidencias, asistencia, historicos y operacion de obra.

Esta version es una reingenieria de organizacion interna basada en la version estable GRAVI SST v1.4. No cambia la logica de negocio ni el modelo funcional; solo ordena el repositorio para despliegue profesional en GitHub, Vercel/Netlify, Supabase y PWA.

## Arquitectura

```text
/
|-- api/                 Funciones serverless para Vercel
|-- assets/              Logo, iconos PWA e imagenes estaticas
|-- database/            SQL de Supabase y Storage
|-- docs/                Documentacion historica y operativa
|-- src/                 Codigo JavaScript de la aplicacion
|-- src/styles/          Hojas de estilo
|-- tests/               Espacio para pruebas futuras
|-- backups/             Notas y respaldos controlados
|-- index.html           Entrada principal
|-- manifest.json        Manifest PWA
|-- service-worker.js    Service worker en raiz para conservar scope PWA
|-- vercel.json          Encabezados de despliegue
```

## Modulos funcionales conservados

- Autenticacion con Supabase Auth.
- Usuarios y roles: Administrador, Supervisor SST y Consulta.
- Desarrollos y obras.
- Dashboard de obra.
- Contratistas, trabajadores, visitantes y asistencia.
- Reporte diario e inspecciones.
- Evidencia fotografica y sincronizacion offline.
- Investigacion de accidentes.
- Cumplimiento normativo y programacion mensual.
- Historicos y documentos corporativos.
- Generacion de PDF mediante vistas de impresion.
- PWA instalable y service worker.

## Instalacion local

El proyecto incluye `package.json` y `package-lock.json` para despliegue compatible con Vercel. No requiere dependencias externas; el lockfile documenta el estado limpio del paquete.

1. Abrir una terminal en la carpeta `gravi-sst-v2.0`.
2. Instalar:

```powershell
npm install
```

3. Validar build:

```powershell
npm run build
```

4. Levantar un servidor estatico local, por ejemplo:

```powershell
npx serve .
```

3. Abrir la URL local indicada por el servidor.

La aplicacion no debe abrirse directamente como archivo local si se requiere probar PWA, service worker o APIs serverless.

## Variables de entorno

Para Vercel se requieren:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` solo debe usarse del lado serverless para acciones administrativas como invitacion de usuarios. No debe exponerse en el navegador.

## Supabase

Ejecutar los archivos en este orden:

1. `database/schema.sql`
2. `database/storage_evidencias.sql` si se usara Supabase Storage para evidencias fotograficas.

El sistema mantiene compatibilidad con la sincronizacion existente y conserva localStorage como cache operativa posterior al inicio de sesion.

## Despliegue en Vercel

1. Subir esta carpeta a un repositorio GitHub.
2. Crear proyecto en Vercel apuntando a la raiz del repositorio.
3. Configurar las variables de entorno.
4. Confirmar que Vercel detecte:
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `.`
5. Desplegar.
6. Validar:
   - `/api/supabase-config`
   - `/api/invite-user`
   - `manifest.json`
   - `service-worker.js`
   - inicio de sesion
   - sincronizacion Supabase

## PWA y offline

El service worker permanece en la raiz para conservar alcance completo sobre la aplicacion. Los recursos principales se cachean desde:

- `index.html`
- `manifest.json`
- `src/`
- `src/styles/`
- `assets/`

El cache de v2.0 usa nombre propio para evitar conflicto con versiones anteriores.

## Respaldo

Antes de cambios mayores:

1. Exportar la base de datos desde Supabase.
2. Descargar Storage si hay evidencias fotograficas.
3. Guardar una copia del repositorio.
4. Exportar o respaldar localStorage de equipos criticos si existen registros offline pendientes.

## Restauracion

1. Restaurar SQL en Supabase.
2. Restaurar bucket `evidencias` si aplica.
3. Desplegar esta version.
4. Confirmar variables de entorno.
5. Iniciar sesion con Administrador y validar obras, trabajadores, historicos y evidencias.

## Versionado

- `v1.4`: version estable previa, no modificada por esta reingenieria.
- `v2.0`: reorganizacion profesional del repositorio, sin cambios funcionales deliberados.

## Notas de mantenimiento

- No mover `service-worker.js` fuera de la raiz sin revisar scope PWA.
- No exponer `SUPABASE_SERVICE_ROLE_KEY` en archivos de cliente.
- Mantener scripts de cliente dentro de `src/`.
- Mantener estilos dentro de `src/styles/`.
- Mantener SQL dentro de `database/`.
