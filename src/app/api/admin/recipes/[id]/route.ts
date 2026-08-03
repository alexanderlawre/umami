import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recipeUpdateSchema } from "@/lib/admin/recipe-schema";

export async function GET(
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
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      steps: { orderBy: { order: "asc" } },
      dietTags: true,
      allergenTags: true,
    },
  });
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  return NextResponse.json({ recipe });
}

export async function PATCH(
  request: Request,
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
  const parsed = recipeUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { dietIds, allergenIds, ingredients, steps, cuisineId, ...rest } = parsed.data;

  const recipe = await prisma.$transaction(async (tx) => {
    if (ingredients) {
      await tx.ingredient.deleteMany({ where: { recipeId: id } });
    }
    if (steps) {
      await tx.step.deleteMany({ where: { recipeId: id } });
    }

    return tx.recipe.update({
      where: { id },
      data: {
        ...rest,
        ...(cuisineId ? { cuisine: { connect: { id: cuisineId } } } : {}),
        ...(dietIds ? { dietTags: { set: dietIds.map((did) => ({ id: did })) } } : {}),
        ...(allergenIds
          ? { allergenTags: { set: allergenIds.map((aid) => ({ id: aid })) } }
          : {}),
        ...(ingredients
          ? {
              ingredients: {
                create: ingredients.map((ing, i) => ({ ...ing, order: i })),
              },
            }
          : {}),
        ...(steps
          ? { steps: { create: steps.map((s, i) => ({ ...s, order: i })) } }
          : {}),
      },
    });
  });

  return NextResponse.json({ recipe });
}
