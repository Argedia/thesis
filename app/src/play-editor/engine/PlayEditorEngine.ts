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
	createEditorDocumentFromLegacyBlocks,
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
	projectDocumentToLegacyBlocks
} from "../operations";
import { buildEditorLineLayout, renameRoutine } from "../model";
import { BLOCK_METADATA, type PaletteGroupId } from "../BlockMetadata";
import type {
	PendingPress,
	ResolvedDropPlacement,
	WheelState
} from "../contracts/types";
import { FUNCTION_BLUE, PREVIEW_BLOCK_ID } from "../contracts/constants";

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
				setBlocks: (nextBlocks) => this.setBlocks(nextBlocks),
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
		return projectDocumentToLegacyBlocks(this.props.value);
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
			createEditorDocumentFromLegacyBlocks(syncedBlocks, this.props.value)
		);
	}

	private synchronizeVariableLabels(blocks: EditorBlock[]): EditorBlock[] {
		const declarations = collectVariableDeclarations(blocks);
		const activeRoutineId = this.props.value.activeRoutineId;
		const activeRoutineName = this.getActiveRoutineName();
		const nameById = new Map<string, string>(
			declarations.map((declaration) => [declaration.id, declaration.name])
		);

		const syncBlock = (block: EditorBlock): EditorBlock => {
			let nextBlock = block;
			if (
				(block.kind === "var_read" ||
					block.kind === "var_assign" ||
					block.kind === "var_operation" ||
					block.kind === "type_field_read" ||
					block.kind === "type_field_assign") &&
				block.variableSourceId
			) {
				const syncedName = nameById.get(block.variableSourceId);
				if (syncedName && syncedName !== block.variableName) {
					nextBlock = {
						...nextBlock,
						variableName: syncedName
					};
				}
			}

			if (
				block.kind === "var_reference" &&
				block.referenceTargetKind === "variable" &&
				block.referenceTargetId
			) {
				const syncedTargetName = nameById.get(block.referenceTargetId);
				if (syncedTargetName && syncedTargetName !== block.variableName) {
					nextBlock = {
						...nextBlock,
						variableName: syncedTargetName
					};
				}
			}

			if (block.kind === "function_definition") {
				if (
					nextBlock.routineId !== activeRoutineId ||
					nextBlock.routineName !== activeRoutineName
				) {
					nextBlock = {
						...nextBlock,
						routineId: activeRoutineId,
						routineName: activeRoutineName
					};
				}
			}
			if (block.kind === "type_definition") {
				if (
					nextBlock.routineId !== activeRoutineId ||
					nextBlock.routineName !== activeRoutineName ||
					nextBlock.typeName !== activeRoutineName
				) {
					nextBlock = {
						...nextBlock,
						routineId: activeRoutineId,
						routineName: activeRoutineName,
						typeRoutineId: activeRoutineId,
						typeName: activeRoutineName
					};
				}
			}

			const syncedInputBlock = nextBlock.inputBlock
				? syncBlock(nextBlock.inputBlock)
				: nextBlock.inputBlock;
			const syncedInputBlocks = nextBlock.inputBlocks?.map((inputBlock) =>
				inputBlock ? syncBlock(inputBlock) : inputBlock
			);
			const syncedBodyBlocks = nextBlock.bodyBlocks?.map(syncBlock);
			const syncedAlternateBodyBlocks = nextBlock.alternateBodyBlocks?.map(syncBlock);

			if (
				syncedInputBlock !== nextBlock.inputBlock ||
				syncedInputBlocks !== nextBlock.inputBlocks ||
				syncedBodyBlocks !== nextBlock.bodyBlocks ||
				syncedAlternateBodyBlocks !== nextBlock.alternateBodyBlocks
			) {
				nextBlock = {
					...nextBlock,
					inputBlock: syncedInputBlock,
					inputBlocks: syncedInputBlocks,
					bodyBlocks: syncedBodyBlocks,
					alternateBodyBlocks: syncedAlternateBodyBlocks
				};
			}

			return nextBlock;
		};

		return blocks.map(syncBlock);
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

	private async requestSelectInput(options: {
		title: string;
		initialValue?: string;
		options: Array<{ value: string; label: string }>;
	}): Promise<string | null> {
		if (this.props.onRequestSelectInput) {
			return this.props.onRequestSelectInput(options);
		}

		const optionsText = options.options
			.map((option, index) => `${index + 1}. ${option.label}`)
			.join("\n");
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

	private async promptForRoutineName(currentName?: string): Promise<string | null> {
		const nextName = await this.requestTextInput({
			title: t("editor.routineName"),
			initialValue: currentName?.trim() || this.getActiveRoutineName()
		});
		if (nextName === null) {
			return null;
		}
		const normalizedName = nextName.trim();
		if (!normalizedName) {
			await this.showAlert({
				title: t("common.notice"),
				message: t("messages.routineNameEmpty")
			});
			return this.promptForRoutineName(currentName);
		}
		return normalizedName;
	}

	private renameRoutineById(routineId: string, name: string): void {
		const normalizedName = name.trim();
		if (!normalizedName) {
			return;
		}
		this.props.onChange(renameRoutine(this.props.value, routineId, normalizedName));
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

	private async promptForScopeVariableTarget(currentTargetId?: string): Promise<{ id: string; name: string } | null> {
		const declarations = collectVariableDeclarations(this.getBlocks());
		if (declarations.length === 0) {
			await this.showAlert({
				title: t("common.notice"),
				message: t("common.noVariables")
			});
			return null;
		}

		const selectedId = await this.requestSelectInput({
			title: t("editor.scopeVariablePrompt"),
			initialValue: currentTargetId ?? declarations[0]?.id,
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
	}

	private async promptForDeclaredTypeRef(
		currentTypeRef?: EditorBlock["declaredTypeRef"]
	): Promise<EditorBlock["declaredTypeRef"] | null> {
		const primitiveOptions: Array<{
			value: string;
			label: string;
			typeRef: EditorBlock["declaredTypeRef"];
		}> = [
			{
				value: "primitive:value",
				label: t("blocks.value"),
				typeRef: { kind: "primitive", primitive: "value" }
			},
			{
				value: "primitive:text",
				label: t("blocks.text"),
				typeRef: { kind: "primitive", primitive: "text" }
			},
			{
				value: "primitive:boolean",
				label: t("blocks.boolean"),
				typeRef: { kind: "primitive", primitive: "boolean" }
			}
		];
		const userTypeOptions = listTypeSignatures(this.props.value).map((signature) => ({
			value: `user:${signature.typeRoutineId}`,
			label: signature.typeName,
			typeRef: {
				kind: "user" as const,
				typeRoutineId: signature.typeRoutineId
			}
		}));
		const allOptions = [...primitiveOptions, ...userTypeOptions];
		if (allOptions.length === 0) {
			return { kind: "primitive", primitive: "value" };
		}

		const initialValue =
			currentTypeRef?.kind === "primitive"
				? `primitive:${currentTypeRef.primitive}`
				: currentTypeRef?.kind === "user"
					? `user:${currentTypeRef.typeRoutineId}`
					: "primitive:value";

		const selectedValue = await this.requestSelectInput({
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
	}

	private async promptForVariableDeclarationSpec(options?: {
		currentName?: string;
		currentTypeRef?: EditorBlock["declaredTypeRef"];
		excludeDeclarationId?: string;
	}): Promise<{ name: string; declaredTypeRef: EditorBlock["declaredTypeRef"] } | null> {
		const primitiveOptions: Array<{
			value: string;
			label: string;
			typeRef: EditorBlock["declaredTypeRef"];
		}> = [
			{
				value: "primitive:value",
				label: t("blocks.value"),
				typeRef: { kind: "primitive", primitive: "value" }
			},
			{
				value: "primitive:text",
				label: t("blocks.text"),
				typeRef: { kind: "primitive", primitive: "text" }
			},
			{
				value: "primitive:boolean",
				label: t("blocks.boolean"),
				typeRef: { kind: "primitive", primitive: "boolean" }
			}
		];
		const userTypeOptions = listTypeSignatures(this.props.value).map((signature) => ({
			value: `user:${signature.typeRoutineId}`,
			label: signature.typeName,
			typeRef: {
				kind: "user" as const,
				typeRoutineId: signature.typeRoutineId
			}
		}));
		const allOptions = [...primitiveOptions, ...userTypeOptions];
		const initialTypeValue =
			options?.currentTypeRef?.kind === "primitive"
				? `primitive:${options.currentTypeRef.primitive}`
				: options?.currentTypeRef?.kind === "user"
					? `user:${options.currentTypeRef.typeRoutineId}`
					: "primitive:value";

		if (this.props.onRequestDeclarationInput) {
			const response = await this.props.onRequestDeclarationInput({
				title: t("blocks.declaration"),
				nameTitle: t("editor.variableNamePrompt"),
				typeTitle: t("editor.variableTypePrompt"),
				initialName: options?.currentName?.trim() || "variable",
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
				await this.showAlert({
					title: t("common.notice"),
					message: t("messages.variableNameEmpty")
				});
				return null;
			}
			if (this.isVariableNameTaken(normalizedName, options?.excludeDeclarationId)) {
				await this.showAlert({
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

		const name = await this.promptForVariableName(
			options?.currentName,
			options?.excludeDeclarationId
		);
		if (!name) {
			return null;
		}
		const declaredTypeRef = await this.promptForDeclaredTypeRef(options?.currentTypeRef);
		if (!declaredTypeRef) {
			return null;
		}
		return { name, declaredTypeRef };
	}

	private async promptForTypedFieldTarget(options?: {
		currentVariableId?: string;
		currentFieldName?: string;
	}): Promise<{ variableId: string; variableName: string; fieldName: string } | null> {
		const declarations = collectVariableDeclarations(this.getBlocks()).filter(
			(declaration) => declaration.declaredTypeRef?.kind === "user"
		);
		if (declarations.length === 0) {
			await this.showAlert({
				title: t("common.notice"),
				message: t("messages.unknownType")
			});
			return null;
		}

		const variableId = await this.requestSelectInput({
			title: t("editor.scopeVariablePrompt"),
			initialValue: options?.currentVariableId ?? declarations[0]?.id,
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
			listTypeSignatures(this.props.value).find(
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
			await this.showAlert({
				title: t("common.notice"),
				message: t("messages.unknownTypeField")
			});
			return null;
		}
		const fieldName = await this.requestSelectInput({
			title: t("blocks.field"),
			initialValue: options?.currentFieldName ?? fieldOptions[0]?.value,
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
		if (block.kind === "function_definition") {
			const hasTypeDefinition = this.getBlocks().some(
				(currentBlock) => currentBlock.kind === "type_definition"
			);
			if (hasTypeDefinition) {
				this.emitStatus(t("messages.functionTypeConflict"));
				return null;
			}
			const alreadyExists = this.getBlocks().some(
				(currentBlock) => currentBlock.kind === "function_definition"
			);
			if (alreadyExists) {
				this.emitStatus("Only one definition block is allowed per routine.");
				return null;
			}
			const routineId = block.routineId ?? this.props.value.activeRoutineId;
			const routineName = block.routineName?.trim() || this.getActiveRoutineName();
			return createFunctionDefinitionBlock(routineId, routineName, block.color);
		}

		if (block.kind === "type_definition") {
			const hasFunctionDefinition = this.getBlocks().some(
				(currentBlock) => currentBlock.kind === "function_definition"
			);
			if (hasFunctionDefinition) {
				this.emitStatus(t("messages.functionTypeConflict"));
				return null;
			}
			const alreadyExists = this.getBlocks().some(
				(currentBlock) => currentBlock.kind === "type_definition"
			);
			if (alreadyExists) {
				this.emitStatus("Only one type definition block is allowed per routine.");
				return null;
			}
			const routineId = block.routineId ?? this.props.value.activeRoutineId;
			const routineName = block.routineName?.trim() || this.getActiveRoutineName();
			return createTypeDefinitionBlock(routineId, routineName, block.color);
		}

		if (block.kind === "conditional") {
			return createConditionalBlock(block.color, block.conditionalMode ?? "if");
		}

		if (block.kind === "while") {
			return createWhileBlock(block.color);
		}

		if (block.kind === "for_each") {
			if (!block.forEachSourceStructureId || !block.forEachSourceStructureKind) {
				this.emitStatus("For-each source structure is missing.");
				return null;
			}
			return createForEachBlock(
				block.forEachSourceStructureId,
				block.forEachSourceStructureKind,
				block.forEachItemName ?? "item",
				block.color
			);
		}

		if (block.kind === "break") {
			return createBreakBlock(block.color);
		}

		if (block.kind === "var_declaration") {
			return createVariableDeclarationBlock(
				block.color,
				block.variableName ?? "variable",
				block.bindingKind ?? "declare"
			);
		}

		if (block.kind === "var_assign") {
			return createVariableAssignBlock(
				block.variableSourceId,
				block.variableName ?? "variable",
				block.color
			);
		}

		if (block.kind === "var_read") {
			return createVariableReadBlock(
				block.variableSourceId,
				block.variableName ?? "variable",
				block.color
			);
		}

		if (block.kind === "var_reference") {
			return createVariableReferenceBlock(
				block.variableName ?? "target",
				block.referenceTargetKind ?? "variable",
				block.referenceTargetId,
				block.color
			);
		}

		if (block.kind === "var_binary_operation") {
			return createVariableBinaryOperationBlock(
				block.color,
				block.variableOperationMode &&
					block.variableOperationMode !== "value" &&
					block.variableOperationMode !== "assign"
					? block.variableOperationMode
					: "add",
				block.expressionFamily
			);
		}

		if (block.kind === "type_instance_new") {
			if (!block.typeRoutineId || !block.typeName) {
				this.emitStatus(t("messages.unknownType"));
				return null;
			}
			return createTypeInstanceBlock(block.typeRoutineId, block.typeName, block.color);
		}

		if (block.kind === "type_field_read") {
			return createTypeFieldReadBlock(
				block.variableSourceId ?? "",
				block.variableName ?? "object",
				block.typeFieldName ?? "field",
				block.color
			);
		}

		if (block.kind === "type_field_assign") {
			return createTypeFieldAssignBlock(
				block.variableSourceId ?? "",
				block.variableName ?? "object",
				block.typeFieldName ?? "field",
				block.color
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
			const hasDefinition = this.getBlocks().some(
				(currentBlock) => currentBlock.kind === "function_definition"
			);
			if (!hasDefinition) {
				this.emitStatus("Return requires a definition block in this routine.");
				return null;
			}
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

		if (block.kind === "structure" && block.structureId && block.structureKind) {
			return createEditorBlock(block.structureId, block.structureKind, block.color);
		}
		this.emitStatus(`Unsupported palette block kind: ${block.kind}`);
		return null;
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
			const matchedBlock = this.paletteBlocks.find(matchesPaletteBlock) ?? null;
			const fallbackBlock = this.buildFallbackPaletteBlock(dragState);
			const sourceBlock =
				matchedBlock && matchedBlock.kind === dragState.blockKind
					? matchedBlock
					: fallbackBlock;
			return this.createBlockFromPalette(sourceBlock);
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

	private async handlePaletteBlockInserted(block: EditorBlock): Promise<void> {
		if (block.kind === "var_declaration") {
			const declarationSpec = await this.promptForVariableDeclarationSpec({
				currentName: block.variableName ?? "variable",
				currentTypeRef: block.declaredTypeRef,
				excludeDeclarationId: block.id
			});
			if (!declarationSpec) {
				this.setBlocks(this.removeBlockById(this.getBlocks(), block.id));
				this.emitStatus("Variable declaration cancelled.");
				return;
			}
			this.setBlocks(
				this.updateBlockById(this.getBlocks(), block.id, (currentBlock) => ({
					...currentBlock,
					variableName: declarationSpec.name,
					declaredTypeRef: declarationSpec.declaredTypeRef
				}))
			);
			this.emitStatus("Variable created.");
			return;
		}

		if (block.kind === "for_each") {
			const itemName = await this.promptForVariableName(
				block.forEachItemName ?? "item",
				block.forEachItemDeclarationId
			);
			if (!itemName) {
				this.setBlocks(this.removeBlockById(this.getBlocks(), block.id));
				this.emitStatus("For-each creation cancelled.");
				return;
			}
			this.setBlocks(
				this.updateBlockById(this.getBlocks(), block.id, (currentBlock) => ({
					...currentBlock,
					forEachItemName: itemName
				}))
			);
			this.emitStatus("For-each created.");
			return;
		}

		if (block.kind === "var_assign") {
			const target = await this.promptForScopeVariableTarget(block.variableSourceId);
			if (!target) {
				this.setBlocks(this.removeBlockById(this.getBlocks(), block.id));
				this.emitStatus("Assignment creation cancelled.");
				return;
			}
			this.setBlocks(
				this.updateBlockById(this.getBlocks(), block.id, (currentBlock) => ({
					...currentBlock,
					variableName: target.name,
					variableSourceId: target.id
				}))
			);
			this.emitStatus("Assignment created.");
			return;
		}

		if (block.kind === "var_reference") {
			const target = await this.promptForScopeVariableTarget(block.referenceTargetId);
			if (!target) {
				this.setBlocks(this.removeBlockById(this.getBlocks(), block.id));
				this.emitStatus("Reference creation cancelled.");
				return;
			}
			this.setBlocks(
				this.updateBlockById(this.getBlocks(), block.id, (currentBlock) => ({
					...currentBlock,
					variableName: target.name,
					referenceTargetKind: "variable",
					referenceTargetId: target.id
				}))
			);
			this.emitStatus("Reference created.");
		}

		if (block.kind === "type_field_read" || block.kind === "type_field_assign") {
			const target = await this.promptForTypedFieldTarget({
				currentVariableId: block.variableSourceId,
				currentFieldName: block.typeFieldName
			});
			if (!target) {
				this.setBlocks(this.removeBlockById(this.getBlocks(), block.id));
				this.emitStatus("Type field block creation cancelled.");
				return;
			}
			this.setBlocks(
				this.updateBlockById(this.getBlocks(), block.id, (currentBlock) => ({
					...currentBlock,
					variableSourceId: target.variableId,
					variableName: target.variableName,
					typeFieldName: target.fieldName
				}))
			);
			this.emitStatus("Type field block created.");
		}
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
