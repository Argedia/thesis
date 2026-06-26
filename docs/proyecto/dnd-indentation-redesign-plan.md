# Drag & Drop + Indentation Redesign Plan

## Goals

- Consistent drag and drop regardless of drag source (palette vs program)
- Clean indentation: visual and data-model aligned
- Ghost identical to how block looks on canvas
- No DOM rect measurement during drag (except one scroll offset read)
- No code redundancy — block rendering is one path for ghost, preview, and canvas
- Extensible: new block kinds declare their own behavior via spec, no hardcoded unions
- Clean slot drops decoupled from row/indent logic

---

## Core Model

### Virtual Row Grid

All rendered block lines have **identical fixed height** `ROW_HEIGHT_PX` (new constant).  
`else_header` rows are included — they are visible lines, count as rows.  
Drop rows are **removed** from `EditorLineLayout` — gaps are implicit between rows.

Row index from pointer:

```
rowIndex = clamp(floor((pointerY - laneLogicalTop) / ROW_HEIGHT_PX), 0, lineCount)
```

`laneLogicalTop` = `laneElement.getBoundingClientRect().top - laneElement.scrollTop`  
Read once at drag start. Stable because the lane's logical origin doesn't move during drag — only the viewport scrolls over it.

`rowIndex` ranges `[0, lineCount]` where `lineCount` means "after the last line."

This formula is **identical** for palette and program drags. No ghost offset ratios.

---

### Indent Constraints Per Gap

A **gap** is the insertion point above `lineLayouts[rowIndex]`.  
Gap `i` sits between `lineLayouts[i-1]` and `lineLayouts[i]`.

Two sentinel lines (never rendered, used only for boundary math):

```ts
const SENTINEL_LINE = { indentCurrent: 0, opensBody: false }
```

For gap at `rowIndex`:

```ts
const prevLine = lineLayouts[rowIndex - 1] ?? SENTINEL_LINE
const nextLine = lineLayouts[rowIndex]     ?? SENTINEL_LINE

maxIndent = prevLine.indentCurrent + (prevLine.opensBody ? 1 : 0)
minIndent = nextLine.indentCurrent
```

Pointer X maps to indent:

```ts
rawIndent    = floor((pointerX - laneLeft) / INDENT_STEP_PX)
chosenIndent = clamp(rawIndent, minIndent, maxIndent)
```

No `INDENT_ACTIVATION_INSET_PX`. No threshold offsets. Pure integer snap.

---

### `opensBody` on Block Spec

Every block kind declares `opensBody: boolean` in its spec entry.  
Currently: `conditional`, `else`, `while`, `for_each` → `opensBody: true`. All others → `false`.  
`buildEditorLineLayout` reads this from specs, not from a hardcoded kind union.  
New block kinds with bodies just set `opensBody: true` in their spec. No other files change.

---

### Sentinel Edge Cases (no special-casing needed)

| Gap position | prevLine | nextLine | maxIndent | minIndent |
|---|---|---|---|---|
| Before line 0 | SENTINEL (indent=0, opensBody=false) | line 0 | 0 | line[0].indentCurrent |
| After last line | last line | SENTINEL (indent=0, opensBody=false) | last.indentCurrent + (opensBody?1:0) | 0 |
| Middle gap | line[i-1] | line[i] | standard formula | standard formula |

All three cases use identical code. Sentinels are compile-time constants, not computed.

---

## Updated `EditorLineLayout`

```ts
interface EditorLineLayout {
  id: string;
  role: "block" | "else_header";   // "drop" role removed
  lineNumber?: number;
  depth: number;
  indentCurrent: number;
  opensBody: boolean;               // NEW — replaces increaseNextIndentation + indentPotential logic
  bodyOwnerPath: string[];
  controlPath: Array<{ ownerId: string; branch: ControlBodyKey }>;
  block: EditorBlock | null;
  blockId?: string;
  topLevelIndex?: number;
  branchOwnerId?: string;
  branch?: ControlBodyKey;
  isLastInBranch?: boolean;

  // REMOVED: indentPotential, promotedBranchTarget, beforeBlockId,
  //          insertionRootIndex, increaseNextIndentation
}
```

---

## Updated `EditorDragState`

```ts
// RENAMED: visualLineIndex → rowIndex  (same concept, clearer name)
// REMOVED: dropIndex (derived at drop time, not stored)
// KEEP: x, y, chosenIndent, slotTargetKey, branchTarget, dropBeforeBlockId, multiDragIds, etc.
```

