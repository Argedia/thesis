# Plan de reducción de archivos grandes

## Objetivo

Reducir archivos gigantes.  
Mejorar lectura humana.  
Mejorar lectura de Codex.  
Bajar costo de contexto por cambio.

## Medición actual

Archivos más grandes en código activo:

1. `app/src/features/program-editor-core/adapters.ts` — 2518 líneas
2. `app/src/features/play-session/controller.ts` — 2254 líneas
3. `app/src/styles.css` — 2184 líneas
4. `app/src/play-editor/engine/PlayEditorEngine.ts` — 1801 líneas
5. `app/src/features/program-editor-core/compiler.ts` — 1309 líneas
6. `ui-editor/src/index.tsx` — 930 líneas
7. `app/src/features/play-ui/PlayLevelScreen.tsx` — 819 líneas
8. `app/src/features/program-editor-core/tree.ts` — 753 líneas
9. `app/src/features/program-editor-core/types.ts` — 728 líneas
10. `app/src/play-editor/render/BlockInstanceRenderer.ts` — 624 líneas
11. `core-engine/src/index.ts` — 610 líneas

## Diagnóstico general

Problema principal no solo tamaño.  
Problema principal: mezcla de responsabilidades.

Archivos peores para contexto:

- `adapters.ts`
- `play-session/controller.ts`
- `PlayEditorEngine.ts`
- `styles.css`
- `ui-editor/src/index.tsx`
- `PlayLevelScreen.tsx`

Esos archivos obligan a leer demasiadas cosas para tocar un detalle pequeño.

## Regla propuesta

### Tamaño meta

- ideal: `150–350` líneas
- tolerable: `350–500`
- revisar: `500–800`
- casi seguro dividir: `800+`

### Regla de responsabilidad

Un archivo debe responder una pregunta clara.

Ejemplos buenos:

- “cómo compilar declaraciones y asignaciones”
- “cómo dibujar variables en board”
- “cómo derivar bloques de paleta de variables”

Ejemplos malos:

- “todo lo del editor”
- “todo lo del runtime”
- “todo lo visual”

## Plan por archivo

## 1. `program-editor-core/adapters.ts`

### Problema

Archivo más costoso del repo.  
Mezcla:

- helpers de operaciones
- output types
- input slots
- compatibilidad de slots
- descripciones visuales
- factories de bloques
- wheel options
- recolección de declaraciones
- legacy → tree
- tree → legacy
- serialización
- deserialización

### Acción recomendada

Dividir por tema.

### Corte propuesto

- `adapters/block-factories.ts`
  - `create*Block`
- `adapters/block-descriptors.ts`
  - `describeBlock`
  - `describeOperation`
  - `blockColorClass`
- `adapters/block-slots.ts`
  - `getOutputType`
  - `getBlockInputSlots`
  - `getBlockSlotBlock`
  - `setBlockSlotBlock`
  - `isSlotCompatible`
- `adapters/wheel-options.ts`
  - `buildWheelOptions`
  - conditional/variable/declaration wheel options
- `adapters/variable-declarations.ts`
  - `collectVariableDeclarations`
  - sync helpers
- `adapters/legacy-to-tree.ts`
  - `legacyBlockToExpression`
  - `legacyBlockToStatement`
  - migration helpers
- `adapters/tree-to-legacy.ts`
  - `expressionToLegacyBlock`
  - `statementToLegacyBlock`
  - projection helpers
- `adapters/persistence.ts`
  - serialize/deserialize

### Beneficio

Codex podrá abrir solo módulo relevante.  
No leer 2500 líneas para cambiar una cavidad o una descripción.

## 2. `play-session/controller.ts`

### Problema

Archivo concentra:

- carga de nivel
- estado de sesión
- control run/step/pause/reset
- compilación
- enfoque de depuración
- runtime frames
- variables runtime
- pointers
- typed objects
- for-each
- function calls
- object members
- progreso de nivel

### Acción recomendada

Mantener controlador como fachada.  
Mover semántica dura a módulos internos.

### Corte propuesto

- `play-session/session-state.ts`
  - `createInitialState`
  - patch helpers
- `play-session/runtime-values.ts`
  - type guards
  - `formatRuntimeValue`
  - compatibilidad de tipos runtime
