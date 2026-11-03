import { Suspense } from "react";
import { Panel, Table } from "@/components/admin/parts";
import { PageHeading } from "@/components/mq/PageHeading";
import { hasRole, requireRole } from "@/lib/admin";
import { prisma } from "@/lib/db";

const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium" });

export default function AuditPage() {
  return <Suspense fallback={<p className="adm-note">Chargement…</p>}><Audit /></Suspense>;
}

async function Audit() {
  const staff = await requireRole("moderator");
  const all = hasRole(staff.role, "admin");
  // Un modérateur ne voit que ses propres actions (SPEC admin §2).
  const rows = await prisma.adminAudit.findMany({ where: all ? {} : { actorId: staff.id }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeading eyebrow="ÉQUIPE" title="Journal d'audit" description={all ? "Toutes les actions de l'équipe (200 dernières)." : "Vos actions (200 dernières)."} />
      <Panel title="Actions">
        <Table head={["Date", "Qui", "Action", "Cible", "Motif", "Détail"]} rows={rows.map((a) => [date.format(a.createdAt), a.actorName, a.action, (a.data as { target?: string } | null)?.target ?? a.targetId ?? "—", a.reason ?? "—", <span key="d" className="adm-code">{a.data ? JSON.stringify(a.data) : ""}</span>])} />
      </Panel>
    </>
  );
}
