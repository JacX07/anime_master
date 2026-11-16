"use client";

import { useState } from "react";
import type { Release } from "@/lib/changelog";
import { ReleaseNotes } from "@/components/changelog/ReleaseNotes";

export function ReleaseHistory({ releases }: { releases: Release[] }) {
  const [selected, setSelected] = useState(releases[0]?.version);
  const latestPublished = releases.find((entry) => !entry.upcoming);
  const release = releases.find((r) => r.version === selected) ?? releases[0];
  if (!release) return <p className="vt-muted">Aucune mise à jour publiée pour le moment.</p>;
  return <div className="release-history">
    <nav className="release-versions" aria-label="Versions du jeu">
      {releases.map((r) => <button key={r.version} type="button" className="release-version" aria-pressed={release.version === r.version}
        aria-controls="release-content" onClick={() => setSelected(r.version)}>
        <b>{r.version}</b><small>{r.upcoming ? "Prochaine mise à jour" : r === latestPublished ? "Dernière version" : "Voir la mise à jour"}</small>
      </button>)}
    </nav>
    <article className="release-content" id="release-content" aria-labelledby="release-title">
      <header className="release-heading">
        <p>{release.version}{release.upcoming ? " · En préparation" : release === latestPublished ? " · Dernière version" : ""}</p>
        <h2 id="release-title">{release.title}</h2>
      </header>
      <div className="release-scroll" key={release.version} tabIndex={0} aria-label={`Notes ${release.version}`}><ReleaseNotes release={release} /></div>
    </article>
  </div>;
}
