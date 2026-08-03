import { mkdir, unlink, writeFile } from "fs/promises";
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

// Same validation as the admin recipe image route, but scoped to the
// submitter's own still-pending submission and written under a separate
// `submissions/` subfolder (moved into the main recipe-photos folder on
// approval, see /api/admin/submissions/[id]/approve).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const submission = await prisma.recipeSubmission.findUnique({
    where: { id },
    select: { userId: true, status: true, imageUrl: true },
  });
  if (!submission || submission.userId !== session.user.id) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (submission.status !== "PENDING") {
    return NextResponse.json({ error: "This submission has already been reviewed." }, { status: 400 });
  }

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

  const dir = path.join(process.cwd(), "public", "recipe-photos", "submissions");
  await mkdir(dir, { recursive: true });

  const filename = `${id}${ext}`;
  const filePath = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const previousFilename = submission.imageUrl?.startsWith("/recipe-photos/submissions/")
    ? submission.imageUrl.slice("/recipe-photos/submissions/".length)
    : null;
  if (previousFilename && previousFilename !== filename) {
    try {
      await unlink(path.join(dir, previousFilename));
    } catch {
      // best-effort cleanup, ignore if missing
    }
  }

  const imageUrl = `/recipe-photos/submissions/${filename}`;
  await prisma.recipeSubmission.update({ where: { id }, data: { imageUrl } });

  return NextResponse.json({ imageUrl });
}
