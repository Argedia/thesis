import type { PaletteBlock } from "../model";
import type { PaletteGroupId } from "../BlockMetadata";
import { getBlockAccentClass } from "./blockAccent";

export type PaletteLaneId = "base" | "scope" | "created";

export interface PaletteRendererContext {
  getPaletteBlocks(): PaletteBlock[];
  getIsActiveRoutineFunction(): boolean;
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
  getEmptyPaletteLaneText(): string;
  isPaletteGroupExpanded(lane: PaletteLaneId, groupId: PaletteGroupId): boolean;
  togglePaletteGroupExpanded(lane: PaletteLaneId, groupId: PaletteGroupId): void;
  getPaletteGroupId(block: PaletteBlock): PaletteGroupId;
  getPaletteGroupLabel(groupId: PaletteGroupId): string;
  getFunctionTypeExclusiveHintText(): string;
  getVariableSubgroupLabel(kind: "declared" | "tools"): string;
  getVariableScopeLabel(kind: "global" | "routine"): string;
  getDefinitionDescriptor(block: PaletteBlock): { chip?: string; label: string };
  getBlockLimitForPaletteBlock(block: PaletteBlock): number | null;
  adjustBlockLimitForPaletteBlock(block: PaletteBlock, delta: number): void;
  getBlocksHeadingText(): string;
  getDragHintText(): string;
  applyBlockColor(element: HTMLElement, color?: string): void;
  onStartPaletteDrag(event: PointerEvent, block: PaletteBlock, rect: DOMRect): void;
}

export class PaletteRenderer {
  public constructor(private readonly ctx: PaletteRendererContext) {}

  private createPanelHeader(
    title: string,
    isCollapsed: boolean,
    side: "left" | "right",
    onToggle: () => void
  ): HTMLDivElement {
    const header = document.createElement("div");
    header.className = "ide-output-tabs palette-panel-tabs";

    const label = document.createElement("span");
    label.className = "ide-output-tab active palette-panel-title";
    label.textContent = title.toUpperCase();
    header.appendChild(label);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "ide-output-toggle palette-panel-toggle";
    toggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    toggle.setAttribute("aria-label", isCollapsed ? "Expand panel" : "Collapse panel");
    if (side === "left") {
      toggle.textContent = isCollapsed ? "▸" : "◂";
    } else {
      toggle.textContent = isCollapsed ? "◂" : "▸";
    }
    toggle.addEventListener("click", onToggle);
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
    if (block.kind === "var_read") {
      return "scope";
    }
    return "base";
  }

  private getFilteredBlocksByLane(lane: PaletteLaneId): PaletteBlock[] {
    return this.ctx.getPaletteBlocks().filter((block) => this.getBlockLane(block) === lane);
  }

  private appendPaletteButton(list: HTMLElement, block: PaletteBlock): void {
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

    const descriptor = this.ctx.getDefinitionDescriptor(block);
    if (descriptor.chip) {
      const chip = document.createElement("span");
      chip.className = "block-chip";
      chip.textContent = descriptor.chip;
      button.appendChild(chip);
    }
    const title = document.createElement("strong");
    title.textContent = descriptor.label;
    button.appendChild(title);

    const limit = this.ctx.getBlockLimitForPaletteBlock(block);
    if (limit !== null) {
      const controls = document.createElement("span");
      controls.className = "palette-limit-controls";

      const decrement = document.createElement("span");
      decrement.className = "palette-limit-step";
      decrement.textContent = "-";
      if (limit <= 0 || this.ctx.getIsLocked()) {
        decrement.classList.add("disabled");
      }
      decrement.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        event.preventDefault();
        if (this.ctx.getIsLocked() || limit <= 0) {
          return;
        }
        this.ctx.adjustBlockLimitForPaletteBlock(block, -1);
      });
      controls.appendChild(decrement);

