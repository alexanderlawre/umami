import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PersonalizeClient } from "./personalize-client";

export default async function OnboardingPersonalizePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.onboarded) redirect("/dashboard");

  const foodGroups = await prisma.foodGroup.findMany({ orderBy: { name: "asc" } });

  return <PersonalizeClient foodGroups={foodGroups} />;
}
