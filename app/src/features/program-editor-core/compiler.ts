import type { DataValue, OperationDefinition, StructureKind } from "@thesis/core-engine";
import type {
  BuilderOperation,
  ConditionalMode,
  ConditionalWheelOption,
  EditorBlock,
  EditorDocument,
  WheelOption
} from "./types";

export interface CompileResult {
  operations: OperationDefinition[];
  operationOwnerIds: string[];
  isComplete: boolean;
  unsupportedFeatures: string[];
  diagnostics: string[];
}

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

export const blockNeedsInput = (block: EditorBlock): boolean =>
  block.kind === "structure" && operationNeedsValue(block.operation);

export const getOutputType = (block: EditorBlock): "none" | "value" => {
  if (block.kind === "value") {
    return "value";
  }

  return block.operation === "POP" || block.operation === "DEQUEUE" ? "value" : "none";
};

export const slotExpectedType = (block: EditorBlock): "value" | null =>
  blockNeedsInput(block) ? "value" : null;

export const isSlotCompatible = (block: EditorBlock, insertedBlock: EditorBlock | null): boolean => {
  const expected = slotExpectedType(block);
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

type CompiledValue =
  | { kind: "literal"; value: DataValue }
  | { kind: "hand" };

interface CompiledBlockResult {
  operations: OperationDefinition[];
  ownerIds: string[];
  provides: CompiledValue | null;
  isComplete: boolean;
}

const containsConditional = (block: EditorBlock): boolean => {
  if (block.kind === "conditional") {
    return true;
  }

  if (block.inputBlock && containsConditional(block.inputBlock)) {
    return true;
  }

  return (
    (block.ifBranch?.some(containsConditional) ?? false) ||
    (block.elseBranch?.some(containsConditional) ?? false)
  );
};

const compileBlock = (block: EditorBlock): CompiledBlockResult => {
  if (block.kind === "conditional") {
    return { operations: [], ownerIds: [], provides: null, isComplete: false };
  }

  if (block.kind === "value") {
    if (block.literalValue === null || block.literalValue === undefined) {
      return { operations: [], ownerIds: [], provides: null, isComplete: false };
    }

    return {
      operations: [],
      ownerIds: [],
      provides: {
        kind: "literal",
        value: block.literalValue
      },
      isComplete: true
    };
  }

  if (!block.operation || !block.structureId) {
    return { operations: [], ownerIds: [], provides: null, isComplete: false };
  }

  if (block.operation === "POP" || block.operation === "DEQUEUE") {
    return {
      operations: [
        {
          type: block.operation,
          sourceId: block.structureId
        }
      ],
      ownerIds: [block.id],
      provides: { kind: "hand" },
      isComplete: true
    };
  }

  if (!block.inputBlock) {
    return { operations: [], ownerIds: [], provides: null, isComplete: false };
  }

  const inputResult = compileBlock(block.inputBlock);
  if (!inputResult.isComplete || !isSlotCompatible(block, block.inputBlock) || !inputResult.provides) {
    return { operations: [], ownerIds: [], provides: null, isComplete: false };
  }

  return {
    operations: [
      ...inputResult.operations,
      {
        type: block.operation,
        targetId: block.structureId,
        value: inputResult.provides.kind === "literal" ? inputResult.provides.value : undefined
      }
    ],
    ownerIds: [...inputResult.ownerIds, block.id],
    provides: null,
    isComplete: true
  };
};

export const compileEditorDocument = (document: EditorDocument): CompileResult => {
  const compiled = document.blocks.map(compileBlock);
  const hasUnsupportedConditionals = document.blocks.some((block) => containsConditional(block));
  const diagnostics: string[] = [];

  if (hasUnsupportedConditionals) {
    diagnostics.push("Conditional blocks are visual-only for now.");
  } else if (!compiled.every((item) => item.isComplete)) {
    diagnostics.push("Finish each block and fill any missing value slots.");
  }

  return {
    operations: compiled.flatMap((item) => item.operations),
    operationOwnerIds: compiled.flatMap((item) => item.ownerIds),
    isComplete: compiled.every((item) => item.isComplete) && !hasUnsupportedConditionals,
    unsupportedFeatures: hasUnsupportedConditionals ? ["conditional"] : [],
    diagnostics
  };
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
  outputType: "value",
  valueType: "text",
  literalValue,
  inputBlock: null
});

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
  ifBranch: [],
  elseBranch: []
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
