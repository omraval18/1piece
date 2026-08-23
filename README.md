# OnePiece / CompatibilityProof

Will this 3D-printer nozzle fit that hotend? Specs are pulled from public
manufacturer and wiki pages through Bright Data Scraper Studio, normalized in
code, then scored against a catalog of counterpart parts.

## Stack

- Next.js (App Router, TypeScript, Tailwind v4)
- shadcn/ui
- Drizzle ORM + local Postgres
- better-auth (email/password)
- `@brightdata/sdk` Scraper Studio (`client.scraperStudio.run`)
- zod

## Quick start (fixture mode, no Bright Data credits)

1. Local Postgres, database created: `createdb comp_scrape`
2. Copy `.env.example` to `.env`. Fill `DATABASE_URL` and `BETTER_AUTH_SECRET`
   (`openssl rand -base64 32`). Leave `COMP_SCRAPE_MODE=fixture`.
3. `pnpm install && pnpm exec drizzle-kit migrate`
4. `pnpm compat:check` — mechanical fit rules (thread, body, PTFE vs 500 °C).
5. `pnpm dev` → http://localhost:3000

Pick a catalog part and click **Find matching parts**. The home page does not
require a login. `/dashboard` is the same lab behind a session.

`POST /api/compat` is the downstream integration: a collector id (when live)
feeds a structured profile, then a typed verdict list.

## Live Scraper Studio (costs credits)

One collector for the whole app. You do not create a new scraper per product.
You create `product-specs` once, then run it on any public spec URL.

1. `npx -p @brightdata/cli bdata login` (or set `BRIGHTDATA_API_TOKEN`).
2. Create the collector once (5–15 min). Prompt is `COLLECTOR_PROMPT` in
   `src/lib/compat/contracts.ts`:

```bash
npx -p @brightdata/cli bdata scraper create \
  "https://e3d-online.com/products/e3d-v6-brass-nozzles" \
  "$(cat output/prompt-product-specs.txt)" \
  --name product-specs \
  --timeout 1500 \
  --pretty -o output/create-product-specs.json
```

3. Put the `c_*` id in `.env`:

```
COMP_SCRAPE_MODE=live
BRIGHTDATA_API_TOKEN=...
BRIGHTDATA_COLLECTOR_ID=c_...
```

4. Restart `pnpm dev`. Every catalog pick and pasted URL reuses that collector.

Do not point collectors at Amazon or other retailer pages Bright Data already
covers with pre-built scrapers.

## Pipeline

1. Scraper Studio extracts a page into a loose JSON object.
2. `normalize.ts` maps temps to °C and thread names onto `M6x1 | M6x0.75 | MK8 | other`.
   Volcano is a body length, not a thread.
3. `match.ts` scores nozzle ↔ hotend in code: thread, filament diameter, heater
   block body, PTFE liner vs a ≥300 °C nozzle. Missing thread or filament →
   `unclear`. Voltage / thermistor are stored, not scored.

## Auth notes

- better-auth tables in `src/db/schema.ts` — regenerate with
  `pnpm dlx @better-auth/cli generate --config src/lib/auth.ts --output src/db/schema.ts`
- **Known drift as of better-auth 1.7.x:** CLI `latest` (1.4.21) may omit
  `account.issuer`. Add `issuer: text("issuer").notNull()` and a unique index
  on `(issuer, accountId)` if sign-up 500s. See `src/db/schema.ts`.
