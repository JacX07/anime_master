import Link from "next/link";
import { Suspense } from "react";
import { Money, Stat } from "@/components/icons";
import { MenuNav } from "@/components/MenuNav";
import { SceneFrame } from "@/components/SceneFrame";
import { SceneBody } from "@/components/SceneBody";
import { CRYSTAL_INTERVAL_MS, MAX_CRYSTALS, WELCOME_CRYSTALS } from "@/lib/crystal-stock";
import { SSR_PITY, UR_PITY } from "@/lib/pull";
import { getSessionUser } from "@/lib/session";
import { getPlayerSummary } from "@/lib/summary";

const num = new Intl.NumberFormat("fr-FR");

// Menu d'accueil façon jeu vidéo : le laboratoire de la scène d'ouverture à la tombée de la nuit, le menu par-dessus.
export default function Home() {
  return (
    <main className="gm">
      <SceneBody night />
      <SceneFrame src="/pack-opening/menu.html" />
      <Suspense fallback={<Guest />}>
        <Menu />
      </Suspense>
    </main>
  );
}

function Wordmark() {
  return (
    <header>
      <h1 className="gm-title">Anime Masters</h1>
      <p className="gm-tagline">Collectionne les héros de tes animes</p>
    </header>
  );
}

function Item({ href, title, hint }: { href?: string; title: string; hint: string }) {
  const body = (
    <>
      <b>{title}</b>
      <small>{hint}</small>
    </>
  );
  return href ? (
    <Link href={href} className="gm-item">
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
    <div className="gm-content">
      <Wordmark />
      <MenuNav label="Menu principal">
        <Item href="/signup" title="Créer un compte" hint={`${WELCOME_CRYSTALS} cristaux offerts`} />
        <Item href="/login" title="Se connecter" hint="Retrouve ta collection" />
      </MenuNav>
      <p className="gm-note">
        Ensuite, un cristal (= une carte) toutes les {CRYSTAL_INTERVAL_MS / 60_000} minutes, jusqu&apos;à {MAX_CRYSTALS} en réserve.
      </p>
    </div>
  );
}

async function Menu() {
  const user = await getSessionUser();
  if (!user) return <Guest />;
  const s = await getPlayerSummary(user.id);
  const available = s.packs.available;
  return (
    <>
      <div className="gm-content">
        <Wordmark />
        <MenuNav label="Menu principal">
          <Item
            href="/packs"
            title="Ouvrir des cartes"
            hint={available > 0 ? `${available} cristal${available > 1 ? "ux" : ""} en réserve` : "Le prochain cristal arrive bientôt"}
          />
          <Item href="/album" title="Mon album" hint={`${num.format(s.owned)} sur ${num.format(s.total)} personnages`} />
          <Item href="/market" title="Marché" hint="Enchères entre joueurs" />
          <Item href="/duels" title="Duels" hint="Quiz et combats de cartes" />
          <Item href="/leaderboard" title="Classement" hint="Duel et collection" />
        </MenuNav>
      </div>

      <footer className="gm-status" aria-label="Ton profil">
        <span className="gm-player">{user.username}</span>
        <dl>
          <div className="gm-power">
            <dt>Puissance totale</dt>
            <dd>
              <Stat icon="puissance" accent="currentColor">
                {num.format(s.power)}
              </Stat>
            </dd>
          </div>
          <div>
            <dt>Ryō</dt>
            <dd>
              <Money n={s.wallet.balance} />
            </dd>
          </div>
          <div>
            <dt>Cartes</dt>
            <dd>{num.format(s.cards)}</dd>
          </div>
          <div>
            <dt>Cristaux</dt>
            <dd>
              {available} / {MAX_CRYSTALS}
            </dd>
          </div>
          <div>
            <dt>Garanties</dt>
            <dd>
              SSR dans {SSR_PITY - s.packs.cardsSinceSSR}, UR dans {UR_PITY - s.packs.cardsSinceUR}
            </dd>
          </div>
        </dl>
      </footer>
    </>
  );
}
