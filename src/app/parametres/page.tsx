import { AudioSettings } from "@/components/AudioSettings";
import { PageHeading } from "@/components/mq/PageHeading";
import "./parametres.css";

export const metadata = { title: "Paramètres — Anime Masters", robots: { index: false } };
export default function SettingsPage() {
  return <main className="vt"><div className="vt-inner"><PageHeading eyebrow="CONFORT DE JEU" title="Paramètres" description="Règle l’ambiance sonore du site. Ces choix sont gardés dans ce navigateur." /><AudioSettings /></div></main>;
}
