import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Screen } from "@thesis/ui-editor";
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
      title: "Nombre del nivel",
      initialValue: "Nuevo nivel",
      validate: (value) => (value.trim() ? null : "El nombre no puede estar vacío.")
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
          <Link className="back-link" to={APP_ROUTES.home}>Menu</Link>
          <div>
            <p className="eyebrow">Editor</p>
            <h1>Mis niveles</h1>
          </div>
          <button type="button" className="menu-link" onClick={() => void handleCreate()}>
            + Nuevo nivel
          </button>
        </header>
        <section className="editor-drafts-list">
          {drafts.length === 0 ? (
            <article className="editor-draft-card">
              <h2>No hay niveles guardados</h2>
              <p>Crea un nivel para comenzar.</p>
            </article>
          ) : (
            drafts.map((draft) => (
              <article key={draft.id} className="editor-draft-card">
                <div className="editor-draft-card-head">
                  <h2>{draft.name}</h2>
                  <span className={`mini-tag ${draft.publishedAt ? "is-published" : "is-draft"}`}>
                    {draft.publishedAt ? "Publicado" : "Borrador"}
                  </span>
                </div>
                <p>Última edición: {formatDate(draft.updatedAt)}</p>
                {draft.publishedAt ? (
                  <p>Publicado: {formatDate(draft.publishedAt)}</p>
                ) : null}
                <div className="editor-draft-card-actions">
                  <button
                    type="button"
                    className="menu-link"
                    onClick={() => navigate(buildEditorDraftRoute(draft.id))}
                  >
                    Abrir editor
                  </button>
                  <button
                    type="button"
                    className="menu-link danger"
                    onClick={() => handleDelete(draft.id)}
                  >
                    Eliminar
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
