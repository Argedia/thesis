import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Screen } from "@thesis/ui-editor";
import { useTranslation } from "react-i18next";
import { APP_ROUTES, buildEditorDraftRoute } from "../types/routes";
import { useDialogManager } from "../features/play-ui/useDialogManager";
import { AppDialogs } from "../features/play-ui/AppDialogs";
import {
  createEditorDraftRecord,
  deleteEditorDraftRecord,
  listEditorDraftRecords,
  saveEditorDraftRecord
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dialog = useDialogManager();
  const [drafts, setDrafts] = useState<LevelEditorDraftRecord[]>([]);

  const refreshDrafts = () => {
    setDrafts(listEditorDraftRecords());
  };

  useEffect(() => {
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
    navigate(buildEditorDraftRoute(draft.id));
  };

  const handleDelete = (id: string) => {
    deleteEditorDraftRecord(id);
    refreshDrafts();
  };

  return (
    <Screen mode="editor">
      <main className="editor-drafts-shell">
        <header className="topbar primary-screen-topbar editor-drafts-topbar">
          <Link className="back-link" to={APP_ROUTES.home}>{t("common.menu")}</Link>
          <div>
            <p className="eyebrow">{t("menu.editor")}</p>
            <h1>{t("drafts.title")}</h1>
          </div>
          <button type="button" className="menu-link" onClick={() => void handleCreate()}>
            + {t("drafts.newLevel")}
          </button>
        </header>
        <section className="editor-drafts-list">
          {drafts.length === 0 ? (
            <article className="editor-draft-card">
              <h2>{t("drafts.emptyTitle")}</h2>
              <p>{t("drafts.emptyBody")}</p>
            </article>
          ) : (
            drafts.map((draft) => (
              <article key={draft.id} className="editor-draft-card">
                <div className="editor-draft-card-head">
                  <h2>{draft.name}</h2>
                  <span className={`mini-tag ${draft.publishedAt ? "is-published" : "is-draft"}`}>
                    {draft.publishedAt ? t("common.published") : t("common.draft")}
                  </span>
                </div>
                <p>{t("drafts.lastEdited", { date: formatDate(draft.updatedAt) })}</p>
                {draft.publishedAt ? (
                  <p>{t("drafts.publishedAt", { date: formatDate(draft.publishedAt) })}</p>
                ) : null}
                <div className="editor-draft-card-actions">
                  <button
                    type="button"
                    className="menu-link"
                    onClick={() => navigate(buildEditorDraftRoute(draft.id))}
                  >
                    {t("drafts.openEditor")}
                  </button>
                  <button
                    type="button"
                    className="menu-link danger"
                    onClick={() => handleDelete(draft.id)}
                  >
                    {t("common.delete")}
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
