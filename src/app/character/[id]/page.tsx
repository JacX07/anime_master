import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CharacterCard } from "@/components/CharacterCard";
import { getCharacter } from "@/lib/album";
import { prisma } from "@/lib/db";
import { Stat, TypeIcon } from "@/components/icons";
import { quickSellPrice } from "@/lib/economy";
import { FINISH_NAMES, RARITY_NAMES, TYPE_LABELS } from "@/lib/labels";
import { getSessionUser } from "@/lib/session";
import { priceHistory } from "@/lib/auctions";
import { traders } from "@/lib/trades";
import { wishesFor } from "@/lib/wishlist";
import { WishButton } from "./WishButton";
import { CopyActions } from "./CopyActions";

const parseId = (raw: string) => (/^\d{1,9}$/.test(raw) ? Number(raw) : null);

export async function generateMetadata({ params }: PageProps<"/character/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  const c = id ? await prisma.character.findUnique({ where: { id }, select: { name: true } }) : null;
  return { title: c ? `${c.name} — Anime Masters` : "Personnage — Anime Masters" };
}

export default function CharacterPage({ params }: PageProps<"/character/[id]">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Link href="/album" className="text-sm text-muted hover:text-foreground">
        ← Album
      </Link>
      <Suspense fallback={<p className="mt-6 text-muted">Chargement…</p>}>
        <Character params={params} />
      </Suspense>
    </main>
  );
}

const ROLES: Record<string, string> = { MAIN: "Principal", SUPPORTING: "Secondaire", BACKGROUND: "Figurant" };
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const numFmt = new Intl.NumberFormat("fr-FR");

async function Character({ params }: { params: PageProps<"/character/[id]">["params"] }) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const user = await getSessionUser();
  const c = await getCharacter(id, user?.id ?? null);
  if (!c) notFound();

  const [offers, history, wishes] = await Promise.all([traders(id), priceHistory(id), user ? wishesFor(user.id, id) : Promise.resolve([])]);
  const owned = c.copies !== null && c.copies.length > 0;
  const t = TYPE_LABELS[c.type];
  const facts: [string, React.ReactNode][] = [
    ["Rareté", `${c.rarity} · ${RARITY_NAMES[c.rarity]}`],
    ["Type", <span key="type" className="stat"><TypeIcon type={c.type} />{t.name}</span>],
    ["Puissance", <Stat key="power" icon="puissance" accent="#00c8b4">{numFmt.format(c.power)}</Stat>],
    ["Attaque", <Stat key="atk" icon="atk">{numFmt.format(c.attack)}</Stat>],
    ["Défense", <Stat key="def" icon="def">{numFmt.format(c.defense)}</Stat>],
    ["Favoris AniList", numFmt.format(c.favourites)],
    ["Exemplaires tirés", numFmt.format(c.pullCount)],
    ...(c.gender ? [["Genre", c.gender] as [string, string]] : []),
    ...(c.age ? [["Âge", c.age] as [string, string]] : []),
    ...(c.birthday ? [["Anniversaire", `${c.birthday.day ?? ""} ${MONTHS[c.birthday.month - 1]}`.trim()] as [string, string]] : []),
  ];

  return (
    <div className="mt-6 grid gap-10 md:grid-cols-[18rem_1fr]">
      <div className="flex flex-col gap-4">
        <CharacterCard {...c} finish={c.copies?.[0]?.finish} missing={!owned} />
        {!owned && (
          <p className="text-center text-sm text-muted">
            {user ? "Tu ne possèdes pas encore ce personnage." : "Connecte-toi pour voir tes exemplaires."}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-8">
        <header>
          <h1 className="text-3xl font-extrabold">{c.name}</h1>
          {c.nameNative && <p className="text-muted">{c.nameNative}</p>}
          {c.series && <p className="mt-1 text-sm text-[#8fb5ff]">{c.series}</p>}
        </header>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k} className="rounded-xl bg-panel px-4 py-3">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        {user && (
          <section>
            <h2 className="mb-2 text-lg font-bold">Liste de souhaits</h2>
            <WishButton characterId={id} wishes={wishes} />
          </section>
        )}

        {history.last.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-bold">Prix aux enchères</h2>
            <p className="mb-2 text-sm text-muted">
              {history.averages.map((a) => `${FINISH_NAMES[a.finish]} : ${numFmt.format(a.average)} Ryō en moyenne (${a.count} vente${a.count > 1 ? "s" : ""})`).join(" · ")}
            </p>
            <ul className="divide-y divide-white/5 rounded-xl bg-panel">
              {history.last.map((h, i) => (
                <li key={i} className="flex items-center gap-4 px-4 py-2 text-sm tabular-nums">
                  <span className="finish-tag" data-finish={h.finish}>{FINISH_NAMES[h.finish]}</span>
                  <span className="font-semibold">{numFmt.format(h.price)} Ryō</span>
                  <span className="ml-auto text-muted">{dateFmt.format(h.at)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.description && (
          <section>
            <h2 className="mb-2 text-lg font-bold">Description</h2>
            <p className="leading-relaxed text-[#c4c4d4]" lang="en">
              {c.description}
            </p>
          </section>
        )}

        {c.copies && c.copies.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-bold">Mes exemplaires ({c.copies.length})</h2>
            <ul className="divide-y divide-white/5 rounded-xl bg-panel">
              {c.copies.map((copy) => (
                <li key={copy.id} className="flex items-start gap-4 px-4 py-2.5 text-sm tabular-nums">
                  <span className="w-16 font-semibold">#{copy.serial}</span>
                  <span className="finish-tag" data-finish={copy.finish}>
                    {FINISH_NAMES[copy.finish]}
                  </span>
                  <span className="ml-auto text-muted">{dateFmt.format(copy.obtainedAt)}</span>
                  <CopyActions
                    cardId={copy.id}
                    locked={copy.locked}
                    forTrade={copy.forTrade}
                    inAuction={copy.inAuction}
                    inExpedition={copy.inExpedition}
                    price={quickSellPrice(c.rarity, copy.finish)}
                    label={`#${copy.serial} · ${FINISH_NAMES[copy.finish]}`}
                    characterName={c.name}
                    lastCopy={c.copies!.length === 1}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {offers.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-bold">Proposé à l&apos;échange ({offers.length})</h2>
            <ul className="divide-y divide-white/5 rounded-xl bg-panel">
              {offers.map((o) => (
                <li key={o.id} className="flex items-center gap-4 px-4 py-2.5 text-sm tabular-nums">
                  <span className="font-semibold">{o.username}</span>
                  <span className="text-muted">#{o.serial}</span>
                  <span className="finish-tag" data-finish={o.finish}>
                    {FINISH_NAMES[o.finish]}
                  </span>
                  {user && o.username !== user.username && (
                    <Link href={`/trades/new?to=${encodeURIComponent(o.username)}&ask=${o.id}`} className="ml-auto text-[#8fb5ff] hover:underline">
                      Proposer un échange
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.media.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold">Séries</h2>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {c.media.map((m) => (
                <li key={m.id} className="flex flex-col gap-1">
                  {m.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-[2/3] w-full rounded-lg object-cover" />
                  ) : (
                    <div className="aspect-[2/3] w-full rounded-lg bg-panel" />
                  )}
                  <span className="line-clamp-2 text-xs font-semibold" title={m.title}>
                    {m.title}
                  </span>
                  <span className="text-xs text-muted">
                    {[m.year, ROLES[m.role]].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
