import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, timezone: true },
  });

  return (
    <SettingsClient
      name={user?.name ?? ""}
      email={user?.email ?? session.user.email ?? ""}
      timezone={user?.timezone ?? null}
    />
  );
}
