import Link from "next/link";
import { ProfileMenu } from "@/components/profile-menu";

export function AppHeader({
  isAdmin,
  name,
}: {
  isAdmin?: boolean;
  name?: string | null;
}) {
  return (
    <header className="flex items-center justify-between border-b border-[#E8E6E0] px-6 py-4">
      <Link
        href="/dashboard"
        className="-my-2 -ml-1 rounded-lg px-1 py-2 text-lg font-bold text-[#1A1D1B]"
      >
        Umami
      </Link>
      <div className="flex items-center gap-4">
        <ProfileMenu name={name} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
