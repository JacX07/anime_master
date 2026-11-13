import type { Release } from "@/lib/changelog";

/** Seulement gras et code inline ; le contenu du document est toujours échappé par React. */
function Inline({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => part.startsWith("**")
    ? <strong key={i}>{part.slice(2, -2)}</strong>
    : part.startsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part);
}

export function ReleaseNotes({ release }: { release: Release }) {
  return <div className="release-notes">
    {release.sections.map((section, index) => <section key={index}>
      {section.title && <h3>{section.title}</h3>}
      {section.blocks.map((block, i) => block.kind === "paragraph"
        ? <p key={i}><Inline text={block.text} /></p>
        : <ul key={i}>{block.items.map((item, n) => <li key={n}><Inline text={item} /></li>)}</ul>)}
    </section>)}
  </div>;
}
