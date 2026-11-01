"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
export function ResourceArt({ resource, size = 36, fallback = null }: { resource: string; size?: number; fallback?: ReactNode }) {
  // 0 : illustration personnalisée, 1 : visuel temporaire de public/items, 2 : repli.
  const [step, setStep] = useState(0);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth === 0) setStep((current) => current + 1);
  }, [resource, step]);
  if (step > 1) return fallback;
  const src = step === 0 ? `/api/illustrations/resource-${resource}` : `/items/${resource}.svg`;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} src={src} alt="" width={size} height={size} loading="lazy" onError={() => setStep((current) => current + 1)} style={{ width: size, height: size, objectFit: "contain", display: "inline-block", verticalAlign: "middle", marginRight: 8 }} />;
}
