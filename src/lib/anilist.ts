// Client minimal pour l'API GraphQL d'AniList (https://docs.anilist.co).
// Respecte la limite de requêtes : lit X-RateLimit-Remaining et attend sur 429.

const ENDPOINT = "https://graphql.anilist.co";
const MAX_RETRIES = 5;

export type AniListRole = "MAIN" | "SUPPORTING" | "BACKGROUND";

export interface AniListTag {
  name: string;
  /** Pertinence du tag pour la série, de 0 à 100 */
  rank: number | null;
  isMediaSpoiler: boolean | null;
}

export interface AniListMedia {
  id: number;
  isAdult: boolean;
  format: string | null;
  seasonYear: number | null;
  startDate: { year: number | null } | null;
  popularity: number | null;
  title: { romaji: string | null; english: string | null; native: string | null };
  coverImage: { large: string | null } | null;
  genres: string[] | null;
  tags: AniListTag[] | null;
  studios: { nodes: { name: string }[] } | null;
}

export interface AniListCharacter {
  id: number;
  name: { full: string | null; native: string | null };
  image: { large: string | null } | null;
  description: string | null;
  gender: string | null;
  age: string | null;
  dateOfBirth: { month: number | null; day: number | null } | null;
  favourites: number | null;
  media: { edges: { characterRole: AniListRole | null; node: AniListMedia }[] };
}

interface CharactersPage {
  Page: {
    pageInfo: { hasNextPage: boolean; currentPage: number };
    characters: AniListCharacter[];
  };
}

// media(type: ANIME) : on ne récupère que les séries animées du personnage.
const CHARACTERS_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage }
    characters(sort: FAVOURITES_DESC) {
      id
      name { full native }
      image { large }
      description
      gender
      age
      dateOfBirth { month day }
      favourites
      media(type: ANIME, sort: POPULARITY_DESC, perPage: 5) {
        edges {
          characterRole
          node {
            id isAdult format seasonYear startDate { year } popularity
            title { romaji english native }
            coverImage { large }
            genres
            tags { name rank isMediaSpoiler }
            studios(isMain: true) { nodes { name } }
          }
        }
      }
    }
  }
}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") ?? "60");
      console.warn(`  Limite AniList atteinte, pause de ${retryAfter}s…`);
      await sleep((retryAfter + 1) * 1000);
      continue;
    }

    if (!res.ok) {
      if (attempt >= MAX_RETRIES) {
        throw new Error(`AniList HTTP ${res.status}: ${await res.text()}`);
      }
      const wait = 2 ** attempt * 1000;
      console.warn(`  AniList HTTP ${res.status}, nouvel essai dans ${wait / 1000}s…`);
      await sleep(wait);
      continue;
    }

    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (json.errors?.length) {
      throw new Error(`AniList: ${json.errors.map((e) => e.message).join("; ")}`);
    }

    // Ralentit avant d'épuiser le quota de la minute.
    const limit = Number(res.headers.get("x-ratelimit-limit") ?? "30");
    const remaining = Number(res.headers.get("x-ratelimit-remaining") ?? "1");
    await sleep(remaining <= 2 ? 60_000 / limit + 5_000 : 60_000 / limit);

    return json.data as T;
  }
}

export async function fetchCharactersPage(page: number, perPage = 50) {
  const data = await request<CharactersPage>(CHARACTERS_QUERY, { page, perPage });
  return data.Page;
}
