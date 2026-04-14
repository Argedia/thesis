import { type DataValue, type StructureSnapshot } from "@thesis/core-engine";
import type {
	ConditionalMode,
	ConditionalWheelOption,
	ControlBodyKey,
	EditorBlock,
	EditorInputSlotDefinition,
	EditorLineLayout,
	EditorDragState,
	PaletteBlock,
	PlayEditorSurfaceProps,
	RoutineSignature,
	RoutineReturnKind,
	RoutineBindingKind,
	VariableOperationMode
} from "./model";
import {
	calculateDropIndex,
	insertAt,
	moveItem,
	type DragGeometry
} from "./layout";
import { DragDropGeometryService } from "./DragDropGeometry";
import { BlockMutationService } from "./services/BlockMutationService";
import { BlockTreeService } from "./services/BlockTreeService";
import { PaletteDerivationService } from "./services/PaletteDerivationService";
import { DropPlacementService } from "./services/DropPlacementService";
import { LiteralParserService } from "./domain/LiteralParserService";
import { VariableValidationService } from "./domain/VariableValidationService";
import {
	DragInteractionController,
	type DragInteractionControllerContext
} from "./interaction/DragInteractionController";
import { PaletteRenderer, type PaletteRendererContext } from "./render/PaletteRenderer";
import {
	EditorCanvasRenderer,
	type EditorCanvasRendererContext
} from "./EditorCanvasRenderer";
import { WheelOverlayRenderer } from "./render/WheelOverlayRenderer";
import {
	WheelInteractionController,
	type WheelInteractionContext
} from "./interaction/WheelInteractionController";
import {
	HostInteractionController
} from "./interaction/HostInteractionController";
import { t } from "../i18n-helpers";
import {
	analyzeDocumentRoutines,
	blockColorClass,
	createEditorDocumentFromLegacyBlocks,
	createVariableDeclarationBlock,
	createVariableOperationBlock,
	createConditionalBlock,
	createWhileBlock,
	createReturnBlock,
	createRoutineCallBlock,
	createRoutineMemberBlock,
	createRoutineValueBlock,
	createBooleanValueBlock,
	createEditorBlock,
	createValueBlock,
	getBlockInputSlots,
	getBlockSlotBlock,
	getOutputType,
	isSlotCompatible,
	setBlockSlotBlock,
	describeBlock,
	projectDocumentToLegacyBlocks
} from "./operations";
import { buildEditorLineLayout } from "./model";
import { BLOCK_METADATA, type PaletteGroupId, getStaticChip, getPaletteGroup, getLabelI18nKey } from "./BlockMetadata";
import type {
	PendingPress,
	PreviewDescriptor,
	ResolvedDropPlacement,
	WheelState
} from "./contracts/types";
import { FUNCTION_BLUE, PREVIEW_BLOCK_ID } from "./contracts/constants";

type ControlEditorBlock = EditorBlock & {
	kind: "conditional" | "while";
};

export class PlayEditorEngine {
	private readonly host: HTMLElement;
	private props: PlayEditorSurfaceProps;
	private blockRefs = new Map<string, HTMLDivElement>();
	private lineRowRefs = new Map<string, HTMLDivElement>();
	private slotRefs = new Map<string, HTMLDivElement>();
	private branchLineRefs: Array<{
		ownerId: string;
		branch: ControlBodyKey;
		depth: number;
		element: HTMLDivElement;
		isLast: boolean;
	}> = [];
	private paletteBlocks: PaletteBlock[] = [];
	private editorLane: HTMLDivElement | null = null;
	private dragState: EditorDragState | null = null;
	private dragBaseLineRects: Array<{ id: string; rect: DOMRect }> | null = null;
	private dragDropGeometry: DragDropGeometryService | null = null;
	private blockMutation: BlockMutationService | null = null;
	private blockTree: BlockTreeService | null = null;
	private paletteDerivation: PaletteDerivationService | null = null;
	private literalParser: LiteralParserService | null = null;
	private variableValidation: VariableValidationService | null = null;
	private dropPlacement: DropPlacementService | null = null;
	private dragInteraction: DragInteractionController | null = null;
	private paletteRenderer: PaletteRenderer | null = null;
	private editorCanvasRenderer: EditorCanvasRenderer | null = null;
	private wheelOverlayRenderer: WheelOverlayRenderer | null = null;
	private wheelInteraction: WheelInteractionController | null = null;
	private readonly hostInteraction = new HostInteractionController();
	private pressState: PendingPress | null = null;
	private wheelState: WheelState | null = null;
	private cleanupFns: Array<() => void> = [];

	public constructor(host: HTMLElement, props: PlayEditorSurfaceProps) {
		this.host = host;
		this.props = props;
		this.render();
		this.attachGlobalListeners();
		this.attachHostListeners();
	}

	public update(props: PlayEditorSurfaceProps): void {
		this.props = props;
		this.render();
	}

	public destroy(): void {
		this.clearPress();
		this.dragBaseLineRects = null;
		this.paletteRenderer = null;
		this.editorCanvasRenderer = null;
		this.wheelOverlayRenderer = null;
		this.wheelInteraction = null;
		this.dragDropGeometry = null;
		this.blockMutation = null;
		this.blockTree = null;
		this.paletteDerivation = null;
		this.literalParser = null;
		this.variableValidation = null;
		this.dropPlacement = null;
		this.dragInteraction = null;
		this.cleanupFns.forEach((cleanup) => cleanup());
		this.cleanupFns = [];
		this.host.innerHTML = "";
	}

	private emitStatus(message: string): void {
		this.props.onStatus?.(message);
	}

	private isLocked(): boolean {
		return this.props.disabled === true;
	}

	private getGeometryService(): DragDropGeometryService {
		if (!this.dragDropGeometry) {
			this.dragDropGeometry = new DragDropGeometryService(
				this.editorLane,
				this.lineRowRefs,
				this.slotRefs,
				this.dragState,
				this.dragBaseLineRects,
				(key) => this.parseSlotKey(key),
				(key) => this.canUseSlotTarget(key),
				(blocks, id) => this.getTreeService().findBlockById(blocks, id),
				(block) => this.isControlBlock(block),
				() => this.getBlocks()
			);
		}
		return this.dragDropGeometry;
	}

	private getMutationService(): BlockMutationService {
		if (!this.blockMutation) {
			this.blockMutation = new BlockMutationService();
		}
		return this.blockMutation;
	}

	private getTreeService(): BlockTreeService {
		if (!this.blockTree) {
			this.blockTree = new BlockTreeService();
		}
		return this.blockTree;
	}

