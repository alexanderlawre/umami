import path from "path";
import { rename } from "fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/recipe-slug";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const submission = await prisma.recipeSubmission.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      steps: { orderBy: { order: "asc" } },
      dietTags: true,
      allergenTags: true,
    },
  });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (submission.status !== "PENDING") {
    return NextResponse.json({ error: "This submission has already been reviewed." }, { status: 400 });
  }

  const slug = await generateUniqueSlug(submission.title);

  // submission.attributes is a plain string[] of codes (RecipeSubmission
  // wasn't migrated to the AttributeTag relation), so it may contain stale
  // codes no longer in the catalog (e.g. the removed KID_FRIENDLY) — filter
  // to only codes that still exist before connecting, so this doesn't throw.
  const validAttributeTags = await prisma.attributeTag.findMany({
    where: { code: { in: submission.attributes } },
    select: { code: true },
  });

  // Move the uploaded photo (if any) from the submissions/ staging folder
  // into the main recipe-photos folder under the recipe's final slug.
  let finalImageUrl: string | null = null;
  if (submission.imageUrl?.startsWith("/recipe-photos/submissions/")) {
    const ext = path.extname(submission.imageUrl);
    const sourcePath = path.join(process.cwd(), "public", submission.imageUrl);
    const destFilename = `${slug}${ext}`;
    const destPath = path.join(process.cwd(), "public", "recipe-photos", destFilename);
    try {
      await rename(sourcePath, destPath);
      finalImageUrl = `/recipe-photos/${destFilename}`;
    } catch {
      // If the file's missing for some reason, approve without a photo
      // rather than failing the whole approval.
      finalImageUrl = null;
    }
  }

  const recipe = await prisma.$transaction(async (tx) => {
    const created = await tx.recipe.create({
      data: {
        title: submission.title,
        shortDescription: submission.shortDescription,
        note: submission.note,
        introCopy: submission.introCopy,
        servings: submission.servings,
        prepMinutes: submission.prepMinutes,
        cookMinutes: submission.cookMinutes,
        difficulty: submission.difficulty,
        mealSlot: submission.mealSlot,
        effortTier: submission.effortTier,
        batchFriendly: submission.batchFriendly,
        heroColor: submission.heroColor,
        imageCredit: submission.imageCredit,
        caloriesPerServing: submission.caloriesPerServing,
        proteinGrams: submission.proteinGrams,
        carbsGrams: submission.carbsGrams,
        fatGrams: submission.fatGrams,
        slug,
        imageUrl: finalImageUrl,
        isActive: true,
        allergenReviewStatus: "UNVERIFIED",
        cuisine: { connect: { id: submission.cuisineId } },
        dietTags: { connect: submission.dietTags.map((d) => ({ id: d.id })) },
        allergenTags: { connect: submission.allergenTags.map((a) => ({ id: a.id })) },
        attributeTags: { connect: validAttributeTags.map((t) => ({ code: t.code })) },
        ingredients: {
          create: submission.ingredients.map((ing) => ({
            component: ing.component,
            order: ing.order,
            quantity: ing.quantity,
            unit: ing.unit,
            item: ing.item,
            prepNote: ing.prepNote,
            optional: ing.optional,
          })),
        },
        steps: {
          create: submission.steps.map((s) => ({
            order: s.order,
            text: s.text,
            durationMinutes: s.durationMinutes,
          })),
        },
      },
    });

    await tx.recipeSubmission.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: session.user.id,
        approvedRecipeId: created.id,
      },
    });

    return created;
  });

  return NextResponse.json({ recipe });
}
