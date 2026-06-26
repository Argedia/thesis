# Block Composition Architecture Plan

This document defines the target architecture for the editor block system in `app/src/features/program-editor-core` and `app/src/play-editor`.

Goal:
- replace the current monolithic `EditorBlock` shape with a composition-based block model
- move editor-facing behavior behind per-kind specs
- preserve plain-object serialization and current AST/compiler/runtime boundaries
- make new block kinds cheaper to add and safer to refactor

This is an incremental refactor plan, not a full language-runtime rewrite.

## Problem Statement

The current block model is centered on one broad `EditorBlock` interface with many optional fields. This creates three architectural problems.

### 1. Weak shape guarantees

`EditorBlock` currently allows many fields that only make sense for some kinds:
- `literalValue`
- `operation`
- `bodyBlocks`
- `alternateBodyBlocks`
- `routineId`
- `typeRoutineId`
- `forEachSourceStructureId`
- `referenceTargetId`

Because these fields coexist in one interface, the type system does not strongly prevent invalid states. The result is defensive code and repeated `if (block.kind === "...")` checks across the editor.

### 2. Behavior scattered by concern, not owned by kind

Block behavior is currently split across multiple modules:
- labels and text description
- output type inference
- input slot definition
- slot get/set behavior
- wheel availability
- render-specific special cases
- palette chip and palette description logic

This makes the system expensive to extend. Adding one new block kind often requires touching many separate files.

### 3. Editor logic mixed with semantic dispatch

Some kind-based dispatch is valid and should stay centralized:
- AST compilation
- AST interpretation
- AST type inference

But editor-block behavior has become mixed into renderer and service code that should mostly orchestrate, not decide block semantics.

## Target Architecture

## A. Block data model: compositional, discriminated, serializable

The block system should keep plain JSON-like objects, not classes. Each block remains a serializable DTO.

### Core rule

Every concrete block type must:
- have a `kind`
- include only fields that belong to that kind
- compose from shared fragments when fields are structurally reused

### Base fragments

Introduce small structural fragments such as:

- `BlockBase`
- `HasColor`
- `HasOperation`
- `HasSingleInput`
- `HasManyInputs`
- `HasBody`
- `HasAlternateBody`
- `HasLiteral`
- `HasVariableRef`
- `HasDeclaredTypeRef`
- `HasRoutineRef`
- `HasTypeRef`
- `HasForEachSource`
- `HasReferenceTarget`

These fragments are data-only. No methods.

### Concrete block unions

Define explicit concrete block types such as:

- `ValueBlock`
- `StructureBlock`
- `ConditionalBlock`
- `ElseBlock`
- `WhileBlock`
- `ForEachBlock`
- `BreakBlock`
- `VarDeclarationBlock`
- `VarAssignBlock`
- `VarBlock`
- `VarReferenceBlock`
- `VarOperationBlock`
- `VarBinaryOperationBlock`
- `ReturnBlock`
- `RoutineCallBlock`
- `RoutineValueBlock`
- `RoutineMemberBlock`
- `FunctionDefinitionBlock`
- `TypeDefinitionBlock`
- `TypeInstanceNewBlock`
- `TypeFieldReadBlock`
- `TypeFieldAssignBlock`

Then redefine:

```ts
type EditorBlock =
  | ValueBlock
  | StructureBlock
  | ConditionalBlock
  | ElseBlock
  | WhileBlock
  | ForEachBlock
  | BreakBlock
  | VarDeclarationBlock
  | VarAssignBlock
  | VarBlock
  | VarReferenceBlock
  | VarOperationBlock
  | VarBinaryOperationBlock
  | ReturnBlock
  | RoutineCallBlock
  | RoutineValueBlock
  | RoutineMemberBlock
  | FunctionDefinitionBlock
  | TypeDefinitionBlock
  | TypeInstanceNewBlock
  | TypeFieldReadBlock
  | TypeFieldAssignBlock;
```

### Design constraints

- `kind` remains the canonical discriminant.
- Composition does not replace unions; it supports them.
- No class hierarchy.
- No prototype-bound methods.
- No ECS-style runtime component graph.
- Backward-compatible serialized shape where possible.

## B. Block behavior model: per-kind spec registry

Editor-facing behavior should not live as methods on serialized blocks. It should live in a registry keyed by block kind.

### Target interface

Introduce a `BlockSpec` abstraction:

```ts
interface BlockSpec<TBlock extends EditorBlock> {
  kind: TBlock["kind"];
  describe(block: TBlock, ctx: BlockSpecContext): string;
  getOutputType(block: TBlock, ctx: BlockSpecContext): OutputType;
  getSlots(block: TBlock, ctx: BlockSpecContext): EditorInputSlotDefinition[];
  getSlotBlock(block: TBlock, slotId: string): EditorBlock | null;
  setSlotBlock(block: TBlock, slotId: string, next: EditorBlock | null): TBlock;
  isControl?: boolean;
  hasWheel?: boolean;
  canNestAsExpression?(block: TBlock, ctx: BlockSpecContext): boolean;
  renderMode?: "default" | "specialized";
}
```

