import type {
  EditorBlock,
  EditorBlockKind,
  EditorDragState,
  ExpressionFamily,
  PaletteBlock,
  VariableOperationMode
} from "./model";

export type BlockLimitKey =
  | "value"
  | "var_binary_operation:arithmetic"
  | "var_binary_operation:logical"
  | "var_binary_operation:comparison"
  | "conditional"
  | "while"
  | "for_each"
  | "break"
  | "function_definition"
  | "type_definition"
  | "return"
  | "var_declaration"
  | "var_assign"
  | "var_reference"
  | "var_operation";

export const BLOCK_LIMIT_KEYS: BlockLimitKey[] = [
  "value",
  "var_binary_operation:arithmetic",
  "var_binary_operation:logical",
  "var_binary_operation:comparison",
  "conditional",
  "while",
  "for_each",
  "break",
  "function_definition",
  "type_definition",
  "return",
  "var_declaration",
  "var_assign",
  "var_reference",
  "var_operation"
];

const LEGACY_KIND_TO_LIMIT_KEYS: Partial<Record<EditorBlockKind, BlockLimitKey[]>> = {
  value: ["value"],
  var_binary_operation: [
    "var_binary_operation:arithmetic",
    "var_binary_operation:logical",
    "var_binary_operation:comparison"
  ],
  conditional: ["conditional"],
  while: ["while"],
  for_each: ["for_each"],
  break: ["break"],
  function_definition: ["function_definition"],
  type_definition: ["type_definition"],
  return: ["return"],
  var_declaration: ["var_declaration"],
  var_assign: ["var_assign"],
  var_reference: ["var_reference"],
  var_operation: ["var_operation"]
};

const resolveBinaryFamily = (
  expressionFamily: ExpressionFamily | undefined,
  mode: VariableOperationMode | undefined
): ExpressionFamily => {
  if (expressionFamily) {
    return expressionFamily;
  }

  if (mode === "and" || mode === "or" || mode === "not") {
    return "logical";
  }
  if (
    mode === "equals" ||
    mode === "not_equals" ||
    mode === "greater_than" ||
    mode === "greater_or_equal" ||
    mode === "less_than" ||
    mode === "less_or_equal"
  ) {
    return "comparison";
  }
  return "arithmetic";
};

const resolveLimitKeyFromKind = (options: {
  kind: EditorBlockKind;
  expressionFamily?: ExpressionFamily;
  variableOperationMode?: VariableOperationMode;
}): BlockLimitKey | null => {
  if (options.kind === "var_binary_operation") {
    const family = resolveBinaryFamily(options.expressionFamily, options.variableOperationMode);
    return `var_binary_operation:${family}`;
  }

  const keys = LEGACY_KIND_TO_LIMIT_KEYS[options.kind];
  if (!keys || keys.length === 0) {
    return null;
  }
  return keys[0] ?? null;
};

export const resolveBlockLimitKeyForPaletteBlock = (block: Pick<PaletteBlock, "kind" | "expressionFamily" | "variableOperationMode">): BlockLimitKey | null =>
  resolveLimitKeyFromKind({
    kind: block.kind,
    expressionFamily: block.expressionFamily,
    variableOperationMode: block.variableOperationMode
  });

export const resolveBlockLimitKeyForEditorBlock = (block: Pick<EditorBlock, "kind" | "expressionFamily" | "variableOperationMode">): BlockLimitKey | null =>
  resolveLimitKeyFromKind({
    kind: block.kind,
    expressionFamily: block.expressionFamily,
    variableOperationMode: block.variableOperationMode
  });

export const resolveBlockLimitKeyForDragState = (dragState: Pick<EditorDragState, "blockKind" | "expressionFamily" | "variableOperationMode">): BlockLimitKey | null =>
  resolveLimitKeyFromKind({
    kind: dragState.blockKind,
    expressionFamily: dragState.expressionFamily,
    variableOperationMode: dragState.variableOperationMode
  });

export const createDefaultBlockLimits = (value: number): Record<BlockLimitKey, number> =>
  BLOCK_LIMIT_KEYS.reduce(
    (accumulator, key) => {
      accumulator[key] = Math.max(0, Math.floor(value));
      return accumulator;
    },
    {} as Record<BlockLimitKey, number>
  );

export const normalizeBlockLimits = (options: {
  blockLimits?: Record<string, number> | null;
  forbiddenBlocks?: string[] | null;
  defaultLimit: number;
}): Record<BlockLimitKey, number> => {
  const normalized = createDefaultBlockLimits(options.defaultLimit);

  if (options.blockLimits) {
    BLOCK_LIMIT_KEYS.forEach((key) => {
      const raw = options.blockLimits?.[key];
      if (typeof raw !== "number" || !Number.isFinite(raw)) {
        return;
      }
      normalized[key] = Math.max(0, Math.floor(raw));
    });
  }

  if (options.forbiddenBlocks) {
    options.forbiddenBlocks.forEach((forbiddenKind) => {
      const keys = LEGACY_KIND_TO_LIMIT_KEYS[forbiddenKind as EditorBlockKind] ?? [];
      keys.forEach((key) => {
        normalized[key] = 0;
      });
    });
  }

  return normalized;
};

export const toLegacyForbiddenBlocks = (blockLimits: Record<BlockLimitKey, number>): string[] => {
  const legacyKinds = new Set<string>();
  (Object.keys(LEGACY_KIND_TO_LIMIT_KEYS) as EditorBlockKind[]).forEach((kind) => {
    const keys = LEGACY_KIND_TO_LIMIT_KEYS[kind] ?? [];
    if (keys.length === 0) {
      return;
    }
    const allDisabled = keys.every((key) => (blockLimits[key] ?? 0) <= 0);
    if (allDisabled) {
      legacyKinds.add(kind);
    }
  });
  return [...legacyKinds];
};

const walkBlock = (block: EditorBlock, visitor: (block: EditorBlock) => void): void => {
  visitor(block);
  if (block.inputBlock) {
    walkBlock(block.inputBlock, visitor);
  }
  block.inputBlocks?.forEach((inputBlock) => {
    if (inputBlock) {
      walkBlock(inputBlock, visitor);
    }
  });
  block.bodyBlocks?.forEach((child) => walkBlock(child, visitor));
  block.alternateBodyBlocks?.forEach((child) => walkBlock(child, visitor));
};

export const countBlockLimitUsageFromBlocks = (
  blocks: EditorBlock[],
  limitKey: BlockLimitKey
): number => {
  let count = 0;
  blocks.forEach((block) => {
    walkBlock(block, (node) => {
      if (resolveBlockLimitKeyForEditorBlock(node) === limitKey) {
        count += 1;
      }
    });
  });
  return count;
};
