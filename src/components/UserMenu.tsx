import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/auth-actions";
import { MAX_CRYSTALS } from "@/lib/crystal-stock";
import { getPackState } from "@/lib/packs";
import { getSessionUser } from "@/lib/session";
import { getWallet } from "@/lib/wallet";
import { DailyBonus } from "./DailyBonus";
import { Icon, Money } from "./icons";
import { NotificationBell } from "./NotificationBell";

const num = new Intl.NumberFormat("fr-FR");

/** Lit la session : à placer derrière un <Suspense>. */
export async function UserMenu() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="site-res">
        <Link href="/login" className="site-link">
          Connexion
        </Link>
        <Link href="/signup" className="site-cta">
          Créer un compte
        </Link>
      </div>
    );
  }
  const [wallet, packs] = await Promise.all([getWallet(user.id), getPackState(user.id)]);
  return (
    <form action={signOut} className="site-res">
      {wallet.canClaimBonus && <DailyBonus />}
      <span className="res-item" title="Ryō">
        <Money n={wallet.balance} />
      </span>
      <span className="res-item" title="Cristaux en réserve">
        <Icon name="paquet" />
        {packs.available}
        {packs.available <= MAX_CRYSTALS && <span className="res-max"> / {MAX_CRYSTALS}</span>}
      </span>
      <span className="res-item res-power" title="Puissance totale de la collection">
        <Icon name="puissance" style={{ "--acc": "currentColor" } as React.CSSProperties} />
        {num.format(packs.collectionPower)}
      </span>
      <Suspense fallback={null}>
        <NotificationBell userId={user.id} />
      </Suspense>
      <Link href={`/u/${encodeURIComponent(user.username)}`} className="site-link">
        Profil
      </Link>
      <button type="submit" className="avatar" title={`${user.username} · se déconnecter`} aria-label={`Se déconnecter (${user.username})`}>
        {user.username.slice(0, 1).toUpperCase()}
      </button>
    </form>
  );
}
