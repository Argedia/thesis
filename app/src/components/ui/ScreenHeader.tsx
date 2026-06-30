import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { tutorialAnchorProps } from "../../features/tutorial/anchors";

interface ScreenHeaderProps {
  backLabel: string;
  backTo: string;
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  tutorialAnchorId?: string;
}

export function ScreenHeader({
  backLabel,
  backTo,
  eyebrow,
  title,
  description,
  actions,
  className = "",
  tutorialAnchorId
}: ScreenHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const rootClassName = `topbar primary-screen-topbar screen-header ${className}`.trim();
  const handleBack = () => {
    const returnTo =
      typeof (location.state as { returnTo?: unknown } | null)?.returnTo === "string"
        ? (location.state as { returnTo: string }).returnTo
        : null;
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    navigate(backTo);
  };

  return (
    <header className={rootClassName} {...(tutorialAnchorId ? tutorialAnchorProps(tutorialAnchorId) : {})}>
      <button type="button" className="back-link back-link--icon" onClick={handleBack} aria-label={backLabel} title={backLabel}>
        <ArrowLeft size={20} aria-hidden="true" />
      </button>
      <div className="screen-header-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="screen-header-description">{description}</p> : null}
      </div>
      {actions ? <div className="screen-header-actions">{actions}</div> : null}
    </header>
  );
}
