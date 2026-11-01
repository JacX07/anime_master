import "server-only";
import { getSessionUser } from "./session";

export async function canEditArt() {
  const user = await getSessionUser();
  return Boolean(user && (process.env.ART_EDITOR_USER_ID
    ? user.id === process.env.ART_EDITOR_USER_ID
    : process.env.NODE_ENV === "development"));
}
