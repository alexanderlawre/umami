import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Bare /onboarding is kept only as a convenience redirect into the new
// 3-page flow (profile is now handled by /signup itself).
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.onboarded) redirect("/dashboard");
  redirect("/onboarding/preferences");
}