	private getPaletteDerivationService(): PaletteDerivationService {
		if (!this.paletteDerivation) {
			this.paletteDerivation = new PaletteDerivationService();
		}
		return this.paletteDerivation;
	}

	private getLiteralParserService(): LiteralParserService {
		if (!this.literalParser) {
			this.literalParser = new LiteralParserService();
		}
		return this.literalParser;
	}

	private getVariableValidationService(): VariableValidationService {
		if (!this.variableValidation) {
			this.variableValidation = new VariableValidationService();
		}
		return this.variableValidation;
	}

	private getDropPlacementService(): DropPlacementService {
		if (!this.dropPlacement) {
			this.dropPlacement = new DropPlacementService({
				blockContainsId: (block, blockId) =>
					this.getTreeService().blockContainsId(block, blockId),
				findBlockById: (blocks, blockId) =>
					this.getTreeService().findBlockById(blocks, blockId),
				parseSlotKey: (slotKey) => this.parseSlotKey(slotKey),
				updateBlockById: (blocks, blockId, updater) =>
					this.updateBlockById(blocks, blockId, updater)
			});
		}
		return this.dropPlacement;
	}

	private getDragInteraction(): DragInteractionController {
		if (!this.dragInteraction) {
			const context: DragInteractionControllerContext = {
				isLocked: () => this.isLocked(),
				getBlocks: () => this.getBlocks(),
				getMaxBlocks: () => this.props.maxBlocks,
				getGeometryService: () => this.getGeometryService(),
				getPressState: () => this.pressState,
				setPressState: (pressState) => {
					this.pressState = pressState;
				},
				getDragState: () => this.dragState,
				setDragState: (dragState) => {
					this.dragState = dragState;
				},
				setDragBaseLineRects: (rects) => {
					this.dragBaseLineRects = rects;
				},
				closeWheel: () => this.closeWheel(),
				render: () => this.render(),
				emitStatus: (message) => this.emitStatus(message),
				findBlockById: (blocks, blockId) =>
					this.getTreeService().findBlockById(blocks, blockId),
				findInputOwnerId: (blocks, blockId) =>
					this.getTreeService().findInputOwnerId(blocks, blockId),
				resolveInsertedBlockFromDrag: (dragState, matcher) =>
					this.resolveInsertedBlockFromDrag(dragState, matcher),
				extractBlockFromTree: (blocks, blockId) =>
					this.extractBlockFromTree(blocks, blockId),
				canUseSlotTarget: (targetSlotKey) => this.canUseSlotTarget(targetSlotKey),
				applyDropDestination: (blocks, insertedBlock, placement) =>
					this.applyDropDestination(blocks, insertedBlock, placement),
				setBlocks: (nextBlocks) => this.setBlocks(nextBlocks)
			};
			this.dragInteraction = new DragInteractionController(context);
		}
		return this.dragInteraction;
	}

	private getPaletteRenderer(): PaletteRenderer {
		if (!this.paletteRenderer) {
			const context: PaletteRendererContext = {
				getPaletteBlocks: () => this.paletteBlocks,
				getIsActiveRoutineFunction: () => this.isActiveRoutineFunction(),
				getIsLocked: () => this.isLocked(),
				getPaletteGroupId: (block) => this.getPaletteGroupId(block),
				getPaletteGroupLabel: (groupId) => this.getPaletteGroupLabel(groupId),
				getDefinitionDescriptor: (block) => this.getDefinitionDescriptor(block),
				getBlocksHeadingText: () => t("editor.blocks"),
				getDragHintText: () => t("editor.dragHint"),
				applyBlockColor: (element, color) => this.applyBlockColor(element, color),
				onStartPaletteDrag: (event, block, rect) => this.startPaletteDrag(event, block, rect)
			};
			this.paletteRenderer = new PaletteRenderer(context);
		}
		return this.paletteRenderer;
	}

	private getEditorCanvasRenderer(): EditorCanvasRenderer {
		if (!this.editorCanvasRenderer) {
			const context: EditorCanvasRendererContext = {
				getIsLocked: () => this.isLocked(),
				getIsActiveRoutineFunction: () => this.isActiveRoutineFunction(),
				getDragState: () => this.dragState,
				getBlocks: () => this.getBlocks(),
				getInlinePreviewBlocks: () => this.buildInlinePreviewBlocks(),
				setEditorLane: (lane) => {
					this.editorLane = lane;
				},
				resetRenderRefs: () => {
					this.blockRefs.clear();
					this.lineRowRefs.clear();
					this.slotRefs.clear();
					this.branchLineRefs = [];
				},
				setLineRowRef: (id, row) => this.lineRowRefs.set(id, row),
				setBlockRef: (id, element) => this.blockRefs.set(id, element),
				addBranchLineRef: (entry) => this.branchLineRefs.push(entry),
				blockContainsId: (block, blockId) =>
					this.getTreeService().blockContainsId(block, blockId),
				getHighlightedNodeId: () => this.props.highlightedNodeId,
				getBreakpointNodeIds: () => this.props.breakpointNodeIds ?? [],
				onToggleBreakpoint: (blockId) => this.props.onToggleBreakpoint?.(blockId),
				createBlockInstanceElement: (block, options) =>
					this.createBlockInstanceElement(block, options),
				startProgramPress: (event, block, rect) => this.startProgramPress(event, block, rect),
				setBlocks: (blocks) => this.setBlocks(blocks),
				removeBlockById: (blocks, blockId) => this.removeBlockById(blocks, blockId),
				closeWheel: () => this.closeWheel(),
				emitStatus: (message) => this.emitStatus(message),
				editValueBlock: (blockId, currentValue) => this.editValueBlock(blockId, currentValue),
				editVariableName: (blockId, currentName) => this.editVariableName(blockId, currentName),
				isControlBlock: (block) => this.isControlBlock(block),
				findBlockById: (blocks, blockId) =>
					this.getTreeService().findBlockById(blocks, blockId),
				buildPreviewDescriptor: () => this.buildPreviewDescriptor(),
				renderPreviewBlock: (descriptor) => this.renderPreviewBlock(descriptor),
				getPreviewBlockId: () => PREVIEW_BLOCK_ID
			};
			this.editorCanvasRenderer = new EditorCanvasRenderer(context);
		}
		return this.editorCanvasRenderer;
	}

