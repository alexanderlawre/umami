-- DataMigration: backfill AttributeTag rows that are missing on some
-- environments due to migration drift — the original data migration
-- (20260809115352_attribute_tags) was edited to add 'Veg-forward'
-- (EAT_MORE_VEG) and 'Under 30 min' (UNDER_30) after it had already been
-- applied to at least one deployed database, so those environments never
-- received the two extra rows (Prisma does not re-run applied migrations).
-- ON CONFLICT DO NOTHING makes this safe to apply on databases that
-- already have these rows (e.g. freshly-created ones).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "AttributeTag" ("id", "name", "code") VALUES
  (gen_random_uuid()::text, 'Veg-forward', 'EAT_MORE_VEG'),
  (gen_random_uuid()::text, 'Under 30 min', 'UNDER_30')
ON CONFLICT ("code") DO NOTHING;
