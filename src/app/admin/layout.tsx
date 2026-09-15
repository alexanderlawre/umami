import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");
  if (!session.user.isAdmin) redirect("/dashboard");

  return (
    <div>
      <div className="border-b border-[#E8E6E0] bg-white">
        <nav className="mx-auto flex w-full max-w-3xl gap-2 px-6 py-3 text-sm font-medium text-[#6B7370]">
          <Link
            href="/admin"
            className="rounded-[100px] px-2.5 py-1.5 transition hover:-translate-y-0.5 hover:bg-[#EDF3EF] hover:text-[#101010]"
          >
            Overview
          </Link>
          <Link
            href="/admin/recipes"
            className="rounded-[100px] px-2.5 py-1.5 transition hover:-translate-y-0.5 hover:bg-[#EDF3EF] hover:text-[#101010]"
          >
            Recipes
          </Link>
          <Link
            href="/admin/preferences"
            className="rounded-[100px] px-2.5 py-1.5 transition hover:-translate-y-0.5 hover:bg-[#EDF3EF] hover:text-[#101010]"
          >
            Preferences
          </Link>
          <Link
            href="/admin/cookbooks"
            className="rounded-[100px] px-2.5 py-1.5 transition hover:-translate-y-0.5 hover:bg-[#EDF3EF] hover:text-[#101010]"
          >
            Cookbooks
          </Link>
          <Link
            href="/admin/users"
            className="rounded-[100px] px-2.5 py-1.5 transition hover:-translate-y-0.5 hover:bg-[#EDF3EF] hover:text-[#101010]"
          >
            Users
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
