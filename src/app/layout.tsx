import type { Metadata } from "next";
import { Michroma, Sora } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { AlbumLink } from "@/components/AlbumLink";
import { Icon, IconSprite } from "@/components/icons";
import { NavLink } from "@/components/NavLink";
import { UserMenu } from "@/components/UserMenu";
import "./globals.css";

// Les deux polices du jeu, partout : Michroma pour les titres, noms et logo, Sora pour l'interface et les chiffres
const michroma = Michroma({ variable: "--font-michroma", weight: "400", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Anime Masters",
  description: "Collectionne les personnages d'anime en ouvrant des paquets de cartes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${michroma.variable} ${sora.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <IconSprite />
        <header className="site-header">
          <div className="site-header-in">
            <Link href="/" className="brand">
              <Icon name="logo" className="brand-mark" />
              <span>Anime Masters</span>
            </Link>
            <nav className="site-nav" aria-label="Navigation principale">
              {/* usePathname() lit l'URL à l'exécution : derrière un Suspense, avec les mêmes liens (sans soulignement) en attendant */}
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
                    <Link href="/trades" className="site-link">
                      <Icon name="echange" />
                      Échanges
                    </Link>
                    <Link href="/market" className="site-link">
                      <Icon name="nav-marche" />
                      Marché
                    </Link>
                    <Link href="/wishlist" className="site-link">
                      <Icon name="souhait" />
                      Souhaits
                    </Link>
                  </>
                }
              >
                <NavLink href="/packs" icon="nav-paquets">
                  Paquets
                </NavLink>
                <AlbumLink />
                <NavLink href="/trades" icon="echange">
                  Échanges
                </NavLink>
                <NavLink href="/market" icon="nav-marche">
                  Marché
                </NavLink>
                <NavLink href="/wishlist" icon="souhait">
                  Souhaits
                </NavLink>
              </Suspense>
              <span className="site-link site-soon" title="Bientôt">
                <Icon name="nav-duels" />
                Duels
              </span>
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
