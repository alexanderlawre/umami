import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no providers that touch Prisma/bcrypt here, so this file
// can be imported from middleware. The Credentials provider (which does need
// Node APIs) is added on top of this in src/auth.ts for server-side routes.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isPublicRoute =
        pathname === "/login" ||
        pathname === "/signup" ||
        pathname.startsWith("/api/signup") ||
        pathname.startsWith("/api/auth");

      if (isPublicRoute) return true;
      if (!isLoggedIn) return false;

      const needsOnboarding = pathname !== "/onboarding" && !pathname.startsWith("/api/onboarding");
      if (!auth?.user.onboarded && needsOnboarding) {
        return Response.redirect(new URL("/onboarding", request.nextUrl));
      }

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.onboarded = (user as { onboarded?: boolean }).onboarded ?? false;
      }
      if (trigger === "update" && session?.onboarded) {
        token.onboarded = true;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.onboarded = token.onboarded as boolean;
      }
      return session;
    },
  },
  providers: [], // populated in src/auth.ts
};
