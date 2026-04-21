import type { EditorBlock, EditorInputSlotDefinition } from "../model";
import {
	blockColorClass,
	describeBlock,
	getBlockInputSlots,
	getBlockSlotBlock,
	getOutputType,
	isSlotCompatible
} from "../operations";
import { getBlockAccentClass } from "./blockAccent";
import { t } from "../../i18n-helpers";

type ControlEditorBlock = EditorBlock & {
	kind: "conditional" | "while" | "for_each";
};

export interface BlockInstanceRendererContext {
	isLocked(): boolean;
	isControlBlock(block: EditorBlock | null | undefined): block is ControlEditorBlock;
	getControlLabel(block: Pick<EditorBlock, "kind">): string;
	canShowDeclarationBindingWheel(block: EditorBlock): boolean;
	createSlotKey(ownerId: string, slotId: string): string;
	getDragSlotTargetKey(): string | null;
	applyBlockColor(element: HTMLElement, color?: string): void;
	assignLiteralIntoSlot(
		slotKey: string,
		value: string,
		expectedType: "value" | "boolean" | "any"
	): void;
	clearSlot(slotKey: string): void;
	onStartProgramPress(event: PointerEvent, block: EditorBlock, rect: DOMRect): void;
	onRemoveBlock(blockId: string): void;
	editValueBlock(blockId: string, currentValue: EditorBlock["literalValue"]): Promise<void>;
	editVariableName(blockId: string, currentName: string | undefined): Promise<void>;
	toggleWheel(blockId: string): void;
	registerSlotRef(slotKey: string, element: HTMLDivElement): void;
	registerBlockRef(blockId: string, element: HTMLDivElement): void;
	resolveTypeName(typeRoutineId: string): string | null;
}

export class BlockInstanceRenderer {
	public constructor(private readonly ctx: BlockInstanceRendererContext) { }

	private getDeclarationTypeTone(
		block: EditorBlock
	): "bool" | "int" | "double" | "string" | "user" {
		if (block.kind !== "var_declaration") {
			return "double";
		}
		if (block.declaredTypeRef?.kind === "user") {
			return "user";
		}
		if (block.declaredTypeRef?.kind === "primitive") {
			if (block.declaredTypeRef.primitive === "boolean") {
				return "bool";
			}
			if (block.declaredTypeRef.primitive === "text") {
				return "string";
			}
			return "double";
		}
		return "double";
	}

	private getDeclarationTypeLabel(
		block: EditorBlock
	): string {
		if (block.kind !== "var_declaration") {
			return "double";
		}
		if (block.declaredTypeRef?.kind === "user") {
			return this.ctx.resolveTypeName(block.declaredTypeRef.typeRoutineId) ?? t("blocks.type");
		}
		if (block.declaredTypeRef?.kind === "primitive") {
			switch (block.declaredTypeRef.primitive) {
				case "boolean":
					return "bool";
				case "text":
					return "string";
				case "value":
				default:
					return "double";
			}
		}
		return "double";
	}

	private getVariableOperationToken(mode: EditorBlock["variableOperationMode"]): string {
		switch (mode) {
			case "add":
				return "+";
			case "subtract":
				return "-";
			case "multiply":
				return "*";
			case "divide":
				return "/";
			case "modulo":
				return "%";
			case "equals":
				return "==";
			case "not_equals":
				return "!=";
			case "greater_than":
				return ">";
			case "greater_or_equal":
				return ">=";
			case "less_than":
				return "<";
			case "less_or_equal":
				return "<=";
			case "and":
				return "and";
			case "or":
				return "or";
			case "not":
				return "not";
			default:
				return "?";
		}
	}

	private getLiteralKind(value: EditorBlock["literalValue"]): "bool" | "int" | "double" | "string" {
		if (typeof value === "boolean") {
			return "bool";
		}
		if (typeof value === "number") {
			return Number.isInteger(value) ? "int" : "double";
		}
		return "string";
	}

