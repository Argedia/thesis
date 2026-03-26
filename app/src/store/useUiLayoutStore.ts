import { create } from "zustand";
import type { EditorPanelId, PlayerPanelId } from "@thesis/game-system";
import type { UiPreferencesData } from "@thesis/storage";

export interface PlayerLayoutState {
  activePanel: PlayerPanelId;
  isSecondaryPanelOpen: boolean;
}

export interface EditorLayoutState {
  leftPanel: EditorPanelId;
  rightPanel: EditorPanelId;
  bottomPanel: EditorPanelId;
  openTabs: EditorPanelId[];
}

interface UiLayoutStore {
  player: PlayerLayoutState;
  editor: EditorLayoutState;
  setPlayerActivePanel: (panel: PlayerPanelId) => void;
  togglePlayerSecondaryPanel: () => void;
  setEditorPanel: (
    target: "leftPanel" | "rightPanel" | "bottomPanel",
    panel: EditorPanelId
  ) => void;
  setEditorOpenTabs: (tabs: EditorPanelId[]) => void;
  hydrate: (data: UiPreferencesData) => void;
  toPreferences: () => UiPreferencesData;
}

const defaultPlayer: PlayerLayoutState = {
  activePanel: "board",
  isSecondaryPanelOpen: false
};

const defaultEditor: EditorLayoutState = {
  leftPanel: "palette",
  rightPanel: "inspector",
  bottomPanel: "timeline",
  openTabs: ["canvas", "preview"]
};

export const useUiLayoutStore = create<UiLayoutStore>((set, get) => ({
  player: defaultPlayer,
  editor: defaultEditor,
  setPlayerActivePanel: (panel) =>
    set((state) => ({
      player: {
        ...state.player,
        activePanel: panel
      }
    })),
  togglePlayerSecondaryPanel: () =>
    set((state) => ({
      player: {
        ...state.player,
        isSecondaryPanelOpen: !state.player.isSecondaryPanelOpen
      }
    })),
  setEditorPanel: (target, panel) =>
    set((state) => ({
      editor: {
        ...state.editor,
        [target]: panel
      }
    })),
  setEditorOpenTabs: (tabs) =>
    set((state) => ({
      editor: {
        ...state.editor,
        openTabs: tabs
      }
    })),
  hydrate: (data) =>
    set({
      player: data.player,
      editor: data.editor
    }),
  toPreferences: () => ({
    player: get().player,
    editor: get().editor
  })
}));
