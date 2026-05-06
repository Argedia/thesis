import type { EditorBlock, PlayEditorSurfaceProps } from "../model";
import { buildEditorLineLayout } from "../model";
import { projectDocumentToEditorBlocks } from "../operations";
import type { EngineServiceRegistry } from "./engine-service-registry";
import type { WheelState } from "../contracts/types";

export interface RenderDeps {
	getProps: () => PlayEditorSurfaceProps;
	getShell: () => HTMLDivElement | null;
	getWorkbench: () => HTMLDivElement | null;
	setShell: (el: HTMLDivElement) => void;
	setWorkbench: (el: HTMLDivElement) => void;
	getHost: () => HTMLElement;
	getDragState: () => import("../model").EditorDragState | null;
	getWheelState: () => WheelState | null;
	isLocked: () => boolean;
	derivePaletteBlocks: () => import("../model").PaletteBlock[];
	setPaletteBlocks: (blocks: import("../model").PaletteBlock[]) => void;
	buildInlinePreviewBlocks: () => EditorBlock[] | null;
	applyResolvedPlacement: (
		document: PlayEditorSurfaceProps["value"],
		placement: import("../contracts/types").ResolvedDropPlacement,
		insertedBlock: EditorBlock
	) => PlayEditorSurfaceProps["value"];
	resolveBaseDocumentForDrop: () => PlayEditorSurfaceProps["value"];
	createPreviewBlockFromDragState: () => EditorBlock | null;
	getGeometryService: () => import("../DragDropGeometry").DragDropGeometryService;
	getBlocks: () => EditorBlock[];
	registry: EngineServiceRegistry;
}

export const render = (deps: RenderDeps): void => {
	deps.setPaletteBlocks(deps.derivePaletteBlocks());
	ensureLayoutShell(deps);
	const shell = deps.getShell()!;
	const workbench = deps.getWorkbench()!;
	shell.className = `scratch-shell${deps.isLocked() ? " is-locked" : ""}`;
	removeChildrenBySelector(workbench, ".scratch-palette");
	removeChildrenBySelector(workbench, ".scratch-editor");

	if (deps.isLocked()) {
		workbench.classList.remove("palette-left-collapsed", "palette-right-collapsed");
		deps.registry.getEditorCanvasRenderer().render(workbench);
	} else {
		deps.registry.getPaletteRenderer().renderLeft(workbench);
		deps.registry.getEditorCanvasRenderer().render(workbench);
		deps.registry.getPaletteRenderer().renderRight(workbench);
	}

	removeChildrenBySelector(shell, ".operation-wheel");
	removeChildrenBySelector(shell, ".drag-ghost");

	const wheelState = deps.getWheelState();
	if (wheelState) {
		const blocks = deps.getBlocks();
		const block = deps.registry.getTreeService().findBlockById(blocks, wheelState.blockId);
		if (block) {
			const options = deps.registry.getWheelInteraction().getOptionsForBlock(block);
			if (options) {
				deps.registry.getWheelOverlayRenderer().render(shell, wheelState, options);
			}
		}
	}

	deps.registry.getGhostRenderer().render(shell);
};

export const ensureLayoutShell = (deps: Pick<RenderDeps, "getShell" | "getWorkbench" | "setShell" | "setWorkbench" | "getHost" | "isLocked">): void => {
	if (deps.getShell() && deps.getWorkbench()) return;

	deps.getHost().innerHTML = "";
	const shell = document.createElement("div");
	shell.className = `scratch-shell${deps.isLocked() ? " is-locked" : ""}`;
	const workbench = document.createElement("div");
	workbench.className = "scratch-workbench";
	shell.appendChild(workbench);
	deps.getHost().appendChild(shell);
	deps.setShell(shell);
	deps.setWorkbench(workbench);
};

export const removeChildrenBySelector = (root: ParentNode, selector: string): void => {
	root.querySelectorAll(selector).forEach((node) => node.remove());
};

export const buildInlinePreviewBlocks = (deps: {
	getDragState: () => import("../model").EditorDragState | null;
	createPreviewBlockFromDragState: () => EditorBlock | null;
	resolveBaseDocumentForDrop: () => PlayEditorSurfaceProps["value"];
	getGeometryService: () => import("../DragDropGeometry").DragDropGeometryService;
	applyResolvedPlacement: (
		document: PlayEditorSurfaceProps["value"],
		placement: import("../contracts/types").ResolvedDropPlacement,
		insertedBlock: EditorBlock
	) => PlayEditorSurfaceProps["value"];
}): EditorBlock[] | null => {
	const dragState = deps.getDragState();
	if (!dragState || dragState.slotTargetKey || !dragState.isOverEditor) return null;

	const previewBlock = deps.createPreviewBlockFromDragState();
	if (!previewBlock) return null;

	const baseDocument = deps.resolveBaseDocumentForDrop();
	const baseBlocks = projectDocumentToEditorBlocks(baseDocument);
	const baseLineLayouts = buildEditorLineLayout(baseBlocks);
	const placement = deps.getGeometryService().resolveDropPlacement(
		baseBlocks,
		baseLineLayouts,
		dragState.visualLineIndex,
		dragState.chosenIndent
	);

	return projectDocumentToEditorBlocks(deps.applyResolvedPlacement(baseDocument, placement, previewBlock));
};
