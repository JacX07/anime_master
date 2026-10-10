import type { Metadata } from "next";
import { Geist, Geist_Mono, Michroma, Sora } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { AlbumLink } from "@/components/AlbumLink";
import { UserMenu } from "@/components/UserMenu";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Polices du menu sur la page Paquets (scène 3D)
const michroma = Michroma({ variable: "--font-michroma", weight: "400", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Anime Masters",
  description: "Collectionne les personnages d'anime en ouvrant des paquets de cartes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} ${michroma.variable} ${sora.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-white/10 bg-black/30">
          <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
            <Link href="/" className="site-logo font-bold tracking-tight">
              Anime <span className="text-violet-400">Masters</span>
            </Link>
            <Link href="/packs" className="site-link text-sm text-muted hover:text-foreground">
              Paquets
            </Link>
            <AlbumLink />
            <div className="ml-auto">
              <Suspense fallback={null}>
                <UserMenu />
              </Suspense>
            </div>
          </nav>
        </header>
        {children}
        <footer className="py-6 text-center text-xs text-muted">
          Données et images : <a href="https://anilist.co" className="hover:underline">AniList</a>
        </footer>
      </body>
    </html>
  );
}
