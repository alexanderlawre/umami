import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "./wizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.onboarded) redirect("/dashboard");

  const [diets, allergens, foodGroups] = await Promise.all([
    prisma.diet.findMany({ orderBy: { name: "asc" } }),
    prisma.allergen.findMany({ orderBy: { name: "asc" } }),
    prisma.foodGroup.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <OnboardingWizard diets={diets} allergens={allergens} foodGroups={foodGroups} />
  );
}
