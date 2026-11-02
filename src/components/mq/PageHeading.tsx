import type { ReactNode } from "react";

/** Structure et classes de renderInventory/renderMarket dans MaquetteDeJeuTCG. */
export function PageHeading({ eyebrow, title, description, children }: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return <header className="mq-page-heading mq-standard-heading">
    <div>
      {eyebrow && <p className="mq-eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {children}
  </header>;
}
