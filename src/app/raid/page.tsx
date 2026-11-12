import { redirect } from "next/navigation";

/** Le raid se joue désormais uniquement avec le Défi des empereurs (le boss hebdomadaire n'est plus proposé, son code reste dans RaidBoard / getRaidState). */
export default function RaidPage() {
  redirect("/raid/empereurs");
}
