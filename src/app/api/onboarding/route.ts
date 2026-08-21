import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const onboardingSchema = z.object({
  diets: z.array(
    z.object({
      dietId: z.string(),
      commitment: z.enum(["STRICT", "MODERATE", "FLEXIBLE"]),
    }),
  ),
  allergenIds: z.array(z.string()),
  customAllergens: z.array(z.string()),
  meters: z.record(z.string(), z.number().min(0).max(100)),
  favoriteCuisines: z.array(z.string()),
  foodGroupFeedback: z.string().nullable().optional(),
  // Free-tier feed intelligence v1: null = Hot/unfiltered, same convention
  // as Recipe.spiceLevel. Optional so existing callers of this route that
  // don't render the spice control don't need to send it.
  spiceMax: z.number().int().min(0).max(3).nullable().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { diets, allergenIds, customAllergens, meters, favoriteCuisines, foodGroupFeedback, spiceMax } =
    parsed.data;

  await prisma.$transaction([
    prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        allergens: { connect: allergenIds.map((id) => ({ id })) },
        customAllergens,
        favoriteCuisines,
        foodGroupFeedback: foodGroupFeedback ?? undefined,
        spiceMax: spiceMax === undefined ? undefined : spiceMax,
      },
      update: {
        allergens: { set: allergenIds.map((id) => ({ id })) },
        customAllergens,
        favoriteCuisines,
        foodGroupFeedback: foodGroupFeedback ?? undefined,
        spiceMax: spiceMax === undefined ? undefined : spiceMax,
      },
    }),
    // UserDietPreference is a separate explicit-join model (not nested under
    // UserPreferences, unlike allergens) so it can carry a per-diet
    // commitment level — full-replace via delete-outside-the-submitted-set
    // plus one upsert per diet, mirroring the meters->FoodGroupPreference
    // pattern below.
    prisma.userDietPreference.deleteMany({
      where: {
        userId: session.user.id,
        dietId: { notIn: diets.map((d) => d.dietId) },
      },
    }),
    ...diets.map((d) =>
      prisma.userDietPreference.upsert({
        where: { userId_dietId: { userId: session.user.id, dietId: d.dietId } },
        create: {
          userId: session.user.id,
          dietId: d.dietId,
          commitment: d.commitment,
        },
        update: {
          commitment: d.commitment,
        },
      })
    ),
    ...Object.entries(meters).map(([foodGroupId, value]) =>
      prisma.foodGroupPreference.upsert({
        where: { userId_foodGroupId: { userId: session.user.id, foodGroupId } },
        create: {
          userId: session.user.id,
          foodGroupId,
          declaredValue: value,
          learnedValue: value,
          source: "ONBOARDING",
        },
        update: {
          declaredValue: value,
          learnedValue: value,
        },
      })
    ),
  ]);

  return NextResponse.json({ ok: true });
}
