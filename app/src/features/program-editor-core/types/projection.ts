import type { StatementNode, ControlBodyKey, ProgramContainerRef } from "./ast";
import type { EditorBlock } from "./editor-block";

export type { ControlBodyKey, ProgramContainerRef } from "./ast";

export type EditorLineRole = "block" | "else_header" | "drop";

export type EditorRowKind =
	| "statement"
	| "function-definition-header"
	| "type-definition-header"
	| "if-header"
	| "else-header"
	| "while-header"
	| "for-each-header"
	| "placeholder";

export interface EditorRow {
	rowId: string;
	rowNumber: number;
	rowKind: EditorRowKind;
	nodeId: string | null;
	depth: number;
	isExecutable: boolean;
	container: ProgramContainerRef;
	indexInContainer: number;
	statement?: StatementNode;
	placeholderFor?: ProgramContainerRef;
}

export interface DropZone {
	zoneId: string;
	container: ProgramContainerRef;
	insertionIndex: number;
	depth: number;
	anchorRowId?: string;
	displayRole: "before-row" | "after-row" | "empty-body";
}

export interface ProjectionResult {
	rows: EditorRow[];
	dropZones: DropZone[];
	nodeRowMap: Record<string, string[]>;
}

export interface ParentContainerMatch {
	container: ProgramContainerRef;
	statements: StatementNode[];
	ownerId: string | null;
	index: number;
}

export interface EditorLineLayout {
	id: string;
	role: EditorLineRole;
	lineNumber?: number;
	depth: number;
	indentCurrent: number;
	indentPotential: number[];
	increaseNextIndentation: boolean;
	bodyOwnerPath: string[];
	controlPath: Array<{ ownerId: string; branch: ControlBodyKey }>;
	block: EditorBlock | null;
	blockId?: string;
	topLevelIndex?: number;
	branchOwnerId?: string;
	branch?: ControlBodyKey;
	isLastInBranch?: boolean;
	beforeBlockId?: string;
	insertionRootIndex?: number;
}
