import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import { getSessionUser } from "@/lib/session";

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
  return (
    <form action={signOut} className="flex items-center gap-3 text-sm">
      <span className="font-medium">{user.username}</span>
      <button type="submit" className="text-muted hover:text-foreground">
        Déconnexion
      </button>
    </form>
  );
}
