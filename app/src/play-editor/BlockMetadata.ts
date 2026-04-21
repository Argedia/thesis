import type { EditorBlock } from "./model";

export type PaletteGroupId = "structures" | "expressions" | "logic" | "functions" | "types" | "variables";

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
		paletteGroup: "expressions",
		labelI18nKey: "blocks.literal"
	},
	function_definition: {
		staticChip: "DEF",
		paletteGroup: "functions",
		labelI18nKey: "blocks.definition"
	},
	type_definition: {
		staticChip: "TYPE",
		paletteGroup: "types",
		labelI18nKey: "blocks.typeDefinition"
	},
	type_instance_new: {
		staticChip: "NEW",
		paletteGroup: "types",
		labelI18nKey: "blocks.typeInstance"
	},
	type_field_read: {
		staticChip: "FLD",
		paletteGroup: "types",
		labelI18nKey: "blocks.fieldRead"
	},
	type_field_assign: {
		staticChip: "SET",
		paletteGroup: "types",
		labelI18nKey: "blocks.fieldAssign"
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
	for_each: {
		staticChip: "FE",
		paletteGroup: "logic",
		labelI18nKey: "blocks.forEach"
	},
	break: {
		staticChip: "BR",
		paletteGroup: "logic",
		labelI18nKey: "blocks.break"
	},
	var_declaration: {
		staticChip: "VAR",
		paletteGroup: "variables",
		labelI18nKey: "blocks.declaration"
	},
	var_assign: {
		staticChip: "ASN",
		paletteGroup: "variables",
		labelI18nKey: "blocks.assign"
	},
	var_read: {
		paletteGroup: "variables",
		labelI18nKey: "blocks.read"
	},
	var_reference: {
		staticChip: "REF",
		paletteGroup: "variables",
		labelI18nKey: "blocks.reference"
	},
	var_operation: {
		paletteGroup: "variables",
		labelI18nKey: "blocks.variable"
	},
	var_binary_operation: {
		staticChip: "OP",
		paletteGroup: "expressions",
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
