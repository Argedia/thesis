import type {
	ControlBodyKey,
	EditorBlock,
	EditorDragState,
	PaletteBlock,
	PlayEditorSurfaceProps,
	RoutineSignature
} from "../model";
import { analyzeDocumentRoutines, projectDocumentToEditorBlocks } from "../operations";
import { HostInteractionController } from "../interaction/HostInteractionController";
import { t } from "../../i18n-helpers";
import {
	createDefaultBlockLimits,
	countBlockLimitUsageFromBlocks,
	resolveBlockLimitKeyForDragState,
	resolveBlockLimitKeyForPaletteBlock,
	type BlockLimitKey
} from "../block-limits";
import type { PendingPress, WheelState } from "../contracts/types";
import type { PaletteLaneId } from "../render/PaletteRenderer";
import { renameRoutine } from "../model";
import {
	promptForRoutineName as promptForRoutineNameExternal,
	promptForScopeVariableTarget as promptForScopeVariableTargetExternal,
	promptForTypedFieldTarget as promptForTypedFieldTargetExternal,
	promptForValueText as promptForValueTextExternal,
	promptForVariableDeclarationSpec as promptForVariableDeclarationSpecExternal,
	promptForVariableName as promptForVariableNameExternal
} from "./engine-prompts";
import { createBlockFromPalette as createBlockFromPaletteExternal, handlePaletteBlockInserted as handlePaletteBlockInsertedExternal } from "./engine-palette";
import { EngineServiceRegistry, type EngineRegistryDeps } from "./engine-service-registry";
import {
	assignLiteralExpressionIntoSlot,
	clearExpressionSlot,
	removeBlockWithSideEffects,
	removeProjectedBlockById,
	replaceProjectedBlockById,
	setBlocks,
	type BlockHelperDeps
} from "./engine-block-helpers";
import { render, ensureLayoutShell, buildInlinePreviewBlocks } from "./engine-render";

type ControlEditorBlock = EditorBlock & { kind: "conditional" | "while" | "for_each" };

export class PlayEditorEngine {
	private readonly host: HTMLElement;
	private props: PlayEditorSurfaceProps;
	private shell: HTMLDivElement | null = null;
	private workbench: HTMLDivElement | null = null;
	private blockRefs = new Map<string, HTMLDivElement>();
	private lineRowRefs = new Map<string, HTMLDivElement>();
	private slotRefs = new Map<string, HTMLDivElement>();
	private branchLineRefs: Array<{ ownerId: string; branch: ControlBodyKey; depth: number; element: HTMLDivElement; isLast: boolean }> = [];
	private paletteBlocks: PaletteBlock[] = [];
	private editorLane: HTMLDivElement | null = null;
	private dragState: EditorDragState | null = null;
	private dragBaseLineRects: Array<{ id: string; rect: DOMRect }> | null = null;
	private readonly hostInteraction = new HostInteractionController();
	private pressState: PendingPress | null = null;
	private wheelState: WheelState | null = null;
	private selectedPaletteLane: PaletteLaneId = "base";
	private isBasePaletteCollapsed = true;
	private isSidePaletteCollapsed = true;
	private expandedPaletteGroupIds = new Set<string>();
	private cleanupFns: Array<() => void> = [];
	private readonly registry: EngineServiceRegistry;

	public constructor(host: HTMLElement, props: PlayEditorSurfaceProps) {
		this.host = host;
		this.props = props;
		this.registry = new EngineServiceRegistry(this.buildRegistryDeps());
		this.ensureShell();
		this.render();
		this.attachGlobalListeners();
		this.attachHostListeners();
	}

	public update(props: PlayEditorSurfaceProps): void {
		this.props = props;
		this.render();
	}

	public destroy(): void {
		this.registry.getDragInteraction().clearPress();
		this.dragBaseLineRects = null;
		this.registry.reset();
		this.cleanupFns.forEach((fn) => fn());
		this.cleanupFns = [];
		this.shell = null;
		this.workbench = null;
		this.host.innerHTML = "";
	}

	// ---------------------------------------------------------------------------
	// Registry deps — wires engine state into the registry
	// ---------------------------------------------------------------------------

