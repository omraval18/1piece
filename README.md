# OnePiece / CompatibilityProof

Will this part work with that one? Any hardware category, any manufacturer —
CompatibilityProof discovers spec pages with Bright Data's AI-ranked web
discovery, scrapes them with a pinned Scraper Studio collector, then scores
fit from the extracted specs. No fixed brand list, no generic guesswork.

## Stack

- Next.js (App Router, TypeScript, Tailwind v4)
- shadcn/ui (sidebar + AI conversation / message / prompt / tool)
- Drizzle ORM + local Postgres
- better-auth (email/password)
- AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`) + Streamdown for streaming markdown
- `@brightdata/sdk` Scraper Studio (`client.scraperStudio.run`)
- zod

## Quick start (fixture mode, no Bright Data credits)

1. Local Postgres, database created: `createdb comp_scrape`
2. Copy `.env.example` to `.env`. Fill `DATABASE_URL` and `BETTER_AUTH_SECRET`
   (`openssl rand -base64 32`). Leave `COMP_SCRAPE_MODE=fixture`.
3. `pnpm install && pnpm exec drizzle-kit migrate`
4. `pnpm compat:check` — without `MINIMAX_API_KEY` this only checks the
   deterministic no-key fallback; set the key to exercise a real comparison.
5. `pnpm dev` → http://localhost:3000

After sign-in, `/` is chat (empty state) and `/{id}` is a thread. Sign-in and
sign-up stay public.

Set `MINIMAX_API_KEY` for chat (OpenAI-compatible MiniMax API at
`https://api.minimax.io/v1`, model `MiniMax-M2.5` by default). Threads live in
Postgres (`conversation.messages` jsonb) as full AI SDK `UIMessage[]` so text,
tool calls, and tool results reload as they were. The sidebar lists those
threads.

`POST /api/compat` is the downstream integration: a collector id (when live)
feeds a structured profile, then a typed verdict list.

## Live Scraper Studio (costs credits)

One collector for the whole app, for any product category. Discovery itself
doesn't need a collector — it's Bright Data's `client.discover()`, a general
AI-ranked web search, not a per-domain registry.

1. `npx -p @brightdata/cli bdata login` (or set `BRIGHTDATA_API_TOKEN`).
2. Create `product-specs` once. Prompt is `COLLECTOR_PROMPT` in
   `src/lib/compat/contracts.ts`:

```bash
npx -p @brightdata/cli bdata scraper create \
  "https://e3d-online.com/products/v6-nozzles" \
  "$(cat output/prompt-product-specs.txt)" \
  --name product-specs \
  --timeout 1500 \
  --pretty -o output/create-product-specs.json
```

The seed URL above is just whatever catalog page was handy when the collector
was first created — the collector itself has no notion of a fixed product
category and works the same on any public spec page.

3. Put the `c_*` id in `.env`:

```
COMP_SCRAPE_MODE=live
BRIGHTDATA_API_TOKEN=...
BRIGHTDATA_COLLECTOR_ID=c_...
```

4. Restart `pnpm dev`. Every product-name query and pasted URL reuses that
   one collector.

Do not point collectors at Amazon or other retailer pages Bright Data already
covers with pre-built scrapers.

## Pipeline

1. `discover.ts` calls Bright Data's `client.discover(query)` — general,
   AI-ranked web search, not scoped to any brand — and ranks results by
   relevance.
2. `product-specs` Scraper Studio extracts a loose JSON object from the
   top-ranked candidate pages until one yields usable specs.
3. `normalize.ts` is deliberately dumb: it trims strings, coerces
   numeric-looking values, and drops nested junk into a flat
   `{ name, category, specs, source_url }` profile.
4. `match.ts` hands both profiles to MiniMax and requires a cited
   `compatible | incompatible | unclear` verdict. If discovery finds nothing
   or extraction yields no specs, the answer is unclear — not a guess.

## Auth notes

- better-auth tables in `src/db/schema.ts` — regenerate with
  `pnpm dlx @better-auth/cli generate --config src/lib/auth.ts --output src/db/schema.ts`
- **Known drift as of better-auth 1.7.x:** CLI `latest` (1.4.21) may omit
  `account.issuer`. Add `issuer: text("issuer").notNull()` and a unique index
  on `(issuer, accountId)` if sign-up 500s. See `src/db/schema.ts`.
