import { writeFile, unlink } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(
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

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPEG, PNG, or WEBP." },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large. Max size is 8MB." },
      { status: 400 },
    );
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { slug: true, imageUrl: true },
  });
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const filename = `${recipe.slug}${ext}`;
  const filePath = path.join(process.cwd(), "public", "recipe-photos", filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const previousFilename = recipe.imageUrl?.startsWith("/recipe-photos/")
    ? recipe.imageUrl.slice("/recipe-photos/".length)
    : null;
  if (previousFilename && previousFilename !== filename) {
    try {
      await unlink(path.join(process.cwd(), "public", "recipe-photos", previousFilename));
    } catch {
      // best-effort cleanup, ignore if missing
    }
  }

  const imageUrl = `/recipe-photos/${filename}`;
  await prisma.recipe.update({ where: { id }, data: { imageUrl } });

  return NextResponse.json({ imageUrl });
}
