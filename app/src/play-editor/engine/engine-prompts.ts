import { type DataValue, type StructureSnapshot } from "@thesis/core-engine";
import type { EditorBlock, PlayEditorSurfaceProps } from "../model";
import { collectVariableDeclarations, listTypeSignatures } from "../operations";
import { t } from "../../i18n-helpers";

type RequestTextInputOptions = {
	title: string;
	initialValue?: string;
	validate?: (value: string) => string | null;
};

type RequestSelectInputOptions = {
	title: string;
	initialValue?: string;
	options: Array<{ value: string; label: string }>;
};

export const requestTextInput = async (
	props: PlayEditorSurfaceProps,
	options: RequestTextInputOptions
): Promise<string | null> => {
	if (props.onRequestTextInput) {
		return props.onRequestTextInput(options);
	}

	return window.prompt(options.title, options.initialValue ?? "") ?? null;
};

export const requestSelectInput = async (
	props: PlayEditorSurfaceProps,
	options: RequestSelectInputOptions
): Promise<string | null> => {
	if (props.onRequestSelectInput) {
		return props.onRequestSelectInput(options);
	}

	const optionsText = options.options.map((option, index) => `${index + 1}. ${option.label}`).join("\n");
	const response = window.prompt(
		`${options.title}\n${optionsText}`,
		options.initialValue ?? options.options[0]?.value ?? ""
	);
	if (response === null) {
		return null;
	}
	const trimmed = response.trim();
	if (!trimmed) {
		return null;
	}
	const byValue = options.options.find((option) => option.value === trimmed);
	if (byValue) {
		return byValue.value;
	}
	const numericIndex = Number(trimmed);
	if (Number.isInteger(numericIndex)) {
		return options.options[numericIndex - 1]?.value ?? null;
	}
	return null;
};

export const showAlert = async (
	props: PlayEditorSurfaceProps,
	options: { title?: string; message: string }
): Promise<void> => {
	if (props.onShowAlert) {
		await props.onShowAlert(options);
		return;
	}

	window.alert(options.message);
};

export const promptForVariableName = async (options: {
	props: PlayEditorSurfaceProps;
	currentName?: string;
	excludeDeclarationId?: string;
	isVariableNameTaken: (name: string, excludeDeclarationId?: string) => boolean;
}): Promise<string | null> => {
	while (true) {
		const nextName = await requestTextInput(options.props, {
			title: t("editor.variableNamePrompt"),
			initialValue: options.currentName?.trim() || "variable"
		});
		if (nextName === null) {
			return null;
		}

		const normalizedName = nextName.trim();
		if (!normalizedName) {
			await showAlert(options.props, {
				title: t("common.notice"),
				message: t("messages.variableNameEmpty")
			});
			continue;
		}

		if (options.isVariableNameTaken(normalizedName, options.excludeDeclarationId)) {
			await showAlert(options.props, {
				title: t("common.notice"),
				message: t("messages.variableNameExists", { name: normalizedName })
			});
			continue;
		}

		return normalizedName;
	}
};

export const promptForRoutineName = async (options: {
	props: PlayEditorSurfaceProps;
	currentName?: string;
	activeRoutineName: string;
}): Promise<string | null> => {
	const nextName = await requestTextInput(options.props, {
		title: t("editor.routineName"),
		initialValue: options.currentName?.trim() || options.activeRoutineName
	});
	if (nextName === null) {
		return null;
	}
	const normalizedName = nextName.trim();
	if (!normalizedName) {
		await showAlert(options.props, {
			title: t("common.notice"),
			message: t("messages.routineNameEmpty")
		});
		return promptForRoutineName(options);
	}
	return normalizedName;
};

export const promptForValueText = async (options: {
	props: PlayEditorSurfaceProps;
	currentValue?: DataValue | null;
}): Promise<string | null> => {
	const nextValue = await requestTextInput(options.props, {
		title: t("editor.valuePrompt"),
		initialValue: String(options.currentValue ?? "item")
	});
	if (nextValue === null) {
		return null;
	}

	const normalizedValue = nextValue.trim();
	if (!normalizedValue) {
		await showAlert(options.props, {
			title: t("common.notice"),
			message: t("messages.valueEmpty")
		});
		return promptForValueText(options);
	}

	return normalizedValue;
};

