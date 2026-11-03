import { Suspense } from "react";
import { AdminChart } from "@/components/admin/AdminChart";
import { Kpi, Panel, PeriodPicker, REASON_NAMES, Table, fmt } from "@/components/admin/parts";
import { PageHeading } from "@/components/mq/PageHeading";
import { requireRole } from "@/lib/admin";
import { economyStats, parsePeriod } from "@/lib/admin-stats";

export default function EconomyPage({ searchParams }: PageProps<"/admin/economie">) {
  return <Suspense fallback={<p className="adm-note">Chargement…</p>}><Economy searchParams={searchParams} /></Suspense>;
}

async function Economy({ searchParams }: { searchParams: PageProps<"/admin/economie">["searchParams"] }) {
  await requireRole("moderator");
  const days = parsePeriod((await searchParams).p);
  const s = await economyStats(days);
  const created = s.reasons.reduce((a, r) => a + r.created, 0);
  const spent = s.reasons.reduce((a, r) => a + r.spent, 0);
  return (
    <>
      <div className="adm-head">
        <PageHeading eyebrow="ÉQUIPE" title="Économie" description={`Mouvements de Ryō des ${days} derniers jours (journal comptable).`} />
        <PeriodPicker path="/admin/economie" days={days} />
      </div>
      <div className="adm-kpis">
        <Kpi label="Ryō en circulation" value={fmt.format(s.supply)} hint={`${fmt.format(s.players)} joueurs`} />
        <Kpi label="Solde moyen" value={fmt.format(s.avg)} hint={`médian ${fmt.format(s.median)}`} />
        <Kpi label="Créé" value={fmt.format(created)} hint={`sur ${days} j`} />
        <Kpi label="Dépensé" value={fmt.format(spent)} hint={`net ${created - spent >= 0 ? "+" : ""}${fmt.format(created - spent)}`} />
      </div>
      <Panel title="Ryō créés et dépensés par jour">
        <AdminChart type="line" labels={s.created.labels} sets={[{ label: "Créé", values: s.created.values }, { label: "Dépensé", values: s.spent.values }]} summary="Ryō créés et dépensés par jour" />
      </Panel>
      <div className="adm-grid">
        <Panel title="Par source" note="Enchères : la mise bloquée (BID_HOLD) puis remboursée ou versée gonfle les deux colonnes sans créer de Ryō.">
          <Table head={["Source", "Mouvements", "Créé", "Dépensé"]} rows={s.reasons.map((r) => [REASON_NAMES[r.reason] ?? r.reason, fmt.format(r.n), fmt.format(r.created), fmt.format(r.spent)])} />
        </Panel>
        <Panel title="Plus gros soldes">
          <Table head={["Joueur", "Ryō"]} rows={s.top.map((u) => [u.username, fmt.format(u.balance)])} />
        </Panel>
      </div>
    </>
  );
}
