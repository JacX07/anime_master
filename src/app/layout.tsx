import type { Metadata } from "next";
import { Cinzel, DM_Sans } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { Icon, IconSprite } from "@/components/icons";
import { NavLink } from "@/components/NavLink";
import { NavMenu, type NavItem } from "@/components/NavMenu";
import { UserMenu } from "@/components/UserMenu";
import "./globals.css";

// Les deux polices du jeu (direction « Citadelle sombre ») : Cinzel pour le logo, les titres et les gros chiffres, DM Sans pour l'interface
const cinzel = Cinzel({ variable: "--font-cinzel", weight: ["500", "600", "700"], subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Anime Masters",
  description: "Collectionne les personnages d'anime en ouvrant des paquets de cartes.",
};

// Barre du haut : ce que je possède reste visible (Paquets, Album, Inventaire) ; le reste est rangé par intention dans des onglets
// qui se déroulent (Jouer, Marché) ; le classement reste seul. Une nouvelle page rejoint la famille qui correspond à ce qu'on y fait.
const PLAY: NavItem[] = [
  { href: "/eveil", icon: "t-coeur", label: "Éveil" },
  { href: "/forge", icon: "t-combat", label: "Forge" },
  { href: "/histoire", icon: "t-aventure", label: "Histoire" },
  { href: "/tour", icon: "nav-duels", label: "Tour" },
  { href: "/raid", icon: "nav-duels", label: "Raid" },
  { href: "/donjons", icon: "t-combat", label: "Donjons" },
  { href: "/duels", icon: "nav-duels", label: "Duels" },
  { href: "/expeditions", icon: "unlock", label: "Expéditions" },
];
const COLLECTION: NavItem[] = [
  { href: "/packs", icon: "nav-paquets", label: "Paquets" },
  { href: "/album", icon: "nav-album", label: "Album" },
  { href: "/wishlist", icon: "souhait", label: "Souhaits" },
];
const MARKET: NavItem[] = [
  { href: "/trades", icon: "echange", label: "Échanges" },
  { href: "/market", icon: "nav-marche", label: "Bourse" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${cinzel.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <IconSprite />
        <header className="site-header">
          <div className="site-header-in">
            <Link href="/" className="brand">
              <Icon name="logo" className="brand-mark" />
              <span>Anime Masters</span>
            </Link>
            <nav className="site-nav" aria-label="Navigation principale">
              {/* Ordre de la maquette : Accueil, Collection, Inventaire, Équipe — Jouer — Quêtes, Marché, Classement.
                  usePathname() lit l'URL à l'exécution : derrière un Suspense, avec les mêmes entrées (sans soulignement ni déroulant) en attendant */}
              <Suspense
                fallback={
                  <>
                    <Link href="/" className="site-link"><Icon name="logo" />Accueil</Link>
                    <span className="site-link"><Icon name="nav-album" />Collection</span>
                    <Link href="/inventaire" className="site-link"><Icon name="bonus" />Inventaire</Link>
                    <Link href="/equipe" className="site-link"><Icon name="t-coeur" />Équipe</Link>
                    <span className="site-link site-play"><Icon name="nav-duels" />Jouer</span>
                    <Link href="/quetes" className="site-link"><Icon name="t-aventure" />Quêtes</Link>
                    <span className="site-link"><Icon name="nav-marche" />Marché</span>
                    <Link href="/leaderboard" className="site-link"><Icon name="nav-classement" />Classement</Link>
                  </>
                }
              >
                <NavLink href="/" icon="logo" exact>Accueil</NavLink>
                <NavMenu icon="nav-album" label="Collection" items={COLLECTION} />
                <NavLink href="/inventaire" icon="bonus">Inventaire</NavLink>
                <NavLink href="/equipe" icon="t-coeur">Équipe</NavLink>
                <NavMenu icon="nav-duels" label="Jouer" items={PLAY} className="site-play" />
                <NavLink href="/quetes" icon="t-aventure">Quêtes</NavLink>
                <NavMenu icon="nav-marche" label="Marché" items={MARKET} />
                <NavLink href="/leaderboard" icon="nav-classement">Classement</NavLink>
              </Suspense>
              {(process.env.NODE_ENV === "development" || process.env.ART_EDITOR_USER_ID) && <Link href="/illustrations" className="site-link" aria-label="Illustrations"><Icon name="f-holo" />Illustrations</Link>}
            </nav>
            <Suspense fallback={null}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        {children}
        <footer className="py-6 text-center text-xs text-muted">
          Données et images : <a href="https://anilist.co" className="hover:underline">AniList</a> · Sons électriques : <a href="https://www.littlerobotsoundfactory.com" className="hover:underline">Little Robot Sound Factory</a> (CC BY 3.0)
        </footer>
      </body>
    </html>
  );
}
