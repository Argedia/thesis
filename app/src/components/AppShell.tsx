import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getAppLanguage, setAppLanguage, type SupportedLanguage } from "../i18n";
import { useUiPreferencesSync } from "../hooks/useUiPreferencesSync";

export function AppShell() {
  useUiPreferencesSync();
  const { t } = useTranslation();
  const currentLanguage = getAppLanguage();

  const handleLanguageChange = (language: SupportedLanguage) => {
    void setAppLanguage(language);
  };

  return (
    <div className="app-shell">
      <div className="app-language-dock">
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

      <Outlet />
    </div>
  );
}