const getDeclarationTypeOptions = (
	structures: StructureSnapshot[],
	document: PlayEditorSurfaceProps["value"]
): Array<{
	value: string;
	label: string;
	typeRef: EditorBlock["declaredTypeRef"];
}> => {
	const primitiveOptions = [
		{
			value: "primitive:value",
			label: t("blocks.value"),
			typeRef: { kind: "primitive", primitive: "value" } as const
		},
		{
			value: "primitive:text",
			label: t("blocks.text"),
			typeRef: { kind: "primitive", primitive: "text" } as const
		},
		{
			value: "primitive:boolean",
			label: t("blocks.boolean"),
			typeRef: { kind: "primitive", primitive: "boolean" } as const
		}
	];
	const structureKinds = Array.from(new Set(structures.map((structure) => structure.kind)));
	const structureOptions = structureKinds
		.filter((kind): kind is "stack" | "queue" | "list" => kind === "stack" || kind === "queue" || kind === "list")
		.map((kind) => ({
			value: `structure:${kind}`,
			label:
				kind === "stack"
					? t("structures.stack")
					: kind === "queue"
						? t("structures.queue")
						: t("structures.list"),
			typeRef: {
				kind: "structure" as const,
				structureKind: kind
			}
		}));
	const userTypeOptions = listTypeSignatures(document).map((signature) => ({
		value: `user:${signature.typeRoutineId}`,
		label: signature.typeName,
		typeRef: {
			kind: "user" as const,
			typeRoutineId: signature.typeRoutineId
		}
	}));
	return [...primitiveOptions, ...structureOptions, ...userTypeOptions];
};

export const promptForDeclaredTypeRef = async (options: {
	props: PlayEditorSurfaceProps;
	structures: StructureSnapshot[];
	document: PlayEditorSurfaceProps["value"];
	currentTypeRef?: EditorBlock["declaredTypeRef"];
}): Promise<EditorBlock["declaredTypeRef"] | null> => {
	const allOptions = getDeclarationTypeOptions(options.structures, options.document);
	if (allOptions.length === 0) {
		return { kind: "primitive", primitive: "value" };
	}

	const initialValue =
		options.currentTypeRef?.kind === "primitive"
			? `primitive:${options.currentTypeRef.primitive}`
			: options.currentTypeRef?.kind === "structure"
				? `structure:${options.currentTypeRef.structureKind}`
				: options.currentTypeRef?.kind === "user"
					? `user:${options.currentTypeRef.typeRoutineId}`
					: "primitive:value";

	const selectedValue = await requestSelectInput(options.props, {
		title: t("editor.variableTypePrompt"),
		initialValue,
		options: allOptions.map((option) => ({
			value: option.value,
			label: option.label
		}))
	});
	if (!selectedValue) {
		return null;
	}
	const selected = allOptions.find((option) => option.value === selectedValue) ?? null;
	return selected?.typeRef ?? { kind: "primitive", primitive: "value" };
};

export const promptForVariableDeclarationSpec = async (options: {
	props: PlayEditorSurfaceProps;
	structures: StructureSnapshot[];
	document: PlayEditorSurfaceProps["value"];
	currentName?: string;
	currentTypeRef?: EditorBlock["declaredTypeRef"];
	excludeDeclarationId?: string;
	isVariableNameTaken: (name: string, excludeDeclarationId?: string) => boolean;
}): Promise<{ name: string; declaredTypeRef: EditorBlock["declaredTypeRef"] } | null> => {
	const allOptions = getDeclarationTypeOptions(options.structures, options.document);
	const initialTypeValue =
		options.currentTypeRef?.kind === "primitive"
			? `primitive:${options.currentTypeRef.primitive}`
			: options.currentTypeRef?.kind === "structure"
				? `structure:${options.currentTypeRef.structureKind}`
				: options.currentTypeRef?.kind === "user"
					? `user:${options.currentTypeRef.typeRoutineId}`
					: "primitive:value";

	if (options.props.onRequestDeclarationInput) {
		const response = await options.props.onRequestDeclarationInput({
			title: t("blocks.declaration"),
			nameTitle: t("editor.variableNamePrompt"),
			typeTitle: t("editor.variableTypePrompt"),
			initialName: options.currentName?.trim() || "variable",
			initialTypeValue,
			options: allOptions.map((option) => ({
				value: option.value,
				label: option.label
			}))
		});
		if (!response) {
			return null;
		}
		const normalizedName = response.name.trim();
		if (!normalizedName) {
			await showAlert(options.props, {
				title: t("common.notice"),
				message: t("messages.variableNameEmpty")
			});
			return null;
		}
		if (options.isVariableNameTaken(normalizedName, options.excludeDeclarationId)) {
			await showAlert(options.props, {
				title: t("common.notice"),
				message: t("messages.variableNameExists", { name: normalizedName })
			});
			return null;
		}
		const selected = allOptions.find((option) => option.value === response.typeValue) ?? null;
		return {
			name: normalizedName,
			declaredTypeRef: selected?.typeRef ?? { kind: "primitive", primitive: "value" }
		};
	}

	const name = await promptForVariableName({
		props: options.props,
		currentName: options.currentName,
		excludeDeclarationId: options.excludeDeclarationId,
		isVariableNameTaken: options.isVariableNameTaken
	});
	if (!name) {
		return null;
	}
	const declaredTypeRef = await promptForDeclaredTypeRef({
		props: options.props,
		structures: options.structures,
		document: options.document,
		currentTypeRef: options.currentTypeRef
	});
	if (!declaredTypeRef) {
		return null;
	}
	return { name, declaredTypeRef };
};

