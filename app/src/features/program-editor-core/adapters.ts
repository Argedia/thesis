import type { DataValue, StructureKind } from "@thesis/core-engine";
import type {
  BuilderOperation,
  ConditionalMode,
  DeclareStatement,
  EditorBlock,
  EditorDocument,
  EditorInputSlotDefinition,
  ExpressionNode,
  LegacySerializedEditorDocument,
  SerializedEditorDocument,
  LiteralExpression,
  NodeVisualStyle,
  OutputType,
  ProgramNode,
  StatementNode,
  StructureValueExpression,
  ValueType,
  VariableExpression,
  VariableOperationMode,
  WheelOption,
  ConditionalWheelOption
} from "./types";
import { createEditorDocument } from "./tree";

const cloneVisual = (color?: string): NodeVisualStyle | undefined =>
  color ? { color } : undefined;

const inferLiteralValueType = (value: DataValue): Exclude<ValueType, null> =>
  typeof value === "boolean" ? "boolean" : "text";

export const isBuilderOperation = (operation: string): operation is BuilderOperation =>
  ["POP", "PUSH", "DEQUEUE", "ENQUEUE"].includes(operation);

export const getAllowedOperations = (
  allowedOperations: string[],
  structureKind: StructureKind
): BuilderOperation[] =>
  allowedOperations
    .filter(isBuilderOperation)
    .filter((operation) => {
      if (structureKind === "stack") {
        return operation === "POP" || operation === "PUSH";
      }

      return operation === "DEQUEUE" || operation === "ENQUEUE";
    });

export const describeOperation = (
  operation: BuilderOperation | null,
  structureId?: string
): string => {
  const label = structureId ?? "Value";
  if (!operation) {
    return label;
  }

  switch (operation) {
    case "POP":
      return `${label}.pop`;
    case "PUSH":
      return `${label}.push`;
    case "DEQUEUE":
      return `${label}.dequeue`;
    case "ENQUEUE":
      return `${label}.enqueue`;
  }
};

export const operationNeedsValue = (operation: BuilderOperation | null): boolean =>
  operation === "PUSH" || operation === "ENQUEUE";

const variableModeOutputType = (mode: VariableOperationMode): Exclude<OutputType, "none"> =>
  ["equals", "not_equals", "greater_than", "greater_or_equal", "less_than", "less_or_equal", "and", "or"].includes(mode)
    ? "boolean"
    : "value";

export const getExpressionOutputType = (expression: ExpressionNode | null): OutputType => {
  if (!expression) {
    return "none";
  }
  return expression.outputType;
};

export const blockNeedsInput = (block: EditorBlock): boolean =>
  block.kind === "conditional" ||
  (block.kind === "structure" && operationNeedsValue(block.operation)) ||
  (block.kind === "var_operation" && block.variableOperationMode !== "value");

export const getOutputType = (block: EditorBlock): OutputType => {
  if (block.kind === "value") {
    return block.outputType;
  }

  if (block.kind === "var_operation") {
    return variableModeOutputType(block.variableOperationMode ?? "value");
  }

  return block.operation === "POP" || block.operation === "DEQUEUE" ? "value" : "none";
};

export const slotExpectedType = (block: EditorBlock): "value" | "boolean" | null =>
  block.kind === "conditional"
    ? "boolean"
    : blockNeedsInput(block)
      ? "value"
      : null;

export const getBlockInputSlot = (block: EditorBlock): EditorInputSlotDefinition | null => {
  if (!blockNeedsInput(block)) {
    return null;
  }

  return {
    id: "input",
    expectedType: slotExpectedType(block) ?? "value",
    allowDirectTextEntry: true,
    title:
      block.kind === "conditional"
        ? "Insert a boolean block or type true / false"
        : block.kind === "var_operation"
          ? "Insert an operand block or type a value"
          : "Insert a compatible block or type a value"
  };
};

export const isSlotCompatible = (block: EditorBlock, insertedBlock: EditorBlock | null): boolean => {
  const expected = getBlockInputSlot(block)?.expectedType ?? null;
  if (!expected || !insertedBlock) {
    return false;
  }

  return getOutputType(insertedBlock) === expected;
};

export const describeValue = (value: DataValue | null | undefined): string =>
  value === null || value === undefined ? "value" : `"${String(value)}"`;

