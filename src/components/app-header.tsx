import { AnimatedLogo } from "@/components/animated-logo";
import { ProfileMenu } from "@/components/profile-menu";

export function AppHeader({
  isAdmin,
  name,
  image,
}: {
  isAdmin?: boolean;
  name?: string | null;
  image?: string | null;
}) {
  return (
    <header className="flex items-center justify-between border-b border-[#E8E6E0] px-6 py-4">
      <AnimatedLogo />
      <div className="flex items-center gap-4">
        <ProfileMenu name={name} image={image} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
