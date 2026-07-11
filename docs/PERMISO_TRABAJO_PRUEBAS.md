# Pruebas del Permiso de Trabajo

## Correcciones verificadas

| Problema | Causa | Archivo | Solución | Prueba |
|---|---|---|---|---|
| Matriz 5×5 incorrecta | Transcripción desde imagen | JS | Matriz oficial 5×4 | 20/20 aserciones |
| Denominaciones incorrectas | No se había leído el Excel | JS/docs/tests | Aislada, cuatro severidades, Grave | `test:permits` |
| Versión 01 | Valor no contrastado | JS/SQL | Versión 00 | build/búsqueda |
| Catálogos genéricos | Fuente incompleta | JS | Peligros, EPP, equipo y 24 medidas oficiales | comparación A1:J64 |
| Residual no editable | Tabla sólo inicial | JS | Frecuencia, severidad y resultado residual | prueba/código |
| Rechazo/permisos parciales | Flujo incompleto | JS | Rechazo y permiso por acción | sintaxis/build; RLS pendiente |
| PDF incompleto | Vista basada en imagen | JS/CSS | Textos, bandas, extensiones, firmas y pie | HTML/CSS; impresión pendiente |
| Riesgo de overflow móvil | Grillas rígidas | CSS | `minmax(0,1fr)` y contención | CSS; navegador pendiente |

## Automatizadas ejecutadas

- `node --check src/work-permits.js`: correcto.
- `npm.cmd run test:permits`: 20/20 equivalencias, máximo y residual correctos.
- `npm.cmd run build`: correcto.

## Validación visual no ejecutable

El 11/07/2026 se agregó y probó `npm.cmd run dev` en `http://localhost:4173`. Shell, CSS, JS, manifest, service worker y rutas de permisos respondieron 200; un recurso inexistente respondió 404 y traversal codificado respondió 403. En navegador no hubo errores de consola.

La validación funcional quedó bloqueada antes del módulo: la pantalla mostró `Supabase no esta configurado en este despliegue.` No se usaron credenciales ni producción. En 390×844, la pantalla de autenticación tuvo `clientWidth=390` y `scrollWidth=390`, pero esto no aprueba la adaptabilidad del formulario.

Evidencias del bloqueo: `docs/evidencias/permiso-validacion-login-escritorio.png` y `docs/evidencias/permiso-validacion-login-movil-390x844.png`.

## Pendientes

- Los 10 casos interactivos solicitados.
- Doble ejecución SQL, CRUD, roles/RLS, aprobaciones, historial, evidencia y snapshot.
- Storage: compresión, carga, lectura, eliminación y acceso por obra.
- PDF: Carta 100 %, páginas, firmas, pie, URL e inmutabilidad histórica.
- Sincronización: se implementó upsert, orden, intentos, propietario, versión y conflicto; falta probarlo contra Supabase y otro navegador.
- Evidencias: se implementó compresión/carga/metadatos y políticas; faltan las pruebas remotas JPG/PNG/accesos/eliminación.
- PDF: `window.print()` no produce un Blob PDF. Persistencia PDF continúa bloqueada; no se guardó HTML fingiendo ser PDF.

No se declara listo para producción.