export const describeBlock = (block: EditorBlock): string => {
  if (block.kind === "conditional") {
    return "if";
  }

  if (block.kind === "var_declaration") {
    return `declare ${block.variableName?.trim() || "variable"}`;
  }

  if (block.kind === "var_operation") {
    const name = block.variableName?.trim() || "variable";
    switch (block.variableOperationMode ?? "value") {
      case "add":
        return `${name} +`;
      case "subtract":
        return `${name} -`;
      case "multiply":
        return `${name} *`;
      case "divide":
        return `${name} /`;
      case "modulo":
        return `${name} %`;
      case "equals":
        return `${name} ==`;
      case "not_equals":
        return `${name} !=`;
      case "greater_than":
        return `${name} >`;
      case "greater_or_equal":
        return `${name} >=`;
      case "less_than":
        return `${name} <`;
      case "less_or_equal":
        return `${name} <=`;
      case "and":
        return `${name} and`;
      case "or":
        return `${name} or`;
      default:
        return name;
    }
  }

  if (block.kind === "value") {
    return describeValue(block.literalValue);
  }

  return describeOperation(block.operation, block.structureId);
};

export const blockColorClass = (operation: BuilderOperation | null): string => {
  switch (operation) {
    case "POP":
    case "DEQUEUE":
      return "mint";
    case "PUSH":
    case "ENQUEUE":
      return "peach";
    default:
      return "sky";
  }
};

export const createEditorBlock = (
  structureId: string,
  structureKind: StructureKind,
  color?: string
): EditorBlock => ({
  id: `block-${crypto.randomUUID()}`,
  kind: "structure",
  color,
  structureId,
  structureKind,
  operation: null,
  outputType: "none",
  valueType: null,
  literalValue: null,
  inputBlock: null
});

export const createValueBlock = (literalValue: DataValue = "item"): EditorBlock => ({
  id: `value-${crypto.randomUUID()}`,
  kind: "value",
  color: undefined,
  operation: null,
  outputType: typeof literalValue === "boolean" ? "boolean" : "value",
  valueType: inferLiteralValueType(literalValue),
  literalValue,
  inputBlock: null
});

export const createBooleanValueBlock = (literalValue = true): EditorBlock =>
  createValueBlock(literalValue);

export const createConditionalBlock = (
  color = "#f4b6d8",
  conditionalMode: ConditionalMode = "if"
): EditorBlock => ({
  id: `conditional-${crypto.randomUUID()}`,
  kind: "conditional",
  color,
  operation: null,
  outputType: "none",
  valueType: null,
  literalValue: null,
  inputBlock: null,
  conditionalMode,
  bodyBlocks: [],
  alternateBodyBlocks: []
});

export const createVariableDeclarationBlock = (
  color = "#b7e4c7",
  variableName = "variable"
): EditorBlock => ({
  id: `var-declaration-${crypto.randomUUID()}`,
  kind: "var_declaration",
  color,
  operation: null,
  outputType: "none",
  valueType: null,
  literalValue: null,
  inputBlock: null,
  variableName,
  variableOperationMode: "value"
});

export const createVariableOperationBlock = (
  variableSourceId: string,
  variableName: string,
  color = "#d8f3dc",
  variableOperationMode: VariableOperationMode = "value"
): EditorBlock => ({
  id: `var-operation-${crypto.randomUUID()}`,
  kind: "var_operation",
  color,
  operation: null,
  outputType: variableModeOutputType(variableOperationMode),
  valueType: null,
  literalValue: null,
  inputBlock: null,
  variableSourceId,
  variableName,
  variableOperationMode
});

export const buildWheelOptions = (
  allowedOperations: string[],
  structureId: string,
  structureKind: StructureKind
): WheelOption[] => [
  ...getAllowedOperations(allowedOperations, structureKind).map((operation) => ({
    operation,
    label: describeOperation(operation, structureId),
    className: blockColorClass(operation)
  })),
  {
    operation: null,
    label: "Base",
    className: "sky"
  }
];

export const buildConditionalWheelOptions = (
  currentMode: ConditionalMode
): ConditionalWheelOption[] => [
  {
    mode: "if",
    label: "If Only",
    className: currentMode === "if" ? "rose" : "sky"
  },
  {
    mode: "if-else",
    label: "If / Else",
    className: currentMode === "if-else" ? "rose" : "sky"
  }
];