### Registry shape

```ts
const blockSpecs = {
  value: valueSpec,
  structure: structureSpec,
  conditional: conditionalSpec,
  else: elseSpec,
  while: whileSpec,
  for_each: forEachSpec,
  break: breakSpec,
  var_declaration: varDeclarationSpec,
  var_assign: varAssignSpec,
  var: varSpec,
  var_reference: varReferenceSpec,
  var_operation: varOperationSpec,
  var_binary_operation: varBinaryOperationSpec,
  return: returnSpec,
  routine_call: routineCallSpec,
  routine_value: routineValueSpec,
  routine_member: routineMemberSpec,
  function_definition: functionDefinitionSpec,
  type_definition: typeDefinitionSpec,
  type_instance_new: typeInstanceNewSpec,
  type_field_read: typeFieldReadSpec,
  type_field_assign: typeFieldAssignSpec,
} satisfies Record<EditorBlockKind, BlockSpec<any>>;
```

### Ownership rule

Any question of the form:
- "what label should this block show?"
- "what slots does this block expose?"
- "what is this block output type?"
- "is this block a control block?"
- "does this block support wheel options?"
- "how do I read or write one of its slots?"

should be answered by the spec layer or by a shared helper called from the spec layer.

Callers should stop branching directly on `block.kind` unless they are implementing the registry itself or performing semantic AST dispatch.

## C. Shared helpers by block family

Not all logic should be repeated in each spec. Shared helpers are still appropriate when several kinds share semantics.

Allowed helper families:
- structure-operation behavior
- routine callable/value behavior
- variable expression behavior
- control-body behavior
- slot schemas for unary/binary/operator forms
- type-reference helpers

Rule:
- shared helpers support specs
- specs remain the public behavior entrypoint

## D. Keep AST/compiler/runtime centralized

The refactor should not force the compiler, type inference engine, or runtime interpreter into the same spec model.

These layers operate on semantic AST nodes, not editor blocks. Central dispatch remains appropriate there.

Keep centralized semantic dispatch in:
- compiler expression translation
- compiler statement translation
- runtime interpretation
- type inference
- pseudocode emission if still AST-oriented

Allowed cleanup:
- make AST adapters simpler because block unions are stronger
- remove impossible branches
- add exhaustiveness checks where the new block types expose missing cases

Not in scope:
- redesigning `ProgramNode`, `StatementNode`, or `ExpressionNode`
- rewriting interpreter dispatch around OO objects
- unifying editor blocks and AST into one runtime object model

## Responsibility Boundaries

## 1. Block data layer

Owns:
- block shapes
- fragments
- block unions
- stable serialization contract

Does not own:
- DOM rendering
- drag/drop geometry
- AST compilation
- runtime execution

## 2. Block spec layer

Owns:
- labels and human description
- output type
- slot schema
- slot read/write semantics
- capability metadata for editor systems
- block-family helper composition

Does not own:
- DOM layout
- pointer handling
- actual wheel overlay rendering
- AST execution

## 3. Adapter layer

Owns:
- block to AST conversion
- AST to block projection
- persistence transforms
- migration compatibility where needed

Does not own:
- DOM behavior
- palette UI rendering
- drag/drop geometry rules

## 4. Renderer layer

Owns:
- DOM construction
- styling hooks
- specialized inline visual composition
- binding user interaction to services/controllers

Does not own:
- semantic meaning of block kinds
- slot schema logic
- output type rules
- label derivation logic beyond delegating to specs

## 5. Services/controllers layer

Owns:
- orchestration
- state transitions
- drag/drop application
- palette derivation flow
- block mutation flow

Does not own:
- per-kind behavior details that specs can answer

## Migration Strategy

The refactor should be implemented in small, behavior-preserving phases.

## Phase 1. Introduce new block types without changing behavior entrypoints

Tasks:
- add fragment types
- add concrete block union types
- redefine `EditorBlock`
- update helper typings and narrow call sites until build passes
- do not yet remove old helper functions

Acceptance:
- no behavior change
- build passes
- type narrowing works for representative blocks

## Phase 2. Add spec registry in parallel

Tasks:
- create `BlockSpec` interfaces and context types
- create `blockSpecs` registry
- implement specs for all existing kinds
- initially allow specs to delegate to old helpers internally if needed

Acceptance:
- registry exhaustive over `EditorBlockKind`
- can fetch a spec for every block kind
- no caller migration yet required

