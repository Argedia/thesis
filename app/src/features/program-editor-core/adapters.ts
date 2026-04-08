import type { DataValue, StructureKind } from "@thesis/core-engine";
import type {
  BuilderOperation,
  ConditionalMode,
  ConditionalWheelOption,
  DeclarationBindingWheelOption,
  DeclareStatement,
  EditorBlock,
  EditorDocument,
  EditorInputSlotDefinition,
  ExpressionNode,
  LegacySerializedEditorDocument,
  LiteralExpression,
  NodeVisualStyle,
  OutputType,
  ProgramNode,
  RoutineBindingKind,
  RoutineSignature,
  RoutineReturnKind,
  SerializedEditorDocument,
  SerializedEditorDocumentV2,
  StatementNode,
  StructureValueExpression,
  ValueType,
  VariableExpression,
  VariableOperationMode,
  WheelOption
} from "./types";
import { createEditorDocument, getActiveProgram, replaceActiveProgram } from "./tree";
import { analyzeDocumentRoutines } from "./routines";

const FUNCTION_BLUE = "#9ec5ff";

const cloneVisual = (color?: string): NodeVisualStyle | undefined =>
  color ? { color } : undefined;

const inferLiteralValueType = (value: DataValue): Exclude<ValueType, null> =>
  typeof value === "boolean" ? "boolean" : "text";

export const isBuilderOperation = (operation: string): operation is BuilderOperation =>
  [
    "POP",
    "PUSH",
    "DEQUEUE",
    "ENQUEUE",
    "APPEND",
    "PREPEND",
    "REMOVE_FIRST",
    "REMOVE_LAST",
    "GET_HEAD",
    "GET_TAIL",
    "SIZE"
  ].includes(operation);

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

      if (structureKind === "list") {
        return (
          operation === "APPEND" ||
          operation === "PREPEND" ||
          operation === "REMOVE_FIRST" ||
          operation === "REMOVE_LAST" ||
          operation === "GET_HEAD" ||
          operation === "GET_TAIL" ||
          operation === "SIZE"
        );
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
    case "APPEND":
      return `${label}.append`;
    case "PREPEND":
      return `${label}.prepend`;
    case "REMOVE_FIRST":
      return `${label}.remove_first`;
    case "REMOVE_LAST":
      return `${label}.remove_last`;
    case "GET_HEAD":
      return `${label}.get_head`;
    case "GET_TAIL":
      return `${label}.get_tail`;
    case "SIZE":
      return `${label}.size`;
  }
};

export const operationNeedsValue = (operation: BuilderOperation | null): boolean =>
  operation === "PUSH" ||
  operation === "ENQUEUE" ||
  operation === "APPEND" ||
  operation === "PREPEND";

const variableModeOutputType = (mode: VariableOperationMode): OutputType =>
  mode === "assign"
    ? "none"
    : [
          "equals",
          "not_equals",
          "greater_than",
          "greater_or_equal",
          "less_than",
          "less_or_equal",
          "and",
          "or"
        ].includes(mode)
      ? "boolean"
      : "value";

const routineReturnToOutputType = (returnKind: RoutineReturnKind | undefined): OutputType =>
  returnKind === "value" || returnKind === "boolean" ? returnKind : "none";

export const getExpressionOutputType = (expression: ExpressionNode | null): OutputType =>
  expression?.outputType ?? "none";

export const getOutputType = (block: EditorBlock): OutputType => {
  if (block.kind === "value") {
    return block.outputType;
  }

  if (block.kind === "var_operation") {
    if ((block.variableOperationMode ?? "value") === "assign") {
      return "none";
    }
    return variableModeOutputType(block.variableOperationMode ?? "value");
  }

  if (block.kind === "routine_call") {
    return routineReturnToOutputType(block.routineReturnKind);
  }

  return (
    block.operation === "POP" ||
    block.operation === "DEQUEUE" ||
    block.operation === "REMOVE_FIRST" ||
    block.operation === "REMOVE_LAST" ||
    block.operation === "GET_HEAD" ||
    block.operation === "GET_TAIL" ||
    block.operation === "SIZE"
      ? "value"
      : "none"
  );
};

