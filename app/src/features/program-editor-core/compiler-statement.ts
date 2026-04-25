import type { OperationDefinition } from "@thesis/core-engine";
import type { CompiledInstruction, RoutineSignature, StatementNode, TypeSignature } from "./types";
import { projectProgramRows } from "./projection";
import {
	callStatementSupportsExecution,
	createOperationForStatement,
	createTargetOperation,
	isTargetOperation
} from "./compiler-structure-ops";
import {
	collectRoutineDeclarationTypes,
	findDeclarationTypeByName,
	inferExpressionTypeRef,
	isTypeCompatible,
	type DeclarationTypeLookup
} from "./compiler-type-inference";
import { compileExpression, expressionCanExecuteAtRuntime, expressionProvidesValue } from "./compiler-expression";

export interface CompileContext {
	routineId: string;
	instructions: CompiledInstruction[];
	operations: OperationDefinition[];
	operationNodeIds: string[];
	diagnostics: string[];
	unsupportedFeatures: Set<string>;
	nodeInstructionMap: Record<string, number[]>;
	nodeRowMap: Record<string, string[]>;
	nodeRowNumberMap: Record<string, number[]>;
}

export interface LoopCompileFrame {
	breakInstructionIps: number[];
}

export const appendInstruction = (
	context: CompileContext,
	instruction: Omit<CompiledInstruction, "ip">
): number => {
	const ip = context.instructions.length;
	context.instructions.push({ ...instruction, ip, routineId: context.routineId });
	context.nodeInstructionMap[instruction.nodeId] = [
		...(context.nodeInstructionMap[instruction.nodeId] ?? []),
		ip
	];
	return ip;
};

export const rowNumbersForNode = (
	rowMap: ReturnType<typeof projectProgramRows>,
	nodeId: string
): number[] => rowMap.rows.filter((row) => row.nodeId === nodeId).map((row) => row.rowNumber);

export { collectRoutineDeclarationTypes };

