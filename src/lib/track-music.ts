// Musiques du jeu (fichiers de public/audio/music) : lues en flux par un élément <audio> branché sur le graphe WebAudio du site,
// pour ne pas décoder plusieurs minutes de son en mémoire. Un morceau reprend là où il s'est arrêté.

export type MusicTrack = "theme" | "combat" | "raid" | "pvp";

export const MUSIC_URLS: Record<MusicTrack, string> = {
  theme: "/audio/music/soliloquy.mp3",
  combat: "/audio/music/combat.mp3",
  raid: "/audio/music/raid.mp3",
  pvp: "/audio/music/pvp.mp3",
};

export interface LoopMusic {
  readonly playing: boolean;
  start(): void;
  stop(): void;
  dispose(): void;
}

export class TrackMusic implements LoopMusic {
  private element: HTMLAudioElement | null = null;
  private node: MediaElementAudioSourceNode | null = null;
  private requested = false;
  private disposed = false;

  constructor(private readonly ctx: AudioContext, private readonly output: AudioNode, private readonly url: string) {}

  get playing() {
    return this.requested;
  }

  start() {
    if (this.requested || this.disposed || this.ctx.state === "closed") return;
    this.requested = true;
    if (!this.element) {
      const element = new Audio(this.url);
      element.loop = true;
      element.preload = "auto";
      this.element = element;
      this.node = this.ctx.createMediaElementSource(element);
      this.node.connect(this.output);
    }
    this.element.play().catch((error: unknown) => {
      // Lecture refusée (aucun geste de l'utilisateur) ou fichier absent : on reste muet sans bruit
      this.requested = false;
      if (!this.disposed) console.warn("Musique indisponible.", error);
    });
  }

  stop() {
    this.requested = false;
    this.element?.pause();
  }

  dispose() {
    this.disposed = true;
    this.requested = false;
    if (this.element) {
      this.element.pause();
      this.element.removeAttribute("src");
      this.element.load();
    }
    this.node?.disconnect();
    this.element = null;
    this.node = null;
  }
}
