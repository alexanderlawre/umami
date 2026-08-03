import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const onboardingSchema = z.object({
  dietIds: z.array(z.string()),
  allergenIds: z.array(z.string()),
  customAllergens: z.array(z.string()),
  meters: z.record(z.string(), z.number().min(0).max(100)),
  favoriteCuisines: z.array(z.string()),
  foodGroupFeedback: z.string().nullable().optional(),
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

  const { dietIds, allergenIds, customAllergens, meters, favoriteCuisines, foodGroupFeedback } =
    parsed.data;

  await prisma.$transaction([
    prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        diets: { connect: dietIds.map((id) => ({ id })) },
        allergens: { connect: allergenIds.map((id) => ({ id })) },
        customAllergens,
        favoriteCuisines,
        foodGroupFeedback: foodGroupFeedback ?? undefined,
      },
      update: {
        diets: { set: dietIds.map((id) => ({ id })) },
        allergens: { set: allergenIds.map((id) => ({ id })) },
        customAllergens,
        favoriteCuisines,
        foodGroupFeedback: foodGroupFeedback ?? undefined,
      },
    }),
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
