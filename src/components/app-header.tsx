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
        <Link
          href="/submit-recipe"
          className="-my-2 rounded-lg px-2 py-2 text-sm text-[#6B7370] underline"
        >
          Submit a recipe
        </Link>
        <ProfileMenu name={name} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
