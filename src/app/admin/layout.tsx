import type { ReactNode } from "react";
import { requireRole } from "@/lib/admin";

/** Tout /admin : 404 pour qui n'est ni modérateur ni admin (chaque page revérifie aussi). */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("moderator");
  return <>{children}</>;
}
