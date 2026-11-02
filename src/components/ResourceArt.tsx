"use client";
import { useEffect, useState, type ReactNode } from "react";
// One request shared by resources mounting together; refresh on subsequent mounts.
let pending: Promise<Record<string, string>> | null = null;
function resourceSources() {
  return pending ??= fetch("/api/illustrations/resources", { signal: AbortSignal.timeout(5000) })
    .then(async (response) => {
      if (!response.ok) throw new Error("Illustrations indisponibles");
      return await response.json() as Record<string, string>;
    }).finally(() => { pending = null; });
}
export function ResourceArt({ resource, size = 36, fallback = null }: { resource: string; size?: number; fallback?: ReactNode }) {
  const [sources, setSources] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    resourceSources().then((value) => { if (active) setSources(value); }).catch(() => { /* Keep the supplied fallback. */ });
    return () => { active = false; };
  }, [resource]);
  const src = sources[resource];
  if (!src || failed === src) return fallback;
  // eslint-disable-next-line @next/next/no-img-element
  return <img key={src} src={src} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(src)} style={{ width: size, height: size, objectFit: "contain", display: "inline-block", verticalAlign: "middle", marginRight: 8 }} />;
}
