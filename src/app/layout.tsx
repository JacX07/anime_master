import type { Metadata } from "next";
import { Big_Shoulders, Michroma, Sora } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { AlbumLink } from "@/components/AlbumLink";
import { Icon, IconSprite } from "@/components/icons";
import { NavLink } from "@/components/NavLink";
import { NavMenu, type NavItem } from "@/components/NavMenu";
import { UserMenu } from "@/components/UserMenu";
import "./globals.css";

// Les deux polices du jeu, partout : Michroma pour les titres, noms et logo, Sora pour l'interface et les chiffres
const michroma = Michroma({ variable: "--font-michroma", weight: "400", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
// Noms de mondes de l'album : très condensée, pour les grands titres
const shoulders = Big_Shoulders({ variable: "--font-shoulders", weight: ["800", "900"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Anime Masters",
  description: "Collectionne les personnages d'anime en ouvrant des paquets de cartes.",
};

// Barre du haut : ce que je possède reste visible (Paquets, Album, Inventaire) ; le reste est rangé par intention dans des onglets
// qui se déroulent (Jouer, Marché) ; le classement reste seul. Une nouvelle page rejoint la famille qui correspond à ce qu'on y fait.
const PLAY: NavItem[] = [
  { href: "/equipe", icon: "t-coeur", label: "Équipe" },
  { href: "/histoire", icon: "t-aventure", label: "Histoire" },
  { href: "/combat", icon: "nav-duels", label: "Donjon" },
  { href: "/duels", icon: "nav-duels", label: "Duels" },
  { href: "/expeditions", icon: "unlock", label: "Expéditions" },
];
const MARKET: NavItem[] = [
  { href: "/trades", icon: "echange", label: "Échanges" },
  { href: "/market", icon: "nav-marche", label: "Bourse" },
  { href: "/wishlist", icon: "souhait", label: "Souhaits" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${michroma.variable} ${sora.variable} ${shoulders.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <IconSprite />
        <header className="site-header">
          <div className="site-header-in">
            <Link href="/" className="brand">
              <Icon name="logo" className="brand-mark" />
              <span>Anime Masters</span>
            </Link>
            <nav className="site-nav" aria-label="Navigation principale">
              {/* usePathname() lit l'URL à l'exécution : derrière un Suspense, avec les mêmes entrées (sans soulignement ni déroulant) en attendant */}
              <Suspense
                fallback={
                  <>
                    <Link href="/packs" className="site-link">
                      <Icon name="nav-paquets" />
                      Paquets
                    </Link>
                    <Link href="/album" className="site-link">
                      <Icon name="nav-album" />
                      Album
                    </Link>
                    <Link href="/inventaire" className="site-link">
                      <Icon name="bonus" />
                      Inventaire
                    </Link>
                    <span className="site-link">
                      <Icon name="nav-duels" />
                      Jouer
                    </span>
                    <span className="site-link">
                      <Icon name="nav-marche" />
                      Marché
                    </span>
                    <Link href="/leaderboard" className="site-link">
                      <Icon name="nav-classement" />
                      Classement
                    </Link>
                  </>
                }
              >
                <NavLink href="/packs" icon="nav-paquets">
                  Paquets
                </NavLink>
                <AlbumLink />
                <NavLink href="/inventaire" icon="bonus">
                  Inventaire
                </NavLink>
                <NavMenu icon="nav-duels" label="Jouer" items={PLAY} />
                <NavMenu icon="nav-marche" label="Marché" items={MARKET} />
                <NavLink href="/leaderboard" icon="nav-classement">
                  Classement
                </NavLink>
              </Suspense>
            </nav>
            <Suspense fallback={null}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        {children}
        <footer className="py-6 text-center text-xs text-muted">
          Données et images : <a href="https://anilist.co" className="hover:underline">AniList</a>
        </footer>
      </body>
    </html>
  );
}
