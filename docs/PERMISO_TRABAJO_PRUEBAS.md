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

`package.json` no contiene `dev` ni `start`; sólo build, validate y test. El navegador integrado bloqueó `file://`. No se creó un servidor alternativo. Por tanto no hay evidencia válida de escritorio, 390×844, PDF o consola y no se generaron capturas.

## Pendientes

- Los 10 casos interactivos solicitados.
- Doble ejecución SQL, CRUD, roles/RLS, aprobaciones, historial, evidencia y snapshot.
- Storage: compresión, carga, lectura, eliminación y acceso por obra.
- PDF: Carta 100 %, páginas, firmas, pie, URL e inmutabilidad histórica.
- Sincronización: `gvc-work-permits-pending-v1` no tiene un upsert remoto que vacíe la cola; sólo notifica pendientes al reconectar.

No se declara listo para producción.