export const promptForScopeVariableTarget = async (options: {
	props: PlayEditorSurfaceProps;
	document: PlayEditorSurfaceProps["value"];
	currentTargetId?: string;
}): Promise<{ id: string; name: string } | null> => {
	const declarations = collectVariableDeclarations(options.document);
	if (declarations.length === 0) {
		await showAlert(options.props, {
			title: t("common.notice"),
			message: t("common.noVariables")
		});
		return null;
	}

	const selectedId = await requestSelectInput(options.props, {
		title: t("editor.scopeVariablePrompt"),
		initialValue: options.currentTargetId ?? declarations[0]?.id,
		options: declarations.map((declaration) => ({
			value: declaration.id,
			label: declaration.name
		}))
	});
	if (!selectedId) {
		return null;
	}

	const selected = declarations.find((declaration) => declaration.id === selectedId) ?? null;
	return selected ? { id: selected.id, name: selected.name } : null;
};

export const promptForTypedFieldTarget = async (options: {
	props: PlayEditorSurfaceProps;
	document: PlayEditorSurfaceProps["value"];
	currentVariableId?: string;
	currentFieldName?: string;
}): Promise<{ variableId: string; variableName: string; fieldName: string } | null> => {
	const declarations = collectVariableDeclarations(options.document).filter(
		(declaration) => declaration.declaredTypeRef?.kind === "user"
	);
	if (declarations.length === 0) {
		await showAlert(options.props, {
			title: t("common.notice"),
			message: t("messages.unknownType")
		});
		return null;
	}

	const variableId = await requestSelectInput(options.props, {
		title: t("editor.scopeVariablePrompt"),
		initialValue: options.currentVariableId ?? declarations[0]?.id,
		options: declarations.map((declaration) => ({
			value: declaration.id,
			label: declaration.name
		}))
	});
	if (!variableId) {
		return null;
	}
	const selectedVariable = declarations.find((declaration) => declaration.id === variableId) ?? null;
	if (!selectedVariable || selectedVariable.declaredTypeRef?.kind !== "user") {
		return null;
	}
	const selectedTypeRef = selectedVariable.declaredTypeRef;

	const typeSignature =
		listTypeSignatures(options.document).find(
			(signature) => signature.typeRoutineId === selectedTypeRef.typeRoutineId
		) ?? null;
	const fieldOptions = (typeSignature?.fieldDeclarations ?? [])
		.map((field) => field.name.trim())
		.filter((fieldName) => fieldName.length > 0)
		.map((fieldName) => ({
			value: fieldName,
			label: fieldName
		}));
	if (fieldOptions.length === 0) {
		await showAlert(options.props, {
			title: t("common.notice"),
			message: t("messages.unknownTypeField")
		});
		return null;
	}
	const fieldName = await requestSelectInput(options.props, {
		title: t("blocks.field"),
		initialValue: options.currentFieldName ?? fieldOptions[0]?.value,
		options: fieldOptions
	});
	if (!fieldName) {
		return null;
	}
	return {
		variableId: selectedVariable.id,
		variableName: selectedVariable.name,
		fieldName
	};
};
