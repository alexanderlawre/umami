// Thin, guarded wrappers around Capacitor native plugin calls. Every export
// here is a no-op on the web (Vercel/Safari) — `Capacitor.isNativePlatform()`
// reliably resolves to `false` there since there's no native bridge, so
// these are safe to call unconditionally from shared src/ code without any
// build-time branching between the web and iOS targets.
//
// This is the single import surface the rest of the app touches for native
// shell behavior (haptics, status bar, splash screen, keyboard) — mirrors
// the focused, single-purpose shape of src/lib/log-interaction.ts and the
// "fire-and-forget side effect" convention used there and in
// src/components/timezone-sync.tsx.

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard } from "@capacitor/keyboard";

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Light haptic tap — used for frequent, low-weight interactions (refresh
 * button press, pull-to-refresh trigger).
 */
export function hapticImpactLight(): void {
  if (!isNative()) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {
    // Best-effort; a dropped haptic call is never worth surfacing.
  });
}

/**
 * Medium haptic tap — used for a more deliberate action (star/save toggle,
 * cook later add).
 */
export function hapticImpactMedium(): void {
  if (!isNative()) return;
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
    // Best-effort.
  });
}

/**
 * Sets the status bar to dark content (readable on Umami's light/cream
 * background) and matches its background color to the app header.
 * Call once on native app launch.
 */
export function configureStatusBar(): void {
  if (!isNative()) return;
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  StatusBar.setBackgroundColor({ color: "#FBFAF7" }).catch(() => {});
}

/**
 * Hides the native launch splash screen. Paired with
 * `SplashScreen: { launchAutoHide: false }` in capacitor.config.ts so the
 * splash stays up until the app has actually mounted and painted, instead
 * of hiding on a blind timer (which can otherwise show a white flash
 * between the splash disappearing and the page finishing its first paint).
 */
export function hideSplashScreen(): void {
  if (!isNative()) return;
  SplashScreen.hide().catch(() => {});
}

/**
 * Dismisses the on-screen keyboard. Used right before navigating away from
 * a form (e.g. after a successful login/signup) so the keyboard doesn't
 * visibly linger through the transition.
 */
export function hideKeyboard(): void {
  if (!isNative()) return;
  Keyboard.hide().catch(() => {});
}
