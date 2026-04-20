import type { EditorBlock } from "./model";

export type PaletteGroupId = "structures" | "values" | "logic" | "functions" | "variables";

interface BlockMetadata {
	staticChip?: string;
	paletteGroup: PaletteGroupId;
	labelI18nKey: string;
}

/**
 * Static metadata for each block kind - chips, groups, and i18n label keys.
 * Dynamic values (structureId, variableName, routineName, etc.) are handled
 * separately in the methods that use this metadata.
 */
export const BLOCK_METADATA: Record<EditorBlock["kind"], BlockMetadata> = {
	structure: {
		paletteGroup: "structures",
		labelI18nKey: "structures.dataStructure"
	},
	value: {
		staticChip: "T",
		paletteGroup: "values",
		labelI18nKey: "blocks.value"
	},
	conditional: {
		staticChip: "IF",
		paletteGroup: "logic",
		labelI18nKey: "blocks.conditional"
	},
	while: {
		staticChip: "WH",
		paletteGroup: "logic",
		labelI18nKey: "blocks.while"
	},
	var_declaration: {
		staticChip: "VAR",
		paletteGroup: "variables",
		labelI18nKey: "blocks.declaration"
	},
	var_operation: {
		paletteGroup: "variables",
		labelI18nKey: "blocks.variable"
	},
	var_binary_operation: {
		staticChip: "OP",
		paletteGroup: "variables",
		labelI18nKey: "blocks.operation"
	},
	return: {
		staticChip: "RET",
		paletteGroup: "functions",
		labelI18nKey: "blocks.return"
	},
	routine_call: {
		staticChip: "FN",
		paletteGroup: "functions",
		labelI18nKey: "blocks.function"
	},
	routine_value: {
		staticChip: "OBJ",
		paletteGroup: "functions",
		labelI18nKey: "blocks.function"
	},
	routine_member: {
		paletteGroup: "functions",
		labelI18nKey: "blocks.member"
	}
};

/**
 * Get the static chip for a block kind, or undefined if the chip is dynamic.
 */
export function getStaticChip(kind: EditorBlock["kind"]): string | undefined {
	return BLOCK_METADATA[kind]?.staticChip;
}

/**
 * Get the palette group for a block kind.
 */
export function getPaletteGroup(kind: EditorBlock["kind"]): PaletteGroupId {
	return BLOCK_METADATA[kind]?.paletteGroup ?? "variables";
}

/**
 * Get the i18n label key for a block kind.
 */
export function getLabelI18nKey(kind: EditorBlock["kind"]): string {
	return BLOCK_METADATA[kind]?.labelI18nKey ?? "blocks.value";
}