- `play-session/runtime-memory.ts`
  - `readVariableValue`
  - `setLocalValue`
  - `assignScopedValue`
  - snapshots de variables
- `play-session/runtime-structures.ts`
  - `resolveStructureTargetId`
  - source/target operations
  - structure execution helpers
- `play-session/runtime-routines.ts`
  - `invokeRoutineFrame`
  - `runRoutineDirect`
  - member calls
  - object instances
- `play-session/runtime-expressions.ts`
  - `evaluateExpression`
  - `evaluateExpressionDirect`
  - operators
- `play-session/runtime-instructions.ts`
  - `executeInstruction`
  - visible stepping helpers
- `play-session/progress.ts`
  - `evaluateProgress`
  - `persistCompletion`

### Beneficio

Debug de stepping.  
Debug de runtime typing.  
Debug de pointers.  
Cada uno en archivo chico.

## 3. `styles.css`

### Problema

2184 líneas.  
CSS global gigante.  
Difícil buscar dueño de una clase.  
Alto costo para lectura de UI.

### Acción recomendada

Partir por dominio visual, no por tamaño bruto.

### Corte propuesto

- `styles/app-shell.css`
- `styles/community-levels.css`
- `styles/play-level.css`
- `styles/play-editor.css`
- `styles/board.css`
- `styles/dialogs.css`
- `styles/utilities.css`

Mantener un `styles.css` mínimo:

- imports
- tokens globales
- reset base

### Beneficio

Codex abre solo CSS de pantalla afectada.  
Baja ruido enorme.

## 4. `play-editor/engine/PlayEditorEngine.ts`

### Problema

El documento de arquitectura dice que engine debe ser orquestador delgado.  
Hoy no lo es.

Hoy mezcla:

- lifecycle
- servicios lazy
- wiring contextos
- prompts
- reglas de negocio
- sync de labels/tipos
- create from palette
- drag/drop integration
- palette insertion side effects
- render shell

### Acción recomendada

Convertir engine en fachada real.

### Corte propuesto

- `engine/engine-services.ts`
  - getters lazy de servicios/renderers/controladores
- `engine/engine-block-sync.ts`
  - `synchronizeVariableLabels`
  - type/name sync
- `engine/engine-prompts.ts`
  - text/select/alert
  - variable/type/routine prompts
- `engine/engine-palette.ts`
  - `createBlockFromPalette`
  - fallback palette block
  - insertion side effects
- `engine/engine-layout.ts`
  - shell DOM
  - render shell
  - color helpers
- `engine/engine-events.ts`
  - attach listeners
  - open/close wheel
  - start drag helpers

### Beneficio

Menor archivo central.  
Menos riesgo al tocar prompts o sync.

## 5. `program-editor-core/compiler.ts`

### Problema

Compilador ya es grande.  
Aún razonable si se parte por statement family.

### Corte propuesto

- `compiler/types.ts`
  - compile context
  - helpers internos
- `compiler/expression-compile.ts`
  - `compileExpression`
  - type inference helpers
- `compiler/statement-compile-basic.ts`
  - declare, assign, expression, return
- `compiler/statement-compile-control.ts`
  - if, while, for-each, break
- `compiler/statement-compile-call.ts`
  - structure calls
  - routine calls
  - member calls
- `compiler/diagnostics.ts`
  - type compatibility
  - routine/type diagnostics
- `compiler/index.ts`
  - orchestration

### Beneficio

Más fácil revisar bugs de tipado sin abrir loops y jumps.

## 6. `ui-editor/src/index.tsx`

### Problema

Archivo exporta demasiados componentes:

- board
- event log
- shell
- panels
- split pane
- tab bar
- collapsible panel
- buttons
- palette stubs
- editor canvas stubs

### Acción recomendada

Separar componentes exportados.

### Corte propuesto

- `ui-editor/src/board/StructuresBoard.tsx`
- `ui-editor/src/board/EventLog.tsx`
- `ui-editor/src/layout/Screen.tsx`
- `ui-editor/src/layout/Panel.tsx`
- `ui-editor/src/layout/Workspace.tsx`
- `ui-editor/src/layout/SplitPane.tsx`
- `ui-editor/src/layout/TabBar.tsx`
- `ui-editor/src/layout/CollapsiblePanel.tsx`
- `ui-editor/src/controls/LargeActionButton.tsx`
- `ui-editor/src/controls/StepControls.tsx`
- `ui-editor/src/editor/StructurePalette.tsx`
- `ui-editor/src/editor/LevelEditorCanvas.tsx`
- `ui-editor/src/editor/InspectorPanel.tsx`
- `ui-editor/src/index.ts`
  - barrel simple

