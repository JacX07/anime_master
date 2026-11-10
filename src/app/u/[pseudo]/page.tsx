import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CharacterCard } from "@/components/CharacterCard";
import { Icon } from "@/components/icons";
import { SceneBody } from "@/components/SceneBody";
import { getProfile, pinnable, SHOWCASE_MAX } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { relationWith } from "@/lib/friends";
import { FriendButtons } from "./FriendButtons";
import { ProfileEditor } from "./ProfileEditor";
import "./profile.css";

const num = new Intl.NumberFormat("fr-FR");
const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export async function generateMetadata({ params }: PageProps<"/u/[pseudo]">): Promise<Metadata> {
  return { title: `${decodeURIComponent((await params).pseudo)} — Anime Masters` };
}

export default function ProfilePage({ params }: PageProps<"/u/[pseudo]">) {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Profile params={params} />
      </Suspense>
    </main>
  );
}

async function Profile({ params }: { params: PageProps<"/u/[pseudo]">["params"] }) {
  const viewer = await requireUser(); // profil visible par les joueurs connectés
  const profile = await getProfile(decodeURIComponent((await params).pseudo));
  if (!profile) notFound();
  const mine = profile.id === viewer.id;
  const done = profile.achievements.filter((a) => a.unlockedAt);
  const pins = mine ? await pinnable(profile.id) : [];
  const relation = mine ? null : await relationWith(viewer.id, profile.id);
  return (
    <div className="vt-inner mq-profile">
      <header className="pf-head mq-profile-hero">
        <div className="pf-avatar" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" /> : profile.username.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="vt-title">{profile.username}</h1>
          {profile.guild && <Link className="pl-title" href={`/guilds/${profile.guild.tag}`}>[{profile.guild.tag}] {profile.guild.name}</Link>}
          {profile.title && <span className="pl-title pf-title">{profile.title}</span>}
          <p className="vt-sub">Joueur depuis le {dateFmt.format(profile.since)}</p>
          {relation && <FriendButtons username={profile.username} userId={profile.id} relation={relation} />}
        </div>
      </header>

      <ul className="pf-stats mq-profile-stats" aria-label="Statistiques">
        <li>
          <b>{num.format(profile.unique)}</b>
          <span>personnages</span>
        </li>
        <li>
          <b>
            <Icon name="puissance" style={{ "--acc": "currentColor" } as React.CSSProperties} /> {num.format(profile.power)}
          </b>
          <span>puissance</span>
        </li>
        <li>
          <b>{num.format(profile.packsOpened)}</b>
          <span>boosters ouverts</span>
        </li>
        <li>
          <b>{profile.duelWins}</b>
          <span>victoires en duel</span>
        </li>
        <li>
          <b>{profile.expeditions}</b>
          <span>expéditions</span>
        </li>
        <li>
          <b>{profile.completedAnime.length}</b>
          <span>anime complets</span>
        </li>
        <li>
          <b>{profile.storyStars}</b>
          <span>étoiles de l&apos;histoire</span>
        </li>
        <li>
          <b>{profile.towerFloor > 0 ? `Étage ${profile.towerFloor}` : "—"}</b>
          <span>Tour universelle</span>
        </li>
      </ul>

      <section aria-label="Vitrine">
        <h2 className="pf-h">Vitrine</h2>
        {profile.showcase.length === 0 ? (
          <p className="vt-muted">{mine ? "Épingle jusqu'à 6 personnages ci-dessous pour les montrer ici." : "Rien d'épinglé pour l'instant."}</p>
        ) : (
          <ul className="pf-showcase">
            {profile.showcase.map((e) => (
              <li key={e.id}>
                <CharacterCard {...e} characterId={e.id} finish={e.owned?.best} count={undefined} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {mine && (
        <ProfileEditor
          titles={done.map((a) => ({ key: a.key, title: a.title }))}
          current={profile.titleKey}
          pinnable={pins.map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl, rarity: c.rarity }))}
          avatar={profile.avatarCharacterId}
          pinned={profile.showcase.map((e) => e.id)}
          max={SHOWCASE_MAX}
        />
      )}

      <section aria-label="Succès">
        <h2 className="pf-h">
          Succès <small className="vt-muted">{done.length} / {profile.achievements.length}</small>
        </h2>
        <ul className="pf-ach">
          {profile.achievements.map((a) => (
            <li key={a.key} data-done={a.unlockedAt !== null}>
              <b>{a.label}</b>
              <span className="vt-muted">{a.description}</span>
              <small>{a.unlockedAt ? `Débloqué le ${dateFmt.format(a.unlockedAt)} · titre « ${a.title} »` : `Titre « ${a.title} »`}</small>
            </li>
          ))}
        </ul>
      </section>

      {profile.completedAnime.length > 0 && (
        <section aria-label="Anime complets">
          <h2 className="pf-h">Anime complets</h2>
          <ul className="pf-anime">
            {profile.completedAnime.map((t) => (
              <li key={t}>✓ {t}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
