import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recipeFieldsSchema } from "@/lib/admin/recipe-schema";

// Any logged-in user can submit a recipe for review — no isAdmin check.
// Validates with the same recipeFieldsSchema the admin create route uses
// (the shape matches exactly). Creates a RecipeSubmission (never a real
// Recipe) so it can never leak into the public catalog until approved.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = recipeFieldsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { dietIds, allergenIds, ingredients, steps, cuisineId, ...rest } = parsed.data;

  const submission = await prisma.recipeSubmission.create({
    data: {
      ...rest,
      user: { connect: { id: session.user.id } },
      cuisine: { connect: { id: cuisineId } },
      dietTags: { connect: dietIds.map((id) => ({ id })) },
      allergenTags: { connect: allergenIds.map((id) => ({ id })) },
      ingredients: { create: ingredients.map((ing, i) => ({ ...ing, order: i })) },
      steps: { create: steps.map((s, i) => ({ ...s, order: i })) },
    },
  });

  return NextResponse.json({ submission });
}
