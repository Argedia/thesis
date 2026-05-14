import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Panel, Screen } from "@thesis/ui-editor";
import { getAppLanguage, setAppLanguage, type SupportedLanguage } from "../i18n";
import { APP_ROUTES } from "../types/routes";
import { getRunLineDelayMs, setRunLineDelayMs } from "../features/settings/execution-speed";
import {
  ALL_LOCAL_STORAGE_KEYS,
  EDITOR_DRAFTS_STORAGE_KEY,
  IMPORTED_LEVELS_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
  UI_PREFERENCES_STORAGE_KEY
} from "../features/settings/local-storage-keys";

interface LocalBackupPayload {
  version: 1;
  createdAt: string;
  keys: Partial<Record<(typeof ALL_LOCAL_STORAGE_KEYS)[number], string>>;
}

const formatNow = (): string => new Date().toISOString().replace(/[:.]/g, "-");

export function SettingsScreen() {
  const { t } = useTranslation();
  const currentLanguage = getAppLanguage();
  const [lineDelayMs, setLineDelayMsState] = useState<number>(() => getRunLineDelayMs());
  const [statusMessage, setStatusMessage] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const localStorageStats = useMemo(
    () => ({
      drafts: window.localStorage.getItem(EDITOR_DRAFTS_STORAGE_KEY) ? "Sí" : "No",
      progress: window.localStorage.getItem(PROGRESS_STORAGE_KEY) ? "Sí" : "No",
      publishedLevels: window.localStorage.getItem(IMPORTED_LEVELS_STORAGE_KEY) ? "Sí" : "No"
    }),
    [statusMessage]
  );

  const handleLanguageChange = (language: SupportedLanguage) => {
    void setAppLanguage(language);
  };

  const resetUiLayout = () => {
    if (!window.confirm("¿Restablecer layout de paneles guardado?")) {
      return;
    }
    window.localStorage.removeItem(UI_PREFERENCES_STORAGE_KEY);
    setStatusMessage("Layout de interfaz restablecido. Recarga para aplicar en todas las vistas.");
  };

  const handleRunDelayChange = (nextRaw: string) => {
    const parsed = Number(nextRaw);
    if (!Number.isFinite(parsed)) return;
    const normalized = setRunLineDelayMs(parsed);
    setLineDelayMsState(normalized);
    setStatusMessage(`Velocidad actualizada: ${normalized} ms por bloque visible.`);
  };

  const exportLocalData = () => {
    const keys: LocalBackupPayload["keys"] = {};
    ALL_LOCAL_STORAGE_KEYS.forEach((key) => {
      const value = window.localStorage.getItem(key);
      if (value !== null) {
        keys[key] = value;
      }
    });
    const payload: LocalBackupPayload = {
      version: 1,
      createdAt: new Date().toISOString(),
      keys
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `vds-local-backup-${formatNow()}.json`;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setStatusMessage("Backup local exportado.");
  };

  const importLocalData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as Partial<LocalBackupPayload>;
      if (parsed?.version !== 1 || !parsed.keys || typeof parsed.keys !== "object") {
        throw new Error("Formato de backup no válido.");
      }
      if (!window.confirm("Importar backup sobreescribirá ajustes locales. ¿Continuar?")) {
        return;
      }
      ALL_LOCAL_STORAGE_KEYS.forEach((key) => {
        const nextValue = parsed.keys?.[key];
        if (typeof nextValue === "string") {
          window.localStorage.setItem(key, nextValue);
        } else {
          window.localStorage.removeItem(key);
        }
      });
      setStatusMessage("Backup importado. Recarga para aplicar completamente.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo importar el backup.");
    }
  };

  const clearProgress = () => {
    if (!window.confirm("¿Eliminar progreso de niveles completados?")) return;
    window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
    setStatusMessage("Progreso eliminado.");
  };

  const clearDrafts = () => {
    if (!window.confirm("¿Eliminar todos los borradores de editor?")) return;
    window.localStorage.removeItem(EDITOR_DRAFTS_STORAGE_KEY);
    setStatusMessage("Borradores eliminados.");
  };

  const resetAllLocalData = () => {
    if (!window.confirm("Esto borrará progreso, borradores, niveles importados y preferencias. ¿Continuar?")) return;
    ALL_LOCAL_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    setStatusMessage("Datos locales restablecidos.");
  };

  return (
    <Screen mode="editor">
      <div className="settings-shell">
        <header className="topbar primary-screen-topbar settings-topbar">
          <Link className="back-link" to={APP_ROUTES.home}>
            {t("menu.menuLabel")}
          </Link>
          <div>
            <p className="eyebrow">{t("settings.sharedSettings")}</p>
            <h1>{t("settings.title")}</h1>
          </div>
        </header>

        <section className="settings-grid">
          <Panel title={t("settings.preferences")}>
            <div className="settings-language-group">
              <p>{t("language")}</p>
              <div className="app-language-options">
                {(["es", "en"] as const).map((language) => (
                  <button
                    key={language}
                    type="button"
                    className={`app-language-button${currentLanguage === language ? " active" : ""}`}
                    aria-label={`${t("language")}: ${t(`languages.${language}`)}`}
                    onClick={() => handleLanguageChange(language)}
                  >
                    {language.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title={t("settings.interface")}>
            <div className="settings-action-stack">
              <button type="button" className="menu-link" onClick={resetUiLayout}>
                {t("settings.resetLayout")}
              </button>
            </div>
          </Panel>

          <Panel title={t("settings.execution")}>
            <div className="settings-action-stack">
              <label className="settings-field">
                <span>{t("settings.lineDelayMs")}</span>
                <input
                  type="number"
                  min={100}
                  max={5000}
                  step={100}
                  value={lineDelayMs}
                  onChange={(event) => handleRunDelayChange(event.target.value)}
                />
              </label>
            </div>
          </Panel>

          <Panel title={t("settings.localData")}>
            <div className="settings-action-stack">
              <p className="settings-meta-line">
                {t("settings.localDataStatus")}: drafts {localStorageStats.drafts}, progress {localStorageStats.progress}, levels {localStorageStats.publishedLevels}
              </p>
              <button type="button" className="menu-link" onClick={exportLocalData}>
                {t("settings.exportBackup")}
              </button>
              <button type="button" className="menu-link" onClick={() => importInputRef.current?.click()}>
                {t("settings.importBackup")}
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                onChange={(event) => void importLocalData(event)}
                hidden
              />
              <button type="button" className="menu-link danger" onClick={clearProgress}>
                {t("settings.clearProgress")}
              </button>
              <button type="button" className="menu-link danger" onClick={clearDrafts}>
                {t("settings.clearDrafts")}
              </button>
              <button type="button" className="menu-link danger" onClick={resetAllLocalData}>
                {t("settings.resetAllLocalData")}
              </button>
            </div>
          </Panel>
        </section>

        {statusMessage ? <p className="level-editor-status">{statusMessage}</p> : null}
      </div>
    </Screen>
  );
}
