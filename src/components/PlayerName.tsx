import Link from "next/link";

/** Pseudo d'un joueur : lien vers son profil, avec son titre équipé s'il en a un. */
export function PlayerName({ username, title }: { username: string; title?: string | null }) {
  return (
    <span className="pl-name">
      <Link href={`/u/${encodeURIComponent(username)}`}>
        <b>{username}</b>
      </Link>
      {title && <small className="pl-title">{title}</small>}
    </span>
  );
}
