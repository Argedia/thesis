import { analyzeDocumentRoutines, analyzeDocumentTypes } from "./routines";
import { projectProgramRows } from "./projection";
import { getActiveRoutine, setActiveRoutineId } from "./tree";
import type {
	CompileResult,
	CompiledRoutine,
	CompilerDiagnostic,
	EditorDocument,
	RoutineNode,
	RoutineSignature,
	StatementNode,
	TypeSignature
} from "./types";
import { collectRoutineDeclarationTypes, type CompileContext, compileStatement } from "./compiler-statement";
import { t } from "../../i18n-helpers";

const createDiagnostic = (
	message: string,
	nodeId?: string,
	code = message,
	severity: CompilerDiagnostic["severity"] = "error"
): CompilerDiagnostic => ({
	code,
	message,
	severity,
	nodeId
});

const dedupeDiagnosticDetails = (diagnostics: CompilerDiagnostic[]): CompilerDiagnostic[] =>
	diagnostics.filter(
		(diagnostic, index, list) =>
			list.findIndex(
				(candidate) =>
					candidate.code === diagnostic.code &&
					candidate.message === diagnostic.message &&
					candidate.nodeId === diagnostic.nodeId &&
					candidate.slotId === diagnostic.slotId &&
					candidate.severity === diagnostic.severity
			) === index
	);

// Merges standalone `mode: "else"` statements into the elseBody of the preceding if-statement.
// This normalizes the editor's standalone else representation into proper if-else AST for compilation.
const mergeElseStatements = (statements: StatementNode[]): StatementNode[] => {
	const result: StatementNode[] = [];
	for (const stmt of statements) {
		const normalized: StatementNode =
			stmt.kind === "if"
				? {
					...stmt,
					thenBody: mergeElseStatements(stmt.thenBody),
					elseBody: stmt.elseBody ? mergeElseStatements(stmt.elseBody) : null
				  }
				: stmt.kind === "while"
				  ? { ...stmt, body: mergeElseStatements(stmt.body) }
				  : stmt.kind === "for-each"
				    ? { ...stmt, body: mergeElseStatements(stmt.body) }
				    : stmt;

		if (normalized.kind === "if" && normalized.mode === "else") {
			const prev = result[result.length - 1];
			if (prev?.kind === "if" && prev.mode !== "else") {
				result[result.length - 1] = {
					...prev,
					elseBody: normalized.thenBody,
					mode: "if-else"
				};
				continue;
			}
		}
		result.push(normalized);
	}
	return result;
};

const normalizeDocument = (document: EditorDocument): EditorDocument => ({
	...document,
	routines: document.routines.map((routine) => ({
		...routine,
		program: { ...routine.program, statements: mergeElseStatements(routine.program.statements) }
	}))
});

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
		diagnosticDetails:
			signature.diagnosticDetails && signature.diagnosticDetails.length > 0
				? [...signature.diagnosticDetails]
				: signature.diagnostics.map((diagnostic) =>
					createDiagnostic(diagnostic, signature.definitionNodeId)
				  ),
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

	if (functionDefinitionStatements.length > 1) {
		context.diagnostics.push("function_definition_duplicate");
		functionDefinitionStatements.forEach((statement) =>
			context.diagnosticDetails.push(
				createDiagnostic("function_definition_duplicate", statement.id)
			)
		);
	}
	if (typeDefinitionStatements.length > 1) {
		context.diagnostics.push("type_definition_duplicate");
		typeDefinitionStatements.forEach((statement) =>
			context.diagnosticDetails.push(
				createDiagnostic("type_definition_duplicate", statement.id)
			)
		);
	}
	if (functionDefinitionStatements.length > 0 && typeDefinitionStatements.length > 0) {
		context.diagnostics.push("function_type_conflict");
		functionDefinitionStatements.forEach((statement) =>
			context.diagnosticDetails.push(createDiagnostic("function_type_conflict", statement.id))
		);
		typeDefinitionStatements.forEach((statement) =>
			context.diagnosticDetails.push(createDiagnostic("function_type_conflict", statement.id))
		);
	}
	if (typeDefinitionStatements.length > 0 && returnStatements.length > 0) {
		context.diagnostics.push("return_in_type_routine");
		returnStatements.forEach((statement) =>
			context.diagnosticDetails.push(createDiagnostic("return_in_type_routine", statement.id))
		);
	}
	if (functionDefinitionStatements.length === 0 && typeDefinitionStatements.length === 0 && returnStatements.length > 0) {
		context.diagnostics.push("return_without_definition");
		returnStatements.forEach((statement) =>
			context.diagnosticDetails.push(createDiagnostic("return_without_definition", statement.id))
		);
	}

	routine.program.statements.forEach((statement) =>
		compileStatement(statement, rowMap, signatures, typeSignatures, declarationTypes, context, [])
	);

	const uniqueDiagnostics = Array.from(new Set(context.diagnostics));
	const uniqueDiagnosticDetails = dedupeDiagnosticDetails(context.diagnosticDetails);
	return {
		routineId: routine.id,
		routineName: routine.name,
		signature,
		instructions: context.instructions,
		operations: context.operations,
		operationNodeIds: context.operationNodeIds,
		isComplete:
			uniqueDiagnostics.length === 0 &&
			context.unsupportedFeatures.size === 0,
		unsupportedFeatures: Array.from(context.unsupportedFeatures),
		diagnostics: uniqueDiagnostics,
		diagnosticDetails: uniqueDiagnosticDetails,
		nodeInstructionMap: context.nodeInstructionMap,
		nodeRowMap: rowMap.nodeRowMap,
		nodeRowNumberMap: context.nodeRowNumberMap
	};
};

export const compileEditorDocument = (document: EditorDocument): CompileResult => {
	document = normalizeDocument(document);
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
		const extraDiagnosticDetails: CompilerDiagnostic[] = [];
		routine.instructions.forEach((instruction) => {
			if (
				(instruction.kind !== "call-routine" && instruction.kind !== "call-member") ||
				!instruction.routineId
			) return;
			const targetRoutine = routines[instruction.routineId];
			if (!targetRoutine) {
				const message = t("diagnostics.missingRoutineCallTarget");
				extraDiagnostics.push(message);
				extraDiagnosticDetails.push(createDiagnostic(message, instruction.nodeId, "missingRoutineCallTarget"));
				return;
			}
			if (!targetRoutine.isComplete) {
				const message = t("diagnostics.routineNotExecutable", { name: targetRoutine.routineName });
				extraDiagnostics.push(message);
				extraDiagnosticDetails.push(createDiagnostic(message, instruction.nodeId, "routineNotExecutable"));
			}
		});
		if (extraDiagnostics.length > 0) {
			routine.diagnostics = Array.from(new Set([...routine.diagnostics, ...extraDiagnostics]));
			routine.diagnosticDetails = dedupeDiagnosticDetails([
				...(routine.diagnosticDetails ?? []),
				...extraDiagnosticDetails
			]);
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
