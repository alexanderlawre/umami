import { prisma } from "@/lib/prisma";
import { SubmissionsClient } from "./submissions-client";

const submissionSelect = {
  id: true,
  title: true,
  shortDescription: true,
  note: true,
  introCopy: true,
  servings: true,
  prepMinutes: true,
  cookMinutes: true,
  difficulty: true,
  effortTier: true,
  batchFriendly: true,
  attributes: true,
  mealSlot: true,
  imageUrl: true,
  imageCredit: true,
  caloriesPerServing: true,
  proteinGrams: true,
  carbsGrams: true,
  fatGrams: true,
  status: true,
  reviewNote: true,
  createdAt: true,
  reviewedAt: true,
  cuisine: { select: { name: true } },
  dietTags: { select: { id: true, name: true } },
  allergenTags: { select: { id: true, name: true } },
  ingredients: {
    orderBy: { order: "asc" as const },
    select: { component: true, quantity: true, unit: true, item: true, prepNote: true, optional: true },
  },
  steps: {
    orderBy: { order: "asc" as const },
    select: { text: true, durationMinutes: true },
  },
  user: { select: { name: true, email: true } },
  approvedRecipe: { select: { slug: true } },
};

export default async function AdminSubmissionsPage() {
  const [pending, recent] = await Promise.all([
    prisma.recipeSubmission.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: submissionSelect,
    }),
    prisma.recipeSubmission.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { reviewedAt: "desc" },
      take: 20,
      select: submissionSelect,
    }),
  ]);

  const serialize = (s: (typeof pending)[number]) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Submissions</h1>
      <p className="mt-1 text-sm text-[#6B7370]">
        Review recipes submitted by users. Approving publishes it as a live, unverified-allergen
        recipe.
      </p>

      <div className="mt-6">
        <SubmissionsClient
          pending={pending.map(serialize)}
          recent={recent.map(serialize)}
        />
      </div>
    </main>
  );
}