	private getWheelInteraction(): WheelInteractionController {
		if (!this.wheelInteraction) {
			const context: WheelInteractionContext = {
				canShowDeclarationBindingWheel: (block) => this.canShowDeclarationBindingWheel(block),
				getAllowedOperations: () => this.props.allowedOperations,
				closeWheel: () => this.closeWheel(),
				rerender: () => this.render(),
				emitStatus: (message) => this.emitStatus(message),
				updateConditionalMode: (blockId, mode) => this.updateConditionalMode(blockId, mode),
				updateVariableOperationMode: (blockId, mode) =>
					this.updateVariableOperationMode(blockId, mode),
				updateDeclarationBindingKind: (blockId, bindingKind) =>
					this.updateDeclarationBindingKind(blockId, bindingKind),
				updateRoutineCallMode: (blockId, mode) => this.updateRoutineCallMode(blockId, mode),
				updateBlockOperation: (blockId, operation) => this.updateBlockOperation(blockId, operation)
			};
			this.wheelInteraction = new WheelInteractionController(context);
		}
		return this.wheelInteraction;
	}

	private getWheelOverlayRenderer(): WheelOverlayRenderer {
		if (!this.wheelOverlayRenderer) {
			this.wheelOverlayRenderer = new WheelOverlayRenderer();
		}
		return this.wheelOverlayRenderer;
	}

	private getBlocks(): EditorBlock[] {
		return projectDocumentToLegacyBlocks(this.props.value);
	}

	private getRoutineSignatures(): Record<string, RoutineSignature> {
		return analyzeDocumentRoutines(this.props.value);
	}

	private getActiveRoutineSignature(): RoutineSignature | null {
		return this.getRoutineSignatures()[this.props.value.activeRoutineId] ?? null;
	}

	private isActiveRoutineFunction(): boolean {
		return this.getActiveRoutineSignature()?.isFunction === true;
	}

	private isRootLevelBlock(blockId: string): boolean {
		return this.getBlocks().some((block) => block.id === blockId);
	}

	private canShowDeclarationBindingWheel(block: EditorBlock): boolean {
		return (
			block.kind === "var_declaration" &&
			!!this.getActiveRoutineSignature()?.isFunction &&
			this.isRootLevelBlock(block.id)
		);
	}

	private createSlotKey(ownerId: string, slotId: string): string {
		return `${ownerId}::${slotId}`;
	}

	private parseSlotKey(slotKey: string): { ownerId: string; slotId: string } {
		const separatorIndex = slotKey.indexOf("::");
		if (separatorIndex < 0) {
			return { ownerId: slotKey, slotId: "input" };
		}
		return {
			ownerId: slotKey.slice(0, separatorIndex),
			slotId: slotKey.slice(separatorIndex + 2)
		};
	}

	private updateBlockById(
		blocks: EditorBlock[],
		blockId: string,
		updater: (block: EditorBlock) => EditorBlock
	): EditorBlock[] {
		return this.getMutationService().updateBlockById(blocks, blockId, updater);
	}

	private removeNestedBlockById(blocks: EditorBlock[], blockId: string): EditorBlock[] {
		return this.getMutationService().removeNestedBlockById(blocks, blockId);
	}

	private removeBlockById(blocks: EditorBlock[], blockId: string): EditorBlock[] {
		return this.getMutationService().removeBlockById(blocks, blockId);
	}

	private extractBlockFromTree(
		blocks: EditorBlock[],
		blockId: string
	): { nextBlocks: EditorBlock[]; block: EditorBlock | null } {
		return this.getMutationService().extractBlockFromTree(blocks, blockId);
	}

	private setBlocks(nextBlocks: EditorBlock[]): void {
		this.props.onChange(
			createEditorDocumentFromLegacyBlocks(nextBlocks, this.props.value)
		);
	}

	private isVariableNameTaken(name: string, excludeDeclarationId?: string): boolean {
		return this.getVariableValidationService().isVariableNameTaken(
			this.getBlocks(),
			name,
			excludeDeclarationId
		);
	}

	private async requestTextInput(options: {
		title: string;
		initialValue?: string;
		validate?: (value: string) => string | null;
	}): Promise<string | null> {
		if (this.props.onRequestTextInput) {
			return this.props.onRequestTextInput(options);
		}

		return window.prompt(options.title, options.initialValue ?? "") ?? null;
	}

	private async showAlert(options: { title?: string; message: string }): Promise<void> {
		if (this.props.onShowAlert) {
			await this.props.onShowAlert(options);
			return;
		}

		window.alert(options.message);
	}

	private async promptForVariableName(currentName?: string, excludeDeclarationId?: string): Promise<string | null> {
		while (true) {
			const nextName = await this.requestTextInput({
				title: t("editor.variableNamePrompt"),
				initialValue: currentName?.trim() || "variable"
			});
			if (nextName === null) {
				return null;
			}

			const normalizedName = nextName.trim();
			if (!normalizedName) {
				await this.showAlert({
					title: t("common.notice"),
					message: t("messages.variableNameEmpty")
				});
				continue;
			}

			if (this.isVariableNameTaken(normalizedName, excludeDeclarationId)) {
				await this.showAlert({
					title: t("common.notice"),
					message: t("messages.variableNameExists", { name: normalizedName })
				});
				continue;
			}

			return normalizedName;
		}
	}

	private async promptForValueText(currentValue?: DataValue | null): Promise<string | null> {
		const nextValue = await this.requestTextInput({
			title: t("editor.valuePrompt"),
			initialValue: String(currentValue ?? "item")
		});
		if (nextValue === null) {
			return null;
		}

		const normalizedValue = nextValue.trim();
		if (!normalizedValue) {
			await this.showAlert({
				title: t("common.notice"),
				message: t("messages.valueEmpty")
			});
			return this.promptForValueText(currentValue);
		}

		return normalizedValue;
	}

	private parseLiteralInput(rawValue: string): DataValue {
		return this.getLiteralParserService().parseLiteralInput(rawValue);
	}

	private isControlBlock(block: EditorBlock | null | undefined): block is ControlEditorBlock {
		return !!block && (block.kind === "conditional" || block.kind === "while");
	}

	private getControlLabel(block: Pick<EditorBlock, "kind">): string {
		return block.kind === "while" ? t("blocks.while").toLowerCase() : t("blocks.if").toLowerCase();
	}

