import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RarityGem, Stat, TypeIcon } from "@/components/icons";
import { SceneBody } from "@/components/SceneBody";
import { Countdown } from "@/app/market/Countdown";
import { duelCards, duelView, type DuelView } from "@/lib/duels";
import { TYPE_LABELS } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { TeamPicker } from "../TeamPicker";
import { DefenseSession } from "./DefenseSession";
import { Replay } from "./Replay";

export const metadata: Metadata = { title: "Duel — Anime Masters" };
const num = new Intl.NumberFormat("fr-FR");

export default function DuelPage({ params }: PageProps<"/duels/[id]">) {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Duel params={params} />
      </Suspense>
    </main>
  );
}

function Team({ title, team }: { title: string; team: DuelView["myTeam"] }) {
  return (
    <div className="trade-side">
      <h3>{title}</h3>
      {team.length === 0 ? (
        <p className="vt-muted">Pas encore choisie.</p>
      ) : (
        <ol className="duel-team compact">
          {team.map((s) => (
            <li key={s.position}>
              <span className="duel-pos">{s.position}</span>
              {s.character ? <img src={s.character.imageUrl} alt="" /> : <div className="duel-mystery-img" aria-hidden>?</div>}
              <div>
                <b>
                  {s.character ? (
                    <Link href={`/character/${s.character.id}`}>{s.character.name}</Link>
                  ) : (
                    "Carte cachée"
                  )}
                </b>
                <span className="duel-stats">
                  {s.character && <RarityGem rarity={s.character.rarity} />}
                  <TypeIcon type={s.type} title={TYPE_LABELS[s.type].name} />
                  {s.character && (
                    <>
                      <Stat icon="atk">{num.format(s.attack)}</Stat>
                      <Stat icon="def">{num.format(s.defense)}</Stat>
                    </>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

async function Duel({ params }: { params: PageProps<"/duels/[id]">["params"] }) {
  const user = await requireUser();
  const { id } = await params;
  const d = await duelView(user.id, id);
  if (!d) notFound();
  const teams = (
    <div className="trade-sides">
      <Team title={`Ton équipe (${d.me})`} team={d.myTeam} />
      <Team title={`Équipe de ${d.other}`} team={d.theirTeam} />
    </div>
  );

  let body: React.ReactNode;
  if (d.status === "PENDING" && !d.mine) {
    body = (
      <>
        <p className="vt-sub">
          {d.other} te défie. Choisis 3 cartes et leur ordre d&apos;attaque avant <Countdown endsAt={d.acceptDeadline.toISOString()} />.
        </p>
        <TeamPicker cards={await duelCards(user.id)} duelId={d.id} />
      </>
    );
  } else if (d.status === "PENDING") {
    body = (
      <>
        <p className="vt-sub">
          En attente de {d.other} : il lui reste <Countdown endsAt={d.acceptDeadline.toISOString()} /> pour accepter.
        </p>
        {teams}
      </>
    );
  } else if (d.status === "ACCEPTED" && !d.defenseFinished) {
    body = (
      <>
        <p className="vt-sub">
          Défends-toi contre les 3 cartes de {d.other}. Temps restant pour jouer : <Countdown endsAt={d.playDeadline!.toISOString()} />.
        </p>
        <DefenseSession duelId={d.id} started={d.defenseStarted} />
      </>
    );
  } else if (d.status === "ACCEPTED") {
    body = (
      <>
        <p className="vt-sub">
          Ta défense est jouée. En attente de celle de {d.other} (<Countdown endsAt={d.playDeadline!.toISOString()} /> au plus ; sinon il perd par forfait).
        </p>
        {teams}
      </>
    );
  } else if (d.status === "DONE" && d.result) {
    body = (
      <>
        <Replay result={d.result} characters={d.characters} nameA={d.challenger} nameB={d.opponent} me={d.mine ? "A" : "B"} />
        <Outcome d={d} />
        {teams}
      </>
    );
  } else {
    const text: Record<string, string> = {
      DECLINED: `${d.opponent} a refusé le duel.`,
      EXPIRED: d.myTeam.length && d.theirTeam.length ? "Personne n'a joué sa défense à temps : duel expiré, sans résultat." : `${d.opponent} n'a pas répondu à temps : duel expiré.`,
      FORFEIT: d.winner === d.me ? `${d.other} n'a pas joué sa défense à temps : tu gagnes par forfait.` : "Tu n'as pas terminé ta défense à temps : défaite par forfait.",
    };
    body = (
      <>
        <p className="duel-verdict" data-outcome={d.status === "FORFEIT" ? (d.winner === d.me ? "win" : "loss") : "draw"}>
          {text[d.status]}
        </p>
        {d.status === "FORFEIT" && <Outcome d={d} />}
        {teams}
      </>
    );
  }

  return (
    <div className="vt-inner">
      <header>
        <Link href="/duels" className="vt-muted">
          ← Duels
        </Link>
        <h1 className="vt-title">
          {d.challenger} contre {d.opponent}
        </h1>
      </header>
      {body}
    </div>
  );
}

function Outcome({ d }: { d: DuelView }) {
  if (d.eloChange === null) return null;
  return (
    <p className="vt-muted">
      Elo {d.eloChange >= 0 ? "+" : ""}
      {d.eloChange}.{" "}
      {d.rewarded ? "Récompense versée dans ton portefeuille." : "Pas de récompense : déjà 2 duels récompensés aujourd'hui contre ce joueur."}
    </p>
  );
}
