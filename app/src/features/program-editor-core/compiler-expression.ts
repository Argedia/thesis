import type { ExpressionNode, RoutineSignature, TypeSignature } from "./types";
import type { OperationDefinition } from "@thesis/core-engine";
import { structureExpressionSupportsValue, isSourceOperation, createSourceOperation } from "./compiler-structure-ops";
import { inferExpressionTypeRef, isTypeCompatible, type DeclarationTypeLookup } from "./compiler-type-inference";

export const expressionProvidesValue = (expression: ExpressionNode | null): boolean => {
	if (!expression) return false;

	switch (expression.kind) {
		case "literal":
			return true;
		case "structure":
			return structureExpressionSupportsValue(expression.operation);
		case "routine-call":
		case "routine-reference":
		case "routine-value":
		case "routine-member":
		case "pointer":
		case "type-instance":
		case "type-field-read":
			return true;
		case "variable":
			if (expression.mode === "assign") return false;
			return expression.mode === "value" ? true : expression.operand !== null;
		case "binary":
			return expression.right !== null;
		case "unary":
			return expression.operand !== null;
	}
};

export const expressionIsBoolean = (expression: ExpressionNode | null): boolean =>
	!!expression && expression.outputType === "boolean";

export const expressionCanExecuteAtRuntime = (
	expression: ExpressionNode | null,
	signatures: Record<string, RoutineSignature>
): boolean => {
	if (!expression) return false;

	switch (expression.kind) {
		case "literal":
			return true;
		case "structure":
			return expression.args.length === 0 && structureExpressionSupportsValue(expression.operation);
		case "routine-call": {
			const signature = signatures[expression.routineId];
			return (
				!!signature &&
				signature.exportKind === "callable" &&
				signature.isPublishable &&
				signature.returnKind !== "none" &&
				expression.args.length === signature.params.length &&
				expression.args.every((arg) => expressionCanExecuteAtRuntime(arg, signatures))
			);
		}
		case "routine-reference": {
			const signature = signatures[expression.routineId];
			return !!signature && signature.exportKind === "callable" && signature.isPublishable;
		}
		case "routine-value": {
			const signature = signatures[expression.routineId];
			return !!signature && signature.exportKind === "object-value" && signature.isPublishable;
		}
		case "routine-member": {
			const ownerSignature = signatures[expression.routineId];
			const memberSignature = ownerSignature?.members.find((m) => m.name === expression.memberName);
			if (!ownerSignature || ownerSignature.exportKind !== "object-value" || !memberSignature) return false;
			if (expression.memberKind !== "function" || expression.callMode === "reference") return true;
			return (
				memberSignature.supportsCall &&
				expression.args.length === (memberSignature.params?.length ?? 0) &&
				expression.args.every((arg) => expressionCanExecuteAtRuntime(arg, signatures))
			);
		}
		case "pointer":
		case "type-instance":
		case "type-field-read":
			return true;
		case "variable":
			if (expression.mode === "assign") return false;
			return expression.mode === "value"
				? true
				: expression.operand !== null && expressionCanExecuteAtRuntime(expression.operand, signatures);
		case "binary":
			return (
				expressionCanExecuteAtRuntime(expression.left, signatures) &&
				expression.right !== null &&
				expressionCanExecuteAtRuntime(expression.right, signatures)
			);
		case "unary":
			return expression.operand !== null && expressionCanExecuteAtRuntime(expression.operand, signatures);
	}
};

export interface ExpressionCompileResult {
	operations: OperationDefinition[];
	operationNodeIds: string[];
	provides: { kind: "literal"; value: import("@thesis/core-engine").DataValue } | { kind: "hand" } | { kind: "pointer"; targetId: string; targetKind: "variable" | "structure" | "object" } | null;
	isComplete: boolean;
	unsupportedFeatures: string[];
	diagnostics: string[];
}

