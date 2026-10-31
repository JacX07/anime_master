import { redirect } from "next/navigation";

/** Ancienne adresse du mode manuel : tout passe maintenant par /combat (choix Auto / Manuel). */
export default function ManualRedirect() {
  redirect("/combat");
}
