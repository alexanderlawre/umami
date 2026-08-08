// Vercel's serverless functions hard-cap request bodies at 4.5MB, and modern
// phone photos routinely blow past that. Rather than require the uploader to
// pre-resize/convert their photo, we normalize it client-side first: decode
// whatever format the browser can read, downscale to a sane max dimension,
// and re-encode as compressed WebP before it's ever sent to the server.
//
// Shared by the admin recipe-photo uploader and the profile-photo uploader
// (signup + profile settings), so both get the same size/quality behavior.
const MAX_UPLOAD_DIMENSION = 2400;
const UPLOAD_QUALITY = 0.85;

export async function compressImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Browser couldn't decode this format (e.g. some HEIC files outside
    // Safari). Fall back to sending the original file and let the server
    // validate it.
    return file;
  }

  const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", UPLOAD_QUALITY),
  );
  return blob ?? file;
}
