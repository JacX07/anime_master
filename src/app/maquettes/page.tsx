// Page temporaire : liens vers les maquettes de design (public/maquettes). À supprimer après le choix.

const MOCKUPS = [
  { href: "/maquettes/futur.html", name: "Ouverture 3D : cyber futuriste, noyaux de données" },
];

export default function MockupsPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Maquette de la page Paquets</h1>
      <p className="mb-6 text-muted">Active le son, survole les cartes et ouvre un paquet.</p>
      <ul className="flex flex-col gap-3">
        {MOCKUPS.map((m) => (
          <li key={m.href}>
            {/* Fichiers HTML statiques : lien classique, pas de navigation Next */}
            <a href={m.href} className="text-lg text-violet-300 hover:underline">
              {m.name}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
