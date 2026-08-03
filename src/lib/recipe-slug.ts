import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

// Shared slug-uniqueness loop, used by the admin recipe-create route and the
// submission-approval route so both produce collision-free slugs the same way.
export async function generateUniqueSlug(title: string): Promise<string> {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.recipe.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
  return slug;
}
