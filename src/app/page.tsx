import Link from "next/link";
import { Suspense } from "react";
import { ACHIEVEMENTS, listAchievements } from "@/lib/achievements";
import { PackOpener } from "./packs/PackOpener";
import { listBanners, poolCounts } from "@/lib/banners";
import { readyCount } from "@/lib/expeditions";
import { WELCOME_CRYSTALS, WELCOME_DRAWS } from "@/lib/crystal-stock";
import { getSessionUser } from "@/lib/session";
import { getPlayerSummary } from "@/lib/summary";

/** Progression d'un succès à seuil (personnages différents) ; les autres sont tout ou rien. */
function progress(key: string, unique: number) {
  const target = { unique_100: 100, unique_500: 500, unique_1000: 1000, unique_2500: 2500 }[key];
  return target ? Math.min(100, Math.round((unique / target) * 100)) : 0;
}

// Accueil de la maquette : succès à gauche, le booster au centre, les invocations à droite.
export default function Home() {
  return (
    <main className="mq-main mq-home-main">
      <Suspense fallback={<Home_ guest />}>
        <Content />
      </Suspense>
    </main>
  );
}

function Landscape() {
  return (
    <>
      <div className="mq-summon-landscape" aria-hidden="true">
        <div className="mq-summon-sky">
          {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
        </div>
        <span className="mq-summon-moon" />
        <span className="mq-mountain mq-mountain-far" />
        <span className="mq-mountain mq-mountain-mid" />
        <span className="mq-mountain mq-mountain-near" />
        <div className="mq-ancient-ruins">
          <i /><i /><i /><i /><span />
        </div>
        <div className="mq-world-rift"><i /></div>
        <span className="mq-summon-fog mq-fog-one" />
        <span className="mq-summon-fog mq-fog-two" />
        <div className="mq-summon-ground" />
      </div>
      <div className="mq-stage-orbit mq-orbit-one" /><div className="mq-stage-orbit mq-orbit-two" />
      <div className="mq-stage-seal" aria-hidden="true"><span>◇</span><i>ANIME · MASTERS · FAILLE · PRIMORDIALE ·</i></div>
      <div className="mq-booster-pack"><div className="mq-pack-shine" /><span className="mq-pack-logo">A</span><small>ORIGINES</small><strong>LA FAILLE<br />PRIMORDIALE</strong><em>5 CARTES</em></div>
    </>
  );
}

/** Version sans compte (et squelette de chargement) : mêmes colonnes, contenu d'accueil. */
function Home_({ guest }: { guest?: boolean }) {
  void guest;
  return (
    <div className="mq-home-page">
      <section className="mq-home-intro">
        <p className="mq-eyebrow">BIENVENUE, INVOCATEUR</p>
        <h1>La Faille vous appelle.</h1>
        <p>{WELCOME_CRYSTALS + WELCOME_DRAWS} cartes sont offertes à l&apos;inscription. Quelle légende renferme le premier booster ?</p>
      </section>
      <div className="mq-home-layout">
        <aside className="mq-achievements-panel">
          <div className="mq-panel-heading"><div><small>PROGRESSION</small><h2>Succès</h2></div><span>0/{ACHIEVEMENTS.length}</span></div>
          {ACHIEVEMENTS.slice(0, 3).map((a) => (
            <div className="mq-achievement" key={a.key}><span className="mq-achievement-gem">◇</span><div><h3>{a.label}</h3><p>{a.description}</p><i><b style={{ width: "0%" }} /></i></div><em>+{a.reward}</em></div>
          ))}
        </aside>
        <section className="mq-booster-stage">
          <Landscape />
          <div className="mq-booster-copy"><span>BOOSTER OFFERT</span><h2>Invocation de bienvenue</h2><p>Crée un compte pour commencer</p><Link href="/signup">Créer un compte</Link></div>
        </section>
        <aside className="mq-summon-panel">
          <div className="mq-panel-heading"><div><small>COMPTE</small><h2>Rejoindre</h2></div></div>
          <Link href="/signup" className="mq-summon-banner mq-nature"><div><small>INSCRIPTION</small><h3>Créer un compte</h3><p>Gratuit</p></div><span>›</span></Link>
          <Link href="/login" className="mq-summon-banner mq-void"><div><small>DÉJÀ INSCRIT</small><h3>Se connecter</h3><p>Retrouve ta collection</p></div><span>›</span></Link>
        </aside>
      </div>
    </div>
  );
}

async function Content() {
  const user = await getSessionUser();
  if (!user) return <Home_ guest />;
  const s = await getPlayerSummary(user.id);
  const [achievements, banners, standardPool, ready] = await Promise.all([listAchievements(user.id), listBanners(s.packs), poolCounts(), readyCount(user.id)]);
  const done = achievements.filter((a) => a.unlockedAt).length;
  const todo = achievements
    .filter((a) => !a.unlockedAt)
    .map((a) => ({ ...a, pct: progress(a.key, s.owned) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);
  const available = s.packs.available;

  return (
    <div className="mq-home-page mq-home-compact">
      <section className="mq-home-intro">
        <p className="mq-eyebrow">BIENVENUE, {user.username.toUpperCase()}</p>
        <h1>La Faille vous appelle.</h1>
        <p>{available > 0 ? "Un nouveau booster vous attend. Quelle légende renferme-t-il ?" : "Le prochain cristal arrive bientôt. La Faille patiente."}</p>
      </section>
      <PackOpener initialState={s.packs} banners={banners} standardPool={standardPool} expeditionsReady={ready}
        achievements={
        <aside className="mq-achievements-panel">
          <div className="mq-panel-heading"><div><small>PROGRESSION</small><h2>Succès</h2></div><span>{done}/{achievements.length}</span></div>
          {todo.map((a) => (
            <div className="mq-achievement" key={a.key}><span className="mq-achievement-gem">◇</span><div><h3>{a.label}</h3><p>{a.description}</p><i><b style={{ width: `${a.pct}%` }} /></i></div><em>{a.pct}%</em></div>
          ))}
          <Link href="/achievements" className="mq-text-link">Voir tous les succès →</Link>
        </aside>
        }
      />
    </div>
  );
}