	private buildRegistryDeps(): EngineRegistryDeps {
		return {
			getProps: () => this.props,
			getBlocks: () => this.getBlocks(),
			getDragState: () => this.dragState,
			setDragState: (s) => { this.dragState = s; },
			getDragBaseLineRects: () => this.dragBaseLineRects,
			setDragBaseLineRects: (rects) => { this.dragBaseLineRects = rects; },
			getPressState: () => this.pressState,
			setPressState: (s) => { this.pressState = s; },
			getWheelState: () => this.wheelState,
			getEditorLane: () => this.editorLane,
			setEditorLane: (lane) => { this.editorLane = lane; },
			getBlockRefs: () => this.blockRefs,
			getLineRowRefs: () => this.lineRowRefs,
			getSlotRefs: () => this.slotRefs,
			getBranchLineRefs: () => this.branchLineRefs,
			setBranchLineRefs: (refs) => { this.branchLineRefs = refs; },
			getSelectedPaletteLane: () => this.selectedPaletteLane,
			setSelectedPaletteLane: (lane) => { this.selectedPaletteLane = lane; },
			getIsBasePaletteCollapsed: () => this.isBasePaletteCollapsed,
			setIsBasePaletteCollapsed: (collapsed) => { this.isBasePaletteCollapsed = collapsed; },
			getIsSidePaletteCollapsed: () => this.isSidePaletteCollapsed,
			setIsSidePaletteCollapsed: (collapsed) => { this.isSidePaletteCollapsed = collapsed; },
			getExpandedPaletteGroupIds: () => this.expandedPaletteGroupIds,
			isLocked: () => this.props.disabled === true,
			isActiveRoutineFunction: () => this.isActiveRoutineFunction(),
			isControlBlock: (block) => this.isControlBlock(block),
			getControlLabel: (block) => this.getControlLabel(block),
			canShowDeclarationBindingWheel: (block) => this.canShowDeclarationBindingWheel(block),
			createSlotKey: (ownerId, slotId) => `${ownerId}::${slotId}`,
			parseSlotKey: (key) => this.parseSlotKey(key),
			applyBlockColor: (element, color) => { if (color) { element.style.backgroundColor = color; element.style.borderColor = color; } },
			canUseSlotTarget: (key) => this.registry.getDropPlacementService().canUseSlotTarget(key, this.dragState, this.getBlocks()),
			applyDropDestination: (document, insertedBlock, options) =>
				this.registry.getDropPlacementService().applyDropDestination(
					document, insertedBlock, options,
					(blocks, lineLayouts, visualLineIndex, chosenIndent) =>
						this.registry.getGeometryService().resolveDropPlacement(blocks, lineLayouts, visualLineIndex, chosenIndent)
				),
			resolveInsertedBlockFromDrag: (dragState, matcher) => this.resolveInsertedBlockFromDrag(dragState, matcher),
			resolveBaseDocumentForDrop: (dragState, document) =>
				this.registry.getDropPlacementService().resolveBaseDocumentForDrop(dragState, document),
			setDocument: (doc) => this.props.onChange(doc),
			setBlocks: (blocks) => setBlocks(this.buildHelperDeps(), blocks),
			removeBlockById: (blocks, blockId) => this.registry.getMutationService().removeBlockById(blocks, blockId),
			removeBlockWithSideEffects: (blockId) => removeBlockWithSideEffects(this.buildHelperDeps(), blockId),
			createPreviewBlockFromDragState: () =>
				this.registry.getDragPreviewFactory().createPreviewBlockFromDragState(
					this.dragState,
					(blockId) => this.registry.getTreeService().findBlockById(this.getBlocks(), blockId)
				),
			buildInlinePreviewBlocks: () => this.buildInlinePreviewBlocks(),
			openWheel: (blockId) => this.openWheel(blockId),
			closeWheel: () => { this.wheelState = null; },
			clearPress: () => this.registry.getDragInteraction().clearPress(),
			render: () => this.render(),
			emitStatus: (msg) => this.props.onStatus?.(msg),
			onPaletteBlockInserted: (block) => this.handlePaletteBlockInserted(block),
			editValueBlock: (blockId, currentValue) =>
				this.registry.getBlockActionController().editValueBlock(blockId, currentValue),
			editVariableName: (blockId, currentName) =>
				this.registry.getBlockActionController().editVariableName(blockId, currentName),
			promptForVariableName: (currentName, excludeDeclarationId) =>
				this.promptForVariableName(currentName, excludeDeclarationId),
			promptForScopeVariableTarget: (currentTargetId) =>
				this.promptForScopeVariableTarget(currentTargetId),
			promptForTypedFieldTarget: (options) => this.promptForTypedFieldTarget(options),
			promptForValueText: (currentValue) => this.promptForValueText(currentValue),
			promptForRoutineName: (currentName) => this.promptForRoutineName(currentName),
			renameRoutineById: (routineId, name) => this.renameRoutineById(routineId, name),
			isVariableNameTaken: (name, excludeDeclarationId) =>
				this.registry.getVariableValidationService().isVariableNameTaken(this.props.value, name, excludeDeclarationId),
			getPaletteBlocks: () => this.paletteBlocks,
			getDefinitionDescriptor: (block) =>
				this.registry.getPaletteDescriptorService().getDefinitionDescriptor(block, (key) => t(key as never)),
			getBlockLimitForPaletteBlock: (block) => {
				if (!this.props.onSetBlockLimit) {
					return null;
				}
				const key = resolveBlockLimitKeyForPaletteBlock(block);
				if (!key) {
					return null;
				}
				return this.getBlockLimitValue(key);
			},
			adjustBlockLimitForPaletteBlock: (block, delta) => {
				if (!this.props.onSetBlockLimit) {
					return;
				}
				const key = resolveBlockLimitKeyForPaletteBlock(block);
				if (!key) {
					return;
				}
				const current = this.getBlockLimitValue(key);
				const next = Math.max(0, Math.floor(current + delta));
				this.props.onSetBlockLimit(key, next);
			},
			getPaletteGroupId: (block) =>
				this.registry.getPaletteDescriptorService().getPaletteGroupId(block),
			getPaletteGroupLabel: (groupId) =>
				this.registry.getPaletteDescriptorService().getPaletteGroupLabel(groupId, (key) => t(key as never)),
			canInsertPaletteBlock: (dragState) => {
				const limitKey = resolveBlockLimitKeyForDragState(dragState);
				if (!limitKey) {
					return { allowed: true };
				}
				const limit = this.getBlockLimitValue(limitKey);
				if (limit <= 0) {
					return { allowed: false, message: "Este bloque está deshabilitado para este nivel." };
				}
				const used = countBlockLimitUsageFromBlocks(this.getBlocks(), limitKey);
				if (used >= limit) {
					return { allowed: false, message: `Límite alcanzado (${used}/${limit}).` };
				}
				return { allowed: true };
			},
			replaceProjectedBlockById: (blockId, updater) =>
				replaceProjectedBlockById(this.buildHelperDeps(), blockId, updater),
			clearExpressionSlot: (slotKey) =>
				clearExpressionSlot(this.buildHelperDeps(), slotKey, (key) => this.parseSlotKey(key)),
			assignLiteralExpressionIntoSlot: (slotKey, rawValue, expectedType) =>
				assignLiteralExpressionIntoSlot(
					this.buildHelperDeps(), slotKey, rawValue, expectedType,
					(key) => this.parseSlotKey(key),
					(rawVal) => this.registry.getLiteralParserService().parseLiteralInput(rawVal)
				)
		};
	}

