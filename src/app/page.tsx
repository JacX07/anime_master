import Link from "next/link";
import { Suspense } from "react";
import { Money, Stat } from "@/components/icons";
import { ACHIEVEMENTS, listAchievements } from "@/lib/achievements";
import { listBanners } from "@/lib/banners";
import { CRYSTAL_INTERVAL_MS, MAX_CRYSTALS, WELCOME_CRYSTALS, WELCOME_DRAWS } from "@/lib/crystal-stock";
import { SSR_PITY, UR_PITY } from "@/lib/pull";
import { getSessionUser } from "@/lib/session";
import { getPlayerSummary } from "@/lib/summary";
import "./home.css";

const num = new Intl.NumberFormat("fr-FR");

/** « 2j 14h », « 5h 12min » ou « Permanent » pour une bannière sans fin. */
function remaining(endsAt: string | null) {
  if (!endsAt) return "Permanent";
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Terminé";
  const h = Math.floor(ms / 3_600_000);
  return h >= 24 ? `${Math.floor(h / 24)}j ${h % 24}h` : `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}min`;
}

// Accueil (direction « Citadelle sombre ») : succès à gauche, le paquet au centre, les bannières à droite.
export default function Home() {
  return (
    <main className="home">
      <Suspense fallback={<Guest />}>
        <Content />
      </Suspense>
    </main>
  );
}

/** Le paquet, dessiné en CSS : pas d'image, pas de 3D. */
function PackStage({ children }: { children: React.ReactNode }) {
  return (
    <section className="home-stage" aria-label="Paquet à ouvrir">
      <div className="home-ruins" aria-hidden="true">
        <span className="home-moon" />
        <span className="home-ridge home-ridge-far" />
        <span className="home-ridge home-ridge-near" />
        <span className="home-rift" />
      </div>
      <div className="home-pack" aria-hidden="true">
        <span className="home-pack-shine" />
        <span className="home-pack-logo">A</span>
        <small>ANIME MASTERS</small>
        <strong>5 CARTES</strong>
      </div>
      <div className="home-stage-copy">{children}</div>
    </section>
  );
}

function Guest() {
  return (
    <div className="home-in">
      <section className="home-intro">
        <p className="eyebrow">Bienvenue, invocateur</p>
        <h1>Collectionne les héros de tes animes.</h1>
        <p>
          {WELCOME_CRYSTALS + WELCOME_DRAWS} cartes offertes à l&apos;inscription, puis un cristal (= une carte) toutes les{" "}
          {CRYSTAL_INTERVAL_MS / 60_000} minutes, jusqu&apos;à {MAX_CRYSTALS} en réserve.
        </p>
      </section>
      <PackStage>
        <Link href="/signup" className="home-cta">Créer un compte</Link>
        <Link href="/login" className="home-link">Se connecter</Link>
      </PackStage>
    </div>
  );
}

async function Content() {
  const user = await getSessionUser();
  if (!user) return <Guest />;
  const s = await getPlayerSummary(user.id);
  const [achievements, banners] = await Promise.all([listAchievements(user.id), listBanners(s.packs)]);
  const done = achievements.filter((a) => a.unlockedAt).length;
  const todo = achievements.filter((a) => !a.unlockedAt).slice(0, 3);
  const available = s.packs.available;

  return (
    <div className="home-in">
      <section className="home-intro">
        <p className="eyebrow">Bienvenue, {user.username}</p>
        <h1>Les brèches t&apos;appellent.</h1>
        <p>
          {available > 0
            ? `${available} cristal${available > 1 ? "ux" : ""} t'attend${available > 1 ? "ent" : ""}. Quelle légende cache le prochain paquet ?`
            : "Le prochain cristal arrive bientôt. En attendant, la collection ne se complétera pas toute seule."}
        </p>
      </section>

      <div className="home-grid">
        <aside className="home-panel" aria-label="Succès">
          <div className="home-panel-head">
            <div><small>Progression</small><h2>Succès</h2></div>
            <span>{done}/{ACHIEVEMENTS.length}</span>
          </div>
          {todo.length === 0 && <p className="home-muted">Tous les succès sont débloqués.</p>}
          {todo.map((a) => (
            <div className="home-row" key={a.key}>
              <span className="home-gem">◇</span>
              <div>
                <h3>{a.label}</h3>
                <p>{a.description}</p>
              </div>
              <em><Money n={a.reward} /></em>
            </div>
          ))}
          <Link href="/achievements" className="home-more">Voir tous les succès →</Link>
        </aside>

        <PackStage>
          <small className="home-kicker">{available > 0 ? "Cristaux disponibles" : "Prochain cristal bientôt"}</small>
          <h2>{available} / {MAX_CRYSTALS}</h2>
          <Link href="/packs" className="home-cta">Ouvrir des cartes</Link>
          <p className="home-muted">SSR garanti dans {SSR_PITY - s.packs.cardsSinceSSR} · UR dans {UR_PITY - s.packs.cardsSinceUR}</p>
        </PackStage>

        <aside className="home-panel" aria-label="Bannières">
          <div className="home-panel-head">
            <div><small>Portails actifs</small><h2>Invocations</h2></div>
            <span>{banners.length}</span>
          </div>
          {banners.map((b) => (
            <Link href="/packs" className={`home-banner ${b.costKind === "SPECIAL" ? "is-event" : ""}`} key={b.id}>
              <div>
                <small>{b.costKind === "SPECIAL" ? "Événement" : b.costKind === "WELCOME" ? "Bienvenue" : b.categoryLabel}</small>
                <h3>{b.name}</h3>
                <p>{remaining(b.endsAt)}</p>
              </div>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
        </aside>
      </div>

      <section className="home-status" aria-label="Ton profil">
        <dl>
          <div className="is-power"><dt>Puissance totale</dt><dd><Stat icon="puissance" accent="currentColor">{num.format(s.power)}</Stat></dd></div>
          <div><dt>Ryō</dt><dd><Money n={s.wallet.balance} /></dd></div>
          <div><dt>Cartes</dt><dd>{num.format(s.cards)}</dd></div>
          <div><dt>Personnages</dt><dd>{num.format(s.owned)} / {num.format(s.total)}</dd></div>
        </dl>
      </section>

      <nav className="home-modes" aria-label="Modes de jeu">
        {[
          ["/histoire", "Histoire", "Traverse les univers déréglés par l'anomalie"],
          ["/tour", "Tour", "Monte le plus haut possible"],
          ["/expeditions", "Expéditions", "Envoie tes cartes explorer les brèches"],
          ["/duels", "Duels", "Quiz et combats de cartes"],
          ["/market", "Bourse des brèches", "Enchères entre joueurs"],
          ["/leaderboard", "Classement", "Duel et collection"],
        ].map(([href, title, hint]) => (
          <Link href={href} key={href}><b>{title}</b><small>{hint}</small></Link>
        ))}
      </nav>
    </div>
  );
}
