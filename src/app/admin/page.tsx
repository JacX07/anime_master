import { PageHeading } from "@/components/mq/PageHeading";
import { requireRole } from "@/lib/admin";

export default async function AdminHome() {
  const staff = await requireRole("moderator");
  return (
    <main className="vt">
      <div className="vt-inner">
        <PageHeading eyebrow="ÉQUIPE" title="Administration" description={`Connecté en tant que ${staff.username} (${staff.role === "admin" ? "admin" : "modérateur"}). Statistiques et outils à venir.`} />
      </div>
    </main>
  );
}
