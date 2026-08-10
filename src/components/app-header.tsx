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
    <header className="glass-surface sticky top-0 z-30 flex items-center justify-between border-x-0 border-t-0 px-6 py-4">
      <AnimatedLogo />
      <div className="flex items-center gap-4">
        <ProfileMenu name={name} image={image} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