---

## Ghost = Real Block Instance

`GhostRenderer` renders via `BlockInstanceRenderer.renderGhostBlockInstance` for **both** sources:

- `source === "program"` → find block in tree by `dragState.blockId`
- `source === "palette"` → call `createPreviewBlockFromDragState()` → get base-state block

Both produce the same DOM structure as the canvas. `drag-ghost` CSS class handles visual difference (opacity, shadow, pointer-events: none).

`PreviewRenderer` and `PreviewDescriptor` are **deleted**.

---

## Base State Contract for Blocks

Every block kind defines a **base state**: a minimal valid `EditorBlock` instance with:

- All required fields set to sensible defaults
- Unresolved refs (variable id, routine id) set to `null` or empty string
- Empty slots (`null`)

This base state is what `createPreviewBlockFromDragState` returns for palette blocks.  
Ghost always renders. Inline preview always renders. No fallback needed.

---

## Slot Type Tolerance

Slots accept **any block** structurally during drag — no type-based drop rejection.  
Type mismatch surfaces as a **validation warning** at compile/run time, not a drag gate.  
`isSlotCompatible` moves from drag logic to the validation/execution layer.

---

## Slot Drop Detection (unchanged, explicit priority)

Slot targets use overlap-ratio detection (existing logic, kept as-is).  
**Priority rule** (explicit invariant in `DragInteractionController.handlePointerMove`):

```
if slotTargetKey !== null:
  skip row index and indent update entirely
```

Row grid and slot detection never run simultaneously. Slot wins.

---

## Inline Preview (unchanged role, cleaner input)

`buildInlinePreviewBlocks` keeps its current role: insert preview block into base document, return projected block list. Canvas renders this with `is-preview` CSS class on the inserted block.

Change: the preview block it inserts is now always a valid base-state block (same one the ghost renders). Single factory, single block, used in both places.

---

## `resolveDropPlacement` — New Input Contract

Input: `(rowIndex: number, chosenIndent: number, lineLayouts: EditorLineLayout[])`  
Output: `ResolvedDropPlacement` (unchanged shape)

Logic:
1. `prevLine = lineLayouts[rowIndex - 1] ?? SENTINEL`
2. Walk `prevLine.controlPath` to find which branch owns `chosenIndent`
3. If `chosenIndent === prevLine.indentCurrent + 1` and `prevLine.opensBody` → drop into `prevLine`'s body
4. Otherwise → find deepest `controlPath` entry matching `chosenIndent`
5. `beforeBlockId` = `lineLayouts[rowIndex]?.blockId ?? null`

No drop row data needed. Purely derived from block lines + indent choice.

---

## Module Responsibility Boundaries

| Module | Owns | Does NOT own |
|---|---|---|
| `editor-block-layout.ts` | Build `EditorLineLayout[]` with `opensBody`; no drop rows | DOM, geometry, specs directly |
| `block-specs` | Declare `opensBody` per kind | Layout, rendering |
| `DragDropGeometryService` | `rowIndex` from pointerY, `chosenIndent` from pointerX clamp, slot overlap | DOM rects except laneLogicalTop at drag start |
| `GhostRenderer` | Render real block instance at pointer position | Preview descriptor, layout logic |
| `EditorCanvasRenderer` | Render lines, inline preview block with `is-preview` class | Geometry, drag state decisions |
| `BlockInstanceRenderer` | Render any block instance: canvas, ghost, inline preview | Position, drag state |
| `DropPlacementService` | Map `(rowIndex, chosenIndent)` → `ResolvedDropPlacement` | Geometry, rendering |
| `DragInteractionController` | Orchestrate pointer events → state → render | Block rendering, layout math |

---

## Files Changed

