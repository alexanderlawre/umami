import { redirect } from "next/navigation";

// Disabled alongside the public "submit a recipe" flow (see
// src/app/submit-recipe/page.tsx) pending a revamp. The review UI
// (submissions-client.tsx) and approve/reject API routes are left in place.
export default function AdminSubmissionsPage() {
  redirect("/admin");
}
