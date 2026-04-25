import type { OperationDefinition, StructureKind } from "@thesis/core-engine";
import type {
	OutputType,
	RoutineBindingKind,
	RoutineExportKind,
	RoutineKind,
	RoutineMemberKind,
	RoutineReturnKind,
	DeclaredTypeRef
} from "./ast";

export interface RoutineSignatureParam {
	declarationId: string;
	name: string;
	declaredTypeRef?: DeclaredTypeRef | null;
}

export interface RoutineMemberSignature {
	name: string;
	kind: RoutineMemberKind;
	outputType: Exclude<OutputType, "none">;
	supportsCall: boolean;
	routineId?: string;
	routineName?: string;
	returnKind?: RoutineReturnKind;
	params?: RoutineSignatureParam[];
}

export interface RoutineSignature {
	routineId: string;
	routineName: string;
	routineKind: RoutineKind;
	hasDefinition: boolean;
	definitionNodeId?: string;
	isFunction: boolean;
	params: RoutineSignatureParam[];
	returnKind: RoutineReturnKind;
	isPublishable: boolean;
	exportKind: RoutineExportKind;
	members: RoutineMemberSignature[];
	diagnostics: string[];
}

export interface TypeFieldSignature {
	name: string;
	declaredTypeRef?: DeclaredTypeRef | null;
}

export interface TypeSignature {
	typeRoutineId: string;
	typeName: string;
	fieldDeclarations: TypeFieldSignature[];
	diagnostics: string[];
}

export interface CompiledInstruction {
	instructionId: string;
	ip: number;
	kind:
	| "definition"
	| "declare"
	| "assign"
	| "call"
	| "call-routine"
	| "call-member"
	| "return"
	| "eval-condition"
	| "jump-if-false"
	| "jump"
	| "expression"
	| "for-each-init"
	| "for-each-check"
	| "for-each-assign-item"
	| "for-each-advance"
	| "break"
	| "type-field-assign";
	nodeId: string;
	rowIds: string[];
	rowNumbers: number[];
	breakpointable: boolean;
	jumpTargetIp?: number;
	operation?: OperationDefinition;
	routineId?: string;
	forEachSourceStructureId?: string;
	forEachSourceStructureKind?: StructureKind;
	forEachItemDeclarationId?: string;
	forEachItemName?: string;
	typeFieldTargetDeclarationId?: string;
	typeFieldTargetName?: string;
	typeFieldName?: string;
}

export interface CompiledRoutine {
	routineId: string;
	routineName: string;
	signature: RoutineSignature;
	instructions: CompiledInstruction[];
	operations: OperationDefinition[];
	operationNodeIds: string[];
	isComplete: boolean;
	unsupportedFeatures: string[];
	diagnostics: string[];
	nodeInstructionMap: Record<string, number[]>;
	nodeRowMap: Record<string, string[]>;
	nodeRowNumberMap: Record<string, number[]>;
}

export interface CompileResult extends CompiledRoutine {
	activeRoutineId: string;
	routines: Record<string, CompiledRoutine>;
	routineSignatures: Record<string, RoutineSignature>;
}
