import type { Metadata, Viewport } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { AuthSessionProvider } from "@/components/session-provider";
import { AppHeader } from "@/components/app-header";
import { TimezoneSync } from "@/components/timezone-sync";
import { NativeBootstrap } from "@/components/native-bootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Headers/titles + the "umami" wordmark use IBM Plex Mono Bold; this slot
// used to be Geist Mono, which was loaded but never actually referenced by
// any `font-mono` usage anywhere in the app — fully repurposed instead of
// adding a second font import.
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700"],
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
      className={`${geistSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
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