	private buildHelperDeps(): BlockHelperDeps {
		return {
			getProps: () => this.props,
			getActiveRoutineName: () => this.getActiveRoutineName(),
			setDocument: (doc) => this.props.onChange(doc),
			getMutationService: () => this.registry.getMutationService(),
			getTreeService: () => this.registry.getTreeService(),
			getRehydratedBlocks: () => this.getBlocks()
		};
	}

	private getEffectiveBlockLimits(): Record<BlockLimitKey, number> {
		const defaultLimit = this.props.onSetBlockLimit ? 0 : Number.MAX_SAFE_INTEGER;
		return {
			...createDefaultBlockLimits(defaultLimit),
			...(this.props.blockLimits ?? {})
		};
	}

	private getBlockLimitValue(key: BlockLimitKey): number {
		const limits = this.getEffectiveBlockLimits();
		const value = limits[key];
		if (typeof value !== "number" || !Number.isFinite(value)) {
			return this.props.onSetBlockLimit ? 0 : Number.MAX_SAFE_INTEGER;
		}
		return Math.max(0, Math.floor(value));
	}

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	private render(): void {
		render({
			getProps: () => this.props,
			getShell: () => this.shell,
			getWorkbench: () => this.workbench,
			setShell: (el) => { this.shell = el; },
			setWorkbench: (el) => { this.workbench = el; },
			getHost: () => this.host,
			getDragState: () => this.dragState,
			getWheelState: () => this.wheelState,
			isLocked: () => this.props.disabled === true,
			derivePaletteBlocks: () =>
				this.registry.getPaletteDerivationService().derivePaletteBlocks(this.props.structures, this.props.value),
			setPaletteBlocks: (blocks) => { this.paletteBlocks = blocks; },
			buildInlinePreviewBlocks: () => this.buildInlinePreviewBlocks(),
			applyResolvedPlacement: (document, placement, insertedBlock) =>
				this.registry.getDropPlacementService().applyResolvedPlacement(document, placement, insertedBlock),
			resolveBaseDocumentForDrop: () =>
				this.registry.getDropPlacementService().resolveBaseDocumentForDrop(this.dragState, this.props.value),
			createPreviewBlockFromDragState: () =>
				this.registry.getDragPreviewFactory().createPreviewBlockFromDragState(
					this.dragState,
					(blockId) => this.registry.getTreeService().findBlockById(this.getBlocks(), blockId)
				),
			getBlocks: () => this.getBlocks(),
			getGeometryService: () => this.registry.getGeometryService(),
			registry: this.registry
		});
	}

