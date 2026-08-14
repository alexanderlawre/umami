import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { preferences: true },
        });
        // Users created via Google/Apple sign-in have no passwordHash and
        // can only authenticate through their OAuth provider.
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          onboarded: !!user.preferences,
          isAdmin: user.isAdmin,
          isPremium: user.isPremium,
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Adapter-less OAuth account linking: there's no Account/Session model
    // in this schema (JWT session strategy only), so the find-or-create /
    // link-by-verified-email logic that an adapter would normally handle
    // lives here instead. `account`/`user`/`profile` are only present on
    // the initial sign-in request, never on subsequent token refreshes, so
    // this only runs once per new session.
    async jwt(params) {
      const { user, account, profile } = params;

      if (account && (account.provider === "google" || account.provider === "apple") && user) {
        const providerAccountId = account.providerAccountId;
        const email = (
          user.email ?? (profile as { email?: string } | undefined)?.email
        )?.toLowerCase();

        let dbUser = await prisma.user.findFirst({
          where:
            account.provider === "google"
              ? { googleId: providerAccountId }
              : { appleId: providerAccountId },
          include: { preferences: true },
        });

        // Not seen this provider account before — link it to an existing
        // credentials-created account by email if one exists. Google/Apple
        // both only ever return verified emails, so this is safe.
        if (!dbUser && email) {
          const existing = await prisma.user.findUnique({
            where: { email },
            include: { preferences: true },
          });
          if (existing) {
            dbUser = await prisma.user.update({
              where: { id: existing.id },
              data:
                account.provider === "google"
                  ? { googleId: providerAccountId }
                  : { appleId: providerAccountId },
              include: { preferences: true },
            });
          }
        }

        // No existing account at all — create a new one. passwordHash and
        // country stay null; the user can fill in country later from their
        // profile, and can never sign in with a password unless they later
        // set one via the reset-password flow.
        if (!dbUser) {
          if (!email) return params.token; // Shouldn't happen — both providers request the email scope.
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? email.split("@")[0],
              image: user.image ?? null,
              ...(account.provider === "google"
                ? { googleId: providerAccountId }
                : { appleId: providerAccountId }),
            },
            include: { preferences: true },
          });
        }

        // Delegate to the shared, edge-safe jwt callback for the actual
        // token shaping, using the same user shape authorize() returns.
        return authConfig.callbacks!.jwt!({
          ...params,
          user: {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            image: dbUser.image,
            onboarded: !!dbUser.preferences,
            isAdmin: dbUser.isAdmin,
            isPremium: dbUser.isPremium,
          },
        });
      }

      return authConfig.callbacks!.jwt!(params);
    },
  },
});
