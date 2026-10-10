import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { MAX_PACKS, PACK_INTERVAL_MS, WELCOME_PACKS } from "@/lib/pack-stock";
import { SSR_PITY, UR_PITY } from "@/lib/pull";
import { getSessionUser } from "@/lib/session";
import { getPlayerSummary } from "@/lib/summary";

const num = new Intl.NumberFormat("fr-FR");

// Menu d'accueil façon jeu vidéo : le laboratoire de la scène d'ouverture en fond, le menu par-dessus.
export default function Home() {
  return (
    <main className="gm">
      <SceneBody />
      <iframe src="/pack-opening/menu.html" title="" aria-hidden="true" tabIndex={-1} className="gm-bg" />
      <div className="gm-content">
        <Suspense fallback={<Guest />}>
          <Menu />
        </Suspense>
      </div>
    </main>
  );
}

function Title() {
  return (
    <header className="gm-head">
      <h1 className="gm-title">
        Anime <span>Masters</span>
      </h1>
      <p className="gm-tagline">Collectionne les héros de tes animes</p>
    </header>
  );
}

function Item({ href, index, title, hint, primary }: { href?: string; index: string; title: string; hint: string; primary?: boolean }) {
  const body = (
    <>
      <span className="gm-idx">{index}</span>
      <span className="gm-label">
        <b>{title}</b>
        <small>{hint}</small>
      </span>
      <span className="gm-arrow" aria-hidden>
        {href ? "→" : "🔒"}
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={`gm-item${primary ? " gm-primary" : ""}`}>
      {body}
    </Link>
  ) : (
    <div className="gm-item gm-locked" aria-disabled="true">
      {body}
    </div>
  );
}

function Guest() {
  return (
    <div className="gm-grid">
      <div className="gm-col">
        <Title />
        <nav className="gm-menu" aria-label="Menu principal">
          <Item href="/signup" index="01" title="Commencer" hint={`${WELCOME_PACKS} paquets offerts à l'inscription`} primary />
          <Item href="/login" index="02" title="Se connecter" hint="Retrouve ta collection" />
        </nav>
        <ul className="gm-facts">
          <li>⏱️ 1 paquet toutes les {PACK_INTERVAL_MS / 60_000} min, jusqu&apos;à {MAX_PACKS}</li>
          <li>
            ⭐ SSR garanti en {SSR_PITY} paquets, UR en {UR_PITY}
          </li>
          <li>✨ Près de 5 000 personnages, finitions Holo et Gold</li>
        </ul>
      </div>
    </div>
  );
}

async function Menu() {
  const user = await getSessionUser();
  if (!user) return <Guest />;
  const s = await getPlayerSummary(user.id);
  const available = s.packs.available;
  return (
    <div className="gm-grid">
      <div className="gm-col">
        <Title />
        <nav className="gm-menu" aria-label="Menu principal">
          <Item
            href="/packs"
            index="01"
            title="Ouvrir des paquets"
            hint={available > 0 ? `${available} paquet${available > 1 ? "s" : ""} prêt${available > 1 ? "s" : ""}` : "Prochain paquet bientôt"}
            primary
          />
          <Item href="/album" index="02" title="Mon album" hint={`${num.format(s.owned)} / ${num.format(s.total)} personnages`} />
          <Item index="03" title="Marché" hint="Enchères et échanges · bientôt" />
          <Item index="04" title="Duels" hint="Affronte d'autres joueurs · bientôt" />
          <Item index="05" title="Classement" hint="Les meilleurs collectionneurs · bientôt" />
        </nav>
      </div>

      <aside className="gm-card" aria-label="Ton profil">
        <p className="gm-eyebrow">Joueur</p>
        <p className="gm-name">{user.username}</p>
        <dl className="gm-stats">
          <div>
            <dt>Puissance totale</dt>
            <dd className="gm-power">⚡ {num.format(s.power)}</dd>
          </div>
          <div>
            <dt>Ryō</dt>
            <dd>{num.format(s.wallet.balance)} 両</dd>
          </div>
          <div>
            <dt>Cartes</dt>
            <dd>{num.format(s.cards)}</dd>
          </div>
          <div>
            <dt>Paquets</dt>
            <dd>
              {available} / {MAX_PACKS}
            </dd>
          </div>
        </dl>
        <p className="gm-pity">
          SSR garanti dans <b>{SSR_PITY - s.packs.packsSinceSSR}</b> · UR dans <b>{UR_PITY - s.packs.packsSinceUR}</b>
        </p>
        {s.wallet.canClaimBonus && <p className="gm-bonus">🎁 Bonus du jour disponible, en haut de l&apos;écran</p>}
      </aside>
    </div>
  );
}