	private ensureShell(): void {
		ensureLayoutShell({
			getShell: () => this.shell,
			getWorkbench: () => this.workbench,
			setShell: (el) => { this.shell = el; },
			setWorkbench: (el) => { this.workbench = el; },
			getHost: () => this.host,
			isLocked: () => this.props.disabled === true
		});
	}

	private buildInlinePreviewBlocks(): EditorBlock[] | null {
		return buildInlinePreviewBlocks({
			getDragState: () => this.dragState,
			createPreviewBlockFromDragState: () =>
				this.registry.getDragPreviewFactory().createPreviewBlockFromDragState(
					this.dragState,
					(blockId) => this.registry.getTreeService().findBlockById(this.getBlocks(), blockId)
				),
			resolveBaseDocumentForDrop: () =>
				this.registry.getDropPlacementService().resolveBaseDocumentForDrop(this.dragState, this.props.value),
			getGeometryService: () => this.registry.getGeometryService(),
			applyResolvedPlacement: (document, placement, insertedBlock) =>
				this.registry.getDropPlacementService().applyResolvedPlacement(document, placement, insertedBlock)
		});
	}

	// ---------------------------------------------------------------------------
	// Helpers
	// ---------------------------------------------------------------------------

	private getBlocks(): EditorBlock[] {
		const projectedBlocks = projectDocumentToEditorBlocks(this.props.value);
		return this.rehydrateLevelStructureTypeRefs(projectedBlocks);
	}