export interface VariableOperationWheelOption {
  mode: VariableOperationMode;
  label: string;
  className: string;
}

export const buildVariableOperationWheelOptions = (
  currentMode: VariableOperationMode
): VariableOperationWheelOption[] => [
  {
    mode: "value",
    label: "var",
    className: currentMode === "value" ? "mint selected" : "mint"
  },
  {
    mode: "add",
    label: "+",
    className: currentMode === "add" ? "peach selected" : "peach"
  },
  {
    mode: "subtract",
    label: "-",
    className: currentMode === "subtract" ? "peach selected" : "peach"
  },
  {
    mode: "multiply",
    label: "*",
    className: currentMode === "multiply" ? "peach selected" : "peach"
  },
  {
    mode: "divide",
    label: "/",
    className: currentMode === "divide" ? "peach selected" : "peach"
  },
  {
    mode: "modulo",
    label: "%",
    className: currentMode === "modulo" ? "peach selected" : "peach"
  },
  {
    mode: "equals",
    label: "==",
    className: currentMode === "equals" ? "sky selected" : "sky"
  },
  {
    mode: "not_equals",
    label: "!=",
    className: currentMode === "not_equals" ? "sky selected" : "sky"
  },
  {
    mode: "greater_than",
    label: ">",
    className: currentMode === "greater_than" ? "sky selected" : "sky"
  },
  {
    mode: "greater_or_equal",
    label: ">=",
    className: currentMode === "greater_or_equal" ? "sky selected" : "sky"
  },
  {
    mode: "less_than",
    label: "<",
    className: currentMode === "less_than" ? "sky selected" : "sky"
  },
  {
    mode: "less_or_equal",
    label: "<=",
    className: currentMode === "less_or_equal" ? "sky selected" : "sky"
  },
  {
    mode: "and",
    label: "and",
    className: currentMode === "and" ? "rose selected" : "rose"
  },
  {
    mode: "or",
    label: "or",
    className: currentMode === "or" ? "rose selected" : "rose"
  }
];

export interface VariableDeclarationInfo {
  id: string;
  name: string;
  color?: string;
}

export const collectVariableDeclarations = (documentOrBlocks: EditorDocument | EditorBlock[]): VariableDeclarationInfo[] => {
  const blocks = Array.isArray(documentOrBlocks)
    ? documentOrBlocks
    : projectDocumentToLegacyBlocks(documentOrBlocks);
  const declarations: VariableDeclarationInfo[] = [];

  const visit = (items: EditorBlock[]) => {
    items.forEach((block) => {
      if (block.kind === "var_declaration") {
        declarations.push({
          id: block.id,
          name: block.variableName?.trim() || "variable",
          color: block.color
        });
      }
      if (block.inputBlock) {
        visit([block.inputBlock]);
      }
      if (block.bodyBlocks) {
        visit(block.bodyBlocks);
      }
      if (block.alternateBodyBlocks) {
        visit(block.alternateBodyBlocks);
      }
    });
  };

  visit(blocks);
  return declarations;
};

export const synchronizeVariableReferences = (blocks: EditorBlock[]): EditorBlock[] =>
  projectProgramToLegacyBlocks(migrateLegacyBlocksToProgram(blocks));

const variableDeclarationMap = (statements: StatementNode[], map = new Map<string, DeclareStatement>()) => {
  statements.forEach((statement) => {
    if (statement.kind === "declare") {
      map.set(statement.id, statement);
    }
    if (statement.kind === "if") {
      variableDeclarationMap(statement.thenBody, map);
      if (statement.elseBody) {
        variableDeclarationMap(statement.elseBody, map);
      }
    }
    if (statement.kind === "while") {
      variableDeclarationMap(statement.body, map);
    }
  });
  return map;
};

const literalToExpression = (block: EditorBlock): LiteralExpression => ({
  id: block.id,
  kind: "literal",
  outputType: block.outputType === "boolean" ? "boolean" : "value",
  valueType: block.valueType === "boolean" ? "boolean" : "text",
  value: block.literalValue ?? "item",
  visual: cloneVisual(block.color)
});

