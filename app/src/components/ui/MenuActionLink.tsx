import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface MenuActionLinkProps {
  to: string;
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function MenuActionLink({
  to,
  icon,
  title,
  description,
  className = ""
}: MenuActionLinkProps) {
  const rootClassName = `menu-link${className ? ` ${className}` : ""}`;

  return (
    <Link className={rootClassName} to={to}>
      {icon ? <span className="menu-link-icon">{icon}</span> : null}
      <span className="menu-link-text">
        <span className="menu-link-title">{title}</span>
        {description ? <span className="menu-link-desc">{description}</span> : null}
      </span>
    </Link>
  );
}
