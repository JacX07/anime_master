import type { Metadata } from "next";
import { Cinzel, DM_Sans } from "next/font/google";
import { Suspense } from "react";
import { AmbientSound } from "@/components/AmbientSound";
import { SelectMenu } from "@/components/SelectMenu";
import { IconSprite } from "@/components/icons";
import { AppShell } from "@/components/mq/AppShell";
import { SiteHeader } from "@/components/mq/SiteHeader";
import { ChatDockMount } from "@/components/chat/ChatDockMount";
import "./globals.css";
import "./maquette.css";
import "./controls.css";
import "./reference.css";
import "./identity.css";
import "./ambiance.css";

// Les deux polices du jeu (direction « Citadelle sombre ») : Cinzel pour le logo, les titres et les gros chiffres, DM Sans pour l'interface
const cinzel = Cinzel({ variable: "--font-cinzel", weight: ["500", "600", "700"], subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Anime Masters",
  description: "Collectionne les personnages d'anime en ouvrant des paquets de cartes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${cinzel.variable} ${dmSans.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">
        <IconSprite />
        <AmbientSound />
        <SelectMenu />
        <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
          <AppShell header={<SiteHeader />}>
            {children}
            <footer className="py-6 text-center text-xs text-muted">
              Données et images : <a href="https://anilist.co" className="hover:underline">AniList</a> · Sons électriques : <a href="https://www.littlerobotsoundfactory.com" className="hover:underline">Little Robot Sound Factory</a> (CC BY 3.0)
            </footer>
          </AppShell>
        </Suspense>
        <Suspense fallback={null}>
          <ChatDockMount />
        </Suspense>
      </body>
    </html>
  );
}
