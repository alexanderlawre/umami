// Preferences (page 2) are carried to personalize (page 3) via sessionStorage
// since they're separate routes/pages rather than steps within one client
// component. Everything is submitted together in a single POST from page 3.
export const ONBOARDING_PREFS_KEY = "umami-onboarding-preferences";

export type OnboardingPreferences = {
  dietIds: string[];
  allergenIds: string[];
  customAllergens: string[];
};