const variableBlockToExpression = (block: EditorBlock): VariableExpression => ({
  id: block.id,
  kind: "variable",
  declarationId: block.variableSourceId ?? block.id,
  variableName: block.variableName?.trim() || "variable",
  mode: block.variableOperationMode ?? "value",
  operand: block.inputBlock ? legacyBlockToExpression(block.inputBlock) : null,
  outputType: variableModeOutputType(block.variableOperationMode ?? "value"),
  visual: cloneVisual(block.color)
});

const structureBlockToExpression = (block: EditorBlock): StructureValueExpression => ({
  id: block.id,
  kind: "structure",
  structureId: block.structureId ?? "A",
  structureKind: block.structureKind ?? "stack",
  operation: block.operation,
  outputType: block.operation === "POP" || block.operation === "DEQUEUE" ? "value" : "value",
  visual: cloneVisual(block.color)
});

export const legacyBlockToExpression = (block: EditorBlock): ExpressionNode => {
  if (block.kind === "value") {
    return literalToExpression(block);
  }

  if (block.kind === "var_operation") {
    return variableBlockToExpression(block);
  }

  if (block.kind === "structure") {
    return structureBlockToExpression(block);
  }

  if (block.kind === "conditional") {
    return {
      id: block.id,
      kind: "unary",
      operator: "not",
      operand: block.inputBlock ? legacyBlockToExpression(block.inputBlock) : null,
      outputType: "boolean",
      visual: cloneVisual(block.color)
    };
  }

  return literalToExpression({
    ...block,
    kind: "value",
    outputType: "value",
    valueType: "text",
    literalValue: block.variableName ?? "value"
  });
};

export const legacyBlockToStatement = (block: EditorBlock): StatementNode => {
  if (block.kind === "conditional") {
    return {
      id: block.id,
      kind: "if",
      condition: block.inputBlock ? legacyBlockToExpression(block.inputBlock) : null,
      thenBody: (block.bodyBlocks ?? []).map(legacyBlockToStatement),
      elseBody:
        block.conditionalMode === "if-else"
          ? (block.alternateBodyBlocks ?? []).map(legacyBlockToStatement)
          : null,
      mode: block.conditionalMode ?? "if",
      visual: cloneVisual(block.color)
    };
  }

  if (block.kind === "var_declaration") {
    return {
      id: block.id,
      kind: "declare",
      variableName: block.variableName?.trim() || "variable",
      visual: cloneVisual(block.color)
    };
  }

  if (block.kind === "var_operation" || block.kind === "value") {
    return {
      id: block.id,
      kind: "expression",
      expression: {
        ...legacyBlockToExpression(block),
        id: `expr-${block.id}`
      },
      visual: cloneVisual(block.color)
    };
  }

  return {
    id: block.id,
    kind: "call",
    calleeKind: "structure",
    structureId: block.structureId ?? "A",
    structureKind: block.structureKind ?? "stack",
    operation: block.operation,
    args: block.inputBlock ? [legacyBlockToExpression(block.inputBlock)] : [],
    visual: cloneVisual(block.color)
  };
};

export const migrateLegacyBlocksToProgram = (
  blocks: EditorBlock[],
  programId = "program-root"
): ProgramNode => ({
  id: programId,
  kind: "program",
  statements: blocks.map(legacyBlockToStatement)
});

const expressionToLegacyBlock = (
  expression: ExpressionNode,
  declarations: Map<string, DeclareStatement>
): EditorBlock => {
  if (expression.kind === "literal") {
    return {
      id: expression.id,
      kind: "value",
      color: expression.visual?.color,
      operation: null,
      outputType: expression.outputType,
      valueType: expression.valueType,
      literalValue: expression.value,
      inputBlock: null
    };
  }

  if (expression.kind === "variable") {
    const declaration = declarations.get(expression.declarationId);
    return {
      id: expression.id,
      kind: "var_operation",
      color: expression.visual?.color ?? declaration?.visual?.color,
      operation: null,
      outputType: expression.outputType,
      valueType: null,
      literalValue: null,
      inputBlock: expression.operand ? expressionToLegacyBlock(expression.operand, declarations) : null,
      variableSourceId: expression.declarationId,
      variableName: declaration?.variableName ?? expression.variableName,
      variableOperationMode: expression.mode
    };
  }

  if (expression.kind === "structure") {
    return {
      id: expression.id,
      kind: "structure",
      color: expression.visual?.color,
      structureId: expression.structureId,
      structureKind: expression.structureKind,
      operation: expression.operation,
      outputType: expression.outputType,
      valueType: null,
      literalValue: null,
      inputBlock: null
    };
  }

  if (expression.kind === "binary") {
    const left = expressionToLegacyBlock(expression.left, declarations);
    const right = expression.right ? expressionToLegacyBlock(expression.right, declarations) : null;
    return {
      ...left,
      id: expression.id,
      inputBlock: right
    };
  }

  return {
    id: expression.id,
    kind: "value",
    color: expression.visual?.color,
    operation: null,
    outputType: "boolean",
    valueType: "boolean",
    literalValue: true,
    inputBlock: null
  };
};