	private async createBlockFromPalette(block: PaletteBlock): Promise<EditorBlock | null> {
		if (block.kind === "conditional") {
			return createConditionalBlock(block.color, block.conditionalMode ?? "if");
		}

		if (block.kind === "while") {
			return createWhileBlock(block.color);
		}

		if (block.kind === "var_declaration") {
			const variableName = await this.promptForVariableName(block.variableName ?? "variable");
			if (!variableName) {
				this.emitStatus("Variable declaration cancelled.");
				return null;
			}
			return createVariableDeclarationBlock(block.color, variableName, block.bindingKind ?? "declare");
		}

		if (block.kind === "var_operation" && block.variableSourceId && block.variableName) {
			return createVariableOperationBlock(
				block.variableSourceId,
				block.variableName,
				block.color,
				block.variableOperationMode ?? "value"
			);
		}

		if (block.kind === "value") {
			const literalValue = await this.promptForValueText(block.literalValue ?? "item");
			if (literalValue === null) {
				this.emitStatus("Value block cancelled.");
				return null;
			}
			return createValueBlock(this.parseLiteralInput(literalValue));
		}

		if (block.kind === "return") {
			return createReturnBlock(block.color);
		}

		if (block.kind === "routine_call" && block.routineId && block.routineName) {
			return createRoutineCallBlock(
				block.routineId,
				block.routineName,
				block.routineReturnKind ?? "none",
				block.routineParamNames ?? [],
				block.color,
				block.routineCallMode ?? "call"
			);
		}

		if (block.kind === "routine_value" && block.routineId && block.routineName) {
			return createRoutineValueBlock(block.routineId, block.routineName, block.color);
		}

		if (
			block.kind === "routine_member" &&
			block.routineId &&
			block.routineName &&
			block.routineMemberName &&
			block.routineMemberKind
		) {
			return createRoutineMemberBlock({
				routineId: block.routineId,
				routineName: block.routineName,
				memberName: block.routineMemberName,
				memberKind: block.routineMemberKind,
				outputType: block.outputType,
				color: block.color,
				memberRoutineId: block.routineMemberRoutineId,
				memberRoutineName: block.routineMemberRoutineName,
				routineReturnKind: block.routineReturnKind,
				routineParamNames: block.routineParamNames,
				routineCallMode: block.routineCallMode
			});
		}

		return createEditorBlock(block.structureId!, block.structureKind!, block.color);
	}

	private createPreviewBlockFromDragState(): EditorBlock | null {
		if (!this.dragState) {
			return null;
		}

		let previewBlock: EditorBlock | null = null;

		if (this.dragState.source === "program" && this.dragState.blockId) {
			const draggingBlock = this.getTreeService().findBlockById(this.getBlocks(), this.dragState.blockId);
			previewBlock = draggingBlock ? structuredClone(draggingBlock) : null;
		} else {
			switch (this.dragState.blockKind) {
				case "conditional":
					previewBlock = createConditionalBlock(this.dragState.color, "if");
					break;
				case "while":
					previewBlock = createWhileBlock(this.dragState.color);
					break;
				case "var_declaration":
					previewBlock = createVariableDeclarationBlock(
						this.dragState.color,
						this.dragState.variableName?.trim() || "variable",
						this.dragState.bindingKind ?? "declare"
					);
					break;
				case "var_operation":
					previewBlock =
						this.dragState.variableSourceId && this.dragState.variableName
							? createVariableOperationBlock(
								this.dragState.variableSourceId,
								this.dragState.variableName,
								this.dragState.color,
								this.dragState.variableOperationMode ?? "value"
							)
							: null;
					break;
				case "value":
					previewBlock =
						typeof this.dragState.literalValue === "boolean"
							? createBooleanValueBlock(this.dragState.literalValue)
							: createValueBlock(this.dragState.literalValue ?? "item");
					break;
				case "structure":
					previewBlock =
						this.dragState.structureId && this.dragState.structureKind
							? createEditorBlock(
								this.dragState.structureId,
								this.dragState.structureKind,
								this.dragState.color
							)
							: null;
					break;
				case "return":
					previewBlock = createReturnBlock(this.dragState.color);
					break;
				case "routine_call":
					previewBlock =
						this.dragState.routineId && this.dragState.routineName
							? createRoutineCallBlock(
								this.dragState.routineId,
								this.dragState.routineName,
								this.dragState.routineReturnKind ?? "none",
								this.dragState.routineParamNames ?? [],
								this.dragState.color,
								this.dragState.routineCallMode ?? "call"
							)
							: null;
					break;
				case "routine_value":
					previewBlock =
						this.dragState.routineId && this.dragState.routineName
							? createRoutineValueBlock(
								this.dragState.routineId,
								this.dragState.routineName,
								this.dragState.color
							)
							: null;
					break;
				case "routine_member":
					previewBlock =
						this.dragState.routineId &&
							this.dragState.routineName &&
							this.dragState.routineMemberName &&
							this.dragState.routineMemberKind
							? createRoutineMemberBlock({
								routineId: this.dragState.routineId,
								routineName: this.dragState.routineName,
								memberName: this.dragState.routineMemberName,
								memberKind: this.dragState.routineMemberKind,
								outputType:
									this.dragState.routineMemberKind === "function"
										? this.dragState.routineReturnKind === "boolean"
											? "boolean"
											: this.dragState.routineReturnKind === "value"
												? "value"
												: "none"
										: "value",
								color: this.dragState.color,
								memberRoutineId: this.dragState.routineMemberRoutineId,
								memberRoutineName: this.dragState.routineMemberRoutineName,
								routineReturnKind: this.dragState.routineReturnKind,
								routineParamNames: this.dragState.routineParamNames,
								routineCallMode: this.dragState.routineCallMode
							})
							: null;
					break;
				default:
					previewBlock = null;
			}
		}

		return previewBlock
			? {
				...previewBlock,
				id: PREVIEW_BLOCK_ID
			}
			: null;
	}

	private applyResolvedPlacement(
		blocks: EditorBlock[],
		placement: ResolvedDropPlacement,
		insertedBlock: EditorBlock
	): EditorBlock[] {
		return this.getDropPlacementService().applyResolvedPlacement(blocks, placement, insertedBlock);
	}