### Beneficio

Paquete reusable de verdad.  
No “kitchen sink file”.

## 7. `features/play-ui/PlayLevelScreen.tsx`

### Problema

Pantalla concentra:

- session controller hookup
- dialog system
- resize behavior
- output mode
- runtime view wiring
- tabs
- toolbar
- board + editor layout

Además ya dio errores de hooks antes.  
Archivo sensible.

### Corte propuesto

- `play-ui/hooks/usePlaySessionController.ts`
- `play-ui/hooks/usePlayDialogs.ts`
- `play-ui/hooks/useResizableDualPane.ts`
- `play-ui/components/PlayToolbar.tsx`
- `play-ui/components/PlayDialogs.tsx`
- `play-ui/components/PlayOutputPanel.tsx`
- `play-ui/components/PlayWorkspace.tsx`
- `play-ui/components/RoutineTabs.tsx`
- `play-ui/PlayLevelScreen.tsx`
  - solo composición

### Beneficio

Menos riesgo de romper orden de hooks.  
Pantalla mucho más legible.

## 8. `program-editor-core/tree.ts`

### Problema

Archivo mezcla:

- búsqueda en árbol
- reemplazo de expresiones
- mutaciones de programa
- rutinas activas

### Corte propuesto

- `tree/routines.ts`
- `tree/find.ts`
- `tree/replace-expression.ts`
- `tree/replace-statement.ts`
- `tree/document-mutations.ts`

## 9. `program-editor-core/types.ts`

### Problema

No siempre conviene partir tipos.  
Pero 700+ líneas ya pesa.

### Acción recomendada

Partir solo por dominio.  
No sobre-fragmentar.

### Corte propuesto

- `types/editor-blocks.ts`
- `types/ast.ts`
- `types/compiler.ts`
- `types/layout.ts`
- `types/runtime.ts`
- `types/index.ts`

## 10. `core-engine/src/index.ts`

### Problema

Aún manejable.  
Pero ya mezcla:

- tipos base
- normalización
- clases stack/queue/list
- factory
- engine state

### Corte propuesto

- `core-engine/src/types.ts`
- `core-engine/src/normalize.ts`
- `core-engine/src/structures/StackStructure.ts`
- `core-engine/src/structures/QueueStructure.ts`
- `core-engine/src/structures/ListStructure.ts`
- `core-engine/src/VisualExecutionEngine.ts`
- `core-engine/src/index.ts`

### Prioridad

Media. No urgente.

## Qué NO conviene partir todavía

- `PaletteDerivationService.ts`
- `BlockActionController.ts`
- `DragInteractionController.ts`
- `projection.ts`
- `pseudocode.ts`

Esos todavía caben bien en contexto y tienen foco razonable.

## Orden recomendado de refactor

### Fase 1. Máximo ahorro para Codex

1. `adapters.ts`
2. `controller.ts`
3. `PlayEditorEngine.ts`
4. `styles.css`

### Fase 2. Reducir bugs de UI y hooks

5. `PlayLevelScreen.tsx`
6. `ui-editor/src/index.tsx`

### Fase 3. Limpieza de dominio

7. `compiler.ts`
8. `tree.ts`
9. `types.ts`
10. `core-engine/src/index.ts`

## Regla operativa para futuro

Cada vez que archivo pase:

- `500` líneas: revisar
- `800` líneas: planificar división
- `1200` líneas: dividir salvo excepción fuerte

## Criterio para Codex

Prioridad no solo “clean code”.  
Prioridad:

1. abrir menos archivos
2. leer menos líneas por cambio
3. ubicar dueño rápido
4. evitar archivos mezcla
5. usar barrels chicos por carpeta

## Resultado esperado

Si este plan se aplica:

- menos costo de contexto
- cambios más seguros
- bugs más localizables
- menor riesgo de romper áreas no relacionadas
- mejor uso de créditos en sesiones futuras