	private formatLiteralValue(value: EditorBlock["literalValue"]): string {
		if (typeof value === "string") {
			return value;
		}
		if (typeof value === "boolean") {
			return value ? "true" : "false";
		}
		if (typeof value === "number") {
			return String(value);
		}
		return "item";
	}

	private createValueTypeBadge(value: EditorBlock["literalValue"]): HTMLSpanElement {
		const kind = this.getLiteralKind(value);
		const badge = document.createElement("span");
		badge.className = `editor-value-type editor-value-type-${kind}`;
		badge.textContent = kind;
		return badge;
	}

	public createBlockInstanceElement(
		block: EditorBlock,
		options: {
			nested?: boolean;
			ghost?: boolean;
			preview?: boolean;
		} = {}
	): HTMLDivElement {
		const nested = options.nested ?? false;
		const ghost = options.ghost ?? false;
		const preview = options.preview ?? false;
		const isPendingStructure = (block.kind === "structure" && !block.operation) || this.ctx.isControlBlock(block);
		const accentClass = getBlockAccentClass(block);
		const declarationTypeClass =
			block.kind === "var_declaration"
				? `declaration-type-${this.getDeclarationTypeTone(block)}`
				: "";
		const element = document.createElement("div");
		element.className = `editor-block sequence editor-block-instance ${nested ? "editor-block-instance-nested " : ""
			}${blockColorClass(block.operation)}${isPendingStructure ? " pending" : ""}${getBlockInputSlots(block).length > 0 ? " has-input-slot" : ""
			}${this.ctx.isControlBlock(block) ? " conditional-block" : ""}${block.kind === "var_declaration" || block.kind === "var_assign" || block.kind === "var_read" || block.kind === "var_reference" || block.kind === "var_operation" || block.kind === "var_binary_operation" || block.kind === "type_definition" || block.kind === "type_instance_new" || block.kind === "type_field_read" || block.kind === "type_field_assign" ? " variable-block" : ""
			}${nested && getOutputType(block) !== "value" ? " invalid" : ""}${preview ? " editor-block-preview" : ""}${ghost ? " drag-ghost-block-instance" : ""
			}${accentClass ? ` ${accentClass}` : ""}${declarationTypeClass ? ` ${declarationTypeClass}` : ""}
      }`.trim();
		this.ctx.applyBlockColor(element, block.color);

		const main = document.createElement("div");
		main.className = "editor-block-instance-main";
		this.appendBlockInstanceContent(block, main, { ghost });
		element.appendChild(main);

		if (
			block.kind === "structure" ||
			block.kind === "conditional" ||
			block.kind === "var_assign" ||
			block.kind === "var_reference" ||
			block.kind === "var_operation" ||
			block.kind === "var_binary_operation" ||
			block.kind === "routine_call" ||
			(block.kind === "routine_member" && block.routineMemberKind === "function") ||
			this.ctx.canShowDeclarationBindingWheel(block)
		) {
			if (ghost) {
				element.appendChild(
					this.createStaticBlockHandle(
						`editor-block-instance-handle${nested ? " editor-block-instance-handle-compact" : ""}`
					)
				);
			} else {
				const handle = this.createInlineBlockHandle(
					block,
					`editor-block-instance-handle${nested ? " editor-block-instance-handle-compact" : ""}`
				);
				if (handle) {
					if (this.ctx.isLocked()) {
						handle.disabled = true;
					}
					element.appendChild(handle);
				}
			}
		}

		return element;
	}

	public renderGhostBlockInstance(block: EditorBlock, nested = false): HTMLElement {
		return this.createBlockInstanceElement(block, { nested, ghost: true });
	}

