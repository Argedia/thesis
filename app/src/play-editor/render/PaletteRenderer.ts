import type { PaletteBlock } from "../model";
import type { PaletteGroupId } from "../BlockMetadata";
import { setTutorialAnchor } from "../../features/tutorial/anchors";
import { getBlockAccentClass } from "./blockAccent";

export type PaletteLaneId = "base" | "scope" | "created";
type PaletteBlockLimitState = {
  limit: number;
  remaining: number;
  editable: boolean;
  hide: boolean;
};

type PaletteChipDescriptor = {
  chip?: string;
  chipIcon?: string;
  label: string;
  metaText?: string;
  metaIcon?: string;
};

export interface PaletteRendererContext {
  getPaletteBlocks(): PaletteBlock[];
  getIsActiveRoutineFunction(): boolean;
  getIsActiveRoutineType(): boolean;
  getHasFunctionDefinition(): boolean;
  getHasTypeDefinition(): boolean;
  getIsLocked(): boolean;
  getSelectedPaletteLane(): PaletteLaneId;
  setSelectedPaletteLane(lane: PaletteLaneId): void;
  getIsBasePaletteCollapsed(): boolean;
  setIsBasePaletteCollapsed(collapsed: boolean): void;
  getIsSidePaletteCollapsed(): boolean;
  setIsSidePaletteCollapsed(collapsed: boolean): void;
  getPaletteLaneLabel(lane: PaletteLaneId): string;
  getPaletteSidePanelLabel(): string;
  getEmptyPaletteLaneText(): string;
  isPaletteGroupExpanded(lane: PaletteLaneId, groupId: PaletteGroupId): boolean;
  togglePaletteGroupExpanded(lane: PaletteLaneId, groupId: PaletteGroupId): void;
  getPaletteGroupId(block: PaletteBlock): PaletteGroupId;
  getPaletteGroupLabel(groupId: PaletteGroupId): string;
  getFunctionTypeExclusiveHintText(): string;
  getVariableSubgroupLabel(kind: "declared" | "tools"): string;
  getVariableScopeLabel(kind: "global" | "routine"): string;
  getDefinitionDescriptor(block: PaletteBlock): PaletteChipDescriptor;
  getPaletteBlockLimitState(block: PaletteBlock): PaletteBlockLimitState | null;
  adjustBlockLimitForPaletteBlock(block: PaletteBlock, delta: number): void;
  getBlocksHeadingText(): string;
  getDragHintText(): string;
  applyBlockColor(element: HTMLElement, color?: string): void;
  onStartPaletteDrag(event: PointerEvent, block: PaletteBlock, rect: DOMRect): void;
}

export class PaletteRenderer {
  public constructor(private readonly ctx: PaletteRendererContext) {}