	private buildFallbackPaletteBlock(dragState: EditorDragState): PaletteBlock {
		const routineReturnKind = dragState.routineReturnKind ?? "none";
		return {
			id: "fallback",
			kind: dragState.blockKind ?? "value",
			color: dragState.color,
			structureId: dragState.structureId,
			structureKind: dragState.structureKind,
			outputType:
				dragState.blockKind === "value"
					? "value"
					: dragState.blockKind === "routine_call"
						? dragState.routineCallMode === "reference"
							? "value"
							: routineReturnKind
						: dragState.blockKind === "routine_value"
							? "value"
							: dragState.blockKind === "routine_member"
								? dragState.routineMemberKind === "function"
									? dragState.routineCallMode === "reference"
										? "value"
										: routineReturnKind
									: "value"
								: "none",
			valueType:
				dragState.blockKind === "value"
					? "text"
					: dragState.blockKind === "routine_call" && routineReturnKind === "boolean"
						? "boolean"
						: dragState.blockKind === "routine_call" && routineReturnKind === "value"
							? "text"
							: dragState.blockKind === "routine_value" || dragState.blockKind === "routine_member"
								? "text"
								: null,
			literalValue: dragState.literalValue ?? null,
			conditionalMode: "if",
			variableName: dragState.variableName,
			variableSourceId: dragState.variableSourceId,
			variableOperationMode: dragState.variableOperationMode,
			bindingKind: dragState.bindingKind,
			routineId: dragState.routineId,
			routineName: dragState.routineName,
			routineReturnKind,
			routineParamNames: dragState.routineParamNames,
			routineCallMode: dragState.routineCallMode,
			routineExportKind: dragState.routineExportKind,
			routineMemberName: dragState.routineMemberName,
			routineMemberKind: dragState.routineMemberKind,
			routineMemberRoutineId: dragState.routineMemberRoutineId,
			routineMemberRoutineName: dragState.routineMemberRoutineName,
			label: dragState.routineName ?? dragState.structureId ?? "Block"
		};
	}

	private async resolveInsertedBlockFromDrag(
		dragState: EditorDragState,
		matchesPaletteBlock: (block: PaletteBlock) => boolean
	): Promise<EditorBlock | null> {
		if (dragState.source === "palette") {
			return this.createBlockFromPalette(
				this.paletteBlocks.find(matchesPaletteBlock) ?? this.buildFallbackPaletteBlock(dragState)
			);
		}

		if (dragState.blockId) {
			return this.extractBlockFromTree(this.getBlocks(), dragState.blockId).block;
		}

		return null;
	}

	private resolveBaseBlocksForDrop(): EditorBlock[] {
		return this.getDropPlacementService().resolveBaseBlocksForDrop(
			this.dragState,
			this.getBlocks(),
			(blocks, blockId) => this.extractBlockFromTree(blocks, blockId)
		);
	}

	private canUseSlotTarget(targetSlotKey: string): boolean {
		return this.getDropPlacementService().canUseSlotTarget(
			targetSlotKey,
			this.dragState,
			this.getBlocks()
		);
	}

	private applyDropDestination(
		baseBlocks: EditorBlock[],
		insertedBlock: EditorBlock,
		options: {
			slotTargetId?: string | null;
			visualLineIndex?: number;
			chosenIndent?: number;
		}
	): { nextBlocks: EditorBlock[]; status: string } {
		return this.getDropPlacementService().applyDropDestination(
			baseBlocks,
			insertedBlock,
			options,
			(blocks, lineLayouts, visualLineIndex, chosenIndent) =>
				this.getGeometryService().resolveDropPlacement(
					blocks,
					lineLayouts,
					visualLineIndex,
					chosenIndent
				)
		);
	}

	private buildInlinePreviewBlocks(): EditorBlock[] | null {
		if (!this.dragState || this.dragState.slotTargetKey || !this.dragState.isOverEditor) {
			return null;
		}

		const previewBlock = this.createPreviewBlockFromDragState();
		if (!previewBlock) {
			return null;
		}

		const baseBlocks = this.resolveBaseBlocksForDrop();
		const baseLineLayouts = buildEditorLineLayout(baseBlocks);
		const placement = this.getGeometryService().resolveDropPlacement(
			baseBlocks,
			baseLineLayouts,
			this.dragState.visualLineIndex,
			this.dragState.chosenIndent
		);

		return this.applyResolvedPlacement(baseBlocks, placement, previewBlock);
	}

	private applyBlockColor(element: HTMLElement, color?: string): void {
		if (!color) {
			return;
		}

		element.style.backgroundColor = color;
		element.style.borderColor = color;
	}

	private derivePaletteBlocks(structures: StructureSnapshot[]): PaletteBlock[] {
		return this.getPaletteDerivationService().derivePaletteBlocks(
			structures,
			this.getBlocks(),
			this.props.value
		);
	}

	private startPaletteDrag(event: PointerEvent, block: PaletteBlock, rect: DOMRect): void {
		this.getDragInteraction().startPaletteDrag(event, block, rect);
	}

	private startProgramPress(
		event: PointerEvent,
		block: EditorBlock,
		rect: DOMRect
	): void {
		this.getDragInteraction().startProgramPress(event, block, rect);
	}

	private openWheel(blockId: string): void {
		if (this.isLocked()) {
			return;
		}
		const element = this.blockRefs.get(blockId);
		const block = this.getTreeService().findBlockById(this.getBlocks(), blockId);
		if (!element || !block) {
			return;
		}

		const rect = element.getBoundingClientRect();
		this.wheelState = {
			blockId,
			x: rect.right + 12,
			y: rect.top + rect.height / 2
		};
		this.render();
	}

	private closeWheel(): void {
		this.wheelState = null;
	}

	private clearPress(): void {
		this.getDragInteraction().clearPress();
	}

	private handlePointerMove = (event: PointerEvent) => {
		void this.getDragInteraction().handlePointerMove(event);
	};

	private handlePointerUp = async (event: PointerEvent) => {
		await this.getDragInteraction().handlePointerUp(event);
	};

	private attachGlobalListeners(): void {
		window.addEventListener("pointermove", this.handlePointerMove);
		window.addEventListener("pointerup", this.handlePointerUp);
		this.cleanupFns.push(() => {
			window.removeEventListener("pointermove", this.handlePointerMove);
			window.removeEventListener("pointerup", this.handlePointerUp);
		});
	}

	private attachHostListeners(): void {
		const cleanup = this.hostInteraction.attach(this.host, {
			isLocked: () => this.isLocked(),
			hasOpenWheel: () => this.wheelState !== null,
			closeWheel: () => this.closeWheel(),
			rerender: () => this.render()
		});
		this.cleanupFns.push(cleanup);
	}

