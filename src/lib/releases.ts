import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";
import { parseChangelog } from "./changelog";

export async function getReleases() {
  "use cache";
  cacheLife("hours");
  return parseChangelog(await readFile(path.join(process.cwd(), "CHANGELOG.md"), "utf8"));
}