## Phase 3. Move descriptor and slot logic behind specs

Tasks:
- migrate:
  - `describeBlock`
  - `getOutputType`
  - `getBlockInputSlots`
  - `getBlockSlotBlock`
  - `setBlockSlotBlock`
  - `isSlotCompatible`
- convert old exported helpers into thin wrappers over specs during transition

Acceptance:
- external behavior unchanged
- old helper names still work temporarily
- internal branching significantly reduced

## Phase 4. Migrate renderers and palette/services to specs

Tasks:
- update block instance rendering to ask specs for behavior instead of open-coding kind checks where possible
- update palette description/chip derivation to use spec metadata
- update engine/service capability questions to use spec metadata or helper families
- keep render-only special cases in renderers when they are truly visual

Acceptance:
- renderer code becomes more orchestration-focused
- no visual regressions
- block-specific DOM logic is limited to real visual differences

## Phase 5. Simplify adapters with stronger block types

Tasks:
- tighten block-to-AST conversion against concrete block types
- tighten AST-to-block projection against concrete block unions
- remove dead or impossible field checks
- add exhaustive assertions for conversions

Acceptance:
- adapters easier to read
- fewer impossible-state guards
- no persistence regressions

## Phase 6. Remove transitional helpers

Tasks:
- remove duplicated old helper logic
- keep only spec-based behavior entrypoints
- document extension rules for future block kinds

Acceptance:
- one canonical place for editor-block behavior
- no legacy parallel API left unless intentionally kept for compatibility

## File and Module Plan

Target additions:
- `block-fragments` module for compositional data pieces
- `block-specs` directory or module group
- spec context definitions
- shared helper modules per family where repeated logic remains useful

Target edits:
- current block type definitions
- descriptor/output/slot helpers
- renderers that currently special-case many kinds
- palette descriptor/derivation services
- block-to-AST and AST-to-block adapters
- any engine/service code asking repeated capability questions

Path guidance:
- keep block data and block specs near `program-editor-core`
- do not place semantic behavior in `play-editor/render`
- do not let `PlayEditorEngine` become the owner of per-kind logic

## Extension Rules After Refactor

When adding a new block kind in the future, the contributor should need to do exactly this:

1. define the concrete block type using fragments
2. add the kind to `EditorBlockKind`
3. add a spec entry for the new kind
4. add adapter support only if the block affects AST semantics
5. add render specialization only if default slot/label rendering is insufficient

The contributor should not need to discover scattered behavior rules across many unrelated files.

## Testing and Validation

## Type-level validation

Must pass:
- full TypeScript build
- exhaustive registry coverage
- exhaustive adapter coverage where applicable

Add tests or compile-time assertions for:
- every `EditorBlockKind` has a spec
- spec functions accept only the matching concrete block type
- impossible field combinations are rejected by the type system where practical

## Behavior regression coverage

Representative kinds to verify:
- `value`
- `structure`
- `conditional`
- `else`
- `while`
- `var_assign`
- `var`
- `var_binary_operation`
- `routine_call`
- `routine_member`
- `function_definition`
- `type_definition`

Scenarios:
- labels unchanged unless intentionally improved
- slots unchanged unless intentionally corrected
- output typing unchanged
- slot compatibility unchanged
- wheel affordances unchanged
- nested-expression validity unchanged

## Manual editor scenarios

Validate:
- palette to canvas drag
- canvas reorder
- indent and nested drop behavior
- slot insertion valid/invalid
- wheel opening and action dispatch
- double click edit of values and names
- breakpoints and active-line rendering
- specialized control rendering
- function/type routine block behavior

## Adapter scenarios

Verify round-trip correctness for:
- control statements
- structure operations
- routine calls and references
- variable declarations and assignments
- value expressions
- type member reads/writes
- for-each and break semantics

## Acceptance Criteria

The refactor is complete when all of the following are true:

- `EditorBlock` is a discriminated union of concrete block types
- shared fragments exist and are the main reuse mechanism for block data shape
- editor-facing per-kind behavior is owned by a spec registry
- renderer and service code stop answering most block-kind questions directly
- AST/compiler/runtime remain behaviorally unchanged
- all current block kinds are covered
- builds and existing editor flows still work
- the architecture document exists and explains how to extend the system

## Explicit Non-Goals

This plan does not include:
- full AST redesign
- full compiler redesign
- full interpreter redesign
- replacing plain objects with classes
- replacing unions with dynamic component stores
- drag/drop UX redesign
- visual theme redesign

## Defaults and Assumptions

- plain-object serialization is mandatory
- incremental migration is preferred over large branch replacement
- compatibility with current persisted block payloads should be preserved
- semantic dispatch over AST remains centralized
- editor-block behavior should become spec-driven
- composition is for data shape reuse, not runtime inheritance
