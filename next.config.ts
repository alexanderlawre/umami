import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Recipe photos uploaded via the admin editor are stored in Vercel Blob
    // storage (see src/app/api/admin/recipes/[id]/image/route.ts) rather
    // than under public/, so next/image needs this host allowlisted.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