export const compileStatement = (
	statement: StatementNode,
	rowMap: ReturnType<typeof projectProgramRows>,
	signatures: Record<string, RoutineSignature>,
	typeSignatures: Record<string, TypeSignature>,
	declarationTypes: DeclarationTypeLookup,
	context: CompileContext,
	loopStack: LoopCompileFrame[]
): void => {
	const rowIds = rowMap.nodeRowMap[statement.id] ?? [];
	const rowNumbers = rowNumbersForNode(rowMap, statement.id);
	context.nodeRowMap[statement.id] = rowIds;
	context.nodeRowNumberMap[statement.id] = rowNumbers;

	switch (statement.kind) {
		case "function-definition":
		case "type-definition":
			appendInstruction(context, {
				instructionId: `ins-${statement.id}-definition`,
				kind: "definition",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: true
			});
			return;

		case "declare":
			appendInstruction(context, {
				instructionId: `ins-${statement.id}-declare`,
				kind: "declare",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: true
			});
			return;

		case "assign":
			appendInstruction(context, {
				instructionId: `ins-${statement.id}-assign`,
				kind: "assign",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: true
			});
			if (!statement.value || !expressionCanExecuteAtRuntime(statement.value, signatures)) {
				context.diagnostics.push("Assignments need a complete value.");
			} else {
				const expectedType =
					(statement.targetDeclarationId
						? declarationTypes.get(statement.targetDeclarationId)?.declaredTypeRef
						: findDeclarationTypeByName(declarationTypes, statement.targetName)) ?? null;
				const actualType = inferExpressionTypeRef(statement.value, declarationTypes, typeSignatures);
				if (!isTypeCompatible(expectedType, actualType)) {
					context.diagnostics.push("type_mismatch_assign");
				}
			}
			return;

		case "type-field-assign":
			appendInstruction(context, {
				instructionId: `ins-${statement.id}-type-field-assign`,
				kind: "type-field-assign",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: true,
				typeFieldTargetDeclarationId: statement.targetDeclarationId,
				typeFieldTargetName: statement.targetName,
				typeFieldName: statement.fieldName
			});
			if (!statement.value || !expressionCanExecuteAtRuntime(statement.value, signatures)) {
				context.diagnostics.push("Assignments need a complete value.");
			} else {
				const targetType = declarationTypes.get(statement.targetDeclarationId)?.declaredTypeRef;
				if (targetType?.kind === "user") {
					const signature = typeSignatures[targetType.typeRoutineId];
					const fieldType =
						signature?.fieldDeclarations.find((field) => field.name === statement.fieldName)
							?.declaredTypeRef ?? null;
					const actualType = inferExpressionTypeRef(statement.value, declarationTypes, typeSignatures);
					if (!isTypeCompatible(fieldType, actualType)) {
						context.diagnostics.push("type_mismatch_field_assign");
					}
				}
			}
			return;

		case "expression":
			appendInstruction(context, {
				instructionId: `ins-${statement.id}-expression`,
				kind: "expression",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: true
			});
			if (!expressionCanExecuteAtRuntime(statement.expression, signatures)) {
				context.diagnostics.push("Standalone expressions need a complete value.");
			}
			return;

		case "call": {
			const compiledArgument = statement.args[0]
				? compileExpression(statement.args[0], signatures, declarationTypes, typeSignatures)
				: { operations: [], operationNodeIds: [], provides: null, isComplete: true, unsupportedFeatures: [], diagnostics: [] };

			const hasDynamicTarget = !!statement.targetDeclarationId || !!statement.targetName;
			const supportsDynamicTargetExecution =
				hasDynamicTarget &&
				callStatementSupportsExecution(statement) &&
				(!isTargetOperation(statement.operation) || compiledArgument.isComplete);

			const operation = hasDynamicTarget
				? null
				: isTargetOperation(statement.operation)
				? compiledArgument.isComplete && compiledArgument.provides
					? createTargetOperation(
						statement.operation,
						statement.structureId,
						compiledArgument.provides.kind === "literal" ? compiledArgument.provides.value : undefined
					)
					: compiledArgument.isComplete
					? createTargetOperation(statement.operation, statement.structureId)
					: null
				: createOperationForStatement(statement, expressionProvidesValue);

			appendInstruction(context, {
				instructionId: `ins-${statement.id}-call`,
				kind: "call",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: true,
				operation: operation ?? undefined
			});

			if (callStatementSupportsExecution(statement) && operation) {
				context.operations.push(...compiledArgument.operations);
				context.operationNodeIds.push(...compiledArgument.operationNodeIds);
				context.operations.push(operation);
				context.operationNodeIds.push(statement.id);
			} else if (supportsDynamicTargetExecution) {
				context.operations.push(...compiledArgument.operations);
				context.operationNodeIds.push(...compiledArgument.operationNodeIds);
			} else if (operation) {
				context.operations.push(operation);
				context.operationNodeIds.push(statement.id);
			} else {
				context.unsupportedFeatures.add("call");
				compiledArgument.unsupportedFeatures.forEach((f) => context.unsupportedFeatures.add(f));
				context.diagnostics.push(...compiledArgument.diagnostics);
				if (!compiledArgument.diagnostics.length) {
					context.diagnostics.push("Finish each block and fill any missing value slots.");
				}
			}
			if (!callStatementSupportsExecution(statement)) {
				compiledArgument.unsupportedFeatures.forEach((f) => context.unsupportedFeatures.add(f));
				context.diagnostics.push(...compiledArgument.diagnostics);
			}
			return;
		}

		case "routine-call": {
			const signature = signatures[statement.routineId];
			appendInstruction(context, {
				instructionId: `ins-${statement.id}-routine-call`,
				kind: "call-routine",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: true,
				routineId: statement.routineId
			});
			if (!signature?.isPublishable || signature.returnKind !== "none") {
				context.diagnostics.push(`${statement.routineName} is not publishable as an action function.`);
			} else if (
				statement.args.length !== signature.params.length ||
				!statement.args.every((arg) => expressionCanExecuteAtRuntime(arg, signatures))
			) {
				context.diagnostics.push("Finish each block and fill any missing value slots.");
			} else if (
				statement.args.some((arg, i) =>
					!isTypeCompatible(
						signature.params[i]?.declaredTypeRef ?? null,
						inferExpressionTypeRef(arg, declarationTypes, typeSignatures)
					)
				)
			) {
				context.diagnostics.push("type_mismatch_expect_arg");
			}
			return;
		}

		case "routine-member-call": {
			const ownerSignature = signatures[statement.routineId];
			const memberSignature = ownerSignature?.members.find((m) => m.name === statement.memberName);
			appendInstruction(context, {
				instructionId: `ins-${statement.id}-routine-member-call`,
				kind: "call-member",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: true,
				routineId: statement.memberRoutineId
			});
			if (!ownerSignature || ownerSignature.exportKind !== "object-value" || !memberSignature) {
				context.diagnostics.push(`${statement.routineName}.${statement.memberName} is not publishable yet.`);
			} else if (
				statement.args.length !== (memberSignature.params?.length ?? 0) ||
				!statement.args.every((arg) => expressionCanExecuteAtRuntime(arg, signatures))
			) {
				context.diagnostics.push("Finish each block and fill any missing value slots.");
			} else if (
				statement.args.some((arg, i) =>
					!isTypeCompatible(
						memberSignature.params?.[i]?.declaredTypeRef ?? null,
						inferExpressionTypeRef(arg, declarationTypes, typeSignatures)
					)
				)
			) {
				context.diagnostics.push("type_mismatch_expect_arg");
			}
			return;
		}

		case "return":
			appendInstruction(context, {
				instructionId: `ins-${statement.id}-return`,
				kind: "return",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: true
			});
			if (statement.value && !expressionCanExecuteAtRuntime(statement.value, signatures)) {
				context.diagnostics.push("Return blocks need a complete value.");
			}
			return;

		case "if": {
			appendInstruction(context, {
				instructionId: `ins-${statement.id}-eval`,
				kind: "eval-condition",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: true
			});
			const jumpIfFalseIp = appendInstruction(context, {
				instructionId: `ins-${statement.id}-jump-false`,
				kind: "jump-if-false",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: false,
				jumpTargetIp: -1
			});
			statement.thenBody.forEach((child) =>
				compileStatement(child, rowMap, signatures, typeSignatures, declarationTypes, context, loopStack)
			);
			let skipJumpIp: number | null = null;
			if (statement.elseBody && statement.elseBody.length > 0) {
				skipJumpIp = appendInstruction(context, {
					instructionId: `ins-${statement.id}-jump-skip-else`,
					kind: "jump",
					nodeId: statement.id,
					rowIds,
					rowNumbers,
					breakpointable: false,
					jumpTargetIp: -1
				});
			}
			const elseStartIp = context.instructions.length;
			if (statement.elseBody) {
				statement.elseBody.forEach((child) =>
					compileStatement(child, rowMap, signatures, typeSignatures, declarationTypes, context, loopStack)
				);
			}
			const endIp = context.instructions.length;
			context.instructions[jumpIfFalseIp] = {
				...context.instructions[jumpIfFalseIp]!,
				jumpTargetIp: statement.elseBody && statement.elseBody.length > 0 ? elseStartIp : endIp
			};
			if (skipJumpIp !== null) {
				context.instructions[skipJumpIp] = {
					...context.instructions[skipJumpIp]!,
					jumpTargetIp: endIp
				};
			}
			if (!expressionCanExecuteAtRuntime(statement.condition, signatures)) {
				context.diagnostics.push("Conditional blocks need a complete condition input.");
			}
			return;
		}

		case "while": {
			const loopStartIp = context.instructions.length;
			const whileFrame: LoopCompileFrame = { breakInstructionIps: [] };
			loopStack.push(whileFrame);
			appendInstruction(context, {
				instructionId: `ins-${statement.id}-eval`,
				kind: "eval-condition",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: true
			});
			const jumpIfFalseIp = appendInstruction(context, {
				instructionId: `ins-${statement.id}-jump-false`,
				kind: "jump-if-false",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: false,
				jumpTargetIp: -1
			});
			statement.body.forEach((child) =>
				compileStatement(child, rowMap, signatures, typeSignatures, declarationTypes, context, loopStack)
			);
			appendInstruction(context, {
				instructionId: `ins-${statement.id}-jump-loop`,
				kind: "jump",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: false,
				jumpTargetIp: loopStartIp
			});
			const loopEndIp = context.instructions.length;
			context.instructions[jumpIfFalseIp] = {
				...context.instructions[jumpIfFalseIp]!,
				jumpTargetIp: loopEndIp
			};
			whileFrame.breakInstructionIps.forEach((breakIp) => {
				context.instructions[breakIp] = { ...context.instructions[breakIp]!, jumpTargetIp: loopEndIp };
			});
			loopStack.pop();
			if (!expressionCanExecuteAtRuntime(statement.condition, signatures)) {
				context.diagnostics.push("Loop blocks need a complete condition input.");
			}
			return;
		}

		case "for-each": {
			if (
				statement.sourceStructureKind !== "stack" &&
				statement.sourceStructureKind !== "queue" &&
				statement.sourceStructureKind !== "list"
			) {
				context.diagnostics.push("For-each only supports linear structures in this version.");
			}
			if (!statement.sourceStructureId?.trim()) {
				context.diagnostics.push("For-each needs a source structure.");
			}

			const forEachFrame: LoopCompileFrame = { breakInstructionIps: [] };
			loopStack.push(forEachFrame);

			appendInstruction(context, {
				instructionId: `ins-${statement.id}-for-each-init`,
				kind: "for-each-init",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: false,
				forEachSourceStructureId: statement.sourceStructureId,
				forEachSourceStructureKind: statement.sourceStructureKind,
				forEachItemDeclarationId: statement.itemDeclarationId,
				forEachItemName: statement.itemName
			});
			const loopCheckIp = appendInstruction(context, {
				instructionId: `ins-${statement.id}-for-each-check`,
				kind: "for-each-check",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: true,
				jumpTargetIp: -1
			});
			appendInstruction(context, {
				instructionId: `ins-${statement.id}-for-each-assign-item`,
				kind: "for-each-assign-item",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: false,
				forEachItemDeclarationId: statement.itemDeclarationId,
				forEachItemName: statement.itemName
			});
			statement.body.forEach((child) =>
				compileStatement(child, rowMap, signatures, typeSignatures, declarationTypes, context, loopStack)
			);
			appendInstruction(context, {
				instructionId: `ins-${statement.id}-for-each-advance`,
				kind: "for-each-advance",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: false,
				jumpTargetIp: loopCheckIp
			});
			const loopEndIp = context.instructions.length;
			context.instructions[loopCheckIp] = {
				...context.instructions[loopCheckIp]!,
				jumpTargetIp: loopEndIp
			};
			forEachFrame.breakInstructionIps.forEach((breakIp) => {
				context.instructions[breakIp] = { ...context.instructions[breakIp]!, jumpTargetIp: loopEndIp };
			});
			loopStack.pop();
			return;
		}

		case "break": {
			const currentLoop = loopStack[loopStack.length - 1];
			const breakIp = appendInstruction(context, {
				instructionId: `ins-${statement.id}-break`,
				kind: "break",
				nodeId: statement.id,
				rowIds,
				rowNumbers,
				breakpointable: true,
				jumpTargetIp: -1
			});
			if (!currentLoop) {
				context.diagnostics.push("Break can only be used inside while or for-each.");
				context.instructions[breakIp] = {
					...context.instructions[breakIp]!,
					jumpTargetIp: breakIp + 1
				};
			} else {
				currentLoop.breakInstructionIps.push(breakIp);
			}
			return;
		}
	}
};
