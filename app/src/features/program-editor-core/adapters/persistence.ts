import type {
	EditorBlock,
	EditorDocument,
	SerializedEditorDocument,
	SerializedEditorDocumentV2
} from "../types";
import { createEditorDocument, getActiveProgram, replaceActiveProgram } from "../tree";
import { migrateEditorBlocksToProgram } from "./editor-blocks-to-tree";

export interface LegacySerializedEditorDocument {
	blocks: EditorBlock[];
}

export const createEditorDocumentFromEditorBlocks = (
	blocks: EditorBlock[],
	source?: EditorDocument | string
): EditorDocument => {
	const programId =
		typeof source === "string" ? source : source ? getActiveProgram(source).id : "program-root";
	const nextProgram = migrateEditorBlocksToProgram(blocks, programId);
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

	return createEditorDocumentFromEditorBlocks(payload.blocks);
};

