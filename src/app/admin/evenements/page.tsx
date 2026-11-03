import { Suspense } from "react";
import { AdminChart } from "@/components/admin/AdminChart";
import { Kpi, MODE_NAMES, Panel, PeriodPicker, Table, fmt, pct } from "@/components/admin/parts";
import { PageHeading } from "@/components/mq/PageHeading";
import { requireRole } from "@/lib/admin";
import { eventStats, parsePeriod } from "@/lib/admin-stats";
import { EVENT_RETENTION_DAYS } from "@/lib/events";

export default function EventsPage({ searchParams }: PageProps<"/admin/evenements">) {
  return <Suspense fallback={<p className="adm-note">Chargement…</p>}><Events searchParams={searchParams} /></Suspense>;
}

const TYPE_NAMES: Record<string, string> = {
  login: "Connexion", signup: "Inscription", pack_open: "Lot ouvert", battle_end: "Combat terminé", battle_abandon: "Combat abandonné",
  purchase: "Achat", trade: "Échange", auction_end: "Enchère vendue", achievement: "Succès",
};

async function Events({ searchParams }: { searchParams: PageProps<"/admin/evenements">["searchParams"] }) {
  await requireRole("moderator");
  const days = parsePeriod((await searchParams).p);
  const s = await eventStats(days);
  const when = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });
  return (
    <>
      <div className="adm-head">
        <PageHeading eyebrow="ÉQUIPE" title="Événements" description={`Journal d'événements de jeu des ${days} derniers jours. Conservés ${EVENT_RETENTION_DAYS} jours, collectés depuis la mise en place : l'historique antérieur n'existe pas.`} />
        <PeriodPicker path="/admin/evenements" days={days} />
      </div>
      <div className="adm-kpis">
        <Kpi label="Événements" value={fmt.format(s.total)} />
        {s.byType.slice(0, 5).map((t) => <Kpi key={t.type} label={TYPE_NAMES[t.type] ?? t.type} value={fmt.format(t.n)} hint={`${fmt.format(t.players)} joueur${t.players > 1 ? "s" : ""}`} />)}
      </div>
      <Panel title="Événements par jour et par type">
        <AdminChart type="bar" stacked labels={s.labels} sets={s.series.map((x) => ({ label: TYPE_NAMES[x.label] ?? x.label, values: x.values }))} summary="Événements par jour et par type" />
      </Panel>
      <Panel title="Combats terminés" note="Événements enregistrés seulement. « Événements » = nombre d'événements du journal de combat (taille du combat) ; durée et actions : combats manuels uniquement.">
        <Table head={["Mode", "Type", "Combats", "Victoires", "Événements moy.", "Actions moy.", "Durée moy. (s)"]} rows={s.fights.map((f) => [MODE_NAMES[f.mode] ?? f.mode, f.manual ? "manuel" : "auto", fmt.format(f.n), pct(f.rate), fmt.format(f.events), f.steps === null ? "—" : fmt.format(f.steps), f.seconds === null ? "—" : fmt.format(f.seconds)])} />
      </Panel>
      <Panel title="Derniers événements">
        <Table head={["Date", "Type", "Joueur", "Détails"]} rows={s.recent.map((r) => [when.format(r.at), TYPE_NAMES[r.type] ?? r.type, r.username ?? "—", <code key="d" className="adm-code">{r.data}</code>])} />
      </Panel>
    </>
  );
}