const statementToLegacyBlock = (
  statement: StatementNode,
  declarations: Map<string, DeclareStatement>
): EditorBlock => {
  if (statement.kind === "declare") {
    return {
      id: statement.id,
      kind: "var_declaration",
      color: statement.visual?.color,
      operation: null,
      outputType: "none",
      valueType: null,
      literalValue: null,
      inputBlock: null,
      variableName: statement.variableName,
      variableOperationMode: "value"
    };
  }

  if (statement.kind === "call") {
    return {
      id: statement.id,
      kind: "structure",
      color: statement.visual?.color,
      structureId: statement.structureId,
      structureKind: statement.structureKind,
      operation: statement.operation,
      outputType: statement.operation === "POP" || statement.operation === "DEQUEUE" ? "value" : "none",
      valueType: null,
      literalValue: null,
      inputBlock: statement.args[0] ? expressionToLegacyBlock(statement.args[0], declarations) : null
    };
  }

  if (statement.kind === "if") {
    return {
      id: statement.id,
      kind: "conditional",
      color: statement.visual?.color,
      operation: null,
      outputType: "none",
      valueType: null,
      literalValue: null,
      inputBlock: statement.condition ? expressionToLegacyBlock(statement.condition, declarations) : null,
      conditionalMode: statement.mode,
      bodyBlocks: statement.thenBody.map((child) => statementToLegacyBlock(child, declarations)),
      alternateBodyBlocks: statement.elseBody
        ? statement.elseBody.map((child) => statementToLegacyBlock(child, declarations))
        : []
    };
  }

  if (statement.kind === "while") {
    return {
      id: statement.id,
      kind: "conditional",
      color: statement.visual?.color ?? "#f4b6d8",
      operation: null,
      outputType: "none",
      valueType: null,
      literalValue: null,
      inputBlock: statement.condition ? expressionToLegacyBlock(statement.condition, declarations) : null,
      conditionalMode: "if",
      bodyBlocks: statement.body.map((child) => statementToLegacyBlock(child, declarations)),
      alternateBodyBlocks: []
    };
  }

  if (statement.kind === "assign") {
    const operand = statement.value ? expressionToLegacyBlock(statement.value, declarations) : null;
    return {
      id: statement.id,
      kind: "var_operation",
      color: statement.visual?.color,
      operation: null,
      outputType: operand ? getOutputType(operand) : "value",
      valueType: null,
      literalValue: null,
      inputBlock: operand,
      variableSourceId: statement.targetDeclarationId ?? statement.id,
      variableName: statement.targetName,
      variableOperationMode: "value"
    };
  }

  return {
    ...expressionToLegacyBlock(statement.expression, declarations),
    id: statement.id
  };
};

export const projectProgramToLegacyBlocks = (program: ProgramNode): EditorBlock[] => {
  const declarations = variableDeclarationMap(program.statements);
  return program.statements.map((statement) => statementToLegacyBlock(statement, declarations));
};

export const projectDocumentToLegacyBlocks = (document: EditorDocument): EditorBlock[] =>
  projectProgramToLegacyBlocks(document.program);

export const createEditorDocumentFromLegacyBlocks = (
  blocks: EditorBlock[],
  programId = "program-root"
): EditorDocument => createEditorDocument(migrateLegacyBlocksToProgram(blocks, programId));

export const serializeEditorDocument = (document: EditorDocument) => ({
  version: 2 as const,
  program: document.program
});

export const deserializeEditorDocument = (
  payload: SerializedEditorDocument | LegacySerializedEditorDocument
): EditorDocument =>
  "program" in payload
    ? createEditorDocument(payload.program)
    : createEditorDocumentFromLegacyBlocks(payload.blocks);
