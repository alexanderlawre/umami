import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PreferencesClient } from "./preferences-client";

export default async function OnboardingPreferencesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.onboarded) redirect("/dashboard");

  const [diets, allergens] = await Promise.all([
    prisma.diet.findMany({ orderBy: { name: "asc" } }),
    prisma.allergen.findMany({ orderBy: { name: "asc" } }),
  ]);

  return <PreferencesClient diets={diets} allergens={allergens} />;
}
