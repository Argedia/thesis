import type {
  DropZone,
  EditorDocument,
  EditorRow,
  IfStatement,
  ProgramContainerRef,
  ProjectionResult,
  StatementNode,
  WhileStatement
} from "./types";
import { getActiveRoutine } from "./tree";

const executableRowKinds = new Set(["statement", "if-header", "while-header", "for-each-header"]);

const pushDropZone = (
  dropZones: DropZone[],
  container: ProgramContainerRef,
  insertionIndex: number,
  depth: number,
  displayRole: DropZone["displayRole"],
  anchorRowId?: string
) => {
  dropZones.push({
    zoneId: `zone-${container.kind}-${container.kind === "program" ? container.programId : container.ownerId}-${insertionIndex}-${displayRole}-${anchorRowId ?? "tail"}`,
    container,
    insertionIndex,
    depth,
    displayRole,
    anchorRowId
  });
};

const pushRow = (
  rows: EditorRow[],
  nodeRowMap: Record<string, string[]>,
  config: Omit<EditorRow, "rowNumber">
) => {
  const row: EditorRow = {
    ...config,
    rowNumber: rows.length + 1
  };
  rows.push(row);
  if (row.nodeId) {
    nodeRowMap[row.nodeId] = [...(nodeRowMap[row.nodeId] ?? []), row.rowId];
  }
};

const visitStatements = (
  statements: StatementNode[],
  container: ProgramContainerRef,
  depth: number,
  rows: EditorRow[],
  dropZones: DropZone[],
  nodeRowMap: Record<string, string[]>
) => {
  if (statements.length === 0) {
    pushRow(rows, nodeRowMap, {
      rowId: `placeholder-${container.kind}-${container.kind === "program" ? container.programId : container.ownerId}`,
      rowKind: "placeholder",
      nodeId: null,
      depth,
      isExecutable: false,
      container,
      indexInContainer: 0,
      placeholderFor: container
    });
    pushDropZone(dropZones, container, 0, depth, "empty-body");
    return;
  }

  statements.forEach((statement, index) => {
    pushDropZone(dropZones, container, index, depth, "before-row", `row-${statement.id}`);

    const rowKind =
      statement.kind === "function-definition"
        ? "function-definition-header"
        : statement.kind === "type-definition"
          ? "type-definition-header"
        : statement.kind === "if"
        ? "if-header"
        : statement.kind === "while"
          ? "while-header"
          : statement.kind === "for-each"
            ? "for-each-header"
          : "statement";
    pushRow(rows, nodeRowMap, {
      rowId: `row-${statement.id}`,
      rowKind,
      nodeId: statement.id,
      depth,
      isExecutable: executableRowKinds.has(rowKind),
      container,
      indexInContainer: index,
      statement
    });

    if (statement.kind === "if") {
      visitStatements(
        statement.thenBody,
        { kind: "if-then", ownerId: statement.id },
        depth + 1,
        rows,
        dropZones,
        nodeRowMap
      );

      if (statement.mode === "if-else") {
        pushRow(rows, nodeRowMap, {
          rowId: `row-${statement.id}-else`,
          rowKind: "else-header",
          nodeId: statement.id,
          depth,
          isExecutable: false,
          container: { kind: "if-else", ownerId: statement.id },
          indexInContainer: 0,
          statement
        });
        visitStatements(
          statement.elseBody ?? [],
          { kind: "if-else", ownerId: statement.id },
          depth + 1,
          rows,
          dropZones,
          nodeRowMap
        );
      }
    }

    if (statement.kind === "while") {
      visitStatements(
        statement.body,
        { kind: "while-body", ownerId: statement.id },
        depth + 1,
        rows,
        dropZones,
        nodeRowMap
      );
    }

    if (statement.kind === "for-each") {
      visitStatements(
        statement.body,
        { kind: "for-each-body", ownerId: statement.id },
        depth + 1,
        rows,
        dropZones,
        nodeRowMap
      );
    }
  });

  pushDropZone(
    dropZones,
    container,
    statements.length,
    depth,
    "after-row",
    `row-${statements[statements.length - 1]!.id}`
  );
};

export const projectProgramRows = (document: EditorDocument): ProjectionResult => {
  const rows: EditorRow[] = [];
  const dropZones: DropZone[] = [];
  const nodeRowMap: Record<string, string[]> = {};
  const activeRoutine = getActiveRoutine(document);

  visitStatements(
    activeRoutine.program.statements,
    { kind: "program", programId: activeRoutine.program.id },
    0,
    rows,
    dropZones,
    nodeRowMap
  );

  return {
    rows,
    dropZones,
    nodeRowMap
  };
};