      const value = document.createElement("span");
      value.className = "palette-limit-value";
      value.textContent = String(limit);
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
    }

    if (this.ctx.getIsLocked()) {
      button.disabled = true;
    }
    button.addEventListener("pointerdown", (event) => {
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
      const groupBlocks = laneBlocks.filter((block) => this.ctx.getPaletteGroupId(block) === groupId);
      hasVisibleGroup = true;

      const section = document.createElement("section");
      section.className = "palette-group";

      const sectionHeading = document.createElement("button");
      sectionHeading.type = "button";
      sectionHeading.className = "palette-group-heading";
      sectionHeading.textContent = this.ctx.getPaletteGroupLabel(groupId);
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

      if (groupBlocks.length === 0) {
        const emptyGroup = document.createElement("div");
        emptyGroup.className = "palette-empty-state";
        const hasDefinitionConflict =
          lane === "base" &&
          (groupId === "functions" || groupId === "types") &&
          (this.ctx.getHasFunctionDefinition() || this.ctx.getHasTypeDefinition());
        emptyGroup.textContent = hasDefinitionConflict
          ? this.ctx.getFunctionTypeExclusiveHintText()
          : this.ctx.getEmptyPaletteLaneText();
        list.appendChild(emptyGroup);
      } else if (groupId === "variables") {
        const declaredVariableBlocks = groupBlocks.filter((block) => block.kind === "var_read");
        const variableToolBlocks = groupBlocks.filter((block) => block.kind !== "var_read");

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
          if (variableToolBlocks.length > 0) {
            const toolHeading = document.createElement("div");
            toolHeading.className = "palette-subgroup-heading";
            toolHeading.textContent = this.ctx.getVariableSubgroupLabel("tools");
            list.appendChild(toolHeading);
            variableToolBlocks.forEach((block) => this.appendPaletteButton(list, block));
          }

          if (declaredVariableBlocks.length > 0) {
            const declaredHeading = document.createElement("div");
            declaredHeading.className = "palette-subgroup-heading";
            declaredHeading.textContent = this.ctx.getVariableSubgroupLabel("declared");
            list.appendChild(declaredHeading);
            declaredVariableBlocks.forEach((block) => this.appendPaletteButton(list, block));
          }
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
    container.classList.toggle("palette-left-collapsed", this.ctx.getIsBasePaletteCollapsed());
    const palette = document.createElement("aside");
    palette.className = "scratch-palette scratch-palette-left";
    if (this.ctx.getIsActiveRoutineFunction()) {
      palette.classList.add("function-routine");
    }
    if (this.ctx.getIsBasePaletteCollapsed()) {
      palette.classList.add("collapsed");
    }

    const isCollapsed = this.ctx.getIsBasePaletteCollapsed();
    palette.appendChild(
      this.createPanelHeader(this.ctx.getPaletteLaneLabel("base"), isCollapsed, "left", () => {
        this.ctx.setIsBasePaletteCollapsed(!isCollapsed);
      })
    );

    const body = document.createElement("div");
    body.className = "palette-panel-body";
    if (!isCollapsed) {
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
    container.classList.toggle("palette-right-collapsed", this.ctx.getIsSidePaletteCollapsed());
    const palette = document.createElement("aside");
    palette.className = "scratch-palette scratch-palette-right";
    if (this.ctx.getIsActiveRoutineFunction()) {
      palette.classList.add("function-routine");
    }
    if (this.ctx.getIsSidePaletteCollapsed()) {
      palette.classList.add("collapsed");
    }

    const isCollapsed = this.ctx.getIsSidePaletteCollapsed();
    palette.appendChild(
      this.createPanelHeader(
        `${this.ctx.getPaletteLaneLabel("scope")} + ${this.ctx.getPaletteLaneLabel("created")}`,
        isCollapsed,
        "right",
        () => {
          this.ctx.setIsSidePaletteCollapsed(!isCollapsed);
        }
      )
    );

    const body = document.createElement("div");
    body.className = "palette-panel-body";
    if (!isCollapsed) {
      const sideStack = document.createElement("div");
      sideStack.className = "palette-side-stack";

      const scopeSection = document.createElement("section");
      scopeSection.className = "palette-side-section";
      const scopeHeading = document.createElement("h4");
      scopeHeading.className = "palette-side-heading";
      scopeHeading.textContent = this.ctx.getPaletteLaneLabel("scope");
      scopeSection.appendChild(scopeHeading);
      scopeSection.appendChild(this.createLaneGroupsContainer("scope", "palette-groups palette-side-groups"));
      sideStack.appendChild(scopeSection);

      const createdSection = document.createElement("section");
      createdSection.className = "palette-side-section";
      const createdHeading = document.createElement("h4");
      createdHeading.className = "palette-side-heading";
      createdHeading.textContent = this.ctx.getPaletteLaneLabel("created");
      createdSection.appendChild(createdHeading);
      createdSection.appendChild(this.createLaneGroupsContainer("created", "palette-groups palette-side-groups"));
      sideStack.appendChild(createdSection);

      body.appendChild(sideStack);
    }

    palette.appendChild(body);
    container.appendChild(palette);
  }
}
