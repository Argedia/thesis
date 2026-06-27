import type { ReactNode } from "react";
import { Link } from "react-router-dom";
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
  const rootClassName = `topbar primary-screen-topbar screen-header ${className}`.trim();

  return (
    <header className={rootClassName} {...(tutorialAnchorId ? tutorialAnchorProps(tutorialAnchorId) : {})}>
      <Link className="back-link" to={backTo}>
        {backLabel}
      </Link>
      <div className="screen-header-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="screen-header-description">{description}</p> : null}
      </div>
      {actions ? <div className="screen-header-actions">{actions}</div> : null}
    </header>
  );
}
