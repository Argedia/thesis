import { analyzeDocumentRoutines, analyzeDocumentTypes } from "./routines";
import { projectProgramRows } from "./projection";
import { getActiveRoutine, setActiveRoutineId } from "./tree";
import type {
	CompileResult,
	CompiledRoutine,
	EditorDocument,
	RoutineNode,
	RoutineSignature,
	StatementNode,
	TypeSignature
} from "./types";
import { collectRoutineDeclarationTypes, type CompileContext, compileStatement } from "./compiler-statement";

const collectReturnStatements = (
	statements: StatementNode[],
	bucket: Array<Extract<StatementNode, { kind: "return" }>> = []
): Array<Extract<StatementNode, { kind: "return" }>> => {
	statements.forEach((statement) => {
		if (statement.kind === "return") {
			bucket.push(statement);
			return;
		}
		if (statement.kind === "if") {
			collectReturnStatements(statement.thenBody, bucket);
			collectReturnStatements(statement.elseBody ?? [], bucket);
			return;
		}
		if (statement.kind === "while") {
			collectReturnStatements(statement.body, bucket);
			return;
		}
		if (statement.kind === "for-each") {
			collectReturnStatements(statement.body, bucket);
		}
	});
	return bucket;
};

const compileRoutine = (
	document: EditorDocument,
	routine: RoutineNode,
	signature: RoutineSignature,
	signatures: Record<string, RoutineSignature>,
	typeSignatures: Record<string, TypeSignature>
): CompiledRoutine => {
	const rowMap = projectProgramRows(setActiveRoutineId(document, routine.id));
	const context: CompileContext = {
		routineId: routine.id,
		instructions: [],
		operations: [],
		operationNodeIds: [],
		diagnostics: [...signature.diagnostics],
		unsupportedFeatures: new Set<string>(),
		nodeInstructionMap: {},
		nodeRowMap: {},
		nodeRowNumberMap: {}
	};
	const declarationTypes = collectRoutineDeclarationTypes(routine.program.statements, new Map());

	const functionDefinitionStatements = routine.program.statements.filter(
		(s): s is Extract<StatementNode, { kind: "function-definition" }> => s.kind === "function-definition"
	);
	const typeDefinitionStatements = routine.program.statements.filter(
		(s): s is Extract<StatementNode, { kind: "type-definition" }> => s.kind === "type-definition"
	);
	const returnStatements = collectReturnStatements(routine.program.statements);

	if (functionDefinitionStatements.length > 1) context.diagnostics.push("function_definition_duplicate");
	if (typeDefinitionStatements.length > 1) context.diagnostics.push("type_definition_duplicate");
	if (functionDefinitionStatements.length > 0 && typeDefinitionStatements.length > 0) context.diagnostics.push("function_type_conflict");
	if (typeDefinitionStatements.length > 0 && returnStatements.length > 0) context.diagnostics.push("return_in_type_routine");
	if (functionDefinitionStatements.length === 0 && typeDefinitionStatements.length === 0 && returnStatements.length > 0) context.diagnostics.push("return_without_definition");

	routine.program.statements.forEach((statement) =>
		compileStatement(statement, rowMap, signatures, typeSignatures, declarationTypes, context, [])
	);

	const uniqueDiagnostics = Array.from(new Set(context.diagnostics));
	return {
		routineId: routine.id,
		routineName: routine.name,
		signature,
		instructions: context.instructions,
		operations: context.operations,
		operationNodeIds: context.operationNodeIds,
		isComplete:
			uniqueDiagnostics.length === 0 &&
			context.unsupportedFeatures.size === 0 &&
			context.instructions.every((ins) => ins.kind !== "call" || !!ins.operation),
		unsupportedFeatures: Array.from(context.unsupportedFeatures),
		diagnostics: uniqueDiagnostics,
		nodeInstructionMap: context.nodeInstructionMap,
		nodeRowMap: rowMap.nodeRowMap,
		nodeRowNumberMap: context.nodeRowNumberMap
	};
};

export const compileEditorDocument = (document: EditorDocument): CompileResult => {
	const signatures = analyzeDocumentRoutines(document);
	const typeSignatures = analyzeDocumentTypes(document);
	const routines = Object.fromEntries(
		document.routines.map((routine) => [
			routine.id,
			compileRoutine(document, routine, signatures[routine.id]!, signatures, typeSignatures)
		])
	) as Record<string, CompiledRoutine>;

	Object.values(routines).forEach((routine) => {
		const extraDiagnostics: string[] = [];
		routine.instructions.forEach((instruction) => {
			if (
				(instruction.kind !== "call-routine" && instruction.kind !== "call-member") ||
				!instruction.routineId
			) return;
			const targetRoutine = routines[instruction.routineId];
			if (!targetRoutine) {
				extraDiagnostics.push("A routine call points to a missing routine.");
				return;
			}
			if (!targetRoutine.isComplete) {
				extraDiagnostics.push(`${targetRoutine.routineName} is not executable yet.`);
			}
		});
		if (extraDiagnostics.length > 0) {
			routine.diagnostics = Array.from(new Set([...routine.diagnostics, ...extraDiagnostics]));
			routine.isComplete = false;
		}
	});

	const activeRoutine =
		routines[document.activeRoutineId] ?? routines[getActiveRoutine(document).id]!;

	return {
		...activeRoutine,
		activeRoutineId: document.activeRoutineId,
		routines,
		routineSignatures: signatures
	};
};
