import { prisma } from "@/lib/prisma";
import { AdminUsersClient } from "./admin-users-client";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      city: true,
      country: true,
      isAdmin: true,
      createdAt: true,
      preferences: {
        select: {
          diets: { select: { name: true } },
          allergens: { select: { name: true } },
          customAllergens: true,
        },
      },
      _count: { select: { cookLogs: true, savedRecipes: true } },
    },
  });

  const rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    city: u.city,
    country: u.country,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt.toISOString(),
    diets: u.preferences?.diets.map((d) => d.name) ?? [],
    allergens: u.preferences?.allergens.map((a) => a.name) ?? [],
    customAllergens: u.preferences?.customAllergens ?? [],
    cookedCount: u._count.cookLogs,
    savedCount: u._count.savedRecipes,
  }));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Users</h1>
      <p className="mt-1 text-sm text-[#6B7370]">
        Location, diet/allergy profile, and activity for every account.
      </p>

      <div className="mt-6">
        <AdminUsersClient users={rows} />
      </div>
    </main>
  );
}
