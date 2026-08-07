// Computes display initials for the profile-menu avatar from a user's name.
// No avatar-image upload capability exists (deliberately, per product
// decision) — initials are the only visual identity shown.
export function getInitials(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}