  private createChipIcon(iconId: string): SVGSVGElement {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("block-chip-icon");

    const makePath = (d: string): void => {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.9");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      svg.appendChild(path);
    };

    switch (iconId) {
      case "stack":
        makePath("M8 7h8");
        makePath("M7 12h10");
        makePath("M6 17h12");
        break;
      case "queue":
        makePath("M5 8h3v8H5z");
        makePath("M10 8h3v8h-3z");
        makePath("M15 8h3v8h-3z");
        makePath("M18.5 12H21");
        break;
      case "list":
        makePath("M4.5 9h4v6h-4z");
        makePath("M9.5 12h4");
        makePath("M14.5 9h4v6h-4z");
        break;
      case "items":
        makePath("M6 6h5v5H6z");
        makePath("M13 6h5v5h-5z");
        makePath("M6 13h5v5H6z");
        makePath("M13 13h5v5h-5z");
        break;
      case "doubly-linked-list":
        makePath("M5 12h14");
        makePath("M9 8l-4 4 4 4");
        makePath("M15 8l4 4-4 4");
        break;
      case "circular-list":
        makePath("M18 10a6 6 0 1 0 1 5");
        makePath("M19 6v5h-5");
        break;
      case "literal":
        makePath("M9 5l-3 14");
        makePath("M15 5l-3 14");
        makePath("M5 9h14");
        makePath("M4 15h14");
        break;
      case "function":
        makePath("M15 5a4 4 0 1 0 0 8H9a4 4 0 1 0 0 8");
        break;
      case "object":
        makePath("M12 4l7 4v8l-7 4-7-4V8l7-4z");
        break;
      case "member":
        makePath("M8 8h8");
        makePath("M8 12h5");
        makePath("M8 16h8");
        makePath("M17 12h2");
        break;
      case "variable":
        makePath("M6 6l6 12 6-12");
        break;
      case "operation":
        makePath("M7 12h10");
        makePath("M12 7v10");
        break;
      case "for-each":
        makePath("M8 7h8");
        makePath("M8 12h6");
        makePath("M8 17h8");
        makePath("M15 10l3 2-3 2");
        break;
      case "new":
        makePath("M12 5v14");
        makePath("M5 12h14");
        break;
      case "field-read":
        makePath("M2 12s4-5 10-5 10 5 10 5-4 5-10 5S2 12 2 12z");
        makePath("M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3");
        break;
      case "field-assign":
        makePath("M4 17.5l3.5-.8L18 6.2 15.8 4 5.3 14.5 4 17.5z");
        makePath("M14.8 5l2.2 2.2");
        break;
      case "type":
        makePath("M12 4l7 4v8l-7 4-7-4V8l7-4z");
        makePath("M12 8v8");
        break;
      case "conditional":
        makePath("M12 4l8 8-8 8-8-8 8-8z");
        break;
      case "else":
        makePath("M6 7h7");
        makePath("M6 12h12");
        makePath("M6 17h7");
        break;
      case "while":
        makePath("M18 8a7 7 0 1 0 1 6");
        makePath("M19 4v5h-5");
        break;
      case "break":
        makePath("M7 7h10v10H7z");
        break;
      case "declaration":
        makePath("M12 5v14");
        makePath("M5 12h14");
        makePath("M7 8h0");
        break;
      case "assign":
        makePath("M6 9h12");
        makePath("M6 15h12");
        break;
      case "reference":
        makePath("M10 14l-2 2a3 3 0 1 1-4-4l2-2");
        makePath("M14 10l2-2a3 3 0 1 1 4 4l-2 2");
        makePath("M9 15l6-6");
        break;
      case "return":
        makePath("M19 12H7");
        makePath("M11 8l-4 4 4 4");
        break;
      default:
        makePath("M12 7v5");
        makePath("M12 17h.01");
        break;
    }

    return svg;
  }

  private hasVisibleBlocksInLane(...lanes: PaletteLaneId[]): boolean {
    return lanes.some((lane) =>
      this.getFilteredBlocksByLane(lane).some(
        (block) => !this.ctx.getPaletteBlockLimitState(block)?.hide
      )
    );
  }

  private createPanelHeader(
    title: string,
    isCollapsed: boolean,
    isEmpty: boolean,
    side: "left" | "right",
    onToggle: () => void
  ): HTMLDivElement {
    const header = document.createElement("div");
    header.className = "ide-output-tabs palette-panel-tabs";
    if (isEmpty) header.classList.add("palette-panel-tabs-empty");

    const label = document.createElement("span");
    label.className = "ide-output-tab active palette-panel-title";
    label.textContent = title.toUpperCase();
    header.appendChild(label);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "ide-output-toggle palette-panel-toggle";
    toggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    toggle.setAttribute("aria-label", isCollapsed ? "Expand panel" : "Collapse panel");
    if (isEmpty) {
      toggle.disabled = true;
    }
    if (side === "left") {
      toggle.textContent = isCollapsed ? "▸" : "◂";
    } else {
      toggle.textContent = isCollapsed ? "◂" : "▸";
    }
    toggle.addEventListener("click", onToggle);
    if (side === "right") {
      setTutorialAnchor(toggle, "editor-palette-side-toggle");
    }
    header.appendChild(toggle);

    return header;
  }