export const getBlockInputSlots = (block: EditorBlock): EditorInputSlotDefinition[] => {
  if (block.kind === "conditional" || block.kind === "while") {
    return [
      {
        id: "input",
        expectedType: "boolean",
        allowDirectTextEntry: true,
        title: "Insert a boolean block or type true / false"
      }
    ];
  }

  if (block.kind === "structure" && operationNeedsValue(block.operation)) {
    return [
      {
        id: "input",
        expectedType: "value",
        allowDirectTextEntry: true,
        title: "Insert a compatible block or type a value"
      }
    ];
  }

  if (block.kind === "var_operation" && (block.variableOperationMode ?? "value") !== "value") {
    return [
      {
        id: "input",
        expectedType: "value",
        allowDirectTextEntry: true,
        title:
          (block.variableOperationMode ?? "value") === "assign"
            ? "Insert a value block or type a value"
            : "Insert an operand block or type a value"
      }
    ];
  }

  if (block.kind === "return") {
    return [
      {
        id: "value",
        expectedType: "any",
        allowDirectTextEntry: true,
        title: "Insert a value block or type a value"
      }
    ];
  }

  if (block.kind === "routine_call") {
    return (block.routineParamNames ?? []).map((paramName, index) => ({
      id: `arg-${index}`,
      expectedType: "any",
      allowDirectTextEntry: true,
      title: `Insert a value for ${paramName}`
    }));
  }

  return [];
};

export const getBlockInputSlot = (block: EditorBlock): EditorInputSlotDefinition | null =>
  getBlockInputSlots(block)[0] ?? null;

export const getBlockSlotBlock = (block: EditorBlock, slotId: string): EditorBlock | null => {
  if (slotId === "input" || slotId === "value") {
    return block.inputBlock ?? null;
  }

  const slotIndex = slotId.startsWith("arg-") ? Number(slotId.slice(4)) : -1;
  return slotIndex >= 0 ? block.inputBlocks?.[slotIndex] ?? null : null;
};

export const setBlockSlotBlock = (
  block: EditorBlock,
  slotId: string,
  nextBlock: EditorBlock | null
): EditorBlock => {
  if (slotId === "input" || slotId === "value") {
    return {
      ...block,
      inputBlock: nextBlock
    };
  }

  const slotIndex = slotId.startsWith("arg-") ? Number(slotId.slice(4)) : -1;
  if (slotIndex < 0) {
    return block;
  }

  const nextInputBlocks = [...(block.inputBlocks ?? [])];
  nextInputBlocks[slotIndex] = nextBlock;
  return {
    ...block,
    inputBlocks: nextInputBlocks
  };
};

export const isSlotCompatible = (
  block: EditorBlock,
  insertedBlock: EditorBlock | null,
  slotId = "input"
): boolean => {
  const expected = getBlockInputSlots(block).find((slot) => slot.id === slotId)?.expectedType ?? null;
  if (!expected || !insertedBlock) {
    return false;
  }

  if (expected === "any") {
    return getOutputType(insertedBlock) !== "none";
  }

  return getOutputType(insertedBlock) === expected;
};

export const describeValue = (value: DataValue | null | undefined): string =>
  value === null || value === undefined ? "value" : `"${String(value)}"`;

