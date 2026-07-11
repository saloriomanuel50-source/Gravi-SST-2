# Firma manuscrita capturada en dispositivo

La firma se captura con dedo, lápiz, mouse o tableta compatible. Abra el slot del documento, verifique nombre, cargo y empresa, lea la declaración, firme y marque el consentimiento. **Borrar** elimina todos los trazos y **Deshacer** elimina el último.

Cada captura pertenece exclusivamente al documento, versión, slot y firmante indicados. No se reutiliza ni constituye firma electrónica avanzada o certificada. Las personas externas firman en presencia del Supervisor SST y no acceden directamente a Storage.

Offline, el PNG Blob y los trazos permanecen en IndexedDB. Al recuperar conexión se carga primero la imagen privada, después el registro y finalmente el evento; el elemento local sólo se elimina tras confirmación. Una autorización sensible exige firmas vigentes y sincronizadas.

En permisos, la firma SST es necesaria para autorizar y las firmas SST + responsable del contratista para activar. Los cambios relevantes invalidan las firmas anteriores sin borrarlas. Cerrado o cancelado bloquea nuevas capturas.

Para base de datos ejecute primero `database/work_permits.sql` y después `database/document_signatures.sql` en un Supabase de prueba. Repita ambos archivos para comprobar idempotencia. No ejecute en producción hasta validar RLS y Storage con Administrador, Supervisor SST, Consulta y permisos personalizados.
