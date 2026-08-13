import type { CapacitorConfig } from '@capacitor/cli';

// Umami is a full-stack Next.js app (SSR, API routes, Prisma/Postgres-backed
// auth) rather than a static SPA, so it can't be bundled as static assets via
// `webDir`. Instead this points the native WebView at a running Next.js
// server ("remote-URL wrapper" pattern). `webDir: 'public'` is required by
// the CLI but unused at runtime since `server.url` takes precedence.
//
// For local simulator development this points at the dev server on the
// LAN/loopback address reachable from the simulator. Swap `server.url` to
// the deployed HTTPS origin (and drop `cleartext`) for production builds.
const config: CapacitorConfig = {
  appId: 'com.umami.app',
  appName: 'Umami',
  webDir: 'public',
  server: {
    url: 'http://localhost:3001',
    cleartext: true,
  },
  // Hide the launch splash manually (via SplashScreen.hide() in
  // NativeBootstrap) once the app has actually mounted, instead of on a
  // blind timer — avoids both a stuck splash and a white-flash gap between
  // splash and first paint.
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
    },
  },
};

export default config;
