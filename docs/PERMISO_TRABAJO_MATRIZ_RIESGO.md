# Matriz de riesgo — GVC-SSH-FMT-002

Autoridad: hoja `Categorización`, celdas `E3:H10` del Excel oficial. El documento contiene 5 frecuencias × 4 severidades = **20 equivalencias**, no 25. La petición de comprobar 25 posiciones contradice al archivo autoridad.

| Frecuencia / Severidad | I Menor | II Moderado | III Crítica | IV Fatal |
|---|---|---|---|---|
| A Remota | Mínimo | Mínimo | Medio | Grave |
| B Aislada | Mínimo | Mínimo | Medio | Grave |
| C Ocasional | Mínimo | Mínimo | Medio | Grave |
| D Recurrente | Mínimo | Medio | Grave | Grave |
| E Frecuente | Medio | Elevado | Grave | Grave |

Colores del Excel: Mínimo azul (`0000FF`), Medio y Elevado amarillo (`FFFF00`), Grave rojo (`FF0000`). La UI conserva texto además del color. Riesgo inicial, residual y máximo usan la misma matriz. `tests/work-permits.test.js` afirma cada una de las 20 celdas por su par frecuencia/severidad.
