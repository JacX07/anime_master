"use client";

import { useState } from "react";
export function ResourceArt({ resource, size = 36 }: { resource: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // Les ressources sans illustration personnalisée conservent leur libellé.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/illustrations/resource-${resource}`} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: "contain", display: "inline-block", verticalAlign: "middle", marginRight: 8 }} />;
}
