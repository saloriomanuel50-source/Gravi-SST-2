# Implementación del Permiso General de Trabajo

Se integró el módulo en la navegación existente, sin otro router ni aplicación independiente. Incluye listado adaptable, filtros, indicadores, captura en nueve secciones, autoguardado local, selección múltiple, controles por actividad, 25 combinaciones de riesgo, validaciones, transiciones de estado y vista HTML/CSS carta del GVC-SSH-FMT-002.

El modelo Supabase usa `work_permits`, `work_permit_approvals`, `work_permit_evidence` y `work_permit_history`, con índices, RLS, permisos personalizados e instantánea autorizada. El caché del service worker avanzó a `v28`.

Rutas conceptuales se implementan dentro de la navegación SPA existente: lista desde Permisos / ATS, edición por ID en memoria y vista oficial en `reportView`; no se añadió un segundo enrutador.

Archivos principales: `src/work-permits.js`, `src/styles/work-permits.css`, `database/work_permits.sql`, documentación y prueba de matriz. Se modificaron `index.html`, `src/bootstrap.js`, `src/supabase.js`, `service-worker.js` y `package.json`.

No se realizó despliegue a Vercel ni se ejecutó SQL contra producción.
