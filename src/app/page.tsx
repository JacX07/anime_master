import Link from "next/link";
import { Suspense } from "react";
import { Money, Stat } from "@/components/icons";
import { MenuNav } from "@/components/MenuNav";
import { SceneFrame } from "@/components/SceneFrame";
import { SceneBody } from "@/components/SceneBody";
import { MAX_PACKS, PACK_INTERVAL_MS, WELCOME_PACKS } from "@/lib/pack-stock";
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
        <Item href="/signup" title="Créer un compte" hint={`${WELCOME_PACKS} paquets offerts`} />
        <Item href="/login" title="Se connecter" hint="Retrouve ta collection" />
      </MenuNav>
      <p className="gm-note">
        Ensuite, un paquet toutes les {PACK_INTERVAL_MS / 60_000} minutes, jusqu&apos;à {MAX_PACKS} en réserve.
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
            title="Ouvrir des paquets"
            hint={available > 0 ? `${available} prêt${available > 1 ? "s" : ""}` : "Le prochain arrive bientôt"}
          />
          <Item href="/album" title="Mon album" hint={`${num.format(s.owned)} sur ${num.format(s.total)} personnages`} />
          <Item title="Marché" hint="Bientôt" />
          <Item title="Duels" hint="Bientôt" />
          <Item title="Classement" hint="Bientôt" />
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
            <dt>Paquets</dt>
            <dd>
              {available} / {MAX_PACKS}
            </dd>
          </div>
          <div>
            <dt>Garanties</dt>
            <dd>
              SSR dans {SSR_PITY - s.packs.packsSinceSSR}, UR dans {UR_PITY - s.packs.packsSinceUR}
            </dd>
          </div>
        </dl>
      </footer>
    </>
  );
}
