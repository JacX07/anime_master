// Page temporaire : liens vers les maquettes de design (public/maquettes). À supprimer après le choix.

const MOCKUPS = [
  { href: "/maquettes/a-capsule.html", name: "A · Capsule (pop coloré)" },
  { href: "/maquettes/b-neon.html", name: "B · Néon arcade (gacha néon)" },
  { href: "/maquettes/c-manga.html", name: "C · Shōnen pop (manga)" },
  { href: "/maquettes/d-dream.html", name: "D · Rêve holo (pastel irisé)" },
  { href: "/maquettes/e-scene3d.html", name: "E · Scène 3D néon (trou noir)" },
  { href: "/maquettes/opening.html?theme=medieval", name: "F · Ouverture 3D : Médiéval (salle du trésor)" },
  { href: "/maquettes/opening.html?theme=cyberpunk", name: "G · Ouverture 3D : Cyberpunk (rue sous la pluie)" },
  { href: "/maquettes/opening.html?theme=futur", name: "H · Ouverture 3D : Cyber futuriste (laboratoire blanc)" },
  { href: "/maquettes/opening.html?theme=prairie", name: "I · Ouverture 3D : Prairie à la Frieren" },
  { href: "/maquettes/opening.html?theme=sanctuaire", name: "J · Ouverture 3D : Sanctuaire au clair de lune" },
];

export default function MockupsPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Maquettes de la page Paquets</h1>
      <p className="mb-6 text-muted">Active le son, survole les cartes et ouvre un paquet dans chacune.</p>
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
