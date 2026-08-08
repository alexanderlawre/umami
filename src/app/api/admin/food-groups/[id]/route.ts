import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const foodGroup = await prisma.foodGroup.findUnique({ where: { id } });
  if (!foodGroup) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Deleting cascades: FoodGroupPreference and RecipeFoodGroup both declare
  // onDelete: Cascade in the schema, so this automatically removes the food
  // group from every user preference and recipe profile that referenced it.
  // The client shows a confirmation before calling this endpoint when the
  // food group is in use.
  await prisma.foodGroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
