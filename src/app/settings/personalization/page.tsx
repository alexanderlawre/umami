import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadPreferencesData } from "../load-preferences";
import { PersonalizationForm } from "./personalization-form";

export default async function SettingsPersonalizationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const data = await loadPreferencesData(session.user.id);

  return <PersonalizationForm {...data} />;
}
