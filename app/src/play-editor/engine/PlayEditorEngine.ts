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
} from "../model";
import {
	calculateDropIndex,
	insertAt,
	moveItem,
	type DragGeometry
} from "../layout";
import { DragDropGeometryService } from "../DragDropGeometry";
import { BlockMutationService } from "../services/BlockMutationService";
import { BlockTreeService } from "../services/BlockTreeService";
import { PaletteDerivationService } from "../services/PaletteDerivationService";
import { DropPlacementService } from "../services/DropPlacementService";
import { PaletteDescriptorService } from "../services/PaletteDescriptorService";
import { DragPreviewBlockFactory } from "../services/DragPreviewBlockFactory";
import { LiteralParserService } from "../domain/LiteralParserService";
import { VariableValidationService } from "../domain/VariableValidationService";
import {
	DragInteractionController,
	type DragInteractionControllerContext
} from "../interaction/DragInteractionController";
import { PaletteRenderer, type PaletteRendererContext } from "../render/PaletteRenderer";
import {
	EditorCanvasRenderer,
	type EditorCanvasRendererContext
} from "../EditorCanvasRenderer";
import { WheelOverlayRenderer } from "../render/WheelOverlayRenderer";
import {
	BlockInstanceRenderer,
	type BlockInstanceRendererContext
} from "../render/BlockInstanceRenderer";
import {
	PreviewRenderer,
	type PreviewRendererContext
} from "../render/PreviewRenderer";
import {
	GhostRenderer,
	type GhostRendererContext
} from "../render/GhostRenderer";
import {
	WheelInteractionController,
	type WheelInteractionContext
} from "../interaction/WheelInteractionController";
import {
	HostInteractionController
} from "../interaction/HostInteractionController";
import {
	BlockActionController,
	type BlockActionContext
} from "../interaction/BlockActionController";
import { t } from "../../i18n-helpers";
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
} from "../operations";
import { buildEditorLineLayout } from "../model";
import { BLOCK_METADATA, type PaletteGroupId } from "../BlockMetadata";
import type {
	PendingPress,
	ResolvedDropPlacement,
	WheelState
} from "../contracts/types";
import { FUNCTION_BLUE, PREVIEW_BLOCK_ID } from "../contracts/constants";

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
	private paletteDescriptor: PaletteDescriptorService | null = null;
	private dragPreviewFactory: DragPreviewBlockFactory | null = null;
	private literalParser: LiteralParserService | null = null;
	private variableValidation: VariableValidationService | null = null;
	private dropPlacement: DropPlacementService | null = null;
	private dragInteraction: DragInteractionController | null = null;
	private paletteRenderer: PaletteRenderer | null = null;
	private editorCanvasRenderer: EditorCanvasRenderer | null = null;
	private wheelOverlayRenderer: WheelOverlayRenderer | null = null;
	private wheelInteraction: WheelInteractionController | null = null;
	private blockAction: BlockActionController | null = null;
	private blockInstanceRenderer: BlockInstanceRenderer | null = null;
	private previewRenderer: PreviewRenderer | null = null;
	private ghostRenderer: GhostRenderer | null = null;
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
		this.blockAction = null;
		this.dragDropGeometry = null;
		this.blockMutation = null;
		this.blockTree = null;
		this.paletteDerivation = null;
		this.paletteDescriptor = null;
		this.dragPreviewFactory = null;
		this.literalParser = null;
		this.variableValidation = null;
		this.dropPlacement = null;
		this.dragInteraction = null;
		this.blockInstanceRenderer = null;
		this.previewRenderer = null;
		this.ghostRenderer = null;
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

	private getPaletteDescriptorService(): PaletteDescriptorService {
		if (!this.paletteDescriptor) {
			this.paletteDescriptor = new PaletteDescriptorService();
		}
		return this.paletteDescriptor;
	}

	private getDragPreviewFactory(): DragPreviewBlockFactory {
		if (!this.dragPreviewFactory) {
			this.dragPreviewFactory = new DragPreviewBlockFactory();
		}
		return this.dragPreviewFactory;
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
					this.getBlockInstanceRenderer().createBlockInstanceElement(block, options),
				startProgramPress: (event, block, rect) => this.startProgramPress(event, block, rect),
				setBlocks: (blocks) => this.setBlocks(blocks),
				removeBlockById: (blocks, blockId) => this.removeBlockById(blocks, blockId),
				closeWheel: () => this.closeWheel(),
				emitStatus: (message) => this.emitStatus(message),
				editValueBlock: (blockId, currentValue) =>
					this.getBlockActionController().editValueBlock(blockId, currentValue),
				editVariableName: (blockId, currentName) =>
					this.getBlockActionController().editVariableName(blockId, currentName),
				isControlBlock: (block) => this.isControlBlock(block),
				findBlockById: (blocks, blockId) =>
					this.getTreeService().findBlockById(blocks, blockId),
				buildPreviewDescriptor: () => this.getPreviewRenderer().buildPreviewDescriptor(),
				renderPreviewBlock: (descriptor) => this.getPreviewRenderer().renderPreviewBlock(descriptor),
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
				updateConditionalMode: (blockId, mode) =>
					this.getBlockActionController().updateConditionalMode(blockId, mode),
				updateVariableOperationMode: (blockId, mode) =>
					this.getBlockActionController().updateVariableOperationMode(blockId, mode),
				updateDeclarationBindingKind: (blockId, bindingKind) =>
					this.getBlockActionController().updateDeclarationBindingKind(blockId, bindingKind),
				updateRoutineCallMode: (blockId, mode) =>
					this.getBlockActionController().updateRoutineCallMode(blockId, mode),
				updateBlockOperation: (blockId, operation) =>
					this.getBlockActionController().updateBlockOperation(blockId, operation)
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

	private getBlockActionController(): BlockActionController {
		if (!this.blockAction) {
			const context: BlockActionContext = {
				isLocked: () => this.isLocked(),
				getBlocks: () => this.getBlocks(),
				setBlocks: (nextBlocks) => this.setBlocks(nextBlocks),
				updateBlockById: (blocks, blockId, updater) =>
					this.updateBlockById(blocks, blockId, updater),
				parseSlotKey: (slotKey) => this.parseSlotKey(slotKey),
				parseLiteralInput: (rawValue) => this.parseLiteralInput(rawValue),
				promptForVariableName: (currentName, excludeDeclarationId) =>
					this.promptForVariableName(currentName, excludeDeclarationId),
				promptForValueText: (currentValue) => this.promptForValueText(currentValue),
				emitStatus: (message) => this.emitStatus(message)
			};
			this.blockAction = new BlockActionController(context);
		}
		return this.blockAction;
	}

	private getPreviewRenderer(): PreviewRenderer {
		if (!this.previewRenderer) {
			const context: PreviewRendererContext = {
				getDragState: () => this.dragState,
				findBlockById: (blockId) => this.getTreeService().findBlockById(this.getBlocks(), blockId),
				isControlBlock: (block) => this.isControlBlock(block),
				getControlLabel: (block) => this.getControlLabel(block),
				applyBlockColor: (element, color) => this.applyBlockColor(element, color)
			};
			this.previewRenderer = new PreviewRenderer(context);
		}
		return this.previewRenderer;
	}

	private getBlockInstanceRenderer(): BlockInstanceRenderer {
		if (!this.blockInstanceRenderer) {
			const context: BlockInstanceRendererContext = {
				isLocked: () => this.isLocked(),
				isControlBlock: (block) => this.isControlBlock(block),
				getControlLabel: (block) => this.getControlLabel(block),
				canShowDeclarationBindingWheel: (block) => this.canShowDeclarationBindingWheel(block),
				createSlotKey: (ownerId, slotId) => this.createSlotKey(ownerId, slotId),
				getDragSlotTargetKey: () => this.dragState?.slotTargetKey ?? null,
				applyBlockColor: (element, color) => this.applyBlockColor(element, color),
				assignLiteralIntoSlot: (slotKey, value, expectedType) =>
					this.getBlockActionController().assignLiteralIntoSlot(
						slotKey,
						value,
						expectedType
					),
				clearSlot: (slotKey) => {
					this.getBlockActionController().clearSlot(slotKey);
					this.emitStatus("Slot cleared.");
				},
				onStartProgramPress: (event, block, rect) =>
					this.startProgramPress(event, block, rect),
				onRemoveBlock: (blockId) => {
					this.setBlocks(this.removeBlockById(this.getBlocks(), blockId));
					this.closeWheel();
					this.emitStatus("Block removed.");
				},
				editValueBlock: (blockId, currentValue) =>
					this.getBlockActionController().editValueBlock(blockId, currentValue),
				editVariableName: (blockId, currentName) =>
					this.getBlockActionController().editVariableName(blockId, currentName),
				toggleWheel: (blockId) => {
					if (this.wheelState?.blockId === blockId) {
						this.closeWheel();
						this.render();
						return;
					}
					this.openWheel(blockId);
				},
				registerSlotRef: (slotKey, element) => this.slotRefs.set(slotKey, element),
				registerBlockRef: (blockId, element) => this.blockRefs.set(blockId, element)
			};
			this.blockInstanceRenderer = new BlockInstanceRenderer(context);
		}
		return this.blockInstanceRenderer;
	}

	private getGhostRenderer(): GhostRenderer {
		if (!this.ghostRenderer) {
			const context: GhostRendererContext = {
				getDragState: () => this.dragState,
				findDraggingBlock: () =>
					this.dragState?.source === "program" && this.dragState.blockId
						? this.getTreeService().findBlockById(this.getBlocks(), this.dragState.blockId)
						: null,
				createPreviewBlockFromDragState: () => this.createPreviewBlockFromDragState(),
				renderGhostBlockInstance: (block, nested) =>
					this.getBlockInstanceRenderer().renderGhostBlockInstance(block, nested),
				buildPreviewDescriptor: () => this.getPreviewRenderer().buildPreviewDescriptor(),
				renderPreviewBlock: (descriptor) => this.getPreviewRenderer().renderPreviewBlock(descriptor)
			};
			this.ghostRenderer = new GhostRenderer(context);
		}
		return this.ghostRenderer;
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
		return this.getDragPreviewFactory().createPreviewBlockFromDragState(
			this.dragState,
			(blockId) => this.getTreeService().findBlockById(this.getBlocks(), blockId)
		);
	}

	private applyResolvedPlacement(
		blocks: EditorBlock[],
		placement: ResolvedDropPlacement,
		insertedBlock: EditorBlock
	): EditorBlock[] {
		return this.getDropPlacementService().applyResolvedPlacement(blocks, placement, insertedBlock);
	}

	private buildFallbackPaletteBlock(dragState: EditorDragState): PaletteBlock {
		return this.getDragPreviewFactory().buildFallbackPaletteBlock(dragState);
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

	private getDefinitionDescriptor(block: PaletteBlock): { chip?: string; label: string } {
		return this.getPaletteDescriptorService().getDefinitionDescriptor(block, (key) => t(key as never));
	}

	private getPaletteGroupId(block: PaletteBlock): PaletteGroupId {
		return this.getPaletteDescriptorService().getPaletteGroupId(block);
	}

	private getPaletteGroupLabel(groupId: PaletteGroupId): string {
		return this.getPaletteDescriptorService().getPaletteGroupLabel(groupId, (key) => t(key as never));
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
		this.getGhostRenderer().render(shell);

		this.host.appendChild(shell);
	}
}
