import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      onboarded: boolean;
      isAdmin: boolean;
      isPremium: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    onboarded?: boolean;
    isAdmin?: boolean;
    isPremium?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    onboarded: boolean;
    isAdmin: boolean;
    isPremium: boolean;
  }
}
