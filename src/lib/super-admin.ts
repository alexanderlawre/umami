// Hardcoded allowlist (not a DB column) for the small set of accounts
// allowed to grant/revoke admin access. Deliberately not surfaced as a
// generic permission system — this is a narrow, product-owner-only
// capability ("nobody sees these options besides me for now").
const SUPER_ADMIN_EMAILS = new Set([
  "lawrenceqa9@gmail.com",
  "qalexanderlawrence@gmail.com",
]);

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.has(email.toLowerCase());
}