  private getGroupOrderForLane(lane: PaletteLaneId): PaletteGroupId[] {
    switch (lane) {
      case "scope":
        return ["variables"];
      case "created":
        return ["functions", "types"];
      case "base":
      default:
        return ["expressions", "logic", "functions", "types", "variables"];
    }
  }

  private getBlockLane(block: PaletteBlock): PaletteLaneId {
    if (
      block.kind === "routine_call" ||
      block.kind === "routine_value" ||
      block.kind === "routine_member" ||
      block.kind === "type_instance_new" ||
      block.kind === "type_field_read" ||
      block.kind === "type_field_assign"
    ) {
      return "created";
    }
    if (block.kind === "var") {
      return "scope";
    }
    return "base";
  }

  private getFilteredBlocksByLane(lane: PaletteLaneId): PaletteBlock[] {
    return this.ctx.getPaletteBlocks().filter((block) => this.getBlockLane(block) === lane);
  }

  private appendPaletteButton(list: HTMLElement, block: PaletteBlock): void {
    const limitState = this.ctx.getPaletteBlockLimitState(block);
    if (limitState?.hide) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "editor-block palette sky";
    const accentClass = getBlockAccentClass(block);
    if (accentClass) {
      button.classList.add(accentClass);
    }
    if (block.kind === "var_declaration" && this.ctx.getIsActiveRoutineFunction()) {
      button.classList.add("palette-declaration-function-ready");
    }
    this.ctx.applyBlockColor(button, block.color);

    const dragDots = document.createElement("span");
    dragDots.className = "block-drag-handle";
    dragDots.setAttribute("aria-hidden", "true");
    button.appendChild(dragDots);

    const descriptor = this.ctx.getDefinitionDescriptor(block);
    if (descriptor.chip) {
      const chip = document.createElement("span");
      chip.className = "block-chip";
      if (descriptor.chipIcon) {
        chip.appendChild(this.createChipIcon(descriptor.chipIcon));
      } else {
        chip.textContent = descriptor.chip;
      }
      button.appendChild(chip);
    }
    const title = document.createElement("strong");
    title.textContent = descriptor.label;
    button.appendChild(title);

    if (descriptor.metaText) {
      button.classList.add("palette-compact-metric");
      const meta = document.createElement("span");
      meta.className = "palette-block-meta";

      const count = document.createElement("span");
      count.className = "palette-block-meta-count";
      count.textContent = descriptor.metaText;
      meta.appendChild(count);

      if (descriptor.metaIcon) {
        const metaIcon = document.createElement("span");
        metaIcon.className = "palette-block-meta-icon";
        metaIcon.appendChild(this.createChipIcon(descriptor.metaIcon));
        meta.appendChild(metaIcon);
      }

      button.appendChild(meta);
    }

    if (limitState) {
      if (limitState.editable) {
        const controls = document.createElement("span");
        controls.className = "palette-limit-controls";

        const decrement = document.createElement("span");
        decrement.className = "palette-limit-step";
        decrement.textContent = "-";
        if (limitState.limit <= 0 || this.ctx.getIsLocked()) {
          decrement.classList.add("disabled");
        }
        decrement.addEventListener("pointerdown", (event) => {
          event.stopPropagation();
          event.preventDefault();
          if (this.ctx.getIsLocked() || limitState.limit <= 0) {
            return;
          }
          this.ctx.adjustBlockLimitForPaletteBlock(block, -1);
        });
        controls.appendChild(decrement);

        const value = document.createElement("span");
        value.className = "palette-limit-value";
        value.textContent = String(limitState.limit);
        controls.appendChild(value);

        const increment = document.createElement("span");
        increment.className = "palette-limit-step";
        increment.textContent = "+";
        if (this.ctx.getIsLocked()) {
          increment.classList.add("disabled");
        }
        increment.addEventListener("pointerdown", (event) => {
          event.stopPropagation();
          event.preventDefault();
          if (this.ctx.getIsLocked()) {
            return;
          }
          this.ctx.adjustBlockLimitForPaletteBlock(block, 1);
        });
        controls.appendChild(increment);

        button.appendChild(controls);
      } else {
        const badge = document.createElement("span");
        badge.className = "palette-limit-badge";
        badge.textContent = String(limitState.remaining);
        button.appendChild(badge);
      }
    }

    const isLevelLocked = !!limitState && !limitState.editable && limitState.remaining <= 0;
    if (isLevelLocked) {
      button.classList.add("palette-limit-locked");
    }
    if (this.ctx.getIsLocked() || isLevelLocked) {
      button.disabled = true;
    }
    if (
      block.kind === "var" &&
      block.variableSourceId?.startsWith("__level_structure__") &&
      block.variableName
    ) {
      setTutorialAnchor(button, `editor-palette-side-structure-${block.variableName}`);
    }
    if (block.kind === "value") {
      setTutorialAnchor(button, "editor-palette-base-literal");
    }
    button.addEventListener("pointerdown", (event) => {
      if (this.ctx.getIsLocked() || isLevelLocked) {
        return;
      }
      const rect = button.getBoundingClientRect();
      this.ctx.onStartPaletteDrag(event, block, rect);
    });
    list.appendChild(button);
  }