	public renderInsertedBlock(block: EditorBlock): HTMLElement {
		const nested = this.createBlockInstanceElement(block, { nested: true });

		nested.addEventListener("pointerdown", (event) => {
			const target = event.target as HTMLElement | null;
			const cavity = target?.closest(".editor-block-instance-cavity") as HTMLElement | null;
			if (cavity?.dataset.ownerBlockId === block.id) {
				return;
			}
			const rect = nested.getBoundingClientRect();
			this.ctx.onStartProgramPress(event, block, rect);
		});
		nested.addEventListener("contextmenu", (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.ctx.onRemoveBlock(block.id);
		});
		if (block.kind === "value") {
			nested.addEventListener("dblclick", (event) => {
				event.stopPropagation();
				void this.ctx.editValueBlock(block.id, block.literalValue);
			});
		} else if (block.kind === "var_declaration") {
			nested.addEventListener("dblclick", (event) => {
				event.stopPropagation();
				void this.ctx.editVariableName(block.id, block.variableName);
			});
		} else if (block.kind === "function_definition" || block.kind === "type_definition") {
			nested.addEventListener("dblclick", (event) => {
				event.stopPropagation();
				void this.ctx.editVariableName(block.id, block.routineName ?? block.typeName);
			});
		} else if (
			block.kind === "var_assign" ||
			block.kind === "var_reference" ||
			block.kind === "type_field_read" ||
			block.kind === "type_field_assign"
		) {
			nested.addEventListener("click", (event) => {
				event.stopPropagation();
				void this.ctx.editVariableName(block.id, block.variableName);
			});
		}

		this.ctx.registerBlockRef(block.id, nested as unknown as HTMLDivElement);
		return nested;
	}

