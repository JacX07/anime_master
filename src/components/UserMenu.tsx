import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import { getSessionUser } from "@/lib/session";
import { getWallet } from "@/lib/wallet";
import { DailyBonus } from "./DailyBonus";

const ryo = new Intl.NumberFormat("fr-FR");

/** Lit la session : à placer derrière un <Suspense>. */
export async function UserMenu() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/login" className="text-muted hover:text-foreground">
          Connexion
        </Link>
        <Link href="/signup" className="rounded-lg bg-violet-500 px-3 py-1.5 font-semibold text-white hover:bg-violet-400">
          S&apos;inscrire
        </Link>
      </div>
    );
  }
  const wallet = await getWallet(user.id);
  return (
    <form action={signOut} className="flex items-center gap-3 text-sm">
      {wallet.canClaimBonus && <DailyBonus />}
      <span className="wallet font-semibold tabular-nums text-amber-300" title="Ryō">
        {ryo.format(wallet.balance)} 両
      </span>
      <span className="font-medium">{user.username}</span>
      <button type="submit" className="text-muted hover:text-foreground">
        Déconnexion
      </button>
    </form>
  );
}
