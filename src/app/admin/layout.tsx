import { Suspense, type ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireRole } from "@/lib/admin";
import "./admin.css";

/** Tout /admin : 404 pour qui n'est ni modérateur ni admin (chaque page revérifie aussi). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}><Guard>{children}</Guard></Suspense>;
}

async function Guard({ children }: { children: ReactNode }) {
  await requireRole("moderator");
  return <main className="vt"><div className="vt-inner"><AdminNav />{children}</div></main>;
}
