// Vérification rapide (optimiste) : sans cookie de session, les pages réservées
// renvoient vers /login. La vraie vérification se fait côté serveur (requireUser).

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/packs/:path*", "/album/:path*"],
};
