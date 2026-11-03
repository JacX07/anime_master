import Link from "next/link";
import { Suspense } from "react";
import { Panel, Table, fmt } from "@/components/admin/parts";
import { PageHeading } from "@/components/mq/PageHeading";
import { requireRole } from "@/lib/admin";
import { PAGE_SIZE, SORTS, listPlayers, parseSort } from "@/lib/admin-players";

const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default function PlayersPage({ searchParams }: PageProps<"/admin/joueurs">) {
  return <Suspense fallback={<p className="adm-note">Chargement…</p>}><Players searchParams={searchParams} /></Suspense>;
}

async function Players({ searchParams }: { searchParams: PageProps<"/admin/joueurs">["searchParams"] }) {
  await requireRole("moderator");
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 40);
  const sort = parseSort(sp.s);
  const page = Math.max(0, Math.min(10_000, Number(sp.page) || 0));
  const { rows, total } = await listPlayers(q, sort, page);
  const href = (over: Record<string, string | number>) => `/admin/joueurs?${new URLSearchParams({ ...(q ? { q } : {}), s: sort, page: "0", ...Object.fromEntries(Object.entries(over).map(([k, v]) => [k, String(v)])) })}`;
  return (
    <>
      <PageHeading eyebrow="ÉQUIPE" title="Joueurs" description={`${fmt.format(total)} compte${total > 1 ? "s" : ""}${q ? ` pour « ${q} »` : ""}.`} />
      <form className="adm-search" action="/admin/joueurs">
        <input name="q" defaultValue={q} placeholder="Pseudo…" maxLength={40} aria-label="Rechercher un pseudo" />
        <input type="hidden" name="s" value={sort} />
        <button className="ui-button" type="submit">Rechercher</button>
      </form>
      <nav className="mq-section-tabs" aria-label="Tri">
        {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((k) => <Link key={k} href={href({ s: k })} aria-current={k === sort ? "page" : undefined}>{SORTS[k].label}</Link>)}
      </nav>
      <Panel title="Comptes">
        <Table
          head={["Joueur", "Rôle", "Ryō", "Cartes", "Paquets", "Dernière activité", "Inscrit"]}
          rows={rows.map((r) => [
            <Link key="u" href={`/admin/joueurs/${r.id}`}>{r.username}{r.banned && <span className="adm-tag ban"> · banni</span>}</Link>,
            r.role === "player" ? "—" : <span key="r" className="adm-tag">{r.role === "admin" ? "admin" : "modo"}</span>,
            fmt.format(r.balance), fmt.format(r.cards), fmt.format(r.packs),
            r.lastSeen ? date.format(r.lastSeen) : "—", date.format(r.createdAt),
          ])}
        />
        <div className="adm-pager">
          {page > 0 && <Link href={href({ page: page - 1 })}>← Précédent</Link>}
          <span>Page {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
          {(page + 1) * PAGE_SIZE < total && <Link href={href({ page: page + 1 })}>Suivant →</Link>}
        </div>
      </Panel>
    </>
  );
}