	private appendBlockInstanceContent(
		block: EditorBlock,
		main: HTMLElement,
		options: {
			ghost?: boolean;
		} = {}
	): void {
		const createVariableNameControl = (): HTMLElement => {
			if (options.ghost) {
				const namePill = document.createElement("span");
				namePill.className = "editor-variable-name";
				namePill.textContent = block.variableName?.trim() || "variable";
				return namePill;
			}

			const nameButton = document.createElement("button");
			nameButton.type = "button";
			nameButton.className = "editor-variable-name";
			nameButton.textContent = block.variableName?.trim() || "variable";
			nameButton.addEventListener("pointerdown", (event) => {
				event.stopPropagation();
			});
			nameButton.addEventListener("click", (event) => {
				event.stopPropagation();
				void this.ctx.editVariableName(block.id, block.variableName);
			});
			return nameButton;
		};

		if (block.kind === "function_definition") {
			const label = document.createElement("strong");
			label.className = "editor-block-instance-label";
			label.textContent = t("blocks.definition").toLowerCase();
			main.appendChild(label);
			if (options.ghost) {
				const routinePill = document.createElement("span");
				routinePill.className = "editor-variable-name";
				routinePill.textContent = block.routineName?.trim() || t("blocks.function").toLowerCase();
				main.appendChild(routinePill);
			} else {
				const routineButton = document.createElement("button");
				routineButton.type = "button";
				routineButton.className = "editor-variable-name";
				routineButton.textContent =
					block.routineName?.trim() || t("blocks.function").toLowerCase();
				routineButton.addEventListener("pointerdown", (event) => {
					event.stopPropagation();
				});
				routineButton.addEventListener("click", (event) => {
					event.stopPropagation();
					void this.ctx.editVariableName(block.id, block.routineName);
				});
				main.appendChild(routineButton);
			}
			return;
		}

		if (block.kind === "type_definition") {
			const label = document.createElement("strong");
			label.className = "editor-block-instance-label";
			label.textContent = t("blocks.typeDefinition").toLowerCase();
			main.appendChild(label);
			if (options.ghost) {
				const routinePill = document.createElement("span");
				routinePill.className = "editor-variable-name";
				routinePill.textContent = block.routineName?.trim() || block.typeName?.trim() || t("blocks.type").toLowerCase();
				main.appendChild(routinePill);
			} else {
				const routineButton = document.createElement("button");
				routineButton.type = "button";
				routineButton.className = "editor-variable-name";
				routineButton.textContent =
					block.routineName?.trim() || block.typeName?.trim() || t("blocks.type").toLowerCase();
				routineButton.addEventListener("pointerdown", (event) => {
					event.stopPropagation();
				});
				routineButton.addEventListener("click", (event) => {
					event.stopPropagation();
					void this.ctx.editVariableName(block.id, block.routineName ?? block.typeName);
				});
				main.appendChild(routineButton);
			}
			return;
		}

		if (block.kind === "var_declaration") {
			const label = document.createElement("strong");
			label.className = "editor-block-instance-label";
			label.textContent = t(`bindings.${block.bindingKind === "expect" ? "expect" : "declare"}`);
			main.appendChild(label);
			const typeBadge = document.createElement("span");
			typeBadge.className = `editor-value-type editor-value-type-${this.getDeclarationTypeTone(block)}`;
			typeBadge.textContent = this.getDeclarationTypeLabel(block);
			main.appendChild(typeBadge);
			main.appendChild(createVariableNameControl());
			return;
		}

		if (block.kind === "var_assign") {
			main.appendChild(createVariableNameControl());
			const operator = document.createElement("strong");
			operator.className = "editor-block-instance-operator";
			operator.textContent = "=";
			main.appendChild(operator);
			getBlockInputSlots(block).forEach((slotDefinition) => {
				main.appendChild(
					options.ghost
						? this.renderGhostInputSlot(block, slotDefinition)
						: this.renderInlineInputSlot(block, slotDefinition)
				);
			});
			return;
		}

		if (block.kind === "var_reference") {
			const label = document.createElement("strong");
			label.className = "editor-block-instance-label";
			label.textContent = t("blocks.referenceTo");
			main.appendChild(label);
			main.appendChild(createVariableNameControl());
			return;
		}

		if (block.kind === "var_binary_operation") {
			const slots = getBlockInputSlots(block);
			if (slots.length === 1) {
				const operator = document.createElement("strong");
				operator.className = "editor-block-instance-operator";
				operator.textContent = this.getVariableOperationToken(block.variableOperationMode);
				main.appendChild(operator);
				main.appendChild(
					options.ghost
						? this.renderGhostInputSlot(block, slots[0]!)
						: this.renderInlineInputSlot(block, slots[0]!)
				);
				return;
			}

			if (slots.length === 2) {
				main.appendChild(
					options.ghost
						? this.renderGhostInputSlot(block, slots[0]!)
						: this.renderInlineInputSlot(block, slots[0]!)
				);
				const operator = document.createElement("strong");
				operator.className = "editor-block-instance-operator";
				operator.textContent = this.getVariableOperationToken(block.variableOperationMode);
				main.appendChild(operator);
				main.appendChild(
					options.ghost
						? this.renderGhostInputSlot(block, slots[1]!)
						: this.renderInlineInputSlot(block, slots[1]!)
				);
				return;
			}
		}

		const label = document.createElement("strong");
		label.className = "editor-block-instance-label";
		label.textContent = this.ctx.isControlBlock(block)
			? this.ctx.getControlLabel(block)
			: describeBlock(block);

		if (block.kind === "value") {
			const valueTypeBadge = this.createValueTypeBadge(block.literalValue);
			main.appendChild(valueTypeBadge);
			if (options.ghost) {
				const valuePill = document.createElement("span");
				valuePill.className = "editor-value-pill";
				valuePill.textContent = this.formatLiteralValue(block.literalValue);
				main.appendChild(valuePill);
			} else {
				const valueButton = document.createElement("button");
				valueButton.type = "button";
				valueButton.className = "editor-value-pill";
				valueButton.textContent = this.formatLiteralValue(block.literalValue);
				valueButton.addEventListener("pointerdown", (event) => {
					event.stopPropagation();
				});
				valueButton.addEventListener("click", (event) => {
					event.stopPropagation();
					void this.ctx.editValueBlock(block.id, block.literalValue);
				});
				main.appendChild(valueButton);
			}
		} else {
			main.appendChild(label);
		}

		getBlockInputSlots(block).forEach((slotDefinition) => {
			main.appendChild(
				options.ghost
					? this.renderGhostInputSlot(block, slotDefinition)
					: this.renderInlineInputSlot(block, slotDefinition)
			);
		});
	}