export const compileExpression = (
	expression: ExpressionNode | null,
	signatures: Record<string, RoutineSignature>,
	declarationTypes: DeclarationTypeLookup,
	typeSignatures: Record<string, TypeSignature>
): ExpressionCompileResult => {
	if (!expression) {
		return {
			operations: [],
			operationNodeIds: [],
			provides: null,
			isComplete: false,
			unsupportedFeatures: [],
			diagnostics: ["Finish each block and fill any missing value slots."]
		};
	}

	switch (expression.kind) {
		case "literal":
			return {
				operations: [],
				operationNodeIds: [],
				provides: { kind: "literal", value: expression.value },
				isComplete: true,
				unsupportedFeatures: [],
				diagnostics: []
			};

		case "structure":
			if (expression.args.length > 0) {
				return {
					operations: [],
					operationNodeIds: [],
					provides: null,
					isComplete: false,
					unsupportedFeatures: ["expression"],
					diagnostics: ["Only value-producing blocks without input slots can be used as expressions."]
				};
			}
			if (isSourceOperation(expression.operation)) {
				if (expression.targetDeclarationId || expression.targetName) {
					return {
						operations: [],
						operationNodeIds: [],
						provides: { kind: "hand" },
						isComplete: true,
						unsupportedFeatures: [],
						diagnostics: []
					};
				}
				return {
					operations: [createSourceOperation(expression.operation!, expression.structureId)],
					operationNodeIds: [expression.id],
					provides: { kind: "hand" },
					isComplete: true,
					unsupportedFeatures: [],
					diagnostics: []
				};
			}
			return {
				operations: [],
				operationNodeIds: [],
				provides: null,
				isComplete: false,
				unsupportedFeatures: ["expression"],
				diagnostics: ["Only value-producing blocks can be used in slots."]
			};

		case "routine-call": {
			const signature = signatures[expression.routineId];
			if (!signature?.isPublishable || signature.returnKind === "none") {
				return {
					operations: [],
					operationNodeIds: [],
					provides: null,
					isComplete: false,
					unsupportedFeatures: [],
					diagnostics: [`${expression.routineName} is not publishable as a value function yet.`]
				};
			}
			const argsComplete =
				expression.args.length === signature.params.length &&
				expression.args.every((arg) => expressionCanExecuteAtRuntime(arg, signatures)) &&
				expression.args.every((arg, i) =>
					isTypeCompatible(
						signature.params[i]?.declaredTypeRef ?? null,
						inferExpressionTypeRef(arg, declarationTypes, typeSignatures)
					)
				);
			return {
				operations: [],
				operationNodeIds: [],
				provides: null,
				isComplete: argsComplete,
				unsupportedFeatures: [],
				diagnostics: argsComplete
					? []
					: expression.args.some((arg, i) =>
						!isTypeCompatible(
							signature.params[i]?.declaredTypeRef ?? null,
							inferExpressionTypeRef(arg, declarationTypes, typeSignatures)
						)
					)
						? ["type_mismatch_expect_arg"]
						: ["Finish each block and fill any missing value slots."]
			};
		}

		case "routine-reference": {
			const signature = signatures[expression.routineId];
			const ok = !!signature && signature.exportKind === "callable" && signature.isPublishable;
			return {
				operations: [],
				operationNodeIds: [],
				provides: null,
				isComplete: ok,
				unsupportedFeatures: [],
				diagnostics: ok ? [] : [`${expression.routineName} is not publishable as a function reference yet.`]
			};
		}

		case "routine-value": {
			const signature = signatures[expression.routineId];
			const ok = !!signature && signature.exportKind === "object-value" && signature.isPublishable;
			return {
				operations: [],
				operationNodeIds: [],
				provides: null,
				isComplete: ok,
				unsupportedFeatures: [],
				diagnostics: ok ? [] : [`${expression.routineName} is not publishable as an object value yet.`]
			};
		}

		case "routine-member": {
			const ownerSignature = signatures[expression.routineId];
			const memberSignature = ownerSignature?.members.find((m) => m.name === expression.memberName);
			const isReferenceOrData = expression.memberKind !== "function" || expression.callMode === "reference";
			const isComplete =
				!!ownerSignature &&
				ownerSignature.exportKind === "object-value" &&
				!!memberSignature &&
				(isReferenceOrData
					? true
					: expression.args.length === (memberSignature.params?.length ?? 0) &&
					expression.args.every((arg) => expressionCanExecuteAtRuntime(arg, signatures)));
			return {
				operations: [],
				operationNodeIds: [],
				provides: null,
				isComplete,
				unsupportedFeatures: [],
				diagnostics: isComplete
					? []
					: [`${expression.routineName}.${expression.memberName} is not executable yet.`]
			};
		}

		case "pointer":
			return {
				operations: [],
				operationNodeIds: [],
				provides: { kind: "pointer", targetId: expression.targetId, targetKind: expression.targetKind },
				isComplete: true,
				unsupportedFeatures: [],
				diagnostics: []
			};

		case "type-instance": {
			const ok = !!signatures[expression.typeRoutineId];
			return {
				operations: [],
				operationNodeIds: [],
				provides: null,
				isComplete: ok,
				unsupportedFeatures: [],
				diagnostics: ok ? [] : ["unknown_type"]
			};
		}

		case "type-field-read": {
			const ok = !!expression.targetDeclarationId && !!expression.fieldName;
			return {
				operations: [],
				operationNodeIds: [],
				provides: null,
				isComplete: ok,
				unsupportedFeatures: [],
				diagnostics: ok ? [] : ["unknown_type_field"]
			};
		}

		case "variable":
			if (expression.mode === "assign") {
				return {
					operations: [],
					operationNodeIds: [],
					provides: null,
					isComplete: false,
					unsupportedFeatures: [],
					diagnostics: ["Assignment blocks cannot be used as expressions."]
				};
			}
			return {
				operations: [],
				operationNodeIds: [],
				provides: null,
				isComplete:
					expression.mode === "value"
						? true
						: expression.operand !== null && expressionCanExecuteAtRuntime(expression.operand, signatures),
				unsupportedFeatures: [],
				diagnostics:
					expression.mode === "value" ||
						(expression.operand && expressionCanExecuteAtRuntime(expression.operand, signatures))
						? []
						: ["Finish each block and fill any missing value slots."]
			};

		case "binary":
		case "unary": {
			const isComplete = expressionCanExecuteAtRuntime(expression, signatures);
			return {
				operations: [],
				operationNodeIds: [],
				provides: null,
				isComplete,
				unsupportedFeatures: [],
				diagnostics: isComplete ? [] : ["Finish each block and fill any missing value slots."]
			};
		}
	}
};
