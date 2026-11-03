import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Kpi, Panel, REASON_NAMES, Table, fmt } from "@/components/admin/parts";
import { StaffForm } from "@/components/admin/StaffForm";
import { PageHeading } from "@/components/mq/PageHeading";
import { requireRole } from "@/lib/admin";
import { denied } from "@/lib/admin-actions";
import { playerSheet } from "@/lib/admin-players";

const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });
const RARITIES = ["UR", "SSR", "SR", "R", "N"];

export default function PlayerPage({ params }: PageProps<"/admin/joueurs/[id]">) {
  return <Suspense fallback={<p className="adm-note">Chargement…</p>}><Player params={params} /></Suspense>;
}

async function Player({ params }: { params: PageProps<"/admin/joueurs/[id]">["params"] }) {
  const staff = await requireRole("moderator");
  const s = await playerSheet((await params).id);
  if (!s) notFound();
  const u = s.user;
  const can = (action: Parameters<typeof denied>[2]) => denied(staff, { id: u.id, role: u.role }, action) === null;
  const sanction = can("ban");
  const admin = can("ryo");
  return (
    <>
      <div className="adm-head">
        <PageHeading eyebrow="JOUEUR" title={u.username} description={`${u.role === "player" ? "Joueur" : u.role === "admin" ? "Administrateur" : "Modérateur"} · inscrit le ${date.format(u.createdAt)} · dernière activité ${s.lastSeen ? date.format(s.lastSeen) : "inconnue"}`} />
        <Link href="/admin/joueurs">← Liste</Link>
      </div>
      {u.bannedAt && <p className="adm-down" role="status">Compte banni le {date.format(u.bannedAt)} : {u.banReason}</p>}
      <div className="adm-kpis">
        <Kpi label="Ryō" value={fmt.format(u.balance)} />
        <Kpi label="Cristaux" value={fmt.format(u.crystals)} />
        <Kpi label="Cartes" value={fmt.format(Object.values(s.byRarity).reduce((a, b) => a + b, 0))} hint={RARITIES.map((r) => `${r} ${s.byRarity[r] ?? 0}`).join(" · ")} />
        <Kpi label="Paquets" value={fmt.format(s.packs)} hint={`pity SSR ${u.cardsSinceSSR} · UR ${u.cardsSinceUR}`} />
        <Kpi label="Combats" value={fmt.format(s.battles)} hint={`${s.achievements} succès`} />
      </div>
      <div className="adm-grid">
        <Panel title="Actions" note={admin ? "Chaque action demande un motif et une confirmation, et est inscrite au journal d'audit." : sanction ? "Votre rôle permet uniquement de bannir ou débannir." : "Aucune action possible sur ce compte."}>
          {sanction && (u.bannedAt
            ? <StaffForm op="unban" target={u.id} title="Débannir" submit="Débannir" />
            : <StaffForm op="ban" target={u.id} title="Bannir (sessions supprimées, connexion refusée)" submit="Bannir" danger />)}
          {admin && <>
            <StaffForm op="ryo" target={u.id} title="Ajuster les Ryō" fields={[{ name: "amount", label: "Montant (négatif pour retirer)", type: "number" }]} submit="Ajuster" />
            <StaffForm op="crystals" target={u.id} title="Ajuster les cristaux" fields={[{ name: "amount", label: "Quantité (négatif pour retirer)", type: "number" }]} submit="Ajuster" />
            <StaffForm op="pity" target={u.id} title="Réinitialiser le compteur de pity" submit="Réinitialiser" />
            <StaffForm op="give" target={u.id} title="Offrir une carte" fields={[{ name: "character", label: "Nom exact du personnage" }]} submit="Offrir" />
            {s.cards.length > 0 && <StaffForm op="remove" target={u.id} title="Retirer une carte" fields={[{ name: "card", label: "Carte", type: "select", options: s.cards.map((c) => ({ value: c.id, label: `${c.character.name} #${c.serial} (${c.character.rarity}${c.finish === "NORMAL" ? "" : ` ${c.finish}`})` })) }]} submit="Retirer" danger />}
            <StaffForm op="role" target={u.id} title="Changer le rôle" fields={[{ name: "role", label: "Rôle", type: "select", options: [{ value: "player", label: "Joueur" }, { value: "moderator", label: "Modérateur" }, { value: "admin", label: "Administrateur" }] }]} submit="Changer" danger />
          </>}
        </Panel>
        <Panel title="Journal de Ryō (25 derniers)">
          <Table head={["Date", "Source", "Ryō"]} rows={s.ledger.map((l) => [date.format(l.createdAt), REASON_NAMES[l.reason] ?? l.reason, <span key="a" className={l.amount >= 0 ? "adm-up" : "adm-down"}>{l.amount > 0 ? "+" : ""}{fmt.format(l.amount)}</span>])} />
        </Panel>
      </div>
      <div className="adm-grid">
        <Panel title="Derniers paquets">
          <Table head={["Date", "Bannière", "Cartes", "Meilleure"]} rows={s.openings.map((o) => [date.format(o.openedAt), o.banner?.name ?? "Standard", o.lotSize, RARITIES.find((r) => o.cards.some((c) => c.rarityAtPull === r)) ?? "—"])} />
        </Panel>
        <Panel title="Derniers combats">
          <Table head={["Date", "Mode", "Résultat"]} rows={s.recentBattles.map((b) => [date.format(b.createdAt), b.mode, b.winner === "A" ? "Victoire" : b.winner ? "Défaite" : "—"])} />
        </Panel>
      </div>
      <Panel title="Collection (60 plus rares)">
        <div className="adm-cards">{s.cards.map((c) => <span key={c.id} className="adm-tag">{c.character.name} #{c.serial} · {c.character.rarity}{c.stars ? ` ★${c.stars}` : ""}{c.inAuction ? " · enchère" : ""}{c.inExpedition ? " · expédition" : ""}</span>)}</div>
      </Panel>
      <Panel title="Actions de l'équipe sur ce compte">
        <Table head={["Date", "Qui", "Action", "Motif"]} rows={s.audit.map((a) => [date.format(a.createdAt), a.actorName, a.action, a.reason ?? "—"])} />
      </Panel>
    </>
  );
}
