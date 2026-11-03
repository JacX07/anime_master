import { Suspense } from "react";
import { AdminChart } from "@/components/admin/AdminChart";
import { Kpi, Panel, PeriodPicker, Table, fmt, pct } from "@/components/admin/parts";
import { PageHeading } from "@/components/mq/PageHeading";
import { requireRole } from "@/lib/admin";
import { boosterStats, parsePeriod } from "@/lib/admin-stats";

export default function BoostersPage({ searchParams }: PageProps<"/admin/boosters">) {
  return <Suspense fallback={<p className="adm-note">Chargement…</p>}><Boosters searchParams={searchParams} /></Suspense>;
}

async function Boosters({ searchParams }: { searchParams: PageProps<"/admin/boosters">["searchParams"] }) {
  await requireRole("moderator");
  const days = parsePeriod((await searchParams).p);
  const s = await boosterStats(days);
  const gap = (share: number, theory: number) => {
    const d = share - theory;
    return <span className={Math.abs(d) < theory * 0.25 ? "adm-up" : "adm-down"}>{d >= 0 ? "+" : ""}{(d * 100).toFixed(2).replace(".", ",")} pt</span>;
  };
  return (
    <>
      <div className="adm-head">
        <PageHeading eyebrow="ÉQUIPE" title="Boosters" description={`Tirages des ${days} derniers jours.`} />
        <PeriodPicker path="/admin/boosters" days={days} />
      </div>
      <div className="adm-kpis">
        <Kpi label="Lots ouverts" value={fmt.format(s.openings)} />
        <Kpi label="Cartes tirées" value={fmt.format(s.cards)} />
        <Kpi label="Pity SSR / UR" value={`${fmt.format(s.pity.ssr)} / ${fmt.format(s.pity.ur)}`} hint="lots où le pity a joué" />
        <Kpi label="Jamais tirés" value={fmt.format(s.neverDrawn)} hint={`sur ${fmt.format(s.totalCharacters)} personnages`} />
      </div>
      <div className="adm-grid">
        <Panel title="Raretés : observé contre théorique" note="Le pity et la 10ᵉ carte garantie augmentent légèrement les raretés hautes : un petit écart positif est normal. Peu de tirages = résultat bruité.">
          <AdminChart type="bar" labels={s.rarity.map((r) => r.key)} sets={[{ label: "Théorique (%)", values: s.rarity.map((r) => +(r.theory * 100).toFixed(2)) }, { label: "Observé (%)", values: s.rarity.map((r) => +(r.share * 100).toFixed(2)) }]} summary="Raretés observées et théoriques" />
          <Table head={["Rareté", "Tirées", "Observé", "Théorique", "Écart"]} rows={s.rarity.map((r) => [r.key, fmt.format(r.seen), pct(r.share, 2), pct(r.theory, 2), gap(r.share, r.theory)])} />
        </Panel>
        <Panel title="Finitions">
          <Table head={["Finition", "Tirées", "Observé", "Théorique", "Écart"]} rows={s.finish.map((r) => [r.key, fmt.format(r.seen), pct(r.share, 2), pct(r.theory, 2), gap(r.share, r.theory)])} />
          <Table head={["Taille du lot", "Lots"]} rows={s.lots.map((l) => [`×${l.size}`, fmt.format(l.n)])} />
        </Panel>
      </div>
      <Panel title="Par bannière">
        <Table head={["Bannière", "Lots", "Cartes", "SSR + UR", "Part SSR + UR"]} rows={s.banners.map((b) => [b.name, fmt.format(b.openings), fmt.format(b.cards), fmt.format(b.top), b.cards ? pct(b.top / b.cards, 2) : "—"])} />
      </Panel>
      <Panel title="Personnages les plus tirés">
        <Table head={["Personnage", "Rareté", "Tirages"]} rows={s.top.map((t) => [t.name, t.rarity, fmt.format(t.n)])} />
      </Panel>
    </>
  );
}
