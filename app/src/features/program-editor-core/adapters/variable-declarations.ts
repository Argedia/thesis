import type {
	DeclareStatement,
	EditorDocument,
	RoutineBindingKind,
	StatementNode
} from "../types";
import { getActiveProgram } from "../tree";

export interface VariableDeclarationInfo {
	id: string;
	name: string;
	color?: string;
	bindingKind: RoutineBindingKind;
	declaredTypeRef?: DeclareStatement["declaredTypeRef"];
}

const collectFromStatements = (
	statements: StatementNode[],
	declarations: VariableDeclarationInfo[]
): void => {
	statements.forEach((statement) => {
		if (statement.kind === "declare") {
			declarations.push({
				id: statement.id,
				name: statement.variableName?.trim() || "variable",
				color: statement.visual?.color,
				bindingKind: statement.bindingKind ?? "declare",
				declaredTypeRef: statement.declaredTypeRef ?? null
			});
		}
		if (statement.kind === "for-each") {
			declarations.push({
				id: statement.itemDeclarationId,
				name: statement.itemName?.trim() || "item",
				color: statement.visual?.color,
				bindingKind: "declare"
			});
			collectFromStatements(statement.body, declarations);
			return;
		}
		if (statement.kind === "if") {
			collectFromStatements(statement.thenBody, declarations);
			if (statement.elseBody) {
				collectFromStatements(statement.elseBody, declarations);
			}
			return;
		}
		if (statement.kind === "while") {
			collectFromStatements(statement.body, declarations);
		}
	});
};

export const collectVariableDeclarations = (document: EditorDocument): VariableDeclarationInfo[] => {
	const declarations: VariableDeclarationInfo[] = [];
	const activeProgram = getActiveProgram(document);
	collectFromStatements(activeProgram.statements, declarations);
	return declarations;
};

export const variableDeclarationMap = (
	statements: StatementNode[],
	map = new Map<string, DeclareStatement>()
) => {
	statements.forEach((statement) => {
		if (statement.kind === "declare") {
			map.set(statement.id, statement);
		}
		if (statement.kind === "if") {
			variableDeclarationMap(statement.thenBody, map);
			if (statement.elseBody) {
				variableDeclarationMap(statement.elseBody, map);
			}
		}
		if (statement.kind === "while") {
			variableDeclarationMap(statement.body, map);
		}
		if (statement.kind === "for-each") {
			map.set(statement.itemDeclarationId, {
				id: statement.itemDeclarationId,
				kind: "declare",
				variableName: statement.itemName,
				bindingKind: "declare"
			});
			variableDeclarationMap(statement.body, map);
		}
	});
	return map;
};
