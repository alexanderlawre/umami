-- CreateTable
CREATE TABLE "AttributeTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "AttributeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AttributeTagToRecipe" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AttributeTagToRecipe_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttributeTag_name_key" ON "AttributeTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeTag_code_key" ON "AttributeTag"("code");

-- CreateIndex
CREATE INDEX "_AttributeTagToRecipe_B_index" ON "_AttributeTagToRecipe"("B");

-- AddForeignKey
ALTER TABLE "_AttributeTagToRecipe" ADD CONSTRAINT "_AttributeTagToRecipe_A_fkey" FOREIGN KEY ("A") REFERENCES "AttributeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AttributeTagToRecipe" ADD CONSTRAINT "_AttributeTagToRecipe_B_fkey" FOREIGN KEY ("B") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: seed the AttributeTag catalog from the previously
-- hardcoded ATTRIBUTE_LABELS map (src/lib/recipe-tags.ts), intentionally
-- excluding KID_FRIENDLY per admin request. Using gen_random_uuid()-free
-- cuid-ish ids isn't necessary here — Prisma's cuid() default only applies
-- at the client layer, so we generate ids with gen_random_uuid() cast to
-- text, which is fine since AttributeTag.id has no format constraint.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "AttributeTag" ("id", "name", "code") VALUES
  (gen_random_uuid()::text, 'High protein', 'HIGH_PROTEIN'),
  (gen_random_uuid()::text, 'Meal prep', 'MAKE_AHEAD'),
  (gen_random_uuid()::text, 'Low carb', 'LOW_CARB'),
  (gen_random_uuid()::text, 'Low calorie', 'LOW_CALORIE'),
  (gen_random_uuid()::text, 'One pot', 'ONE_POT'),
  (gen_random_uuid()::text, 'Budget-friendly', 'SPEND_LESS'),
  (gen_random_uuid()::text, 'Crowd-pleaser', 'CROWD_PLEASER'),
  (gen_random_uuid()::text, 'Veg-forward', 'EAT_MORE_VEG'),
  (gen_random_uuid()::text, 'Fried', 'FRIED'),
  (gen_random_uuid()::text, 'Under 30 min', 'UNDER_30'),
  (gen_random_uuid()::text, 'Spicy', 'SPICY'),
  (gen_random_uuid()::text, 'Freezer-friendly', 'FREEZER_FRIENDLY'),
  (gen_random_uuid()::text, 'High fiber', 'HIGH_FIBER'),
  (gen_random_uuid()::text, 'Low sugar', 'LOW_SUGAR'),
  (gen_random_uuid()::text, 'No-cook', 'NO_COOK'),
  (gen_random_uuid()::text, 'Grilled', 'GRILLED'),
  (gen_random_uuid()::text, 'Comfort food', 'COMFORT_FOOD'),
  (gen_random_uuid()::text, 'Sheet-pan', 'SHEET_PAN');

-- DataMigration: connect existing recipes to their attribute tags based on
-- the old `attributes` string[] column (unnested), matching by code.
-- Recipes that only had "KID_FRIENDLY" (no longer a row in AttributeTag)
-- simply get no match for that entry and lose just that tag, per the
-- explicit request to remove Kid-Friendly.
INSERT INTO "_AttributeTagToRecipe" ("A", "B")
SELECT DISTINCT at."id", r."id"
FROM "Recipe" r
CROSS JOIN LATERAL unnest(r."attributes") AS attr(code)
JOIN "AttributeTag" at ON at."code" = attr.code;

-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "attributes";
