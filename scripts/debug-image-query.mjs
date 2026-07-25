import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const recipes = await prisma.recipe.findMany({
  where: { isActive: true },
  include: { dietTags: true, allergenTags: true },
});
console.log("total recipes:", recipes.length);
console.log("sample:", JSON.stringify({
  slug: recipes[0].slug,
  imageUrl: recipes[0].imageUrl,
  imageCredit: recipes[0].imageCredit,
}, null, 2));
const withImage = recipes.filter((r) => r.imageUrl).length;
console.log("with imageUrl:", withImage, "/", recipes.length);
await prisma.$disconnect();
