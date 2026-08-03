import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");
  if (!session.user.isAdmin) redirect("/dashboard");

  const pendingSubmissionCount = await prisma.recipeSubmission.count({
    where: { status: "PENDING" },
  });

  return (
    <div>
      <div className="border-b border-[#E8E6E0] bg-white">
        <nav className="mx-auto flex w-full max-w-3xl gap-5 px-6 py-3 text-sm font-medium text-[#6B7370]">
          <Link href="/admin" className="hover:text-[#1A1D1B]">
            Overview
          </Link>
          <Link href="/admin/recipes" className="hover:text-[#1A1D1B]">
            Recipes
          </Link>
          <Link href="/admin/preferences" className="hover:text-[#1A1D1B]">
            Preferences
          </Link>
          <Link href="/admin/submissions" className="flex items-center gap-1.5 hover:text-[#1A1D1B]">
            Submissions
            {pendingSubmissionCount > 0 && (
              <span className="rounded-full bg-[#B45309] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {pendingSubmissionCount}
              </span>
            )}
          </Link>
          <Link href="/admin/users" className="hover:text-[#1A1D1B]">
            Users
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
