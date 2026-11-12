import Link from "next/link";

const TABS = [["/inventaire", "Objets"], ["/eveil", "Éveil"], ["/forge", "Forge"]] as const;

/** Sous-onglets de l'Inventaire : objets, éveil des cartes et forge des armes légendaires. */
export function InventoryTabs({ current }: { current: (typeof TABS)[number][0] }) {
  return (
    <div className="pg-tabs">
      <nav aria-label="Inventaire">
        {TABS.map(([href, label]) => <Link key={href} href={href} aria-current={current === href ? "page" : undefined}>{label}</Link>)}
      </nav>
    </div>
  );
}
