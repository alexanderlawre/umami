import { put, del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Mirrors src/app/api/admin/recipes/[id]/image/route.ts's upload pattern for
// the user's own profile photo (signup + profile settings). The client
// (src/lib/image-compression.ts) compresses/re-encodes to WebP before
// upload, but falls back to sending the original file untouched if the
// browser couldn't decode it, so keep a broader allowlist here too.
const MAX_SIZE_BYTES = 4 * 1024 * 1024;
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported image format. Try saving it as JPEG or PNG first." },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      {
        error:
          "File too large after processing. Try a smaller photo, or crop/screenshot it before uploading.",
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Vercel's serverless functions have a read-only filesystem in production,
  // so profile photos are stored in Vercel Blob storage instead. See the
  // recipe-image route for the same pattern and reasoning.
  const filename = `profile-photos/${session.user.id}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(filename, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  // Best-effort cleanup of the previous photo. Never blocks the response.
  if (user.image && user.image.includes("blob.vercel-storage.com")) {
    try {
      await del(user.image);
    } catch {
      // ignore
    }
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { image: blob.url } });

  return NextResponse.json({ imageUrl: blob.url });
}
