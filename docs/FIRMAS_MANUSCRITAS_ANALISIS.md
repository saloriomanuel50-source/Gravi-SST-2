# Análisis del sistema transversal de firmas manuscritas

## Arquitectura encontrada

GRAVI SST es una SPA sin framework. `bootstrap.js` carga módulos, `supabase.js` centraliza sesión/RLS/Storage, `system.js` contiene módulos operativos, `work-permits.js` implementa permisos y `dynamic-formats.js` formatos configurables. La persistencia offline actual combina `localStorage`; las evidencias binarias se comprimen antes de Storage, pero no existe IndexedDB transversal.

No existe componente canvas ni Pointer Events para firma. Las firmas actuales son líneas físicas, nombres o textos. El permiso conserva autorizaciones e instantánea, pero no una entidad transversal de firma.

## Componentes reutilizables

- Modales y estilos adaptables existentes.
- Perfil autenticado y permisos personalizados.
- Función de petición Supabase y bucket privado.
- Cola offline y eventos `online`.
- Generación institucional HTML/CSS e impresión.
- Historial y snapshots de permisos.
- Configuración extensible de formatos dinámicos.

## Archivos previstos

- Nuevos: `src/signatures.js`, `src/styles/signatures.css`, `database/document_signatures.sql`, documentación y pruebas.
- Modificados: `index.html`, `bootstrap.js`, `supabase.js`, `work-permits.js`, `service-worker.js` y validador del build.

## Modelo propuesto

`document_signatures` relacionará una firma con tipo, ID, versión, slot, firmante, aceptación, hash, estado y ruta privada. `document_signature_events` conservará captura, carga, invalidación, reemplazo y sincronización. La imagen PNG será exclusiva del documento; los trazos JSON sirven para auditoría, nunca para reaplicar la firma.

El binario offline se guardará en IndexedDB con `client_uuid`; localStorage conservará sólo metadatos pequeños. La sincronización seguirá el orden documento → PNG → fila → evento.

## Módulos prioritarios

1. Permiso de Trabajo.
2. ATS, suspensión, entrega de EPP e inspecciones.
3. Pláticas, asistencia, investigaciones, incidentes y liberaciones.
4. Formatos dinámicos.

## Riesgos de regresión

- El código operativo es monolítico: el componente debe permanecer aislado.
- Canvas debe escalar por DPR sin perder trazos.
- Cambios relevantes deben invalidar, no borrar.
- Storage privado necesita políticas probadas por documento/obra.
- Autorización no debe completarse si faltan firmas requeridas o sincronización.
- No debe confundirse con firma electrónica avanzada o certificada.

## Estrategia de migración

No migrar líneas físicas como firmas digitales. Los documentos históricos permanecen sin firma capturada. Activar primero slots del permiso; los demás tipos sólo se registrarán en configuración hasta una integración gradual. No ejecutar SQL en producción durante esta tarea.
