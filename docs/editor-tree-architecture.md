# Tree-First Editor Architecture

The editor now treats the program tree as the source of truth.

## Flow

1. `EditorDocument.program` stores semantic statements and expressions.
2. `program-editor-core/adapters` can import old block payloads into that tree and project the tree into the current editor block view model for the DOM editor.
3. `program-editor-core/projection` derives visual rows and drop zones from the tree.
4. `program-editor-core/compiler` compiles the tree into debugger instructions and engine operations with source mappings.
5. `program-editor-core/pseudocode` emits text recursively from the tree.

## Why

- Line numbers and indentation are now derived, not semantic identity.
- Breakpoints attach to stable node IDs.
- Compiler/debugger mappings come from semantic nodes, not visible rows.
- Pseudocode export no longer guesses nesting from presentation state.

## Transitional note

The current DOM editor still uses an editor block view model internally for interaction, but the state boundary is tree-first: `PlayEditorEngine` reads from and writes back to `EditorDocument.program`. Old block payloads are only supported as an import path during deserialization.
