import { useTranslation } from "react-i18next";
import { Map, Globe, PenLine, Settings, Layers, Code2, BookOpen } from "lucide-react";
import { APP_ROUTES } from "../types/routes";
import { tutorialAnchorProps } from "../features/tutorial/anchors";
import { MenuActionLink } from "./ui/MenuActionLink";

export function MainMenuScreen() {
  const { t } = useTranslation();

  return (
    <main className="menu-shell">
      <section className="menu-card" {...tutorialAnchorProps("home-menu-card")}>
        <h1>{t("appTitle")}</h1>
        <p className="menu-tagline">{t("menu.tagline")}</p>
        <div className="menu-feature-chips">
          <span className="menu-feature-chip"><Layers size={13} />{t("menu.features.structures")}</span>
          <span className="menu-feature-chip"><Code2 size={13} />{t("menu.features.visual")}</span>
          <span className="menu-feature-chip"><BookOpen size={13} />{t("menu.features.guided")}</span>
        </div>
        <div className="menu-actions" {...tutorialAnchorProps("home-menu-actions")}>
          <MenuActionLink
            to={APP_ROUTES.campaign}
            icon={<Map size={26} />}
            title={t("menu.campaign")}
            description={t("menu.campaignDesc")}
          />
          <MenuActionLink
            to={APP_ROUTES.play}
            icon={<Globe size={26} />}
            title={t("menu.community")}
            description={t("menu.communityDesc")}
          />
          <MenuActionLink
            to={APP_ROUTES.editor}
            icon={<PenLine size={26} />}
            title={t("menu.editor")}
            description={t("menu.editorDesc")}
          />
          <MenuActionLink
            to={APP_ROUTES.settings}
            icon={<Settings size={26} />}
            title={t("menu.settings")}
            description={t("menu.settingsDesc")}
          />
        </div>
      </section>
    </main>
  );
}
