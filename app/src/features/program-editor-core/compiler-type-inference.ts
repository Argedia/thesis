import type {
	DeclaredTypeRef,
	ExpressionNode,
	StatementNode,
	TypeSignature
} from "./types";

export type DeclarationTypeLookup = Map<
	string,
	{
		name: string;
		declaredTypeRef: DeclaredTypeRef | null;
	}
>;

export const collectRoutineDeclarationTypes = (
	statements: StatementNode[],
	lookup: DeclarationTypeLookup
): DeclarationTypeLookup => {
	statements.forEach((statement) => {
		if (statement.kind === "declare") {
			lookup.set(statement.id, {
				name: statement.variableName,
				declaredTypeRef: statement.declaredTypeRef ?? null
			});
			return;
		}
		if (statement.kind === "for-each") {
			lookup.set(statement.itemDeclarationId, {
				name: statement.itemName,
				declaredTypeRef: { kind: "primitive", primitive: "value" }
			});
			collectRoutineDeclarationTypes(statement.body, lookup);
			return;
		}
		if (statement.kind === "if") {
			collectRoutineDeclarationTypes(statement.thenBody, lookup);
			collectRoutineDeclarationTypes(statement.elseBody ?? [], lookup);
			return;
		}
		if (statement.kind === "while") {
			collectRoutineDeclarationTypes(statement.body, lookup);
		}
	});
	return lookup;
};

export const findDeclarationTypeByName = (
	lookup: DeclarationTypeLookup,
	name: string
): DeclaredTypeRef | null => {
	for (const declaration of lookup.values()) {
		if (declaration.name === name) return declaration.declaredTypeRef ?? null;
	}
	return null;
};

export const inferExpressionTypeRef = (
	expression: ExpressionNode | null,
	declarationTypes: DeclarationTypeLookup,
	typeSignatures: Record<string, TypeSignature>
): DeclaredTypeRef | "unknown" | null => {
	if (!expression) return null;

	switch (expression.kind) {
		case "literal":
			return typeof expression.value === "boolean"
				? { kind: "primitive", primitive: "boolean" }
				: typeof expression.value === "string"
					? { kind: "primitive", primitive: "text" }
					: { kind: "primitive", primitive: "value" };
		case "binary":
		case "unary":
			return expression.outputType === "boolean"
				? { kind: "primitive", primitive: "boolean" }
				: { kind: "primitive", primitive: "value" };
		case "variable":
			return (
				declarationTypes.get(expression.declarationId)?.declaredTypeRef ??
				findDeclarationTypeByName(declarationTypes, expression.variableName) ??
				"unknown"
			);
		case "type-instance":
			return { kind: "user", typeRoutineId: expression.typeRoutineId };
		case "type-field-read": {
			const parentType = declarationTypes.get(expression.targetDeclarationId)?.declaredTypeRef;
			if (!parentType || parentType.kind !== "user") return "unknown";
			const signature = typeSignatures[parentType.typeRoutineId];
			if (!signature) return "unknown";
			const field = signature.fieldDeclarations.find((f) => f.name === expression.fieldName);
			return field?.declaredTypeRef ?? "unknown";
		}
		case "structure":
			return { kind: "primitive", primitive: "value" };
		case "pointer":
			if (expression.targetKind === "variable") {
				return declarationTypes.get(expression.targetId)?.declaredTypeRef ?? "unknown";
			}
			return "unknown";
		case "routine-call":
		case "routine-reference":
		case "routine-value":
		case "routine-member":
			return "unknown";
	}
};

export const isTypeCompatible = (
	expected: DeclaredTypeRef | null | undefined,
	actual: DeclaredTypeRef | "unknown" | null
): boolean => {
	if (!expected) return true;
	if (!actual || actual === "unknown") return true;
	if (expected.kind !== actual.kind) return false;
	if (expected.kind === "primitive" && actual.kind === "primitive") {
		if (expected.primitive === "value") return actual.primitive === "value" || actual.primitive === "text";
		return expected.primitive === actual.primitive;
	}
	if (expected.kind === "structure" && actual.kind === "structure") {
		return expected.structureKind === actual.structureKind;
	}
	if (expected.kind === "user" && actual.kind === "user") {
		return expected.typeRoutineId === actual.typeRoutineId;
	}
	return false;
};
