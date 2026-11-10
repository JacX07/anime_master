import type { MouseEvent } from "react";

/** Ferme une `<dialog>` modale quand on clique sur le fond (hors du cadre), pas sur sa marge intérieure. */
export function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
  const dialog = event.currentTarget;
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  if (outside) dialog.close();
}
