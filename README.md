# OnePiece

Will this 3D-printer nozzle fit that hotend? Next.js app scaffold with auth in
place; the scraping/compatibility pipeline comes next.

## Stack

- Next.js (App Router, TypeScript, Tailwind v4)
- shadcn/ui (Radix UI primitives)
- Drizzle ORM + local Postgres
- better-auth (email/password only)
- zod

## Setup

1. Local Postgres running, database created:
   ```bash
   createdb comp_scrape
   ```
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` /
   `BETTER_AUTH_SECRET` (generate one with `openssl rand -base64 32`).
3. Install deps and run migrations:
   ```bash
   pnpm install
   pnpm exec drizzle-kit migrate
   ```
4. `pnpm dev` and open http://localhost:3000 — `/sign-up`, `/sign-in`,
   `/dashboard` (session-gated) are wired up.

## Notes for whoever touches auth next

- `src/db/schema.ts`'s `user`/`session`/`account`/`verification` tables are
  managed by better-auth — regenerate with
  `pnpm dlx @better-auth/cli generate --config src/lib/auth.ts --output src/db/schema.ts`
  rather than hand-editing, then `drizzle-kit generate && drizzle-kit migrate`.
- **Known drift as of better-auth 1.7.x:** `@better-auth/cli`'s published
  `latest` (1.4.21) is behind the `better-auth` core package and generates an
  `account` table missing the `issuer` column introduced in 1.7 (see
  [1.7 upgrade guide](https://better-auth.com/docs/guides/1-7-upgrade-guide#account-identity-is-scoped-by-issuer)).
  Without it, sign-up 500s with `BetterAuthError: The field "issuer" does not
  exist`. If you regenerate the schema and hit this again, manually add:
  ```ts
  issuer: text("issuer").notNull(),
  ```
  to the `account` table plus a unique index on `(issuer, accountId)` — see
  `src/db/schema.ts` for the current fix.
