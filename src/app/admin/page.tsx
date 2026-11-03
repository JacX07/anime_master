import { Suspense } from "react";
import { AdminChart } from "@/components/admin/AdminChart";
import { Kpi, Panel, PeriodPicker, Table, fmt, pct } from "@/components/admin/parts";
import { PageHeading } from "@/components/mq/PageHeading";
import { requireRole } from "@/lib/admin";
import { dashboardStats, parsePeriod } from "@/lib/admin-stats";

export default function AdminHome({ searchParams }: PageProps<"/admin">) {
  return <Suspense fallback={<p className="adm-note">Chargement…</p>}><Dashboard searchParams={searchParams} /></Suspense>;
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const staff = await requireRole("moderator");
  const days = parsePeriod((await searchParams).p);
  const s = await dashboardStats(days);
  return (
    <>
      <div className="adm-head">
        <PageHeading eyebrow="ÉQUIPE" title="Tableau de bord" description={`Connecté en tant que ${staff.username} (${staff.role === "admin" ? "admin" : "modérateur"}). Activité des ${days} derniers jours.`} />
        <PeriodPicker path="/admin" days={days} />
      </div>
      <div className="adm-kpis">
        <Kpi label="Joueurs" value={fmt.format(s.users)} hint={`+${fmt.format(s.newUsers)} sur ${days} j`} />
        <Kpi label="Actifs 24 h" value={fmt.format(s.active.d1)} />
        <Kpi label="Actifs 7 j" value={fmt.format(s.active.d7)} />
        <Kpi label="Actifs 30 j" value={fmt.format(s.active.d30)} />
        <Kpi label="Lots ouverts" value={fmt.format(s.openings.values.reduce((a, b) => a + b, 0))} hint={`sur ${days} j`} />
        <Kpi label="Combats" value={fmt.format(s.battles.values.reduce((a, b) => a + b, 0))} hint={`sur ${days} j`} />
      </div>
      <div className="adm-grid">
        <Panel title="Joueurs actifs par jour"><AdminChart type="line" labels={s.activeDaily.labels} sets={[{ label: "Actifs", values: s.activeDaily.values }]} summary="Joueurs actifs par jour" /></Panel>
        <Panel title="Nouveaux comptes par jour"><AdminChart type="bar" labels={s.signups.labels} sets={[{ label: "Inscriptions", values: s.signups.values }]} summary="Nouveaux comptes par jour" /></Panel>
        <Panel title="Lots ouverts par jour"><AdminChart type="bar" labels={s.openings.labels} sets={[{ label: "Lots", values: s.openings.values }]} summary="Lots ouverts par jour" /></Panel>
        <Panel title="Combats par jour"><AdminChart type="bar" labels={s.battles.labels} sets={[{ label: "Combats", values: s.battles.values }]} summary="Combats par jour" /></Panel>
      </div>
      <Panel title="Rétention" note="Part des comptes revenus exactement n jours après l'inscription (comptes créés sur les 90 derniers jours). Activité = lot, combat, mouvement de Ryō ou session.">
        <Table head={["Jour", "Comptes", "Revenus", "Rétention"]} rows={s.retention.map((r) => [`J${r.day}`, fmt.format(r.eligible), fmt.format(r.kept), r.eligible ? pct(r.kept / r.eligible) : "—"])} />
      </Panel>
    </>
  );
}
