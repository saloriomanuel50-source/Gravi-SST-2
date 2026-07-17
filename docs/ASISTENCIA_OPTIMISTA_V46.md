# Asistencia optimista v46

La actualización v46 mantiene la navegación v45 y cambia únicamente el flujo de Asistencia y su sincronización.

- El estado local, los botones, el borde de fila y los contadores se actualizan antes de llamar a Supabase.
- Existe un solo manejador delegado de clic y los clics que no cambian el estado se ignoran.
- Las escrituras se serializan por obra/fecha y Supabase usa `upsert` por `(work_id, attendance_date)`.
- La cola offline combina cambios pendientes de la misma fecha y se vacía al recuperar conexión.
- La hidratación remota conserva cualquier asistencia local que todavía esté pendiente.
- El indicador pertenece a la fila y siempre sale del estado `Guardando…` al resolver o fallar.

Versión de caché: `gravi-sst-v2-shell-v45-attendance-v46-v38`. Al activarse elimina los cachés anteriores para impedir mezcla de JavaScript.
