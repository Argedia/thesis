import type { WheelOption, WheelState } from "../contracts/types";
import { t } from "../../i18n-helpers";

type OpGroupKey = "insert" | "extract" | "query" | "mutate";

const OP_GROUPS: Record<string, OpGroupKey> = {
  PUSH: "insert", ENQUEUE: "insert", APPEND: "insert",
  PREPEND: "insert", INSERT_AT: "insert",
  POP: "extract", DEQUEUE: "extract", REMOVE_FIRST: "extract",
  REMOVE_LAST: "extract", REMOVE_AT: "extract",
  PEEK: "query", SIZE: "query", IS_EMPTY: "query",
  GET_HEAD: "query", GET_TAIL: "query",
  GET_AT: "query", CONTAINS: "query", FIND: "query",
  REVERSE: "mutate", CLEAR: "mutate",
};

const GROUP_ORDER: OpGroupKey[] = ["insert", "extract", "query", "mutate"];

const translateGroupKey = (key: OpGroupKey): string => {
  switch (key) {
    case "insert": return t("editor.opGroupInsert");
    case "extract": return t("editor.opGroupExtract");
    case "query": return t("editor.opGroupQuery");
    case "mutate": return t("editor.opGroupMutate");
  }
};

const labelToOpKey = (label: string): string => {
  const part = label.includes(".") ? label.split(".").pop()! : label;
  return part.toUpperCase().replace(/ /g, "_");
};

const groupOptions = (options: WheelOption[]): Map<string, WheelOption[]> => {
  const groups = new Map<string, WheelOption[]>();
  const ungrouped: WheelOption[] = [];

  for (const option of options) {
    const opKey = labelToOpKey(option.label);
    const group = OP_GROUPS[opKey];
    if (group) {
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(option);
    } else {
      ungrouped.push(option);
    }
  }

  if (ungrouped.length > 0) groups.set("__top__", ungrouped);

  const ordered = new Map<string, WheelOption[]>();
  if (groups.has("__top__")) ordered.set("__top__", groups.get("__top__")!);
  for (const g of GROUP_ORDER) {
    if (groups.has(g)) ordered.set(g, groups.get(g)!);
  }
  for (const [k, v] of groups) {
    if (!ordered.has(k)) ordered.set(k, v);
  }

  return ordered;
};

export class PaletteOverlayRenderer {
  private activeIndex = 0;
  private query = "";
  private allOptions: WheelOption[] = [];
  private onCloseExternal: (() => void) | null = null;

  public render(
    container: HTMLElement,
    wheelState: WheelState,
    options: WheelOption[]
  ): void {
    this.allOptions = options;
    this.activeIndex = 0;
    this.query = "";

    const overlay = document.createElement("div");
    overlay.className = "op-palette-overlay";
    overlay.dataset.blockId = wheelState.blockId;
    overlay.style.left = `${wheelState.x}px`;
    overlay.style.top = `${wheelState.y}px`;
    overlay.tabIndex = -1;

    // Query display strip — only visible while typing
    const queryStrip = document.createElement("div");
    queryStrip.className = "op-palette-query-strip hidden";
    overlay.appendChild(queryStrip);

    // Options list
    const listEl = document.createElement("div");
    listEl.className = "op-palette-list";
    overlay.appendChild(listEl);

    const renderList = () => {
      listEl.innerHTML = "";
      const q = this.query.toLowerCase().trim();
      const filtered = this.allOptions.filter(o => !q || o.label.toLowerCase().includes(q));

      // Update query strip
      if (q) {
        queryStrip.textContent = this.query;
        queryStrip.classList.remove("hidden");
      } else {
        queryStrip.classList.add("hidden");
      }

      if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.className = "op-palette-empty";
        empty.textContent = t("messages.noResults");
        listEl.appendChild(empty);
        this.activeIndex = 0;
        return;
      }

      const grouped = groupOptions(filtered);
      let itemCount = 0;

      grouped.forEach((groupOpts, groupName) => {
        if (groupName !== "__top__") {
          const header = document.createElement("div");
          header.className = "op-palette-group-header";
          header.textContent = translateGroupKey(groupName as OpGroupKey);
          listEl.appendChild(header);
        }

        groupOpts.forEach(option => {
          const item = document.createElement("button");
          item.type = "button";
          item.className = `op-palette-item ${option.className ?? ""}${option.disabled ? " disabled" : ""}`;
          item.dataset.itemIndex = String(itemCount++);
          if (option.disabled) item.disabled = true;

          const label = option.label;
          if (label.includes(".")) {
            const [prefix, opName] = label.split(/\.(.+)/);
            const prefixSpan = document.createElement("span");
            prefixSpan.className = "op-palette-item-prefix";
            prefixSpan.textContent = prefix + ".";
            const nameSpan = document.createElement("span");
            nameSpan.className = "op-palette-item-name";
            nameSpan.textContent = opName ?? "";
            item.appendChild(prefixSpan);
            item.appendChild(nameSpan);
          } else {
            item.textContent = label;
          }

          if (!option.disabled) {
            item.addEventListener("pointerdown", (e) => {
              e.stopPropagation();
              option.onSelect();
              this.close(container);
            });
          }

          if (option.className?.includes("selected")) item.classList.add("active");

          listEl.appendChild(item);
        });
      });

      this.activeIndex = Math.min(this.activeIndex, itemCount - 1);
      this.updateHighlight(listEl);
    };

    renderList();

    const onKeyDown = (e: KeyboardEvent) => {
      const items = listEl.querySelectorAll<HTMLButtonElement>(".op-palette-item:not(.disabled)");

      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, items.length - 1);
        this.updateHighlight(listEl);
        items[this.activeIndex]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this.updateHighlight(listEl);
        items[this.activeIndex]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        items[this.activeIndex]?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      } else if (e.key === "Escape") {
        this.close(container);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        this.query = this.query.slice(0, -1);
        this.activeIndex = 0;
        renderList();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.query += e.key;
        this.activeIndex = 0;
        renderList();
      }
    };

    overlay.addEventListener("keydown", onKeyDown);

    const onOutside = (e: PointerEvent) => {
      if (!overlay.contains(e.target as Node)) {
        this.close(container);
        document.removeEventListener("pointerdown", onOutside, true);
      }
    };
    document.addEventListener("pointerdown", onOutside, true);
    this.onCloseExternal = () => {
      document.removeEventListener("pointerdown", onOutside, true);
    };

    container.appendChild(overlay);
    requestAnimationFrame(() => overlay.focus());
  }

  private updateHighlight(listEl: HTMLElement): void {
    const items = listEl.querySelectorAll<HTMLButtonElement>(".op-palette-item:not(.disabled)");
    items.forEach((item, i) => {
      item.classList.toggle("keyboard-active", i === this.activeIndex);
    });
  }

  private close(container: HTMLElement): void {
    this.onCloseExternal?.();
    container.querySelector(".op-palette-overlay")?.remove();
  }
}