  private createLaneGroupsContainer(
    lane: PaletteLaneId,
    className: string
  ): HTMLElement {
    const groups = document.createElement("div");
    groups.className = className;
    const groupOrder = this.getGroupOrderForLane(lane);
    const laneBlocks = this.getFilteredBlocksByLane(lane);

    let hasVisibleGroup = false;
    groupOrder.forEach((groupId) => {
      const groupBlocks = laneBlocks.filter(
        (block) =>
          this.ctx.getPaletteGroupId(block) === groupId &&
          !this.ctx.getPaletteBlockLimitState(block)?.hide
      );
      if (groupBlocks.length === 0) {
        return;
      }
      hasVisibleGroup = true;

      const section = document.createElement("section");
      section.className = "palette-group";

      const sectionHeading = document.createElement("button");
      sectionHeading.type = "button";
      sectionHeading.className = "palette-group-heading";
      sectionHeading.textContent = this.ctx.getPaletteGroupLabel(groupId);
      if (lane === "base" && groupId === "expressions") {
        setTutorialAnchor(sectionHeading, "editor-palette-group-expressions");
      }
      const isExpanded = this.ctx.isPaletteGroupExpanded(lane, groupId);
      sectionHeading.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      sectionHeading.addEventListener("click", () => {
        this.ctx.togglePaletteGroupExpanded(lane, groupId);
      });
      section.appendChild(sectionHeading);

      const list = document.createElement("div");
      list.className = "palette-list palette-group-list";
      list.hidden = !isExpanded;
      if (!isExpanded) {
        section.classList.add("collapsed");
      }

      if (groupId === "variables") {
        const declaredVariableBlocks = groupBlocks.filter((block) => block.kind === "var");
        const variableToolBlocks = groupBlocks.filter((block) => block.kind !== "var");

        if (lane === "scope") {
          const globalScopeBlocks = declaredVariableBlocks.filter(
            (block) => block.variableSourceId?.startsWith("__level_structure__") === true
          );
          const routineScopeBlocks = declaredVariableBlocks.filter(
            (block) => !block.variableSourceId?.startsWith("__level_structure__")
          );

          if (globalScopeBlocks.length > 0) {
            const globalHeading = document.createElement("div");
            globalHeading.className = "palette-subgroup-heading";
            globalHeading.textContent = this.ctx.getVariableScopeLabel("global");
            list.appendChild(globalHeading);
            globalScopeBlocks.forEach((block) => this.appendPaletteButton(list, block));
          }

          if (routineScopeBlocks.length > 0) {
            const routineHeading = document.createElement("div");
            routineHeading.className = "palette-subgroup-heading";
            routineHeading.textContent = this.ctx.getVariableScopeLabel("routine");
            list.appendChild(routineHeading);
            routineScopeBlocks.forEach((block) => this.appendPaletteButton(list, block));
          }
        } else {
          variableToolBlocks.forEach((block) => this.appendPaletteButton(list, block));
          declaredVariableBlocks.forEach((block) => this.appendPaletteButton(list, block));
        }
      } else {
        groupBlocks.forEach((block) => this.appendPaletteButton(list, block));
      }

      section.appendChild(list);
      groups.appendChild(section);
    });

    if (!hasVisibleGroup) {
      const empty = document.createElement("div");
      empty.className = "palette-empty-state";
      empty.textContent = this.ctx.getEmptyPaletteLaneText();
      groups.appendChild(empty);
    }

    return groups;
  }

