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
        <nav className="mx-auto flex w-full max-w-3xl gap-5 px-6 py-3 text-sm font-medium text-[#6B7370]">
          <Link href="/admin" className="hover:text-[#1A1D1B]">
            Overview
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