	private rehydrateLevelStructureTypeRefs(blocks: EditorBlock[]): EditorBlock[] {
		const prefix = "__level_structure__";
		const structureKinds = new Map(
			this.props.structures.map((structure) => [structure.id.trim(), structure.kind] as const)
		);

		const syncBlock = (block: EditorBlock): EditorBlock => {
			let nextBlock = block;
			if (
				(block.kind === "var" ||
					block.kind === "var_assign" ||
					block.kind === "var_operation" ||
					block.kind === "type_field_read" ||
					block.kind === "type_field_assign") &&
				block.variableSourceId?.startsWith(prefix)
			) {
				const structureId = block.variableSourceId.slice(prefix.length).trim();
				const structureKind =
					structureKinds.get(structureId) ??
					(block.declaredTypeRef?.kind === "structure"
						? block.declaredTypeRef.structureKind
						: null);
				const nextDeclaredTypeRef =
					structureKind !== null ? { kind: "structure" as const, structureKind } : null;
				const mustSyncType =
					!!nextDeclaredTypeRef &&
					(block.declaredTypeRef?.kind !== "structure" ||
						block.declaredTypeRef.structureKind !== nextDeclaredTypeRef.structureKind);
				const mustSyncName = (!block.variableName || block.variableName.trim().length === 0) && structureId.length > 0;
				if (mustSyncType || mustSyncName) {
					nextBlock = {
						...nextBlock,
						declaredTypeRef: nextDeclaredTypeRef ?? nextBlock.declaredTypeRef,
						variableName: block.variableName?.trim().length
							? block.variableName
							: structureId
					};
				}
			}

			const syncedInputBlock = nextBlock.inputBlock ? syncBlock(nextBlock.inputBlock) : nextBlock.inputBlock;
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

	private getRoutineSignatures(): Record<string, RoutineSignature> {
		return analyzeDocumentRoutines(this.props.value);
	}

	private getActiveRoutineSignature(): RoutineSignature | null {
		return this.getRoutineSignatures()[this.props.value.activeRoutineId] ?? null;
	}

	private getActiveRoutineName(): string {
		return (
			this.props.value.routines.find((r) => r.id === this.props.value.activeRoutineId)?.name ??
			t("editor.functionDefault")
		);
	}

	private isActiveRoutineFunction(): boolean {
		return this.getActiveRoutineSignature()?.isFunction === true;
	}

	private isRootLevelBlock(blockId: string): boolean {
		return this.getBlocks().some((block) => block.id === blockId);
	}

	private canShowDeclarationBindingWheel(block: EditorBlock): boolean {
		const sig = this.getActiveRoutineSignature();
		return (
			block.kind === "var_declaration" &&
			!!sig?.isFunction &&
			sig.routineKind !== "type" &&
			this.isRootLevelBlock(block.id)
		);
	}

	private parseSlotKey(slotKey: string): { ownerId: string; slotId: string } {
		const separatorIndex = slotKey.indexOf("::");
		if (separatorIndex < 0) return { ownerId: slotKey, slotId: "input" };
		return { ownerId: slotKey.slice(0, separatorIndex), slotId: slotKey.slice(separatorIndex + 2) };
	}

	private isControlBlock(block: EditorBlock | null | undefined): block is ControlEditorBlock {
		return !!block && (block.kind === "conditional" || block.kind === "while" || block.kind === "for_each");
	}

	private getControlLabel(block: Pick<EditorBlock, "kind">): string {
		if (block.kind === "while") return t("blocks.while").toLowerCase();
		if (block.kind === "for_each") return t("blocks.forEach").toLowerCase();
		return t("blocks.if").toLowerCase();
	}

	private openWheel(blockId: string): void {
		if (this.props.disabled) return;
		const element = this.blockRefs.get(blockId);
		const block = this.registry.getTreeService().findBlockById(this.getBlocks(), blockId);
		if (!element || !block) return;
		const rect = element.getBoundingClientRect();
		this.wheelState = { blockId, x: rect.right + 12, y: rect.top + rect.height / 2 };
		this.render();
	}

	private renameRoutineById(routineId: string, name: string): void {
		const normalizedName = name.trim();
		if (!normalizedName) return;
		this.props.onChange(renameRoutine(this.props.value, routineId, normalizedName));
	}

	// ---------------------------------------------------------------------------
	// Prompt delegates
	// ---------------------------------------------------------------------------

	private async promptForVariableName(currentName?: string, excludeDeclarationId?: string): Promise<string | null> {
		return promptForVariableNameExternal({
			props: this.props,
			currentName,
			excludeDeclarationId,
			isVariableNameTaken: (name, excludedId) =>
				this.registry.getVariableValidationService().isVariableNameTaken(this.props.value, name, excludedId)
		});
	}

	private async promptForRoutineName(currentName?: string): Promise<string | null> {
		return promptForRoutineNameExternal({ props: this.props, currentName, activeRoutineName: this.getActiveRoutineName() });
	}

	private async promptForValueText(currentValue?: import("@thesis/core-engine").DataValue | null): Promise<string | null> {
		return promptForValueTextExternal({ props: this.props, currentValue });
	}

	private async promptForScopeVariableTarget(currentTargetId?: string): Promise<{ id: string; name: string } | null> {
		return promptForScopeVariableTargetExternal({ props: this.props, document: this.props.value, currentTargetId });
	}

	private async promptForTypedFieldTarget(options?: { currentVariableId?: string; currentFieldName?: string }): Promise<{ variableId: string; variableName: string; fieldName: string } | null> {
		return promptForTypedFieldTargetExternal({ props: this.props, document: this.props.value, ...options });
	}

	// ---------------------------------------------------------------------------
	// Drag / palette
	// ---------------------------------------------------------------------------

	private async resolveInsertedBlockFromDrag(
		dragState: EditorDragState,
		matchesPaletteBlock: (block: PaletteBlock) => boolean
	): Promise<EditorBlock | null> {
		if (dragState.source === "palette") {
			const matchedBlock = this.paletteBlocks.find(matchesPaletteBlock) ?? null;
			const fallbackBlock = this.registry.getDragPreviewFactory().buildFallbackPaletteBlock(dragState);
			const sourceBlock =
				matchedBlock && matchedBlock.kind === dragState.blockKind ? matchedBlock : fallbackBlock;
			return createBlockFromPaletteExternal({
				block: sourceBlock,
				props: this.props,
				getBlocks: () => this.getBlocks(),
				getActiveRoutineName: () => this.getActiveRoutineName(),
				emitStatus: (msg) => this.props.onStatus?.(msg),
				promptForValueText: (currentValue) => this.promptForValueText(currentValue),
				parseLiteralInput: (rawValue) => this.registry.getLiteralParserService().parseLiteralInput(rawValue)
			});
		}

		if (dragState.blockId) {
			return this.registry.getTreeService().findBlockById(this.getBlocks(), dragState.blockId);
		}

		return null;
	}

	private async handlePaletteBlockInserted(block: EditorBlock): Promise<void> {
		await handlePaletteBlockInsertedExternal({
			block,
			getBlocks: () => this.getBlocks(),
			removeProjectedBlockById: (blockId) => removeProjectedBlockById(this.buildHelperDeps(), blockId),
			replaceProjectedBlockById: (blockId, updater) =>
				replaceProjectedBlockById(this.buildHelperDeps(), blockId, updater),
			emitStatus: (msg) => this.props.onStatus?.(msg),
			promptForVariableDeclarationSpec: (spec) =>
				promptForVariableDeclarationSpecExternal({
					props: this.props,
					structures: this.props.structures,
					document: this.props.value,
					currentName: spec?.currentName,
					currentTypeRef: spec?.currentTypeRef,
					excludeDeclarationId: spec?.excludeDeclarationId,
					isVariableNameTaken: (name, excludeDeclarationId) =>
						this.registry.getVariableValidationService().isVariableNameTaken(this.props.value, name, excludeDeclarationId)
				}),
			promptForVariableName: (currentName, excludeDeclarationId) =>
				this.promptForVariableName(currentName, excludeDeclarationId),
			promptForScopeVariableTarget: (currentTargetId) =>
				this.promptForScopeVariableTarget(currentTargetId),
			promptForTypedFieldTarget: (spec) => this.promptForTypedFieldTarget(spec)
		});
	}

	// ---------------------------------------------------------------------------
	// Event listeners
	// ---------------------------------------------------------------------------

	private readonly handlePointerMove = (event: PointerEvent): void => {
		void this.registry.getDragInteraction().handlePointerMove(event);
	};

	private readonly handlePointerUp = async (event: PointerEvent): Promise<void> => {
		await this.registry.getDragInteraction().handlePointerUp(event);
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
			isLocked: () => this.props.disabled === true,
			hasOpenWheel: () => this.wheelState !== null,
			closeWheel: () => { this.wheelState = null; },
			rerender: () => this.render()
		});
		this.cleanupFns.push(cleanup);
	}
}
