# Decisions Log

Simplifications and judgment calls made while building Phase 1 ("skeleton that
runs"), per §0's instruction to pick the simpler option, document it here, and
only stop to ask about ambiguities involving allergens or auth.

## Environment & infra

- **Local Postgres for dev, Neon for prod.** No Docker or existing Postgres was
  found on this machine. Installed `postgresql@16` via Homebrew and created a
  local `umami_dev` database for development. `DATABASE_URL` in `.env` points
  to it. Swapping to a Neon connection string for deployment is a one-line
  change — no code changes needed, since Prisma only cares about the URL.
- **Prisma pinned to v6.19.3, not the default v7.9.0.** `npm install prisma`
  pulled the brand-new v7 line, which changes the generator (`prisma-client`
  instead of `prisma-client-js`), requires an explicit `output` path, replaces
  the `datasource url` with a separate `prisma.config.ts`, drops automatic
  `.env` loading, and no longer auto-generates the client on `migrate dev`.
  None of that is needed for this app, so I pinned to the stable v6 line to
  reduce risk on a from-scratch build.
- **Next.js 16's `middleware.ts` → `proxy.ts` rename.** The scaffold pulled
  Next 16.2.11, which renamed the middleware file convention to `proxy.ts`
  (exporting a `proxy` function instead of `middleware`) partway through this
  build. Renamed the file and export accordingly; behavior (Auth.js session
  gating + redirect-to-onboarding) is unchanged.

## Data & seeding

- **30 recipes instead of the 100-120 called for in §10**, to keep Phase 1
  buildable in one pass. Cuisine diversity was kept proportional and exact
  (3 recipes each across 10 cuisines: Italian, Mexican, Japanese, Indian,
  Thai, Middle Eastern, American, Chinese, French, Korean) rather than hitting
  every absolute diet/allergen quota from §10, which was written against the
  larger catalog. The full quotas are a Phase 3 concern when the catalog grows.
- **Two recipes intentionally left `UNVERIFIED`** (`chicken-katsu`,
  `mapo-tofu`) so the fail-closed allergen logic has real data to exercise —
  any user with a declared allergen (built-in or custom free-text) should
  never see these, regardless of their diet/allergen tags.
- **Onboarding's food-group meter screens are a hand-grouped adaptation**, not
  a literal transcription of the spec's category names. The 27 food groups
  are split into 5 screens (Produce; Grains, legumes & fruit; Proteins; Dairy,
  eggs & extras; Flavour & indulgence) sized 4-6 sliders each, to keep every
  screen roughly balanced. The category *set* (27 groups, 18 diets, 15
  allergens) matches §3 exactly.

## Application logic

- **Dashboard is random-not-scored, per §14 Phase 1 scope.** The server does:
  hard filter (allergens/diets) → shuffle → take 4. There is no cooldown
  suppression or scoring engine yet, so a dismissed card can reappear on the
  next load or as a replacement in the same session — expected for Phase 1,
  to be addressed by the cooldown system in a later phase.
- **OPEN is logged on the detail page mounting**, not on the dashboard card
  tap, so a logged OPEN always corresponds to a page that was actually
  reached (avoids double-counting from link prefetching).
- **Serving stepper scales numeric quantities only.** Ingredient quantities
  that parse as a plain number (`"2"`, `"1.5"`) scale linearly with the
  servings stepper; non-numeric quantities (`"a pinch"`, `"2 cans"`) are left
  as-authored rather than attempting fraction/unit parsing, which is out of
  scope for a Phase 1 skeleton.
- **Star and cosign are fire-and-forget interaction logs.** There's no
  dedicated "starred" or "cosigned" field surfaced back to the UI on reload
  (e.g. a profile page showing your starred recipes) — that's Phase 2+
  (profile page, §8). Phase 1 just needs the behavioral log populated
  correctly, which it does (verified via direct DB inspection during
  end-to-end testing).
- **Cosign "Skip" still counts as a completed cook**, just without a public
  note — `COOK` is logged unconditionally when "I cooked this" is pressed;
  `COSIGN` is only logged if the user submits (with or without a note) rather
  than skipping.

## Verified end-to-end (2026-07-24)

Walked through signup → onboarding (diet: Vegan, allergen: Tree nuts) →
dashboard → dismiss → recipe detail → serving stepper → star → cook → cosign
with a live browser session against the local dev DB. Confirmed:
- Dashboard only ever showed vegan, tree-nut-free recipes.
- Dismissing a card logged `DISMISS` and swapped in an eligible replacement.
- `IMPRESSION`, `OPEN`, `DISMISS`, `COOK`, `STAR`, `COSIGN` interactions were
  all written with correct `userId`/`recipeId`/`localHour`/`localDayOfWeek`.
- `CookLog` row had the correct scaled `servings`, `isPublic: true`, and the
  submitted `cosignNote`.
- `vitest run` passes 11/11 hard-filter tests covering: no-restriction users,
  inactive recipes, new users, vegan+peanut-allergy fixtures, ALL-diets
  matching, custom free-text allergens (fail-closed to VERIFIED), and
  interaction history being irrelevant to the hard filter.

## Post-Phase-1 prototype pass (photos, admin, mobile, iOS wrapper)

- **Recipe photos: one licensed photo per recipe, no user-uploaded photos.**
  Sourced Wikimedia Commons images (public domain / CC-licensed, no account
  needed) for all 30 recipes, added a nullable `imageUrl` (+`imageCredit`)
  column via migration, and backfilled it via a one-off script. The
  "let people add their own photo of the dish" idea was descoped for this
  prototype pass to keep scope tight — no upload UI, storage, or moderation
  exists yet.
- **Admin is a single hidden route (`/admin`), not a separate app.** Added a
  boolean `isAdmin` column, threaded it through the JWT/session (`auth.ts`,
  `auth.config.ts`, `src/types/next-auth.d.ts`) so it's checked server-side,
  and built one page with basic stats (user/recipe/interaction counts) plus
  a recipe list with review-status and active/hidden toggles via a small
  `PATCH /api/admin/recipes/[id]` route. No role system beyond a single
  boolean — sufficient for one operator running a prototype.
  **Note:** an existing session's JWT won't pick up a newly-set `isAdmin`
  flag until the user signs out and back in, since the `jwt()` callback only
  re-reads the DB on initial sign-in, not on every request.
- **Mobile-first pass covered three concrete things**, not a full native
  redesign: (1) `env(safe-area-inset-*)` padding at the `body` level (via a
  `viewport-fit=cover` viewport export) so content clears the notch/home
  indicator on every page, whether or not the app header is present;
  (2) confirmed single-column-by-default layouts were already correct
  throughout, no grid changes needed; (3) bumped every interactive control
  below Apple's 44×44pt guideline (servings stepper, dismiss/chip-remove
  buttons, admin toggles) and every form input below 16px font-size (which
  otherwise triggers iOS's auto-zoom-on-focus).
- **iOS wrapper uses Capacitor's "remote-URL" pattern, not a static bundle.**
  Umami is a full SSR app with API routes and a Postgres-backed session, so
  `next export` isn't viable. `capacitor.config.ts` instead points
  `server.url` at the running Next.js server directly (`localhost` for
  simulator dev), with `cleartext: true` and a matching `NSAppTransportSecurity`
  exception for `localhost` in `Info.plist` (plain `http://`, not `https://`).
  For a real device or production build, `server.url` should point at the
  deployed HTTPS origin and the ATS exception can be dropped entirely.
- **Xcode build had to use a DerivedData path outside `~/Desktop`.** This
  machine has iCloud "Desktop & Documents" sync enabled, which injects a
  `com.apple.provenance`-style extended attribute into files under Desktop
  that trips Xcode's codesign step (`resource fork, Finder information, or
  similar detritus not allowed`). Building with `-derivedDataPath` pointed at
  `/tmp` instead of the default (inside the project, under synced Desktop)
  avoided this entirely; this is a machine-local build quirk, not something
  that affects other developers' machines or CI.
