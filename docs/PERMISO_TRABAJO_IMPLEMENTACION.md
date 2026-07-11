# Implementación del Permiso General de Trabajo

El módulo permanece integrado en la navegación existente. Incluye listado adaptable, captura en nueve secciones, autoguardado local, selección múltiple, controles por actividad, las 20 combinaciones oficiales de riesgo, riesgo residual, validaciones, estados y vista HTML/CSS Carta.

La validación final tomó como autoridad `docs/referencias/GVC-SSH-FMT-002 Permiso de trabajo.xls`. Se corrigieron versión 00, título, matriz 5×4, severidad/frecuencia, peligros, EPP, equipo adicional, 24 medidas preventivas, firmas, extensiones y composición institucional. Tipos de trabajo, controles dinámicos, participantes, riesgo residual, estados, evidencia, historial y snapshot son ampliaciones digitales.

El modelo propone `work_permits`, `work_permit_approvals`, `work_permit_evidence` y `work_permit_history`, con RLS y permisos personalizados. El service worker permanece en `v28`.

Pendientes: la cola local todavía no demuestra sincronización remota con `work_permits`; carga/compresión de evidencia y persistencia PDF no están conectadas al módulo; RLS por transición debe endurecerse y probarse; Storage requiere políticas reales. No está listo para producción.

No se realizó despliegue a Vercel ni se ejecutó SQL contra producción.
