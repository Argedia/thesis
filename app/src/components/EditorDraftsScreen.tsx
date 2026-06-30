import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Screen } from "@thesis/ui-editor";
import { APP_ROUTES, buildEditorDraftRoute } from "../types/routes";
import { useDialogManager } from "../features/play-ui/useDialogManager";
import { AppDialogs } from "../features/play-ui/AppDialogs";
import { ScreenHeader } from "./ui/ScreenHeader";
import { tutorialAnchorProps } from "../features/tutorial/anchors";
import {
  createEditorDraftRecord,
  deleteEditorDraftRecord,
  listEditorDraftRecords,
  saveEditorDraftRecord,
  seedInitialExampleDraftRecords
} from "../features/level-editor-drafts/storage";
import type { LevelEditorDraftRecord } from "../features/level-editor-drafts/types";

const formatDate = (rawIso: string): string => {
  try {
    return new Date(rawIso).toLocaleString();
  } catch {
    return rawIso;
  }
};

export function EditorDraftsScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dialog = useDialogManager();
  const [drafts, setDrafts] = useState<LevelEditorDraftRecord[]>([]);

  const refreshDrafts = () => {
    setDrafts(listEditorDraftRecords());
  };

  useEffect(() => {
    seedInitialExampleDraftRecords();
    refreshDrafts();
    const onFocus = () => refreshDrafts();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleCreate = async () => {
    const requestedName = await dialog.requestTextInput({
      title: t("drafts.newLevelPrompt"),
      initialValue: t("drafts.newLevelDefault"),
      validate: (value) => (value.trim() ? null : t("drafts.nameRequired"))
    });
    if (requestedName === null) return;
    const draft = createEditorDraftRecord(requestedName);
    saveEditorDraftRecord(draft);
    navigate(buildEditorDraftRoute(draft.id), { state: { returnTo: APP_ROUTES.editor } });
  };

  const handleDelete = (id: string) => {
    deleteEditorDraftRecord(id);
    refreshDrafts();
  };

  return (
    <Screen mode="editor">
      <main className="editor-drafts-shell">
        <ScreenHeader
          backLabel="Menu"
          backTo={APP_ROUTES.home}
          eyebrow="Editor"
          title={t("drafts.title")}
          className="editor-drafts-topbar"
          tutorialAnchorId="editor-drafts-topbar"
          actions={
            <div className="editor-drafts-topbar-actions" {...tutorialAnchorProps("editor-drafts-actions")}>
              <button
                type="button"
                className="menu-link editor-drafts-create-button"
                onClick={() => void handleCreate()}
                aria-label={t("drafts.newLevel")}
                title={t("drafts.newLevel")}
              >
                <Plus size={20} aria-hidden="true" />
                <span>{t("drafts.newLevel")}</span>
              </button>
            </div>
          }
        />
        <section
          className="editor-drafts-list"
          {...tutorialAnchorProps("editor-drafts-list")}
        >
          {drafts.length === 0 ? (
            <article className="editor-draft-card">
              <h2>{t("drafts.emptyTitle")}</h2>
              <p>{t("drafts.emptyBody")}</p>
            </article>
          ) : (
            drafts.map((draft) => (
              <article key={draft.id} className="editor-draft-card">
                <div className="editor-draft-card-head">
                  <div className="editor-draft-card-title-group">
                    <h2>{draft.name}</h2>
                    <p>{draft.publishedAt ? t("drafts.publishedAt", { date: formatDate(draft.publishedAt) }) : t("drafts.lastEdited", { date: formatDate(draft.updatedAt) })}</p>
                  </div>
                  <div className="editor-draft-card-head-actions">
                    <span className={`mini-tag ${draft.publishedAt ? "is-published" : "is-draft"}`}>
                      {draft.publishedAt ? t("drafts.publishedBadge") : t("drafts.draftBadge")}
                    </span>
                    <button
                      type="button"
                      className="icon-only-button icon-only-button-danger editor-draft-delete-button"
                      onClick={() => handleDelete(draft.id)}
                      aria-label={t("drafts.deleteLevel", { name: draft.name })}
                      title={t("drafts.deleteAction")}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="editor-draft-card-actions">
                  <button
                    type="button"
                    className="menu-link"
                    onClick={() => navigate(buildEditorDraftRoute(draft.id), { state: { returnTo: APP_ROUTES.editor } })}
                  >
                    {t("drafts.openEditor")}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
        <AppDialogs dialog={dialog} />
      </main>
    </Screen>
  );
}
