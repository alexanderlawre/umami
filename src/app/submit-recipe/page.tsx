import { redirect } from "next/navigation";

// The "submit a recipe" feature is temporarily disabled pending a revamp.
// The rest of the flow (this page's former form/list components, the submit
// API routes, and the admin review UI) is left in place so it can be
// resumed without rebuilding from scratch — this route just isn't linked
// from anywhere in the app anymore, and now redirects if reached directly.
export default function SubmitRecipePage() {
  redirect("/dashboard");
}
