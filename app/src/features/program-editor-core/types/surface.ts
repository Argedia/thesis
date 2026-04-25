import type { StructureSnapshot } from "@thesis/core-engine";
import type { EditorDocument, RoutineNode, ProgramNode } from "./ast";

export interface SerializedEditorDocument {
	version: 3;
	routines: RoutineNode[];
	activeRoutineId: string;
}

export interface SerializedEditorDocumentV2 {
	version: 2;
	program: ProgramNode;
}

export interface EditorSurfaceAdapter {
	value: EditorDocument;
	onChange: (document: EditorDocument) => void;
}

export interface PlayEditorSurfaceProps extends EditorSurfaceAdapter {
	structures: StructureSnapshot[];
	allowedOperations: string[];
	maxBlocks: number;
	disabled?: boolean;
	highlightedNodeId?: string | null;
	breakpointNodeIds?: string[];
	onToggleBreakpoint?: (nodeId: string) => void;
	onStatus?: (message: string) => void;
	onRequestTextInput?: (options: {
		title: string;
		initialValue?: string;
		validate?: (value: string) => string | null;
	}) => Promise<string | null>;
	onRequestSelectInput?: (options: {
		title: string;
		initialValue?: string;
		options: Array<{
			value: string;
			label: string;
		}>;
	}) => Promise<string | null>;
	onRequestDeclarationInput?: (options: {
		title: string;
		nameTitle: string;
		typeTitle: string;
		initialName?: string;
		initialTypeValue?: string;
		options: Array<{
			value: string;
			label: string;
		}>;
	}) => Promise<{
		name: string;
		typeValue: string;
	} | null>;
	onShowAlert?: (options: {
		title?: string;
		message: string;
	}) => Promise<void>;
}