	private createStaticBlockHandle(className: string): HTMLSpanElement {
		const handle = document.createElement("span");
		handle.className = className;
		handle.innerHTML = `<span class="editor-block-handle-arrow">▸</span>`;
		return handle;
	}

	private renderGhostInputSlot(
		block: EditorBlock,
		slotDefinition: EditorInputSlotDefinition
	): HTMLDivElement {
		const slot = document.createElement("div");
		slot.className = "editor-block-instance-cavity";
		slot.dataset.ownerBlockId = block.id;
		slot.dataset.slotId = slotDefinition.id;
		if (block.color) {
			slot.style.borderColor = block.color;
		}
		const slotBlock = getBlockSlotBlock(block, slotDefinition.id);
		if (slotBlock) {
			slot.classList.add("filled");
			slot.appendChild(this.createBlockInstanceElement(slotBlock, { nested: true, ghost: true }));
		}
		return slot;
	}

	private renderInlineInputSlot(block: EditorBlock, inputSlot: EditorInputSlotDefinition): HTMLDivElement {
		const slot = document.createElement("div");
		slot.className = "editor-block-instance-cavity";
		slot.dataset.ownerBlockId = block.id;
		slot.dataset.slotId = inputSlot.id;
		const slotKey = this.ctx.createSlotKey(block.id, inputSlot.id);
		if (block.color) {
			slot.style.borderColor = block.color;
		}
		if (this.ctx.getDragSlotTargetKey() === slotKey) {
			slot.classList.add("active");
		}
		const slotBlock = getBlockSlotBlock(block, inputSlot.id);
		if (slotBlock && !isSlotCompatible(block, slotBlock, inputSlot.id)) {
			slot.classList.add("invalid");
		}
		if (slotBlock) {
			slot.classList.add("filled");
			slot.textContent = "";
			slot.appendChild(this.renderInsertedBlock(slotBlock));
		} else {
			slot.title = inputSlot.title;
			const textInput = document.createElement("input");
			textInput.type = "text";
			textInput.className = "editor-block-instance-cavity-text";
			textInput.setAttribute("aria-label", inputSlot.title);
			textInput.setAttribute("spellcheck", "false");
			if (inputSlot.allowDirectTextEntry) {
				textInput.placeholder = "";
			} else {
				textInput.disabled = true;
			}
			textInput.addEventListener("pointerdown", (event) => {
				event.stopPropagation();
			});
			textInput.addEventListener("click", (event) => {
				event.stopPropagation();
			});
			textInput.addEventListener("keydown", (event) => {
				event.stopPropagation();
				if (event.key === "Enter") {
					event.preventDefault();
					this.ctx.assignLiteralIntoSlot(slotKey, textInput.value, inputSlot.expectedType);
				} else if (event.key === "Escape") {
					textInput.value = "";
					textInput.blur();
				}
			});
			textInput.addEventListener("blur", () => {
				this.ctx.assignLiteralIntoSlot(slotKey, textInput.value, inputSlot.expectedType);
			});
			slot.appendChild(textInput);
		}
		slot.addEventListener("pointerdown", (event) => {
			event.stopPropagation();
		});
		slot.addEventListener("contextmenu", (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.ctx.clearSlot(slotKey);
		});
		this.ctx.registerSlotRef(slotKey, slot);
		return slot;
	}

	private createInlineBlockHandle(block: EditorBlock, className: string): HTMLButtonElement | null {
		if (
			block.kind !== "structure" &&
			block.kind !== "conditional" &&
			block.kind !== "var_operation" &&
			block.kind !== "var_binary_operation" &&
			block.kind !== "var_declaration" &&
			block.kind !== "routine_call" &&
			block.kind !== "routine_member"
		) {
			return null;
		}

		const handle = document.createElement("button");
		handle.type = "button";
		handle.className = className;
		handle.innerHTML = `<span class="editor-block-handle-arrow">▸</span>`;
		handle.addEventListener("pointerdown", (event) => {
			event.stopPropagation();
		});
		handle.addEventListener("click", (event) => {
			event.stopPropagation();
			this.ctx.toggleWheel(block.id);
		});
		return handle;
	}
}
