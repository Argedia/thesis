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
  getPaletteLaneLabel(lane: PaletteLaneId): string;
  getEmptyPaletteLaneText(): string;
  isPaletteGroupExpanded(groupId: PaletteGroupId): boolean;
  togglePaletteGroupExpanded(groupId: PaletteGroupId): void;
  getPaletteGroupId(block: PaletteBlock): PaletteGroupId;
  getPaletteGroupLabel(groupId: PaletteGroupId): string;
  getFunctionTypeExclusiveHintText(): string;
  getVariableSubgroupLabel(kind: "declared" | "tools"): string;
  getDefinitionDescriptor(block: PaletteBlock): { chip?: string; label: string };
  getBlocksHeadingText(): string;
  getDragHintText(): string;
  applyBlockColor(element: HTMLElement, color?: string): void;
  onStartPaletteDrag(event: PointerEvent, block: PaletteBlock, rect: DOMRect): void;
}

export class PaletteRenderer {
  public constructor(private readonly ctx: PaletteRendererContext) {}

  private getGroupOrderForLane(lane: PaletteLaneId): PaletteGroupId[] {
    switch (lane) {
      case "scope":
        return ["variables", "types"];
      case "created":
        return ["functions", "types"];
      case "base":
      default:
        return [
          "structures",
          "expressions",
          "logic",
          "functions",
          "types",
          "variables"
        ];
    }
  }

  private getBlockLane(block: PaletteBlock): PaletteLaneId {
    if (
      block.kind === "routine_call" ||
      block.kind === "routine_value" ||
      block.kind === "routine_member" ||
      block.kind === "type_instance_new"
    ) {
      return "created";
    }
    if (block.kind === "var_read" || block.kind === "type_field_read" || block.kind === "type_field_assign") {
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

    if (this.ctx.getIsLocked()) {
      button.disabled = true;
    }
    button.addEventListener("pointerdown", (event) => {
      const rect = button.getBoundingClientRect();
      this.ctx.onStartPaletteDrag(event, block, rect);
    });
    list.appendChild(button);
  }

  public render(container: HTMLElement): void {
    const palette = document.createElement("aside");
    palette.className = "scratch-palette";
    if (this.ctx.getIsActiveRoutineFunction()) {
      palette.classList.add("function-routine");
    }

    const heading = document.createElement("div");
    heading.className = "builder-heading";
    heading.innerHTML = `<strong>${this.ctx.getBlocksHeadingText()}</strong><span>${this.ctx.getDragHintText()}</span>`;
    palette.appendChild(heading);

    const lanesShell = document.createElement("div");
    lanesShell.className = "palette-lanes-shell";

    const laneRail = document.createElement("nav");
    laneRail.className = "palette-lane-rail";
    const laneIds: PaletteLaneId[] = ["base", "scope", "created"];
    const selectedLane = this.ctx.getSelectedPaletteLane();
    laneIds.forEach((laneId) => {
      const laneButton = document.createElement("button");
      laneButton.type = "button";
      laneButton.className = "palette-lane-pill";
      if (selectedLane === laneId) {
        laneButton.classList.add("active");
      }
      laneButton.textContent = this.ctx.getPaletteLaneLabel(laneId);
      laneButton.addEventListener("click", () => {
        this.ctx.setSelectedPaletteLane(laneId);
      });
      laneRail.appendChild(laneButton);
    });

    lanesShell.appendChild(laneRail);

    const groups = document.createElement("div");
    groups.className = "palette-groups";
    lanesShell.appendChild(groups);

    const groupOrder = this.getGroupOrderForLane(selectedLane);

    const laneBlocks = this.getFilteredBlocksByLane(selectedLane);

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
      const isExpanded = this.ctx.isPaletteGroupExpanded(groupId);
      sectionHeading.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      sectionHeading.addEventListener("click", () => {
        this.ctx.togglePaletteGroupExpanded(groupId);
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
          selectedLane === "base" &&
          (groupId === "functions" || groupId === "types") &&
          (this.ctx.getHasFunctionDefinition() || this.ctx.getHasTypeDefinition());
        emptyGroup.textContent = hasDefinitionConflict
          ? this.ctx.getFunctionTypeExclusiveHintText()
          : this.ctx.getEmptyPaletteLaneText();
        list.appendChild(emptyGroup);
      } else if (groupId === "variables") {
        const declaredVariableBlocks = groupBlocks.filter((block) => block.kind === "var_read");
        const variableToolBlocks = groupBlocks.filter((block) => block.kind !== "var_read");

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

    palette.appendChild(lanesShell);
    container.appendChild(palette);
  }
}