| File | Change |
|---|---|
| `editor-layout-constants.ts` | Add `ROW_HEIGHT_PX`; remove `INDENT_ACTIVATION_INSET_PX` |
| `types/projection.ts` | Update `EditorLineLayout`: remove drop fields, add `opensBody` |
| `editor-block-layout.ts` | Remove drop line generation; compute `opensBody` from spec; remove `indentPotential`/`promotedBranchTarget` |
| `DragDropGeometry.ts` | Replace `currentDropWithPoint` with grid formula; replace `currentIndentChoice` with clamp; remove `getLineRects`/`captureBaseLineRects` |
| `layout.ts` | Delete `calculateDropIndex` |
| `GhostRenderer.ts` | Render real block instance; remove `PreviewDescriptor` path |
| `PreviewRenderer.ts` | **Delete** |
| `EditorCanvasRenderer.ts` | Remove drop row rendering; add `is-preview` class; remove `lineIndicatorIndex` |
| `DragInteractionController.ts` | Remove `dragBaseLineRects` capture; remove `placementY` ratio; add explicit slot-wins invariant; rename `visualLineIndex` → `rowIndex` |
| `engine-service-registry.ts` | Remove `getPreviewRenderer` |
| `contracts/types.ts` | Remove `PreviewDescriptor`; rename `visualLineIndex` → `rowIndex` in `EditorDragState` |
| `engine-render.ts` | Remove `buildPreviewDescriptor`/`renderPreviewBlock` deps |
| `BlockInstanceRenderer.ts` | Ensure ghost render path works for both base-state and real blocks |
| `DropPlacementService.ts` | Update `resolveDropPlacement` to new input contract |

---

## Implementation Phases

### Phase 0 — Foundation (prerequisite for everything)
- Add `ROW_HEIGHT_PX` constant
- Enforce uniform row height on all line types via CSS (`min-height`, `max-height`, `box-sizing: border-box`)
- Add `opensBody: boolean` to `EditorLineLayout`
- Add `opensBody` declaration to all block specs (or `isControlBlock` wrapper until specs exist)
- **Acceptance**: All rows render at identical height. Build passes. No behavior change.

### Phase 1 — New layout model
- Remove `drop` role from `EditorLineLayout`
- Remove `indentPotential`, `promotedBranchTarget`, `beforeBlockId`, `insertionRootIndex`, `increaseNextIndentation` from `EditorLineLayout`
- Update `buildEditorLineLayout` to produce only `block` and `else_header` rows with `opensBody`
- Update `resolveDropPlacement` to new contract: `(rowIndex, chosenIndent, lineLayouts)`
- **Acceptance**: Layout builds correctly. Drop placement resolves to correct branch/index. Build passes.

### Phase 2 — Grid detection
- Compute `laneLogicalTop` once at drag start
- Replace `calculateDropIndex` + `dragBaseLineRects` with `rowIndex = floor((pointerY - laneLogicalTop) / ROW_HEIGHT_PX)`
- Replace `currentIndentChoice` with `clamp(floor((pointerX - laneLeft) / INDENT_STEP_PX), minIndent, maxIndent)`
- Remove `INDENT_ACTIVATION_INSET_PX`
- Rename `visualLineIndex` → `rowIndex` in `EditorDragState` and all call sites
- Delete `calculateDropIndex` from `layout.ts`
- **Acceptance**: Drag from palette and from program produce same row detection. Indentation snaps cleanly.

### Phase 3 — Unified ghost
- Define base state factory per block kind (or via palette block → `createPreviewBlockFromDragState`)
- Update `GhostRenderer` to use `BlockInstanceRenderer.renderGhostBlockInstance` for both sources
- Delete `PreviewRenderer`, `PreviewDescriptor`
- Update `buildInlinePreviewBlocks` to use same preview block factory
- **Acceptance**: Ghost looks identical to canvas block. Inline preview uses same block. No visual regressions.

### Phase 4 — Slot type tolerance
- Remove type-based slot rejection from drag logic
- Move `isSlotCompatible` to validation/execution layer
- Add explicit slot-wins priority rule in `handlePointerMove`
- **Acceptance**: Any block droppable into any slot. Type errors surface at run/compile time only.

### Phase 5 — Cleanup
- Remove dead code: drop row rendering from `EditorCanvasRenderer`, `captureBaseLineRects`, `dragBaseLineRects`, old ghost paths
- Remove `getPreviewRenderer` from registry
- **Acceptance**: No dead exports. Build passes. All existing editor flows work.

---

## Invariants to Preserve

- Block tree (`EditorBlock[]` with nested `bodyBlocks`/`alternateBodyBlocks`) is always the source of truth
- `EditorLineLayout[]` is ephemeral — rebuilt every render from the tree
- `ResolvedDropPlacement` is the only output of drop detection — nothing downstream touches raw geometry
- Slot detection and row detection never run simultaneously (slot wins)
- Ghost, inline preview, and canvas block all render via `BlockInstanceRenderer` — one code path
