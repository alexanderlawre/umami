import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export function proxy(...args: Parameters<typeof auth>) {
  return auth(...args);
}

export const config = {
  // Recipe photos live under public/recipe-photos and must be reachable both
  // directly and via Next's image optimizer (which fetches the local file
  // through this same middleware chain) without requiring a session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|recipe-photos).*)"],
};
