"use client";

import { useEffect, useRef } from "react";

/** Rouages brisés de fond (docs/direction-artistique.md §4.13 et §6).
 *  Grand rouage et pignon avancent d'une dent toutes les 1,8 s, en sens opposés ; immobiles si l'utilisateur réduit les animations. */
export function MechanicalBackdrop() {
  const gear = useRef<HTMLSpanElement>(null);
  const pinion = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let step = 0;
    const id = window.setInterval(() => {
      if (document.hidden || !gear.current?.offsetParent) return;
      step += 1;
      gear.current.style.transform = `rotate(${(step * 360) / 28}deg)`;
      if (pinion.current) pinion.current.style.transform = `rotate(${(-step * 360) / 12}deg)`;
    }, 1800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mq-mech" aria-hidden="true">
      <div className="mq-mech-cluster">
        <span ref={gear} className="mq-mech-part mq-mech-gear" />
        <span ref={pinion} className="mq-mech-part mq-mech-pinion" />
        <span className="mq-mech-part mq-mech-dial" />
      </div>
      <span className="mq-mech-part mq-mech-ruin" />
    </div>
  );
}
