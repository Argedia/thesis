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
import { BlockMutationService } from "../BlockMutationService";
import { BlockTreeService } from "../BlockTreeService";
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
import {
	PaletteRenderer,
	type PaletteLaneId,
	type PaletteRendererContext
} from "../render/PaletteRenderer";
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
	createEditorDocumentFromEditorBlocks,
	createVariableBinaryOperationBlock,
	createVariableAssignBlock,
	createVariableDeclarationBlock,
	createVariableReadBlock,
	createVariableReferenceBlock,
	createConditionalBlock,
	createWhileBlock,
	createFunctionDefinitionBlock,
	createTypeDefinitionBlock,
	createTypeFieldAssignBlock,
	createTypeFieldReadBlock,
	createTypeInstanceBlock,
	createForEachBlock,
	createBreakBlock,
	createReturnBlock,
	createRoutineCallBlock,
	createRoutineMemberBlock,
	createRoutineValueBlock,
	createBooleanValueBlock,
	createEditorBlock,
	createValueBlock,
	collectVariableDeclarations,
	listTypeSignatures,
	getBlockInputSlots,
	getBlockSlotBlock,
	getOutputType,
	isSlotCompatible,
	setBlockSlotBlock,
	describeBlock,
	projectDocumentToEditorBlocks,
	editorBlockToExpression,
	editorBlockToStatement,
	getActiveProgram,
	replaceActiveProgram,
	findNode,
	findExpression,
	replaceStatementNode,
	replaceExpressionNode,
	replaceExpression,
	clearExpression,
	detachNode,
	detachExpression
} from "../operations";
import { buildEditorLineLayout, renameRoutine } from "../model";
import { BLOCK_METADATA, type PaletteGroupId } from "../BlockMetadata";
import type {
	PendingPress,
	ResolvedDropPlacement,
	WheelState
} from "../contracts/types";
import { FUNCTION_BLUE, PREVIEW_BLOCK_ID } from "../contracts/constants";
import { synchronizeVariableLabels as synchronizeVariableLabelsExternal } from "./engine-block-sync";
import {
	handlePaletteBlockInserted as handlePaletteBlockInsertedExternal,
	createBlockFromPalette as createBlockFromPaletteExternal
} from "./engine-palette";
import {
	promptForDeclaredTypeRef as promptForDeclaredTypeRefExternal,
	promptForRoutineName as promptForRoutineNameExternal,
	promptForScopeVariableTarget as promptForScopeVariableTargetExternal,
	promptForTypedFieldTarget as promptForTypedFieldTargetExternal,
	promptForValueText as promptForValueTextExternal,
	promptForVariableDeclarationSpec as promptForVariableDeclarationSpecExternal,
	promptForVariableName as promptForVariableNameExternal
} from "./engine-prompts";

type ControlEditorBlock = EditorBlock & {
	kind: "conditional" | "while" | "for_each";
};

export class PlayEditorEngine {
	private readonly host: HTMLElement;
	private props: PlayEditorSurfaceProps;
	private shell: HTMLDivElement | null = null;
	private workbench: HTMLDivElement | null = null;
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
	private selectedPaletteLane: PaletteLaneId = "base";
	private expandedPaletteGroupIds = new Set<PaletteGroupId>();
	private cleanupFns: Array<() => void> = [];

	public constructor(host: HTMLElement, props: PlayEditorSurfaceProps) {
		this.host = host;
		this.props = props;
		this.ensureLayoutShell();
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
		this.shell = null;
		this.workbench = null;
		this.host.innerHTML = "";
	}

	private emitStatus(message: string): void {
		this.props.onStatus?.(message);
	}

	private isLocked(): boolean {
		return this.props.disabled === true;
	}

