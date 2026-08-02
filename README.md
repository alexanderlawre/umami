# Umami

A recipe recommendation app: users onboard with their diets/allergens/preferences,
get a personalized dashboard of eligible recipes, save some for later, and log
what they cook. Built with Next.js (App Router), Prisma/Postgres, and Auth.js.

See [`DECISIONS.md`](./DECISIONS.md) for the running log of design/scope
decisions made while building this.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Prisma 6** + **PostgreSQL**
- **Auth.js (NextAuth v5)** — email/password (Credentials provider), JWT sessions
- **Resend** — transactional email (password reset)
- **Tailwind CSS 4**
- **Vitest** — unit tests
- **Capacitor** — iOS wrapper around the same Next.js server (see `capacitor.config.ts`)

## Local development

### Prerequisites

- Node ≥ 20
- A local PostgreSQL instance (or any reachable Postgres — see `.env.example`)

### Setup

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL / AUTH_SECRET at minimum
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See `.env.example` for the full list. Notes:

- `DATABASE_URL` — Postgres connection string.
- `AUTH_SECRET` — generate with `openssl rand -base64 32`.
- `APP_URL` — base URL used to build links in emails (e.g. password reset).
- `RESEND_API_KEY` / `EMAIL_FROM` — optional. Without `RESEND_API_KEY` set,
  password-reset links are logged to the server console instead of emailed,
  so local dev works without a Resend account.

### Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / run |
| `npm run lint` | ESLint |
| `npm run test` | Run the Vitest suite |
| `npm run db:seed` | Seed the DB from `prisma/seed/` |
| `ADMIN_EMAIL=you@example.com npx tsx scripts/create-admin.ts` | Create/promote an admin user (see script header for options) |
| `npx tsx scripts/find-recipe-photos.mjs` | Search Wikimedia Commons for candidate recipe photos, write `prisma/seed/photo-manifest.json` |
| `npx tsx scripts/download-recipe-photos.mjs` | Download the manifest's chosen photos into `public/recipe-photos/` |

## Admin

`/admin` is a hidden route, only reachable by a user with `isAdmin: true`.
It shows basic usage stats and lets you toggle a recipe's active/allergen
review status and replace its photo. Create an admin account with
`scripts/create-admin.ts` (see table above) — there's no invite-code system,
just a boolean on the `User` row, so promote an existing account or create a
dedicated one.

## Deployment

This app is a standard Next.js + Postgres app — deploy it anywhere that
supports both (Vercel + Neon is what it was built against):

1. Provision a production Postgres database (e.g. [Neon](https://neon.tech)).
2. Set `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, and (optionally)
   `RESEND_API_KEY` / `EMAIL_FROM` as environment variables on your host.
3. Run `npx prisma migrate deploy` against the production database.
4. Optionally run `npm run db:seed` to load the recipe catalog, and
   `ADMIN_EMAIL=... npx tsx scripts/create-admin.ts` to create an admin.
5. Deploy (`vercel --prod`, or your platform's equivalent).
