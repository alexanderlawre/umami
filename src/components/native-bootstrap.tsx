"use client";

import { useEffect } from "react";
import { configureStatusBar, hideSplashScreen } from "@/lib/native";

// Mounted once in the root layout, mirroring TimezoneSync's shape (a
// no-render client component that exists purely to run a side effect on
// load). On native iOS, this configures the status bar to match the app's
// light theme and hides the launch splash screen now that the app has
// actually mounted — avoiding both a mismatched status bar and a white
// flash between splash and first paint. Both calls are no-ops on the web.
export function NativeBootstrap() {
  useEffect(() => {
    configureStatusBar();
    hideSplashScreen();
  }, []);

  return null;
}
