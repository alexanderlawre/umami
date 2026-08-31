import { put, del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Mirrors src/app/api/account/photo/route.ts's upload pattern.
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const cookbook = await prisma.userCookbook.findUnique({ where: { id } });
  if (!cookbook || cookbook.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const filename = `cookbook-covers/${id}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(filename, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  if (cookbook.coverImageUrl && cookbook.coverImageUrl.includes("blob.vercel-storage.com")) {
    try {
      await del(cookbook.coverImageUrl);
    } catch {
      // ignore
    }
  }

  await prisma.userCookbook.update({ where: { id }, data: { coverImageUrl: blob.url } });

  return NextResponse.json({ coverImageUrl: blob.url });
}
