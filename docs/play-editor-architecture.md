# Arquitectura de `play-editor`

Este documento describe cómo está organizado `app/src/play-editor`, qué módulo es dueño de cada responsabilidad y cómo extenderlo sin romper drag/drop, wheel y render.

## 1. Vista general

`PlayEditorSurface` es un wrapper React mínimo que monta/desmonta el engine imperativo.

- Entrada React: `app/src/play-editor/PlayEditorSurface.tsx`
- Engine canónico: `app/src/play-editor/engine/PlayEditorEngine.ts`
- Reexport de compatibilidad: `app/src/play-editor/PlayEditorEngine.ts`

El engine **no** define reglas de negocio de editor en detalle: orquesta servicios, renderers y controladores.

## 2. Estructura modular

### `engine/`
- `PlayEditorEngine.ts`
- Responsabilidad: lifecycle (`constructor`, `update`, `destroy`), wiring de contextos, ciclo de render, listeners globales.

### `render/`
- `PaletteRenderer.ts`: paleta y grupos.
- `CanvasRenderer.ts` / `EditorCanvasRenderer.ts`: lienzo, líneas, breakpoints, preview inline.
- `BlockInstanceRenderer.ts`: instancia visual de bloque (normal, nested, ghost, cavity/slots).
- `PreviewRenderer.ts`: descriptor y render de preview de bloque.
- `GhostRenderer.ts`: render del ghost durante drag.
- `WheelOverlayRenderer.ts`: solo UI del wheel.

### `interaction/`
- `DragInteractionController.ts`: ciclo completo de drag.
- `WheelInteractionController.ts`: opciones y ejecución de acciones del wheel.
- `HostInteractionController.ts`: reglas de host (click fuera, context policies).
- `BlockActionController.ts`: mutaciones de bloque disparadas por UI (operación, modo, edición de nombre/valor, slots).

### `services/`
- `BlockTreeService.ts`: lectura del árbol (`findBlockById`, `blockContainsId`, etc.).
- `BlockMutationService.ts`: mutaciones estructurales (immer).
- `DropPlacementService.ts`: resolución y aplicación de destinos de drop.
- `PaletteDerivationService.ts`: deriva bloques de paleta desde estructuras + documento.
- `PaletteDescriptorService.ts`: etiqueta/chip visible de cada bloque de paleta.
- `DragPreviewBlockFactory.ts`: bloque preview durante drag.

### `domain/`
- `LiteralParserService.ts`: parseo de texto a literal (`bool`, `int`, `double`, `string`).
- `VariableValidationService.ts`: validaciones de variables.

### `contracts/`
- `types.ts`: tipos compartidos de interacción/render.
- `contexts.ts`: contratos de contexto entre engine y módulos.
- `constants.ts`: constantes compartidas de editor.
- `runtimeState.ts`: contrato de estado runtime compartido.

## 3. Flujo de datos principal

1. `PlayEditorSurface` crea `PlayEditorEngine(host, props)`.
2. Engine deriva `paletteBlocks` y renderiza:
   - paleta
   - canvas
   - overlay wheel (si aplica)
   - ghost (si hay drag activo)
3. Interacciones llaman controladores:
   - drag -> `DragInteractionController`
   - wheel -> `WheelInteractionController`
   - acciones de bloque -> `BlockActionController`
4. Mutaciones de árbol usan:
   - `BlockMutationService`
   - `DropPlacementService`
5. Cambios de bloques se propagan por `props.onChange(...)` con `createEditorDocumentFromEditorBlocks`.

## 4. Drag & drop: puntos críticos

Para debug de drop fallido, revisar en este orden:

1. `DragInteractionController`
- `startPaletteDrag`, `handlePointerMove`, `handlePointerUp`
- confirma `isOverEditor`, `slotTargetKey`, `visualLineIndex`, `chosenIndent`

2. `DragDropGeometryService`
- cálculo de geometría (`currentDropWithPoint`, `currentIndentChoice`, `currentSlotTarget`)
- depende de refs frescas (`editorLane`, `lineRowRefs`, `slotRefs`)

3. `DropPlacementService`
- traduce placement a mutación real del árbol
- aplica inserción root/branch/slot

4. `BlockMutationService`
- extracción/movimiento seguro de subárboles

## 5. Wheel y acciones de bloque

- `WheelOverlayRenderer` dibuja solamente.
- `WheelInteractionController` decide opciones por tipo de bloque y despacha acción.
- `BlockActionController` ejecuta mutación concreta sobre árbol.

Regla: cualquier nueva acción de wheel debe terminar en `BlockActionController` o servicio equivalente, no en renderer.

## 6. Guía para cambios futuros

### Añadir un nuevo tipo de bloque
1. Agregar tipo/campos en `features/program-editor-core/types.ts`.
2. Integrar factories/adapters en `features/program-editor-core/adapters.ts`.
3. Añadir metadata visual en `play-editor/BlockMetadata.ts` y, si aplica, `PaletteDescriptorService`.
4. Definir slots/compatibilidad en `operations` (`getBlockInputSlots`, `isSlotCompatible`).
5. Render de instancia en `BlockInstanceRenderer`.
6. Si requiere wheel, integrar en `WheelInteractionController` + `BlockActionController`.

### Cambiar solo visual
- Preferir `render/*` + `styles.css`.
- Evitar tocar servicios de mutación.

### Cambiar solo reglas de negocio
- Preferir `services/*` o `domain/*`.
- Evitar lógica en renderer.

## 7. Invariantes de mantenibilidad

- `PlayEditorEngine` debe seguir siendo orquestador delgado.
- Renderers no deben mutar estado de dominio.
- Servicios no deben depender de renderers.
- Evitar reintroducir wrappers legacy (`BlockRenderer`, `WheelRenderer`, `types` en raíz de `play-editor`).

## 8. Checklist de validación (manual)

Tras cualquier cambio en `play-editor`, validar:

1. Drag desde paleta a canvas.
2. Reorder y mover dentro/fuera de anidación.
3. Drop en slot válido e inválido.
4. Wheel en bloques clave (`structure`, `conditional`, `while`, `var_*`, `routine_*`).
5. Ghost + preview inline.
6. Doble click para editar valor/variable.
7. Breakpoints en gutter.
8. `npx tsc -p app/tsconfig.json --noEmit`
9. `npm run build -w app`
