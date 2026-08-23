# OnePiece

**Will this part actually work with that one?** CPU + motherboard, camera +
lens, GPU + PSU, nozzle + hotend, charger + laptop — any hardware category,
any manufacturer. Ask in plain English; OnePiece finds the real spec pages,
scrapes them with Bright Data, and gives a cited yes/no/conditional — never
a guess.

Built for [WeMakeDevs' Into the Scrape-Verse hackathon](https://www.wemakedevs.org/hackathons/scrape-verse).

## The problem

"Will X work with Y?" is one of the most common questions in hardware, and
the honest answer usually needs two spec sheets read side by side —
different vocabularies, different units, half the time a compatibility
caveat buried in a footnote (a BIOS version, a firmware minimum, a thread
that "will fit but shouldn't"). Compatibility-checker sites that exist today
are almost always scoped to one category (RAM, GPUs) and hand-curated. This
one has no catalog to maintain: point it at a product name and it goes and
finds the evidence itself.

## How it works

```
user asks about Part A + Part B
        │
        ▼
 discover.ts ── Bright Data client.discover() (AI-ranked web search,
        │        not scoped to any brand or domain list)
        │        + redirect resolution, retailer/forum de-prioritization,
        │        domain-recurrence re-ranking
        ▼
 extract.ts ── Scraper Studio collector "product-specs" (c_*, pinned,
        │       reused for every URL) → structured {name, category, specs}
        │       falls back to a Web Unlocker markdown scrape + re-parse if
        │       Studio's structured output comes back empty
        ▼
 normalize.ts ── deterministic, dumb on purpose: trims strings, coerces
        │         numeric-looking values, flattens nested JSON. No unit
        │         tables, no per-brand aliases — it doesn't know what a
        │         "thread" or a "socket" is.
        ▼
 match.ts ── both structured profiles go to MiniMax as JSON. Must return
             one of compatible / conditional / incompatible / unclear,
             citing the exact spec keys that drove it. Missing evidence on
             either side → unclear, explicitly, never a bluff.
```

The only place an LLM makes the actual judgment call is the last step, and
it's constrained to compare two already-normalized JSON objects with
required citations — not "read two pages and guess." Discovery and scraping
are equally load-bearing: garbage in (wrong page, no specs) reliably
produces `unclear` out, not a confident wrong answer.

## Scraper Studio usage

One pinned collector, `product-specs` (**`c_mt5vemizfhl0jccaf`**), reused for
every product across every category — there is no per-brand or per-category
collector to maintain. Extraction prompt (`COLLECTOR_PROMPT` in
`src/lib/compat/contracts.ts`):

> Extract one product as a single JSON object (not a list). Reused on many
> kinds of product pages. Fields: name, category (what kind of part or
> product this is, in a couple of words), source_url, and any other spec
> fields present on the page as flat key-value pairs (dimensions, ratings,
> materials, connectors, voltages, capacities, thread sizes, etc. —
> whatever the page actually lists). Omit fields that are not present. Do
> not guess.

It was created with a real `bdata scraper create` run and is invoked live
via `@brightdata/sdk`'s `client.scraperStudio.run(collectorId, { input: { url } })`
(`src/lib/compat/brightdata.ts`) — every "extraction" step in the pipeline
above is a genuine collector run, not a mock.

## Self-healing (real, not staged)

While testing this build, `bdata scraper run` on the pinned collector
started returning nothing but an echo of its own input —
`{"source_url": "...", "input": {"url": "..."}}` — for **every** URL,
including a plain Wikipedia article. Confirmed independently via the CLI
(bypassing our own code) before touching anything:

```bash
$ bdata scraper run c_mt5vemizfhl0jccaf https://en.wikipedia.org/wiki/Sony_FE_200-600mm_F5.6-6.3_G_OSS
[{ "source_url": "...", "input": { "url": "..." } }]   # no real fields at all
```

Fixed it with `bdata scraper heal`, same collector ID, describing the
symptom:

```bash
$ bdata scraper heal c_mt5vemizfhl0jccaf \
  "The scraper is returning only {source_url, input} for every page and \
   never extracting the real product fields..."
```

The heal returned a genuine preview extraction before we approved anything:

```json
{
  "name": "E3D V6 1.75mm Brass Nozzles",
  "part_kind": "nozzle",
  "thread": "M6",
  "nozzle_diameter_mm": ["0.15mm", "0.25mm", "..."],
  "max_temperature": "300°C",
  "material": "Brass"
}
```

Approved with `bdata scraper approve c_mt5vemizfhl0jccaf`, then reran the
exact same failing URL to confirm the fix actually persisted (`status:
"done"`, real fields returned, not just the preview). Honest caveat: the
heal fixed the domain it had evidence for (e3d-online.com) — it did not
retroactively fix every other site, which is exactly why `extract.ts` also
has the markdown fallback above, and why `unclear` is a real, expected,
frequent answer rather than something to hide.

## Downstream integration

The collector ID isn't just sitting in a JSON dump — it feeds two live
consumers:

1. **An agent** — `src/lib/chat-tools.ts` gives the MiniMax chat agent three
   tools (`discoverSpecUrls`, `scrapeSpecs`, `checkCompatibility`) that call
   the collector directly and reason over cited results across a multi-turn
   conversation (`POST /api/chat`).
2. **An API** — `POST /api/compat` takes a catalog id or URL and returns a
   typed verdict list built the same way, for non-chat integrations.

## Data source rules

- Public manufacturer/support/wiki pages only — nothing behind a login or
  paywall.
- `discover.ts` explicitly de-prioritizes Amazon, eBay, Best Buy, and other
  marketplaces Bright Data already has 800+ pre-built scrapers for; targets
  are manufacturer and community reference pages.
- No personal data is scraped or stored — profiles are product specs only.
- `.env` is git-ignored; only `.env.example` (no real values) is committed.

## Quick start (fixture mode — no Bright Data credits needed)

1. Local Postgres, database created: `createdb comp_scrape`
2. Copy `.env.example` to `.env`. Fill `DATABASE_URL` and `BETTER_AUTH_SECRET`
   (`openssl rand -base64 32`). Leave `COMP_SCRAPE_MODE=fixture`.
3. `pnpm install && pnpm run db:migrate`
4. `pnpm compat:check` — without `MINIMAX_API_KEY` this only checks the
   deterministic no-key fallback; set the key to exercise a real comparison.
5. `pnpm dev` → http://localhost:3000, sign up, start a chat.

`pnpm run build` runs `drizzle-kit migrate` before `next build`, so every
deploy stays schema-current automatically.

Set `MINIMAX_API_KEY` to enable chat (OpenAI-compatible MiniMax API,
`https://api.minimax.io/v1`, model `MiniMax-M3` by default). Threads persist
in Postgres (`conversation.messages` jsonb) as full AI SDK `UIMessage[]`, so
tool calls and their results reload exactly as they happened.

## Live Scraper Studio (costs credits)

```bash
npx -p @brightdata/cli bdata login   # or set BRIGHTDATA_API_TOKEN

npx -p @brightdata/cli bdata scraper create \
  "https://e3d-online.com/products/v6-nozzles" \
  "$(cat output/prompt-product-specs.txt)" \
  --name product-specs --timeout 1500 --pretty -o output/create-product-specs.json
```

Put the resulting `c_*` id in `.env`:

```
COMP_SCRAPE_MODE=live
BRIGHTDATA_API_TOKEN=...
BRIGHTDATA_COLLECTOR_ID=c_...
```

Restart `pnpm dev` — every product-name query and pasted URL now reuses that
one collector. Discovery itself needs no separate collector; it's Bright
Data's `client.discover()`, general AI-ranked search.

## Stack

- Next.js (App Router, TypeScript, Tailwind v4), shadcn/ui
- Drizzle ORM + Postgres, better-auth (email/password)
- AI SDK + MiniMax (chat and the compatibility verdict)
- `@brightdata/sdk` — `client.discover()` for discovery, `client.scraperStudio.run()` for extraction, `client.scrapeUrl()` as a markdown fallback

## Auth notes

- better-auth tables live in `src/db/schema.ts` — regenerate with
  `pnpm dlx @better-auth/cli generate --config src/lib/auth.ts --output src/db/schema.ts`
- **Known drift as of better-auth 1.7.x:** the `@better-auth/cli` `latest`
  tag (1.4.21) can omit `account.issuer`, which 1.7's core package requires.
  If sign-up 500s with a missing-column error, add
  `issuer: text("issuer").notNull()` plus a unique index on
  `(issuer, accountId)` — see `src/db/schema.ts` for the applied fix.

## Judging checklist

| Criterion | Where |
|---|---|
| Potential impact | Universally understood problem, works across categories, not a toy demo — see [The problem](#the-problem) |
| Creativity & innovation | Discover → extract → normalize → cited-compare pipeline, not "AI reads a page and guesses" — see [How it works](#how-it-works) |
| Technical excellence | Typed contracts, deterministic normalization, a real extraction fallback chain, cited verdicts | 
| Scraper Studio usage | One real pinned collector driving every category — see [Scraper Studio usage](#scraper-studio-usage) |
| Reliability & self-healing | A real `bdata scraper heal` round-trip on this exact collector, plus a markdown fallback and honest `unclear` for anything neither path can support — see [Self-healing](#self-healing-real-not-staged) |
| Presentation | Chat UI: name two parts, get a cited verdict, click through to sources |