  public renderLeft(container: HTMLElement): void {
    const isEmpty = !this.hasVisibleBlocksInLane("base");
    const isCollapsed = this.ctx.getIsBasePaletteCollapsed();
    container.classList.toggle("palette-left-collapsed", isCollapsed || isEmpty);
    const palette = document.createElement("aside");
    palette.className = "scratch-palette scratch-palette-left";
    setTutorialAnchor(palette, "editor-palette-base");
    if (this.ctx.getIsActiveRoutineFunction()) {
      palette.classList.add("function-routine");
    }
    if (this.ctx.getIsActiveRoutineType()) {
      palette.classList.add("type-routine");
    }
    if (isCollapsed || isEmpty) {
      palette.classList.add("collapsed");
    }
    palette.appendChild(
      this.createPanelHeader(this.ctx.getPaletteLaneLabel("base"), isCollapsed || isEmpty, isEmpty, "left", () => {
        this.ctx.setIsBasePaletteCollapsed(!isCollapsed);
      })
    );

    const body = document.createElement("div");
    body.className = "palette-panel-body";
    if (!isCollapsed && !isEmpty) {
      setTutorialAnchor(body, "editor-palette-base-body");
      const heading = document.createElement("div");
      heading.className = "builder-heading";
      heading.innerHTML = `<strong>${this.ctx.getBlocksHeadingText()}</strong><span>${this.ctx.getDragHintText()}</span>`;
      body.appendChild(heading);
      const groups = this.createLaneGroupsContainer("base", "palette-groups palette-main-groups");
      body.appendChild(groups);
    }

    palette.appendChild(body);
    container.appendChild(palette);
  }

  public renderRight(container: HTMLElement): void {
    const isEmpty = !this.hasVisibleBlocksInLane("scope", "created");
    const isCollapsed = this.ctx.getIsSidePaletteCollapsed();
    container.classList.toggle("palette-right-collapsed", isCollapsed || isEmpty);
    const palette = document.createElement("aside");
    palette.className = "scratch-palette scratch-palette-right";
    setTutorialAnchor(palette, "editor-palette-side");
    if (this.ctx.getIsActiveRoutineFunction()) {
      palette.classList.add("function-routine");
    }
    if (this.ctx.getIsActiveRoutineType()) {
      palette.classList.add("type-routine");
    }
    if (isCollapsed || isEmpty) {
      palette.classList.add("collapsed");
    }
    palette.appendChild(
      this.createPanelHeader(
        this.ctx.getPaletteSidePanelLabel(),
        isCollapsed || isEmpty,
        isEmpty,
        "right",
        () => {
          this.ctx.setIsSidePaletteCollapsed(!isCollapsed);
        }
      )
    );

    const body = document.createElement("div");
      body.className = "palette-panel-body";
      if (!isCollapsed && !isEmpty) {
        setTutorialAnchor(body, "editor-palette-side-body");
        const sideStack = document.createElement("div");
        sideStack.className = "palette-side-stack";

      if (this.hasVisibleBlocksInLane("scope")) {
        const scopeGroups = this.createLaneGroupsContainer("scope", "palette-groups palette-side-groups");
        sideStack.appendChild(scopeGroups);
      }

      if (this.hasVisibleBlocksInLane("created")) {
        const createdGroups = this.createLaneGroupsContainer("created", "palette-groups palette-side-groups");
        sideStack.appendChild(createdGroups);
      }

      body.appendChild(sideStack);
    }

    palette.appendChild(body);
    container.appendChild(palette);
  }
}