export const describeBlock = (block: EditorBlock): string => {
  if (block.kind === "conditional") {
    return "if";
  }

  if (block.kind === "while") {
    return "while";
  }

  if (block.kind === "return") {
    return "return";
  }

  if (block.kind === "routine_call") {
    return block.routineName?.trim() || "function";
  }

  if (block.kind === "var_declaration") {
    return `${block.bindingKind === "expect" ? "expect" : "declare"} ${block.variableName?.trim() || "variable"}`;
  }

  if (block.kind === "var_operation") {
    const name = block.variableName?.trim() || "variable";
    switch (block.variableOperationMode ?? "value") {
      case "assign":
        return `${name} =`;
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
    case "REMOVE_FIRST":
    case "REMOVE_LAST":
    case "GET_HEAD":
    case "GET_TAIL":
    case "SIZE":
      return "mint";
    case "PUSH":
    case "ENQUEUE":
    case "APPEND":
    case "PREPEND":
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
  valueType: typeof literalValue === "boolean" ? "boolean" : inferLiteralValueType(literalValue),
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

export const createWhileBlock = (color = "#e99ac3"): EditorBlock => ({
  id: `while-${crypto.randomUUID()}`,
  kind: "while",
  color,
  operation: null,
  outputType: "none",
  valueType: null,
  literalValue: null,
  inputBlock: null,
  bodyBlocks: []
});

export const createVariableDeclarationBlock = (
  color = "#b7e4c7",
  variableName = "variable",
  bindingKind: RoutineBindingKind = "declare"
): EditorBlock => ({
  id: `var-declaration-${crypto.randomUUID()}`,
  kind: "var_declaration",
  color: bindingKind === "expect" ? FUNCTION_BLUE : color,
  operation: null,
  outputType: "none",
  valueType: null,
  literalValue: null,
  inputBlock: null,
  variableName,
  variableOperationMode: "value",
  bindingKind
});

export const createReturnBlock = (color = FUNCTION_BLUE): EditorBlock => ({
  id: `return-${crypto.randomUUID()}`,
  kind: "return",
  color,
  operation: null,
  outputType: "none",
  valueType: null,
  literalValue: null,
  inputBlock: null
});

export const createRoutineCallBlock = (
  routineId: string,
  routineName: string,
  routineReturnKind: RoutineReturnKind,
  routineParamNames: string[],
  color = FUNCTION_BLUE
): EditorBlock => ({
  id: `routine-call-${crypto.randomUUID()}`,
  kind: "routine_call",
  color,
  operation: null,
  outputType: routineReturnToOutputType(routineReturnKind),
  valueType: routineReturnKind === "boolean" ? "boolean" : routineReturnKind === "value" ? "text" : null,
  literalValue: null,
  inputBlock: null,
  inputBlocks: routineParamNames.map(() => null),
  routineId,
  routineName,
  routineReturnKind,
  routineParamNames
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
    mode: "assign",
    label: "=",
    className: currentMode === "assign" ? "mint selected" : "mint"
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

export const buildDeclarationBindingWheelOptions = (
  currentBindingKind: RoutineBindingKind
): DeclarationBindingWheelOption[] => [
  {
    bindingKind: "declare",
    label: "declare",
    className: currentBindingKind === "declare" ? "mint selected" : "mint"
  },
  {
    bindingKind: "expect",
    label: "expect",
    className: currentBindingKind === "expect" ? "sky selected" : "sky"
  }
];

export interface VariableDeclarationInfo {
  id: string;
  name: string;
  color?: string;
  bindingKind: RoutineBindingKind;
}

export const collectVariableDeclarations = (
  documentOrBlocks: EditorDocument | EditorBlock[]
): VariableDeclarationInfo[] => {
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
          color: block.color,
          bindingKind: block.bindingKind ?? "declare"
        });
      }

      if (block.inputBlock) {
        visit([block.inputBlock]);
      }

      (block.inputBlocks ?? []).forEach((nested) => {
        if (nested) {
          visit([nested]);
        }
      });

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

const variableDeclarationMap = (
  statements: StatementNode[],
  map = new Map<string, DeclareStatement>()
) => {
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
  outputType:
    variableModeOutputType(block.variableOperationMode ?? "value") === "boolean" ? "boolean" : "value",
  visual: cloneVisual(block.color)
});

const structureBlockToExpression = (block: EditorBlock): StructureValueExpression => ({
  id: block.id,
  kind: "structure",
  structureId: block.structureId ?? "A",
  structureKind: block.structureKind ?? "stack",
  operation: block.operation,
  args: block.inputBlock ? [legacyBlockToExpression(block.inputBlock)] : [],
  outputType: "value",
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

  if (block.kind === "routine_call") {
    return {
      id: block.id,
      kind: "routine-call",
      routineId: block.routineId ?? block.id,
      routineName: block.routineName ?? "function",
      args: (block.inputBlocks ?? [])
        .filter((value): value is EditorBlock => !!value)
        .map(legacyBlockToExpression),
      outputType: block.routineReturnKind === "boolean" ? "boolean" : "value",
      visual: cloneVisual(block.color)
    };
  }

  if (block.kind === "conditional" || block.kind === "while") {
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

  if (block.kind === "while") {
    return {
      id: block.id,
      kind: "while",
      condition: block.inputBlock ? legacyBlockToExpression(block.inputBlock) : null,
      body: (block.bodyBlocks ?? []).map(legacyBlockToStatement),
      visual: cloneVisual(block.color)
    };
  }

  if (block.kind === "var_declaration") {
    return {
      id: block.id,
      kind: "declare",
      variableName: block.variableName?.trim() || "variable",
      bindingKind: block.bindingKind ?? "declare",
      visual: cloneVisual(block.color)
    };
  }

  if (block.kind === "return") {
    return {
      id: block.id,
      kind: "return",
      value: block.inputBlock ? legacyBlockToExpression(block.inputBlock) : null,
      visual: cloneVisual(block.color)
    };
  }

  if (block.kind === "routine_call") {
    const args = (block.inputBlocks ?? [])
      .filter((value): value is EditorBlock => !!value)
      .map(legacyBlockToExpression);

    if ((block.routineReturnKind ?? "none") === "none") {
      return {
        id: block.id,
        kind: "routine-call",
        routineId: block.routineId ?? block.id,
        routineName: block.routineName ?? "function",
        returnKind: "none",
        args,
        visual: cloneVisual(block.color)
      };
    }

    return {
      id: block.id,
      kind: "expression",
      expression: legacyBlockToExpression(block),
      visual: cloneVisual(block.color)
    };
  }

  if (block.kind === "var_operation" && (block.variableOperationMode ?? "value") === "assign") {
    return {
      id: block.id,
      kind: "assign",
      targetName: block.variableName?.trim() || "variable",
      targetDeclarationId: block.variableSourceId ?? null,
      value: block.inputBlock ? legacyBlockToExpression(block.inputBlock) : null,
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
  declarations: Map<string, DeclareStatement>,
  signatures: Record<string, RoutineSignature>
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
      inputBlock: expression.operand ? expressionToLegacyBlock(expression.operand, declarations, signatures) : null,
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
      inputBlock: expression.args[0] ? expressionToLegacyBlock(expression.args[0], declarations, signatures) : null
    };
  }

  if (expression.kind === "routine-call") {
    const signature = signatures[expression.routineId];
    const routineParamNames = signature?.params.map((param) => param.name) ?? expression.args.map((_, index) => `arg${index + 1}`);
    const expectedArgCount = routineParamNames.length;
    const inputBlocks = Array.from({ length: expectedArgCount }, (_, index) =>
      expression.args[index] ? expressionToLegacyBlock(expression.args[index]!, declarations, signatures) : null
    );
    return {
      id: expression.id,
      kind: "routine_call",
      color: expression.visual?.color ?? FUNCTION_BLUE,
      operation: null,
      outputType: signature?.returnKind === "none" ? "none" : (signature?.returnKind ?? expression.outputType),
      valueType:
        (signature?.returnKind ?? expression.outputType) === "boolean"
          ? "boolean"
          : (signature?.returnKind ?? expression.outputType) === "value"
            ? "text"
            : null,
      literalValue: null,
      inputBlock: null,
      inputBlocks,
      routineId: expression.routineId,
      routineName: signature?.routineName ?? expression.routineName,
      routineReturnKind: signature?.returnKind ?? expression.outputType,
      routineParamNames
    };
  }

  if (expression.kind === "binary") {
    const left = expressionToLegacyBlock(expression.left, declarations, signatures);
    const right = expression.right ? expressionToLegacyBlock(expression.right, declarations, signatures) : null;
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
  declarations: Map<string, DeclareStatement>,
  signatures: Record<string, RoutineSignature>
): EditorBlock => {
  if (statement.kind === "declare") {
    return {
      id: statement.id,
      kind: "var_declaration",
      color: statement.visual?.color ?? (statement.bindingKind === "expect" ? FUNCTION_BLUE : undefined),
      operation: null,
      outputType: "none",
      valueType: null,
      literalValue: null,
      inputBlock: null,
      variableName: statement.variableName,
      variableOperationMode: "value",
      bindingKind: statement.bindingKind
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
      outputType:
        statement.operation === "POP" ||
        statement.operation === "DEQUEUE" ||
        statement.operation === "REMOVE_FIRST" ||
        statement.operation === "REMOVE_LAST" ||
        statement.operation === "GET_HEAD" ||
        statement.operation === "GET_TAIL" ||
        statement.operation === "SIZE"
          ? "value"
          : "none",
      valueType: null,
      literalValue: null,
      inputBlock: statement.args[0] ? expressionToLegacyBlock(statement.args[0], declarations, signatures) : null
    };
  }

  if (statement.kind === "routine-call") {
    const signature = signatures[statement.routineId];
    const routineParamNames = signature?.params.map((param) => param.name) ?? statement.args.map((_, index) => `arg${index + 1}`);
    const expectedArgCount = routineParamNames.length;
    const inputBlocks = Array.from({ length: expectedArgCount }, (_, index) =>
      statement.args[index] ? expressionToLegacyBlock(statement.args[index]!, declarations, signatures) : null
    );
    return {
      id: statement.id,
      kind: "routine_call",
      color: statement.visual?.color ?? FUNCTION_BLUE,
      operation: null,
      outputType: "none",
      valueType: null,
      literalValue: null,
      inputBlock: null,
      inputBlocks,
      routineId: statement.routineId,
      routineName: signature?.routineName ?? statement.routineName,
      routineReturnKind: signature?.returnKind ?? "none",
      routineParamNames
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
      inputBlock: statement.condition ? expressionToLegacyBlock(statement.condition, declarations, signatures) : null,
      conditionalMode: statement.mode,
      bodyBlocks: statement.thenBody.map((child) => statementToLegacyBlock(child, declarations, signatures)),
      alternateBodyBlocks: statement.elseBody
        ? statement.elseBody.map((child) => statementToLegacyBlock(child, declarations, signatures))
        : []
    };
  }

  if (statement.kind === "while") {
    return {
      id: statement.id,
      kind: "while",
      color: statement.visual?.color ?? "#e99ac3",
      operation: null,
      outputType: "none",
      valueType: null,
      literalValue: null,
      inputBlock: statement.condition ? expressionToLegacyBlock(statement.condition, declarations, signatures) : null,
      bodyBlocks: statement.body.map((child) => statementToLegacyBlock(child, declarations, signatures))
    };
  }

  if (statement.kind === "return") {
    return {
      id: statement.id,
      kind: "return",
      color: statement.visual?.color ?? FUNCTION_BLUE,
      operation: null,
      outputType: "none",
      valueType: null,
      literalValue: null,
      inputBlock: statement.value ? expressionToLegacyBlock(statement.value, declarations, signatures) : null
    };
  }

  if (statement.kind === "assign") {
    return {
      id: statement.id,
      kind: "var_operation",
      color: statement.visual?.color,
      operation: null,
      outputType: "none",
      valueType: null,
      literalValue: null,
      inputBlock: statement.value ? expressionToLegacyBlock(statement.value, declarations, signatures) : null,
      variableSourceId: statement.targetDeclarationId ?? statement.id,
      variableName: statement.targetName,
      variableOperationMode: "assign"
    };
  }

  return {
    ...expressionToLegacyBlock(statement.expression, declarations, signatures),
    id: statement.id
  };
};

export const projectProgramToLegacyBlocks = (
  program: ProgramNode,
  signatures: Record<string, RoutineSignature> = {}
): EditorBlock[] => {
  const declarations = variableDeclarationMap(program.statements);
  return program.statements.map((statement) => statementToLegacyBlock(statement, declarations, signatures));
};

export const projectDocumentToLegacyBlocks = (document: EditorDocument): EditorBlock[] =>
  projectProgramToLegacyBlocks(getActiveProgram(document), analyzeDocumentRoutines(document));

export const createEditorDocumentFromLegacyBlocks = (
  blocks: EditorBlock[],
  source?: EditorDocument | string
): EditorDocument => {
  const programId =
    typeof source === "string" ? source : source ? getActiveProgram(source).id : "program-root";
  const nextProgram = migrateLegacyBlocksToProgram(blocks, programId);
  if (source && typeof source !== "string") {
    return replaceActiveProgram(source, nextProgram);
  }
  return createEditorDocument(nextProgram);
};

export const serializeEditorDocument = (document: EditorDocument): SerializedEditorDocument => ({
  version: 3,
  routines: document.routines,
  activeRoutineId: document.activeRoutineId
});

export const deserializeEditorDocument = (
  payload: SerializedEditorDocument | SerializedEditorDocumentV2 | LegacySerializedEditorDocument
): EditorDocument => {
  if ("routines" in payload) {
    return createEditorDocument(payload);
  }

  if ("program" in payload) {
    return createEditorDocument(payload.program);
  }

  return createEditorDocumentFromLegacyBlocks(payload.blocks);
};
