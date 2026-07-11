# Implementación transversal de firmas manuscritas

Se creó `GraviSignatures`, componente general basado en canvas y Pointer Events para touch, pen y mouse. Produce PNG transparente, trazos JSON, dimensiones, número de trazos, fecha, consentimiento y metadatos del firmante. No conserva perfiles de firma ni permite reutilización automática.

Los Blobs offline viven en IndexedDB y se sincronizan mediante `client_uuid` al bucket privado `document-signatures`. La configuración central declara slots por tipo documental. El Permiso de Trabajo activa responsable del contratista, Supervisor SST y slots de cierre; ATS, suspensión, EPP, inspección y formatos dinámicos quedan preparados sin integración visual prematura.

Los cambios relevantes comparan el hash de contenido, invalidan firmas sin borrarlas y registran historial local. La base ofrece tabla de eventos y RPC de invalidación. Autorización y activación exigen firmas vigentes y sincronizadas tanto en UI como en el trigger de permisos.

No es firma electrónica avanzada ni certificada. No se ejecutó SQL ni se desplegó.
