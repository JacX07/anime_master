import { Suspense } from "react";
import { AdminChart } from "@/components/admin/AdminChart";
import { MODE_NAMES, Panel, PeriodPicker, Table, fmt, pct } from "@/components/admin/parts";
import { PageHeading } from "@/components/mq/PageHeading";
import { requireRole } from "@/lib/admin";
import { combatStats, parsePeriod } from "@/lib/admin-stats";

export default function CombatsPage({ searchParams }: PageProps<"/admin/combats">) {
  return <Suspense fallback={<p className="adm-note">Chargement…</p>}><Combats searchParams={searchParams} /></Suspense>;
}

async function Combats({ searchParams }: { searchParams: PageProps<"/admin/combats">["searchParams"] }) {
  await requireRole("moderator");
  const days = parsePeriod((await searchParams).p);
  const s = await combatStats(days);
  const rows = (list: { name: string; games: number; rate: number }[]) => list.map((c) => [c.name, fmt.format(c.games), pct(c.rate)]);
  return (
    <>
      <div className="adm-head">
        <PageHeading eyebrow="ÉQUIPE" title="Combats" description={`Combats des ${days} derniers jours. Victoire = l'équipe du joueur gagne.`} />
        <PeriodPicker path="/admin/combats" days={days} />
      </div>
      <Panel title="Combats par jour et par mode">
        <AdminChart type="bar" stacked labels={s.labels} sets={s.byMode.map((m) => ({ label: MODE_NAMES[m.mode] ?? m.mode, values: m.values }))} summary="Combats par jour et par mode" />
      </Panel>
      <Panel title="Par mode">
        <Table head={["Mode", "Lancés", "Terminés", "Victoires", "Nuls", "Abandons", "En cours", "Manuels"]} rows={s.modes.map((m) => [MODE_NAMES[m.mode] ?? m.mode, fmt.format(m.total), fmt.format(m.done), pct(m.rate), fmt.format(m.draws), fmt.format(m.abandoned), fmt.format(m.running), fmt.format(m.manual)])} />
      </Panel>
      <div className="adm-grid">
        <Panel title="Personnages les plus gagnants" note={`Combats terminés hors test, au moins ${s.minGames} combats (${fmt.format(s.ratedCount)} personnages concernés). Un personnage est souvent joué avec d'autres : le taux reflète surtout l'équipe.`}>
          <Table head={["Personnage", "Combats", "Victoires"]} rows={rows(s.best)} />
        </Panel>
        <Panel title="Personnages les moins gagnants">
          <Table head={["Personnage", "Combats", "Victoires"]} rows={rows(s.worst)} />
        </Panel>
      </div>
      <Panel title="Adversaires PvM" note="Histoire, raid, Tour et donjons, au moins 5 combats terminés. Un taux très haut ou très bas signale un niveau mal réglé.">
        <Table head={["Mode", "Adversaire", "Combats", "Victoires"]} rows={s.opponents.map((o) => [MODE_NAMES[o.mode] ?? o.mode, o.opponent, fmt.format(o.done), pct(o.rate)])} />
      </Panel>
    </>
  );
}
