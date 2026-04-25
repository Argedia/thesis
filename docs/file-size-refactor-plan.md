# Plan de reducción de archivos grandes (estado actualizado)

## Objetivo

Reducir archivos gigantes.  
Mejorar lectura humana.  
Mejorar lectura de Codex.  
Bajar costo de contexto por cambio.

## Fecha de snapshot

Actualizado con estado real del repositorio al **25 de abril de 2026**.

## Medición actual

Archivos más grandes en código activo (`app/src`, `core-engine/src`, `game-system/src`, `storage/src`, `ui-editor/src`):

1. `app/src/styles/play-editor.css` — 1326 líneas
2. `ui-editor/src/index.tsx` — 930 líneas
3. `app/src/play-editor/render/BlockInstanceRenderer.ts` — 624 líneas
4. `core-engine/src/index.ts` — 610 líneas
5. `app/src/features/play-session/runtime/interpreter.ts` — 547 líneas
6. `app/src/features/program-editor-core/tree-mutation.ts` — 519 líneas
7. `app/src/play-editor/engine/engine-service-registry.ts` — 503 líneas
8. `app/src/features/program-editor-core/compiler-statement.ts` — 494 líneas
9. `app/src/play-editor/DragInteractionController.ts` — 484 líneas
10. `app/src/i18n.ts` — 447 líneas
11. `app/src/play-editor/engine/PlayEditorEngine.ts` — 436 líneas
12. `app/src/features/program-editor-core/adapters/block-factories.ts` — 432 líneas
13. `app/src/play-editor/engine/engine-prompts.ts` — 414 líneas
14. `app/src/features/play-session/controller.ts` — 413 líneas
15. `app/src/styles/app-layout.css` — 399 líneas

## Estado de refactor vs plan original

### Completado

1. `program-editor-core/adapters.ts` eliminado y dividido en `program-editor-core/adapters/*`.
2. `play-session/controller.ts` reducido y con runtime extraído a `play-session/runtime/*`.
3. `program-editor-core/compiler.ts` reducido y separado por responsabilidades (`compiler-statement`, `compiler-expression`, `compiler-type-inference`, `compiler-structure-ops`).
4. `PlayEditorEngine.ts` reducido y moviendo responsabilidades a `engine-*`.

### Parcial

1. `PlayEditorEngine.ts` todavía puede adelgazar más (secciones de eventos/lifecycle y wiring siguen en el engine).

### Pendiente crítico

1. `app/src/styles.css` ya quedó como entrypoint de imports; el archivo CSS dios ahora es `app/src/styles/play-editor.css`.
2. `ui-editor/src/index.tsx` sigue como archivo multipropósito.
3. `BlockInstanceRenderer.ts` mantiene mezcla de render y construcción detallada de elementos.
4. `play-session/runtime/interpreter.ts` concentra demasiada semántica.

## Regla propuesta

### Tamaño meta

- ideal: `150–350` líneas
- tolerable: `350–500`
- revisar: `500–800`
- casi seguro dividir: `800+`

### Regla de responsabilidad

Un archivo debe responder una pregunta clara.

Ejemplos buenos:

- "cómo compilar declaraciones y asignaciones"
- "cómo dibujar variables en board"
- "cómo derivar bloques de paleta de variables"

Ejemplos malos:

- "todo lo del editor"
- "todo lo del runtime"
- "todo lo visual"

## Plan vigente por prioridad

## 1. `app/src/styles/play-editor.css`

### Problema

Archivo más grande de estilos tras la división inicial.  
Concentra casi todo el estilo del editor visual.

### Acción recomendada

Partir por subdominio interno del editor.

### Corte propuesto

- `styles/play-editor-canvas.css`
- `styles/play-editor-palette.css`
- `styles/play-editor-blocks.css`
- `styles/play-editor-wheel-ghost.css`
- `styles/play-editor-output.css`

Mantener `styles.css` como punto de entrada con `@import` (ya aplicado).

## 2. `ui-editor/src/index.tsx`

### Problema

Archivo concentra componentes de layout, board y controles.

### Acción recomendada

Separar componentes por dominio y dejar `index.ts` como barrel.

### Corte propuesto

- `ui-editor/src/layout/*`
- `ui-editor/src/board/*`
- `ui-editor/src/controls/*`
- `ui-editor/src/editor/*`
- `ui-editor/src/index.ts`

## 3. `play-editor/render/BlockInstanceRenderer.ts`

### Problema

Render de bloque con alta densidad de casos por tipo de bloque.

### Acción recomendada

Partir en renderers por familia:

- `render/block-instance/value-block-renderer.ts`
- `render/block-instance/flow-block-renderer.ts`
- `render/block-instance/routine-block-renderer.ts`
- `render/block-instance/shared.ts`

## 4. `play-session/runtime/interpreter.ts`

### Problema

Concentración de evaluación de expresiones, llamadas y resolución de objetos.

### Acción recomendada

Separar por semántica:

- `runtime/interpreter-expressions.ts`
- `runtime/interpreter-routines.ts`
- `runtime/interpreter-members.ts`
- `runtime/interpreter-helpers.ts`

## 5. `core-engine/src/index.ts`

### Problema

Archivo todavía mezcla tipos, normalización, estructuras y engine.

### Acción recomendada

Partir en `types`, `normalize`, `structures/*`, `VisualExecutionEngine`.

## Orden recomendado (siguiente iteración)

1. `styles/play-editor.css`
2. `ui-editor/src/index.tsx`
3. `BlockInstanceRenderer.ts`
4. `play-session/runtime/interpreter.ts`
5. `core-engine/src/index.ts`

## Regla operativa para futuro

Cada vez que archivo pase:

- `500` líneas: revisar
- `800` líneas: planificar división
- `1200` líneas: dividir salvo excepción fuerte

## Criterio para Codex

Prioridad práctica:

1. abrir menos archivos
2. leer menos líneas por cambio
3. ubicar dueño rápido
4. evitar archivos mezcla
5. usar barrels pequeños por carpeta

## Resultado esperado

Si este plan se aplica:

- menos costo de contexto
- cambios más seguros
- bugs más localizables
- menor riesgo de romper áreas no relacionadas
- mejor uso de créditos en sesiones futuras