	private getGeometryService(): DragDropGeometryService {
		return new DragDropGeometryService(
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
				parseSlotKey: (slotKey) => this.parseSlotKey(slotKey)
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
				getDocument: () => this.props.value,
				canUseSlotTarget: (targetSlotKey) => this.canUseSlotTarget(targetSlotKey),
				applyDropDestination: (document, insertedBlock, placement) =>
					this.applyDropDestination(document, insertedBlock, placement),
				setDocument: (nextDocument) => this.setDocument(nextDocument),
				onPaletteBlockInserted: async (block) => {
					await this.handlePaletteBlockInserted(block);
				}
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
				getHasFunctionDefinition: () =>
					this.getBlocks().some((block) => block.kind === "function_definition"),
				getHasTypeDefinition: () =>
					this.getBlocks().some((block) => block.kind === "type_definition"),
				getIsLocked: () => this.isLocked(),
				getSelectedPaletteLane: () => this.selectedPaletteLane,
				setSelectedPaletteLane: (lane) => {
					if (this.selectedPaletteLane === lane) {
						return;
					}
					this.selectedPaletteLane = lane;
					this.render();
				},
				getPaletteLaneLabel: (lane) => {
					switch (lane) {
						case "scope":
							return t("editor.paletteLaneScope");
						case "created":
							return t("editor.paletteLaneCreated");
						case "base":
						default:
							return t("editor.paletteLaneBase");
					}
				},
				getEmptyPaletteLaneText: () => t("editor.paletteLaneEmpty"),
				isPaletteGroupExpanded: (groupId) => this.expandedPaletteGroupIds.has(groupId),
				togglePaletteGroupExpanded: (groupId) => {
					if (this.expandedPaletteGroupIds.has(groupId)) {
						this.expandedPaletteGroupIds.delete(groupId);
					} else {
						this.expandedPaletteGroupIds.add(groupId);
					}
					this.render();
				},
				getPaletteGroupId: (block) => this.getPaletteGroupId(block),
				getPaletteGroupLabel: (groupId) => this.getPaletteGroupLabel(groupId),
				getFunctionTypeExclusiveHintText: () => t("editor.functionTypeExclusiveHint"),
				getVariableSubgroupLabel: (kind) =>
					kind === "declared"
						? t("editor.groupDeclaredVariables")
						: t("editor.groupVariableBlocks"),
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
				convertVariableBlockKind: (blockId, kind) =>
					this.getBlockActionController().convertVariableBlockKind(blockId, kind),
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
				replaceProjectedBlockById: (blockId, updater) =>
					this.replaceProjectedBlockById(blockId, updater),
				clearExpressionSlot: (slotKey) => this.clearExpressionSlot(slotKey),
				assignLiteralExpressionIntoSlot: (slotKey, rawValue, expectedType) =>
					this.assignLiteralExpressionIntoSlot(slotKey, rawValue, expectedType),
				parseSlotKey: (slotKey) => this.parseSlotKey(slotKey),
				parseLiteralInput: (rawValue) => this.parseLiteralInput(rawValue),
				promptForVariableName: (currentName, excludeDeclarationId) =>
					this.promptForVariableName(currentName, excludeDeclarationId),
				promptForScopeVariableTarget: (currentTargetId) =>
					this.promptForScopeVariableTarget(currentTargetId),
				promptForTypedFieldTarget: (currentVariableId, currentFieldName) =>
					this.promptForTypedFieldTarget({
						currentVariableId,
						currentFieldName
					}),
				promptForValueText: (currentValue) => this.promptForValueText(currentValue),
				promptForRoutineName: (currentName) => this.promptForRoutineName(currentName),
				renameRoutine: (routineId, name) => this.renameRoutineById(routineId, name),
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
					this.setBlocks(this.removeBlockWithSideEffects(blockId));
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
				registerBlockRef: (blockId, element) => this.blockRefs.set(blockId, element),
				resolveTypeName: (typeRoutineId) =>
					listTypeSignatures(this.props.value).find(
						(signature) => signature.typeRoutineId === typeRoutineId
					)?.typeName ?? null
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
		return projectDocumentToEditorBlocks(this.props.value);
	}

	private getRoutineSignatures(): Record<string, RoutineSignature> {
		return analyzeDocumentRoutines(this.props.value);
	}

	private getActiveRoutineSignature(): RoutineSignature | null {
		return this.getRoutineSignatures()[this.props.value.activeRoutineId] ?? null;
	}

	private getActiveRoutineName(): string {
		return (
			this.props.value.routines.find((routine) => routine.id === this.props.value.activeRoutineId)
				?.name ?? t("editor.functionDefault")
		);
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

	private setDocument(nextDocument: PlayEditorSurfaceProps["value"]): void {
		this.props.onChange(nextDocument);
	}

	private updateActiveProgram(
		updater: (program: ReturnType<typeof getActiveProgram>) => ReturnType<typeof getActiveProgram>
	): void {
		const nextProgram = updater(getActiveProgram(this.props.value));
		this.setDocument(replaceActiveProgram(this.props.value, nextProgram));
	}

	private replaceProjectedBlockById(
		blockId: string,
		updater: (block: EditorBlock) => EditorBlock
	): void {
		const currentBlock = this.getTreeService().findBlockById(this.getBlocks(), blockId);
		if (!currentBlock) {
			return;
		}

		const nextBlock = updater(currentBlock);
		const activeProgram = getActiveProgram(this.props.value);
		if (findNode(activeProgram, blockId)) {
			this.setDocument(
				replaceActiveProgram(
					this.props.value,
					replaceStatementNode(activeProgram, blockId, editorBlockToStatement(nextBlock))
				)
			);
			return;
		}

		if (findExpression(activeProgram, blockId)) {
			this.setDocument(
				replaceActiveProgram(
					this.props.value,
					replaceExpressionNode(activeProgram, blockId, editorBlockToExpression(nextBlock))
				)
			);
		}
	}

	private clearExpressionSlot(slotKey: string): void {
		const { ownerId, slotId } = this.parseSlotKey(slotKey);
		this.updateActiveProgram((program) => clearExpression(program, ownerId, slotId));
	}

	private assignLiteralExpressionIntoSlot(
		slotKey: string,
		rawValue: string,
		expectedType: "value" | "boolean" | "any"
	): void {
		const trimmed = rawValue.trim();
		if (!trimmed) {
			return;
		}

		const { ownerId, slotId } = this.parseSlotKey(slotKey);
		const parsedValue = this.parseLiteralInput(trimmed);
		const expression =
			expectedType === "boolean" && typeof parsedValue === "boolean"
				? editorBlockToExpression(createBooleanValueBlock(parsedValue))
				: editorBlockToExpression(createValueBlock(parsedValue));
		this.updateActiveProgram((program) => replaceExpression(program, ownerId, slotId, expression));
	}

	private removeProjectedBlockById(blockId: string): void {
		const activeProgram = getActiveProgram(this.props.value);
		if (findNode(activeProgram, blockId)) {
			this.setDocument(replaceActiveProgram(this.props.value, detachNode(activeProgram, blockId).program));
			return;
		}

		if (findExpression(activeProgram, blockId)) {
			this.setDocument(
				replaceActiveProgram(this.props.value, detachExpression(activeProgram, blockId).program)
			);
		}
	}

	private removeNestedBlockById(blocks: EditorBlock[], blockId: string): EditorBlock[] {
		return this.getMutationService().removeNestedBlockById(blocks, blockId);
	}

	private removeBlockById(blocks: EditorBlock[], blockId: string): EditorBlock[] {
		return this.getMutationService().removeBlockById(blocks, blockId);
	}

	private removeReturnsInBlocks(blocks: EditorBlock[]): EditorBlock[] {
		return blocks
			.filter((block) => block.kind !== "return")
			.map((block) => ({
				...block,
				inputBlock: block.inputBlock ? this.removeReturnsInBlocks([block.inputBlock])[0] ?? null : null,
				inputBlocks: block.inputBlocks?.map((inputBlock) =>
					inputBlock ? this.removeReturnsInBlocks([inputBlock])[0] ?? null : null
				),
				bodyBlocks: block.bodyBlocks ? this.removeReturnsInBlocks(block.bodyBlocks) : block.bodyBlocks,
				alternateBodyBlocks: block.alternateBodyBlocks
					? this.removeReturnsInBlocks(block.alternateBodyBlocks)
					: block.alternateBodyBlocks
			}));
	}

	private removeTypeDependentBlocks(blocks: EditorBlock[], typeRoutineId: string): EditorBlock[] {
		return blocks
			.filter((block) => {
				if (block.kind === "type_instance_new" && block.typeRoutineId === typeRoutineId) {
					return false;
				}
				if (
					(block.kind === "var_declaration" && block.declaredTypeRef?.kind === "user" && block.declaredTypeRef.typeRoutineId === typeRoutineId) ||
					(block.kind === "type_field_read" && block.typeRoutineId === typeRoutineId) ||
					(block.kind === "type_field_assign" && block.typeRoutineId === typeRoutineId)
				) {
					return false;
				}
				return true;
			})
			.map((block) => ({
				...block,
				inputBlock: block.inputBlock ? this.removeTypeDependentBlocks([block.inputBlock], typeRoutineId)[0] ?? null : null,
				inputBlocks: block.inputBlocks?.map((inputBlock) =>
					inputBlock ? this.removeTypeDependentBlocks([inputBlock], typeRoutineId)[0] ?? null : null
				),
				bodyBlocks: block.bodyBlocks ? this.removeTypeDependentBlocks(block.bodyBlocks, typeRoutineId) : block.bodyBlocks,
				alternateBodyBlocks: block.alternateBodyBlocks
					? this.removeTypeDependentBlocks(block.alternateBodyBlocks, typeRoutineId)
					: block.alternateBodyBlocks
			}));
	}

	private removeBlockWithSideEffects(blockId: string): EditorBlock[] {
		const blocks = this.getBlocks();
		const blockToRemove = this.getTreeService().findBlockById(blocks, blockId);
		if (!blockToRemove) {
			return blocks;
		}

		let nextBlocks = this.removeBlockById(blocks, blockId);
		if (blockToRemove.kind === "function_definition") {
			nextBlocks = this.removeReturnsInBlocks(nextBlocks);
		}
		if (blockToRemove.kind === "type_definition") {
			nextBlocks = this.removeTypeDependentBlocks(
				nextBlocks,
				blockToRemove.routineId ?? this.props.value.activeRoutineId
			);
		}

		return nextBlocks;
	}

	private extractBlockFromTree(
		blocks: EditorBlock[],
		blockId: string
	): { nextBlocks: EditorBlock[]; block: EditorBlock | null } {
		return this.getMutationService().extractBlockFromTree(blocks, blockId);
	}

	private setBlocks(nextBlocks: EditorBlock[]): void {
		const syncedBlocks = this.synchronizeVariableLabels(nextBlocks);
		this.props.onChange(
			createEditorDocumentFromEditorBlocks(syncedBlocks, this.props.value)
		);
	}

	private synchronizeVariableLabels(blocks: EditorBlock[]): EditorBlock[] {
		return synchronizeVariableLabelsExternal({
			blocks,
			document: this.props.value,
			activeRoutineId: this.props.value.activeRoutineId,
			activeRoutineName: this.getActiveRoutineName()
		});
	}

	private isVariableNameTaken(name: string, excludeDeclarationId?: string): boolean {
		return this.getVariableValidationService().isVariableNameTaken(
			this.props.value,
			name,
			excludeDeclarationId
		);
	}

	private async promptForVariableName(currentName?: string, excludeDeclarationId?: string): Promise<string | null> {
		return promptForVariableNameExternal({
			props: this.props,
			currentName,
			excludeDeclarationId,
			isVariableNameTaken: (name, excludedId) => this.isVariableNameTaken(name, excludedId)
		});
	}

	private async promptForRoutineName(currentName?: string): Promise<string | null> {
		return promptForRoutineNameExternal({
			props: this.props,
			currentName,
			activeRoutineName: this.getActiveRoutineName()
		});
	}

	private renameRoutineById(routineId: string, name: string): void {
		const normalizedName = name.trim();
		if (!normalizedName) {
			return;
		}
		this.props.onChange(renameRoutine(this.props.value, routineId, normalizedName));
	}

	private async promptForValueText(currentValue?: DataValue | null): Promise<string | null> {
		return promptForValueTextExternal({
			props: this.props,
			currentValue
		});
	}

	private async promptForScopeVariableTarget(currentTargetId?: string): Promise<{ id: string; name: string } | null> {
		return promptForScopeVariableTargetExternal({
			props: this.props,
			document: this.props.value,
			currentTargetId
		});
	}

	private async promptForDeclaredTypeRef(
		currentTypeRef?: EditorBlock["declaredTypeRef"]
	): Promise<EditorBlock["declaredTypeRef"] | null> {
		return promptForDeclaredTypeRefExternal({
			props: this.props,
			structures: this.props.structures,
			document: this.props.value,
			currentTypeRef
		});
	}

	private async promptForVariableDeclarationSpec(options?: {
		currentName?: string;
		currentTypeRef?: EditorBlock["declaredTypeRef"];
		excludeDeclarationId?: string;
	}): Promise<{ name: string; declaredTypeRef: EditorBlock["declaredTypeRef"] } | null> {
		return promptForVariableDeclarationSpecExternal({
			props: this.props,
			structures: this.props.structures,
			document: this.props.value,
			currentName: options?.currentName,
			currentTypeRef: options?.currentTypeRef,
			excludeDeclarationId: options?.excludeDeclarationId,
			isVariableNameTaken: (name, excludeDeclarationId) =>
				this.isVariableNameTaken(name, excludeDeclarationId)
		});
	}

	private async promptForTypedFieldTarget(options?: {
		currentVariableId?: string;
		currentFieldName?: string;
	}): Promise<{ variableId: string; variableName: string; fieldName: string } | null> {
		return promptForTypedFieldTargetExternal({
			props: this.props,
			document: this.props.value,
			currentVariableId: options?.currentVariableId,
			currentFieldName: options?.currentFieldName
		});
	}

	private parseLiteralInput(rawValue: string): DataValue {
		return this.getLiteralParserService().parseLiteralInput(rawValue);
	}

	private isControlBlock(block: EditorBlock | null | undefined): block is ControlEditorBlock {
		return !!block && (block.kind === "conditional" || block.kind === "while" || block.kind === "for_each");
	}

	private getControlLabel(block: Pick<EditorBlock, "kind">): string {
		if (block.kind === "while") {
			return t("blocks.while").toLowerCase();
		}
		if (block.kind === "for_each") {
			return t("blocks.forEach").toLowerCase();
		}
		return t("blocks.if").toLowerCase();
	}

	private async createBlockFromPalette(block: PaletteBlock): Promise<EditorBlock | null> {
		return createBlockFromPaletteExternal({
			block,
			props: this.props,
			getBlocks: () => this.getBlocks(),
			getActiveRoutineName: () => this.getActiveRoutineName(),
			emitStatus: (message) => this.emitStatus(message),
			promptForValueText: (currentValue) => this.promptForValueText(currentValue),
			parseLiteralInput: (rawValue) => this.parseLiteralInput(rawValue)
		});
	}

	private createPreviewBlockFromDragState(): EditorBlock | null {
		return this.getDragPreviewFactory().createPreviewBlockFromDragState(
			this.dragState,
			(blockId) => this.getTreeService().findBlockById(this.getBlocks(), blockId)
		);
	}

	private applyResolvedPlacement(
		document: PlayEditorSurfaceProps["value"],
		placement: ResolvedDropPlacement,
		insertedBlock: EditorBlock
	): PlayEditorSurfaceProps["value"] {
		return this.getDropPlacementService().applyResolvedPlacement(document, placement, insertedBlock);
	}

	private buildFallbackPaletteBlock(dragState: EditorDragState): PaletteBlock {
		return this.getDragPreviewFactory().buildFallbackPaletteBlock(dragState);
	}

	private async resolveInsertedBlockFromDrag(
		dragState: EditorDragState,
		matchesPaletteBlock: (block: PaletteBlock) => boolean
	): Promise<EditorBlock | null> {
		if (dragState.source === "palette") {
			const matchedBlock = this.paletteBlocks.find(matchesPaletteBlock) ?? null;
			const fallbackBlock = this.buildFallbackPaletteBlock(dragState);
			const sourceBlock =
				matchedBlock && matchedBlock.kind === dragState.blockKind
					? matchedBlock
					: fallbackBlock;
			return this.createBlockFromPalette(sourceBlock);
		}

		if (dragState.blockId) {
			return this.getTreeService().findBlockById(this.getBlocks(), dragState.blockId);
		}

		return null;
	}

	private resolveBaseDocumentForDrop(): PlayEditorSurfaceProps["value"] {
		return this.getDropPlacementService().resolveBaseDocumentForDrop(
			this.dragState,
			this.props.value
		);
	}

	private async handlePaletteBlockInserted(block: EditorBlock): Promise<void> {
		await handlePaletteBlockInsertedExternal({
			block,
			getBlocks: () => this.getBlocks(),
			removeProjectedBlockById: (blockId) => this.removeProjectedBlockById(blockId),
			replaceProjectedBlockById: (blockId, updater) =>
				this.replaceProjectedBlockById(blockId, updater),
			emitStatus: (message) => this.emitStatus(message),
			promptForVariableDeclarationSpec: (spec) => this.promptForVariableDeclarationSpec(spec),
			promptForVariableName: (currentName, excludeDeclarationId) =>
				this.promptForVariableName(currentName, excludeDeclarationId),
			promptForScopeVariableTarget: (currentTargetId) => this.promptForScopeVariableTarget(currentTargetId),
			promptForTypedFieldTarget: (spec) => this.promptForTypedFieldTarget(spec)
		});
	}

	private canUseSlotTarget(targetSlotKey: string): boolean {
		return this.getDropPlacementService().canUseSlotTarget(
			targetSlotKey,
			this.dragState,
			this.getBlocks()
		);
	}

	private applyDropDestination(
		document: PlayEditorSurfaceProps["value"],
		insertedBlock: EditorBlock,
		options: {
			slotTargetId?: string | null;
			visualLineIndex?: number;
			chosenIndent?: number;
		}
	): { nextDocument: PlayEditorSurfaceProps["value"]; status: string } {
		return this.getDropPlacementService().applyDropDestination(
			document,
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

		const baseDocument = this.resolveBaseDocumentForDrop();
		const baseBlocks = projectDocumentToEditorBlocks(baseDocument);
		const baseLineLayouts = buildEditorLineLayout(baseBlocks);
		const placement = this.getGeometryService().resolveDropPlacement(
			baseBlocks,
			baseLineLayouts,
			this.dragState.visualLineIndex,
			this.dragState.chosenIndent
		);

		return projectDocumentToEditorBlocks(
			this.applyResolvedPlacement(baseDocument, placement, previewBlock)
		);
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
		this.ensureLayoutShell();
		const shell = this.shell!;
		const workbench = this.workbench!;
		shell.className = `scratch-shell${this.isLocked() ? " is-locked" : ""}`;

		// Keep palette stable while dragging to avoid global flicker.
		// Hide it only while the editor is locked (running/debugging).
		if (this.isLocked()) {
			this.removeChildrenBySelector(workbench, ".scratch-palette");
		} else if (!this.dragState) {
			this.removeChildrenBySelector(workbench, ".scratch-palette");
			const paletteRenderer = this.getPaletteRenderer();
			paletteRenderer.render(workbench);
		}

		this.removeChildrenBySelector(workbench, ".scratch-editor");
		const canvasRenderer = this.getEditorCanvasRenderer();
		canvasRenderer.render(workbench);

		this.removeChildrenBySelector(shell, ".operation-wheel");
		this.removeChildrenBySelector(shell, ".drag-ghost");
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
	}

	private ensureLayoutShell(): void {
		if (this.shell && this.workbench) {
			return;
		}

		this.host.innerHTML = "";
		const shell = document.createElement("div");
		shell.className = `scratch-shell${this.isLocked() ? " is-locked" : ""}`;
		const workbench = document.createElement("div");
		workbench.className = "scratch-workbench";
		shell.appendChild(workbench);
		this.host.appendChild(shell);
		this.shell = shell;
		this.workbench = workbench;
	}

	private removeChildrenBySelector(root: ParentNode, selector: string): void {
		root.querySelectorAll(selector).forEach((node) => node.remove());
	}
}
