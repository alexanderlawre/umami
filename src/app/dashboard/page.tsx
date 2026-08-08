import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDailySelection } from "@/lib/dashboard/select-daily";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const selection = await getDailySelection(session.user.id);
  const slotCopy: Record<typeof selection.currentSlot, string> = {
    BREAKFAST: "Breakfast picks for you",
    LUNCH: "Lunch picks for you",
    DINNER: "Dinner picks for you",
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">{slotCopy[selection.currentSlot]}</h1>
      <p className="mt-1 text-sm text-[#6B7370]">
        Four recipes. That&apos;s the whole surface.
      </p>

      <div className="mt-6">
        <DashboardClient
          pool={selection.pool}
          served={selection.served}
          refreshAvailable={selection.refreshAvailable}
          nextWindowAt={selection.nextWindowAt.toISOString()}
          userDiets={selection.userDiets}
        />
      </div>
    </main>
  );
}
