import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "react-aria-components";
import { Map, Globe, PenLine, Settings, Layers, Code2, BookOpen, Info } from "lucide-react";
import { APP_ROUTES } from "../types/routes";
import { tutorialAnchorProps } from "../features/tutorial/anchors";
import { MenuActionLink } from "./ui/MenuActionLink";
import { AppDialog, AppModal } from "./ui/AppOverlay";

export function MainMenuScreen() {
  const { t } = useTranslation();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <>
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

      <Button className="app-info-fab" aria-label={t("menu.info")} onPress={() => setIsInfoOpen(true)}>
        <Info size={22} />
      </Button>

      <AppModal isOpen={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <AppDialog title={t("menu.aboutTitle")}>
          <p className="app-dialog-message">{t("menu.aboutBody")}</p>
          <p className="app-dialog-message">{t("menu.aboutBodySecondary")}</p>
          <ul className="app-dialog-list">
            <li>{t("menu.aboutPoints.campaign")}</li>
            <li>{t("menu.aboutPoints.community")}</li>
            <li>{t("menu.aboutPoints.editor")}</li>
            <li>{t("menu.aboutPoints.execution")}</li>
          </ul>
          <div className="app-dialog-actions">
            <Button className="app-dialog-button" onPress={() => setIsInfoOpen(false)}>
              {t("common.ok")}
            </Button>
          </div>
        </AppDialog>
      </AppModal>
    </>
  );
}
