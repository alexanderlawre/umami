// Computes display initials for the profile-menu avatar from a user's name.
// Users can upload a profile photo (see src/app/api/account/photo/route.ts);
// these initials are only the fallback shown when no photo is set.
export function getInitials(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}