	private updateBlockOperation(blockId: string, operation: EditorBlock["operation"]): void {
		if (this.isLocked()) {
			return;
		}
		this.setBlocks(
			this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
				...currentBlock,
				operation,
				outputType:
					currentBlock.kind === "value"
						? "value"
						: operation === "POP" ||
							operation === "DEQUEUE" ||
							operation === "REMOVE_FIRST" ||
							operation === "REMOVE_LAST" ||
							operation === "GET_HEAD" ||
							operation === "GET_TAIL" ||
							operation === "SIZE"
							? "value"
							: "none",
				inputBlock:
					operation === "PUSH" ||
						operation === "ENQUEUE" ||
						operation === "APPEND" ||
						operation === "PREPEND"
						? currentBlock.inputBlock ?? null
						: null
			}))
		);
	}

	private updateConditionalMode(blockId: string, mode: ConditionalMode): void {
		if (this.isLocked()) {
			return;
		}

		this.setBlocks(
			this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
				...currentBlock,
				conditionalMode: mode,
				alternateBodyBlocks: mode === "if-else" ? currentBlock.alternateBodyBlocks ?? [] : []
			}))
		);
	}

	private updateVariableOperationMode(blockId: string, mode: VariableOperationMode): void {
		if (this.isLocked()) {
			return;
		}

		this.setBlocks(
			this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
				...currentBlock,
				variableOperationMode: mode,
				inputBlock: mode === "value" ? null : currentBlock.inputBlock ?? null
			}))
		);
	}

	private updateDeclarationBindingKind(blockId: string, bindingKind: RoutineBindingKind): void {
		if (this.isLocked()) {
			return;
		}

		this.setBlocks(
			this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
				...currentBlock,
				bindingKind,
				color: bindingKind === "expect" ? FUNCTION_BLUE : "#b7e4c7"
			}))
		);
	}

	private updateRoutineCallMode(blockId: string, mode: NonNullable<EditorBlock["routineCallMode"]>): void {
		if (this.isLocked()) {
			return;
		}

		this.setBlocks(
			this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => {
				if (currentBlock.kind === "routine_call") {
					return {
						...currentBlock,
						routineCallMode: mode,
						outputType: mode === "reference" ? "value" : (currentBlock.routineReturnKind ?? "none"),
						valueType:
							mode === "reference"
								? "text"
								: currentBlock.routineReturnKind === "boolean"
									? "boolean"
									: currentBlock.routineReturnKind === "value"
										? "text"
										: null,
						inputBlocks: mode === "reference" ? [] : (currentBlock.routineParamNames ?? []).map(() => null)
					};
				}

				if (currentBlock.kind === "routine_member" && currentBlock.routineMemberKind === "function") {
					return {
						...currentBlock,
						routineCallMode: mode,
						outputType: mode === "reference" ? "value" : (currentBlock.routineReturnKind ?? "none"),
						valueType:
							mode === "reference"
								? "text"
								: currentBlock.routineReturnKind === "boolean"
									? "boolean"
									: currentBlock.routineReturnKind === "value"
										? "text"
										: null,
						inputBlocks: mode === "reference" ? [] : (currentBlock.routineParamNames ?? []).map(() => null)
					};
				}

				return currentBlock;
			})
		);
	}

	private async editVariableName(blockId: string, currentName: string | undefined): Promise<void> {
		if (this.isLocked()) {
			return;
		}

		const normalizedName = await this.promptForVariableName(currentName, blockId);
		if (!normalizedName) {
			return;
		}
		this.setBlocks(
			this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
				...currentBlock,
				variableName: normalizedName
			}))
		);
		this.emitStatus("Variable renamed.");
	}

	private clearSlot(slotKey: string): void {
		if (this.isLocked()) {
			return;
		}
		const { ownerId, slotId } = this.parseSlotKey(slotKey);
		this.setBlocks(
			this.updateBlockById(this.getBlocks(), ownerId, (currentBlock) =>
				setBlockSlotBlock(currentBlock, slotId, null)
			)
		);
	}

	private assignLiteralIntoSlot(
		slotKey: string,
		rawValue: string,
		expectedType: "value" | "boolean" | "any"
	): void {
		if (this.isLocked()) {
			return;
		}

		const trimmed = rawValue.trim();
		if (!trimmed) {
			return;
		}

		const parsedValue = this.parseLiteralInput(trimmed);
		const { ownerId, slotId } = this.parseSlotKey(slotKey);

		this.setBlocks(
			this.updateBlockById(this.getBlocks(), ownerId, (currentBlock) =>
				setBlockSlotBlock(
					currentBlock,
					slotId,
					expectedType === "boolean" && typeof parsedValue === "boolean"
						? createBooleanValueBlock(parsedValue)
						: createValueBlock(parsedValue)
				)
			)
		);
		this.emitStatus("Value inserted.");
	}

	private async editValueBlock(blockId: string, currentValue: DataValue | null | undefined): Promise<void> {
		if (this.isLocked()) {
			return;
		}
		const rawValue = await this.promptForValueText(currentValue);
		if (rawValue === null) {
			return;
		}
		const normalizedValue = this.parseLiteralInput(rawValue);

		this.setBlocks(
			this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
				...currentBlock,
				literalValue: normalizedValue,
				outputType: typeof normalizedValue === "boolean" ? "boolean" : "value",
				valueType: typeof normalizedValue === "boolean" ? "boolean" : "text"
			}))
		);
		this.emitStatus("Value updated.");
	}

	private buildPreviewDescriptor(): PreviewDescriptor | null {
		if (!this.dragState) {
			return null;
		}

		const getDeclarationLabel = (bindingKind?: RoutineBindingKind) =>
			bindingKind === "expect" ? "expect" : "declare";

		const getPreviewChip = (
			blockKind: EditorBlock["kind"],
			options: {
				structureId?: string;
				variableName?: string;
				bindingKind?: RoutineBindingKind;
			}
		): string | undefined => {
			const staticChip = getStaticChip(blockKind);
			if (staticChip) return staticChip;

			// Handle dynamic chips based on context
			if (blockKind === "structure") return options.structureId;
			if (blockKind === "var_declaration") return options.bindingKind === "expect" ? "EXP" : "VAR";
			if (blockKind === "var_operation") return options.variableName?.slice(0, 3).toUpperCase() ?? "VAR";

			return undefined;
		};

		const draggingBlock =
			this.dragState.source === "program" && this.dragState.blockId
				? this.getTreeService().findBlockById(this.getBlocks(), this.dragState.blockId)
				: null;

		if (draggingBlock) {
			return {
				label:
					this.isControlBlock(draggingBlock)
						? this.getControlLabel(draggingBlock)
						: draggingBlock.kind === "var_declaration"
							? getDeclarationLabel(draggingBlock.bindingKind)
							: describeBlock(draggingBlock),
				chip: getPreviewChip(draggingBlock.kind, {
					structureId: draggingBlock.structureId,
					variableName: draggingBlock.variableName,
					bindingKind: draggingBlock.bindingKind
				}),
				color: draggingBlock.color,
				operation: draggingBlock.operation,
				pending:
					(draggingBlock.kind === "structure" && !draggingBlock.operation) ||
					this.isControlBlock(draggingBlock),
				control: this.isControlBlock(draggingBlock),
				variable: draggingBlock.kind === "var_declaration" || draggingBlock.kind === "var_operation"
			};
		}

		return {
			label:
				this.dragState.blockKind === "conditional" || this.dragState.blockKind === "while"
					? this.getControlLabel({ kind: this.dragState.blockKind } as Pick<EditorBlock, "kind">)
					: this.dragState.blockKind === "var_declaration"
						? getDeclarationLabel(this.dragState.bindingKind)
						: this.dragState.blockKind === "return"
							? "return"
							: this.dragState.blockKind === "routine_call"
								? this.dragState.routineCallMode === "reference"
									? this.dragState.routineName ?? "function"
									: `${this.dragState.routineName ?? "function"}()`
								: this.dragState.blockKind === "routine_value"
									? this.dragState.routineName ?? "object"
									: this.dragState.blockKind === "routine_member"
										? this.dragState.routineMemberKind === "function" &&
											this.dragState.routineCallMode !== "reference"
											? `${this.dragState.routineName ?? "object"}.${this.dragState.routineMemberName ?? "member"
											}()`
											: `${this.dragState.routineName ?? "object"}.${this.dragState.routineMemberName ?? "member"
											}`
										: this.dragState.blockKind === "var_operation"
											? this.dragState.variableName ?? "variable"
											: this.dragState.blockKind === "value"
												? "value"
												: "Data Structure",
			chip: getPreviewChip(this.dragState.blockKind, {
				structureId: this.dragState.structureId,
				variableName: this.dragState.variableName,
				bindingKind: this.dragState.bindingKind
			}),
			color: this.dragState.color,
			operation: null,
			pending:
				this.dragState.blockKind === "conditional" ||
				this.dragState.blockKind === "while" ||
				this.dragState.blockKind === "structure",
			control: this.dragState.blockKind === "conditional" || this.dragState.blockKind === "while",
			variable: this.dragState.blockKind === "var_declaration" || this.dragState.blockKind === "var_operation"
		};
	}

	private renderPreviewBlock(descriptor: PreviewDescriptor): HTMLElement {
		const element = document.createElement("div");
		element.className = `editor-block sequence editor-block-preview ${blockColorClass(descriptor.operation)}${descriptor.pending ? " pending" : ""
			}${descriptor.control ? " conditional-block" : ""}${descriptor.variable ? " variable-block" : ""}`;
		this.applyBlockColor(element, descriptor.color);

		if (descriptor.chip) {
			const chip = document.createElement("span");
			chip.className = "block-chip";
			chip.textContent = descriptor.chip;
			element.appendChild(chip);
		}

		const title = document.createElement("strong");
		title.textContent = descriptor.label;
		element.appendChild(title);
		return element;
	}

	private createStaticBlockHandle(className: string): HTMLSpanElement {
		const handle = document.createElement("span");
		handle.className = className;
		handle.innerHTML = `<span class="editor-block-handle-arrow">▸</span>`;
		return handle;
	}

	private appendBlockInstanceContent(
		block: EditorBlock,
		main: HTMLElement,
		options: {
			ghost?: boolean;
			nested?: boolean;
		} = {}
	): void {
		const label = document.createElement("strong");
		label.className = "editor-block-instance-label";
		label.textContent = this.isControlBlock(block)
			? this.getControlLabel(block)
			: block.kind === "var_declaration"
				? block.bindingKind === "expect"
					? "expect"
					: "declare"
				: describeBlock(block);

		if (block.kind === "value") {
			if (options.ghost) {
				const valuePill = document.createElement("span");
				valuePill.className = "editor-value-pill";
				valuePill.textContent = String(block.literalValue ?? "item");
				main.appendChild(valuePill);
			} else {
				const valueButton = document.createElement("button");
				valueButton.type = "button";
				valueButton.className = "editor-value-pill";
				valueButton.textContent = String(block.literalValue ?? "item");
				valueButton.addEventListener("pointerdown", (event) => {
					event.stopPropagation();
				});
				valueButton.addEventListener("click", (event) => {
					event.stopPropagation();
					void this.editValueBlock(block.id, block.literalValue);
				});
				main.appendChild(valueButton);
			}
		} else {
			main.appendChild(label);
		}

		if (block.kind === "var_declaration") {
			if (options.ghost) {
				const namePill = document.createElement("span");
				namePill.className = "editor-variable-name";
				namePill.textContent = block.variableName?.trim() || "variable";
				main.appendChild(namePill);
			} else {
				const nameButton = document.createElement("button");
				nameButton.type = "button";
				nameButton.className = "editor-variable-name";
				nameButton.textContent = block.variableName?.trim() || "variable";
				nameButton.addEventListener("pointerdown", (event) => {
					event.stopPropagation();
				});
				nameButton.addEventListener("click", (event) => {
					event.stopPropagation();
					void this.editVariableName(block.id, block.variableName);
				});
				main.appendChild(nameButton);
			}
		}

		getBlockInputSlots(block).forEach((slotDefinition) => {
			main.appendChild(
				options.ghost
					? this.renderGhostInputSlot(block, slotDefinition)
					: this.renderInlineInputSlot(block, slotDefinition)
			);
		});
	}

	private createBlockInstanceElement(
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
		const isPendingStructure = (block.kind === "structure" && !block.operation) || this.isControlBlock(block);
		const element = document.createElement("div");
		element.className = `editor-block sequence editor-block-instance ${nested ? "editor-block-instance-nested " : ""
			}${blockColorClass(block.operation)}${isPendingStructure ? " pending" : ""}${getBlockInputSlots(block).length > 0 ? " has-input-slot" : ""
			}${this.isControlBlock(block) ? " conditional-block" : ""}${block.kind === "var_declaration" || block.kind === "var_operation" ? " variable-block" : ""
			}${nested && getOutputType(block) !== "value" ? " invalid" : ""}${preview ? " editor-block-preview" : ""}${ghost ? " drag-ghost-block-instance" : ""
			}`.trim();
		this.applyBlockColor(element, block.color);

		const main = document.createElement("div");
		main.className = "editor-block-instance-main";
		this.appendBlockInstanceContent(block, main, { ghost, nested });
		element.appendChild(main);

		if (
			block.kind === "structure" ||
			block.kind === "conditional" ||
			block.kind === "var_operation" ||
			block.kind === "routine_call" ||
			(block.kind === "routine_member" && block.routineMemberKind === "function") ||
			this.canShowDeclarationBindingWheel(block)
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
					if (this.isLocked()) {
						handle.disabled = true;
					}
					element.appendChild(handle);
				}
			}
		}

		return element;
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

	private renderGhostBlockInstance(block: EditorBlock, nested = false): HTMLElement {
		return this.createBlockInstanceElement(block, { nested, ghost: true });
	}

	private renderInlineInputSlot(block: EditorBlock, inputSlot: EditorInputSlotDefinition): HTMLDivElement {
		const slot = document.createElement("div");
		slot.className = "editor-block-instance-cavity";
		slot.dataset.ownerBlockId = block.id;
		slot.dataset.slotId = inputSlot.id;
		const slotKey = this.createSlotKey(block.id, inputSlot.id);
		if (block.color) {
			slot.style.borderColor = block.color;
		}
		if (this.dragState?.slotTargetKey === slotKey) {
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
					this.assignLiteralIntoSlot(slotKey, textInput.value, inputSlot.expectedType);
				} else if (event.key === "Escape") {
					textInput.value = "";
					textInput.blur();
				}
			});
			textInput.addEventListener("blur", () => {
				this.assignLiteralIntoSlot(slotKey, textInput.value, inputSlot.expectedType);
			});
			slot.appendChild(textInput);
		}
		slot.addEventListener("pointerdown", (event) => {
			event.stopPropagation();
		});
		slot.addEventListener("contextmenu", (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.clearSlot(slotKey);
			this.emitStatus("Slot cleared.");
		});
		this.slotRefs.set(slotKey, slot);
		return slot;
	}

	private createInlineBlockHandle(block: EditorBlock, className: string): HTMLButtonElement | null {
		if (
			block.kind !== "structure" &&
			block.kind !== "conditional" &&
			block.kind !== "var_operation" &&
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
			if (this.wheelState?.blockId === block.id) {
				this.closeWheel();
				this.render();
				return;
			}
			this.openWheel(block.id);
		});
		return handle;
	}

	private renderInsertedBlock(block: EditorBlock): HTMLElement {
		const nested = this.createBlockInstanceElement(block, { nested: true });

		nested.addEventListener("pointerdown", (event) => {
			const target = event.target as HTMLElement | null;
			const cavity = target?.closest(".editor-block-instance-cavity") as HTMLElement | null;
			if (cavity?.dataset.ownerBlockId === block.id) {
				return;
			}
			const rect = nested.getBoundingClientRect();
			this.startProgramPress(event, block, rect);
		});
		nested.addEventListener("contextmenu", (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.setBlocks(this.removeBlockById(this.getBlocks(), block.id));
			this.closeWheel();
			this.emitStatus("Block removed.");
		});
		if (block.kind === "value") {
			nested.addEventListener("dblclick", (event) => {
				event.stopPropagation();
				void this.editValueBlock(block.id, block.literalValue);
			});
		} else if (block.kind === "var_declaration") {
			nested.addEventListener("dblclick", (event) => {
				event.stopPropagation();
				void this.editVariableName(block.id, block.variableName);
			});
		}

		this.blockRefs.set(block.id, nested as unknown as HTMLDivElement);
		return nested;
	}

	private getDefinitionDescriptor(block: PaletteBlock): { chip?: string; label: string } {
		if (block.kind === "structure") {
			return {
				chip: block.structureId,
				label: t("structures.dataStructure")
			};
		}

		if (block.kind === "routine_call") {
			return {
				chip: "FN",
				label:
					block.routineCallMode === "reference"
						? (block.routineName ?? t("blocks.function"))
						: `${block.routineName ?? t("blocks.function")}()`
			};
		}

		if (block.kind === "routine_value") {
			return {
				chip: "OBJ",
				label: block.routineName ?? t("blocks.function")
			};
		}

		if (block.kind === "routine_member") {
			return {
				chip: block.routineMemberKind === "function" ? "MF" : "M",
				label:
					block.routineMemberKind === "function" && block.routineCallMode !== "reference"
						? `${block.routineName ?? "object"}.${block.routineMemberName ?? "member"}()`
						: `${block.routineName ?? "object"}.${block.routineMemberName ?? "member"}`
			};
		}

		if (block.kind === "var_operation") {
			return {
				chip: block.variableName?.slice(0, 3).toUpperCase() ?? "VAR",
				label: block.variableName ?? t("blocks.variable")
			};
		}

		const staticChip = getStaticChip(block.kind);
		return {
			chip: staticChip,
			label: t(getLabelI18nKey(block.kind))
		};
	}

	private getPaletteGroupId(block: PaletteBlock): PaletteGroupId {
		return getPaletteGroup(block.kind);
	}

	private getPaletteGroupLabel(groupId: PaletteGroupId): string {
		switch (groupId) {
			case "structures":
				return t("editor.groupStructures");
			case "values":
				return t("editor.groupValues");
			case "logic":
				return t("editor.groupLogic");
			case "functions":
				return t("editor.groupFunctions");
			case "variables":
			default:
				return t("editor.groupVariables");
		}
	}

	private renderGhost(container: HTMLElement): void {
		if (!this.dragState) {
			return;
		}

		const ghost = document.createElement("div");
		ghost.className = "drag-ghost";
		ghost.style.transform = `translate(${this.dragState.x}px, ${this.dragState.y}px)`;
		const previewBlock = this.createPreviewBlockFromDragState();
		if (previewBlock) {
			ghost.appendChild(this.renderGhostBlockInstance(previewBlock));
		} else {
			const draggingBlock =
				this.dragState.source === "program" && this.dragState.blockId
					? this.getTreeService().findBlockById(this.getBlocks(), this.dragState.blockId)
					: null;
			const descriptor = draggingBlock
				? this.buildPreviewDescriptor()
				: this.buildPreviewDescriptor();
			if (descriptor) {
				ghost.appendChild(this.renderPreviewBlock(descriptor));
			}
		}
		container.appendChild(ghost);
	}

	private render(): void {
		this.paletteBlocks = this.derivePaletteBlocks(this.props.structures);
		this.host.innerHTML = "";

		const shell = document.createElement("div");
		shell.className = `scratch-shell${this.isLocked() ? " is-locked" : ""}`;

		const workbench = document.createElement("div");
		workbench.className = "scratch-workbench";

		const paletteRenderer = this.getPaletteRenderer();
		paletteRenderer.render(workbench);
		const canvasRenderer = this.getEditorCanvasRenderer();
		canvasRenderer.render(workbench);

		shell.appendChild(workbench);
		const wheelState = this.wheelState;
		if (wheelState) {
			const block = this.getTreeService().findBlockById(this.getBlocks(), wheelState.blockId);
			if (block) {
				const options = this.getWheelInteraction().getOptionsForBlock(block);
				if (options) {
					this.getWheelOverlayRenderer().render(shell, wheelState, options);
				}
			}
		}
		this.renderGhost(shell);

		this.host.appendChild(shell);
	}
}
