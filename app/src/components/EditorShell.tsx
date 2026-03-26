import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { EditorPanelId, LevelDefinition } from "@thesis/game-system";
import { JsonLevelRepository } from "@thesis/storage";
import {
  InspectorPanel,
  LevelEditorCanvas,
  Panel,
  Screen,
  SplitPane,
  StructurePalette,
  TabBar,
  Workspace,
  type TabBarItem
} from "@thesis/ui-editor";
import { APP_ROUTES } from "../types/routes";
import { useUiLayoutStore } from "../store/useUiLayoutStore";

const levelRepository = new JsonLevelRepository();

const editorTabs: TabBarItem<EditorPanelId>[] = [
  { id: "canvas", label: "Canvas" },
  { id: "preview", label: "Preview" },
  { id: "timeline", label: "Timeline" }
];

export interface EditorShellProps {}

const renderEditorPanel = (panel: EditorPanelId) => {
  switch (panel) {
    case "palette":
      return <StructurePalette />;
    case "inspector":
      return <InspectorPanel />;
    case "preview":
      return <Panel title="Preview"><p>Desktop preview stub</p></Panel>;
    case "timeline":
      return <Panel title="Timeline"><p>Editor timeline stub</p></Panel>;
    case "canvas":
    default:
      return <LevelEditorCanvas />;
  }
};

export function EditorShell(_props: EditorShellProps) {
  const [level, setLevel] = useState<LevelDefinition | null>(null);
  const leftPanel = useUiLayoutStore((state) => state.editor.leftPanel);
  const rightPanel = useUiLayoutStore((state) => state.editor.rightPanel);
  const bottomPanel = useUiLayoutStore((state) => state.editor.bottomPanel);
  const openTabs = useUiLayoutStore((state) => state.editor.openTabs);
  const setEditorPanel = useUiLayoutStore((state) => state.setEditorPanel);
  const setEditorOpenTabs = useUiLayoutStore((state) => state.setEditorOpenTabs);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const loadedLevel = await levelRepository.getLevel("intro-transfer");
      if (!active) {
        return;
      }

      setLevel(loadedLevel);
      setEditorPanel("leftPanel", loadedLevel.editorLayout.leftPanel);
      setEditorPanel("rightPanel", loadedLevel.editorLayout.rightPanel);
      setEditorPanel("bottomPanel", loadedLevel.editorLayout.bottomPanel);
      setEditorOpenTabs(loadedLevel.editorLayout.openTabs);
    };

    void load();
    return () => {
      active = false;
    };
  }, [setEditorOpenTabs, setEditorPanel]);

  const activeTab = openTabs[0] ?? "canvas";

  const centerContent = useMemo(() => renderEditorPanel(activeTab), [activeTab]);

  return (
    <Screen mode="editor">
      <div className="editor-shell">
        <header className="topbar">
          <Link className="back-link" to={APP_ROUTES.home}>
            Menu
          </Link>
          <div>
            <p className="eyebrow">Editor Mode</p>
            <h1>{level?.title ?? "Level Editor"}</h1>
          </div>
        </header>

        <Workspace>
          <SplitPane
            asideWidth="360px"
            primary={
              <div className="editor-grid">
                <TabBar
                  items={editorTabs}
                  activeId={activeTab}
                  onSelect={(panel) => {
                    const nextTabs = [panel, ...openTabs.filter((tab) => tab !== panel)];
                    setEditorOpenTabs(nextTabs);
                  }}
                />
                <div className="editor-middle">
                  <Panel title={`Left: ${leftPanel}`}>{renderEditorPanel(leftPanel)}</Panel>
                  <div>{centerContent}</div>
                  <Panel title={`Right: ${rightPanel}`}>{renderEditorPanel(rightPanel)}</Panel>
                </div>
                <Panel title={`Bottom: ${bottomPanel}`}>{renderEditorPanel(bottomPanel)}</Panel>
              </div>
            }
            secondary={
              <Panel title="Advanced Tools" accent="#ffffff">
                <div className="tool-buttons">
                  <button type="button" onClick={() => setEditorPanel("leftPanel", "palette")}>
                    Palette
                  </button>
                  <button type="button" onClick={() => setEditorPanel("rightPanel", "inspector")}>
                    Inspector
                  </button>
                  <button type="button" onClick={() => setEditorPanel("bottomPanel", "timeline")}>
                    Timeline
                  </button>
                  <button type="button" onClick={() => setEditorOpenTabs(["preview", "canvas"])}>
                    Preview Tabs
                  </button>
                </div>
              </Panel>
            }
          />
        </Workspace>
      </div>
    </Screen>
  );
}
