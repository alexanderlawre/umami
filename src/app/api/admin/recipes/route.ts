import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recipeFieldsSchema } from "@/lib/admin/recipe-schema";
import { generateUniqueSlug } from "@/lib/recipe-slug";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = recipeFieldsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { dietIds, allergenIds, ingredients, steps, cuisineId, ...rest } = parsed.data;

  const slug = await generateUniqueSlug(rest.title);

  const recipe = await prisma.recipe.create({
    data: {
      ...rest,
      slug,
      cuisine: { connect: { id: cuisineId } },
      dietTags: { connect: dietIds.map((id) => ({ id })) },
      allergenTags: { connect: allergenIds.map((id) => ({ id })) },
      ingredients: { create: ingredients.map((ing, i) => ({ ...ing, order: i })) },
      steps: { create: steps.map((s, i) => ({ ...s, order: i })) },
    },
  });

  return NextResponse.json({ recipe });
}
