import type { Metadata, Viewport } from "next";
import { Work_Sans, Lora, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { AuthSessionProvider } from "@/components/session-provider";
import { AppHeader } from "@/components/app-header";
import { TimezoneSync } from "@/components/timezone-sync";
import { NativeBootstrap } from "@/components/native-bootstrap";

// Body copy: an open, airy sans-serif (replaces Geist Sans, which read as
// too condensed) with enough weights loaded to cover the app's existing
// font-medium/font-semibold/font-bold hierarchy usage.
const workSans = Work_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Page titles/section headers (h1-h3) app-wide. A warm, readable text serif
// with true semibold/bold cuts (unlike Quando, which is regular-only and
// would have needed a faked/synthesized bold) so the existing
// font-semibold/font-bold hierarchy on every heading renders crisply.
const lora = Lora({
  variable: "--font-title",
  subsets: ["latin"],
  weight: ["600", "700"],
});

// Reserved for the "umami" wordmark only (nav logo + login/signup headline)
// via the .font-display utility — not applied to generic headers/titles.
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Umami",
  description: "Four recipes. That's the whole surface.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${workSans.variable} ${lora.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FBFAF7] text-[#1A1D1B]">
        <AuthSessionProvider session={session}>
          <NativeBootstrap />
          <TimezoneSync />
          {session?.user?.onboarded && (
            <AppHeader
              isAdmin={session.user.isAdmin}
              name={session.user.name}
              image={session.user.image}
            />
          )}
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
