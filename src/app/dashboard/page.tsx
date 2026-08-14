import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDailySelection } from "@/lib/dashboard/select-daily";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const selection = await getDailySelection(session.user.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <DashboardClient
        pool={selection.pool}
        served={selection.served}
        userDiets={selection.userDiets}
        cookbooks={selection.cookbooks}
        category={selection.category}
        currentSlot={selection.currentSlot}
      />
    </main>
  );
}
