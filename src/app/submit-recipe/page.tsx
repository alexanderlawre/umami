import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionForm } from "./submission-form";
import { MySubmissions } from "./my-submissions";

export default async function SubmitRecipePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const [cuisines, diets, allergens, submissions] = await Promise.all([
    prisma.cuisine.findMany({ orderBy: { name: "asc" } }),
    prisma.diet.findMany({ orderBy: { name: "asc" } }),
    prisma.allergen.findMany({ orderBy: { name: "asc" } }),
    prisma.recipeSubmission.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        reviewNote: true,
        createdAt: true,
        approvedRecipe: { select: { slug: true } },
      },
    }),
  ]);

  const submissionRows = submissions.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    reviewNote: s.reviewNote,
    createdAt: s.createdAt.toISOString(),
    approvedSlug: s.approvedRecipe?.slug ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Submit a recipe</h1>
      <p className="mt-1 text-sm text-[#6B7370]">
        Share a recipe with the Umami community. An admin will review it before it appears
        on anyone&apos;s dashboard.
      </p>

      {submissionRows.length > 0 && (
        <div className="mt-6">
          <MySubmissions submissions={submissionRows} />
        </div>
      )}

      <div className="mt-8">
        <SubmissionForm cuisines={cuisines} diets={diets} allergens={allergens} />
      </div>
    </main>
  );
}
