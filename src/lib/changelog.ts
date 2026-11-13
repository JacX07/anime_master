export type ReleaseBlock = { kind: "paragraph"; text: string } | { kind: "list"; items: string[] };
export interface ReleaseSection { title: string; blocks: ReleaseBlock[] }
export interface Release { version: string; title: string; sections: ReleaseSection[] }

/** Le document reste la source unique ; les consignes de déploiement ne sont pas des notes joueur. */
export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  let release: Release | null = null;
  let section: ReleaseSection | null = null;
  let separated = true;
  let introduction = false;
  for (const line of markdown.replaceAll("\r\n", "\n").split("\n")) {
    if (line.startsWith("## ")) {
      const match = /^## (v\d+\.\d+\.\d+(?:-[\w.-]+)?) — (.+)$/.exec(line);
      release = match ? { version: match[1], title: match[2], sections: [] } : null;
      section = null;
      introduction = true;
      if (release) {
        if (releases.some((r) => r.version === release!.version)) throw new Error("Version dupliquée dans le changelog");
        releases.push(release);
      }
    } else if (release && line.startsWith("### ")) {
      introduction = false;
      const title = line.slice(4).trim();
      section = /^(Migrations|Technique et exploitation)/i.test(title) ? null : { title, blocks: [] };
      if (section) release.sections.push(section);
    } else if (release && introduction && !section && line.trim() && !/migration/i.test(line)) {
      section = { title: "", blocks: [] };
      release.sections.push(section);
      section.blocks.push({ kind: "paragraph", text: line.trim() });
    } else if (section && line.trim()) {
      const text = line.trim();
      const previous = section.blocks.at(-1);
      if (text.startsWith("- ")) {
        if (previous?.kind === "list") previous.items.push(text.slice(2));
        else section.blocks.push({ kind: "list", items: [text.slice(2)] });
      } else if (!separated && previous?.kind === "paragraph") previous.text += ` ${text}`;
      else section.blocks.push({ kind: "paragraph", text });
    }
    separated = !line.trim() || line.startsWith("#");
  }
  return releases.map((r) => ({ ...r, sections: r.sections.filter((s) => s.blocks.length) }));
}

/** Une version inconnue peut venir d'un déploiement plus récent : ne pas annoncer ni acquitter une ancienne. */
export function needsReleaseNotice(versions: readonly string[], lastRead: string | null): boolean {
  return versions.length > 0 && (lastRead === null || versions.slice(1).includes(lastRead));
}
