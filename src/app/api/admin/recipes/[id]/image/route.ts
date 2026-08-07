import { put, del } from "@vercel/blob";
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

  // Vercel's serverless functions have a read-only filesystem in production
  // (writes only persist to `public/` at build time, and would silently
  // fail — or write to an ephemeral /tmp — at request time), so recipe
  // photos are stored in Vercel Blob storage instead of `public/recipe-photos/`.
  // `addRandomSuffix` avoids collisions/CDN-cache staleness when a recipe's
  // photo is swapped for a new one at the same slug.
  const filename = `recipe-photos/${recipe.slug}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(filename, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  // Best-effort cleanup of the previous image — never blocks the response
  // on failure (e.g. the URL predates Blob storage, or was already removed).
  if (recipe.imageUrl && recipe.imageUrl.includes("blob.vercel-storage.com")) {
    try {
      await del(recipe.imageUrl);
    } catch {
      // ignore
    }
  }

  await prisma.recipe.update({ where: { id }, data: { imageUrl: blob.url } });

  return NextResponse.json({ imageUrl: blob.url });
}
