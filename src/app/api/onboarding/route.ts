import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const onboardingSchema = z.object({
  dietIds: z.array(z.string()),
  allergenIds: z.array(z.string()),
  customAllergens: z.array(z.string()),
  meters: z.record(z.string(), z.number().min(0).max(100)),
  favoriteFoods: z.array(z.string()).max(10),
  cookingFor: z
    .enum(["SELF", "PARTNER", "FAMILY", "MIXED", "HOSTING"])
    .nullable(),
  cookFrequency: z
    .enum(["DAILY", "EVERY_OTHER_DAY", "FEW_TIMES_WEEK", "MEAL_PREP", "WEEKENDS_ONLY"])
    .nullable(),
  goals: z.array(
    z.enum([
      "EAT_MORE_VEG",
      "MORE_PROTEIN",
      "LESS_TIME",
      "SPEND_LESS",
      "LEARN_TECHNIQUE",
      "EAT_WIDER",
    ])
  ),
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

  const {
    dietIds,
    allergenIds,
    customAllergens,
    meters,
    favoriteFoods,
    cookingFor,
    cookFrequency,
    goals,
  } = parsed.data;

  await prisma.$transaction([
    prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        diets: { connect: dietIds.map((id) => ({ id })) },
        allergens: { connect: allergenIds.map((id) => ({ id })) },
        customAllergens,
        favoriteFoods,
        cookingFor: cookingFor ?? undefined,
        cookFrequency: cookFrequency ?? undefined,
        goals,
      },
      update: {
        diets: { set: dietIds.map((id) => ({ id })) },
        allergens: { set: allergenIds.map((id) => ({ id })) },
        customAllergens,
        favoriteFoods,
        cookingFor: cookingFor ?? undefined,
        cookFrequency: cookFrequency ?? undefined,
        goals,
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
