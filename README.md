# Iziet

Mobile-first event discovery for Latvia: something to do nearby in under 30 seconds. Latvian UI, installable PWA, works offline, no accounts.

## Run it

```bash
npm install
npx playwright install chromium
npm run dev            # http://localhost:5173
```

Production build and preview:

```bash
npm run build
npm run preview        # http://localhost:4173
```

## Data

```bash
npm run data           # fetch every source, write static/data
npm run data -- --offline            # replay the HTTP cache only
npm run data -- --only=fienta,liveriga   # refresh some sources, others use their cache
npx tsx pipeline/dev/run-adapter.ts liveriga   # try one adapter
```

- Adapters live in `pipeline/adapters/<id>/` (62 in total). Each has `parse.ts`, fixture tests and a default export.
- Output: `static/data/events.json` (list), `static/data/details/0..15.json` (event pages), `static/data/meta.json` (source status).
- Sources that need written permission run only with their flag: `SOURCE_BILESUSERVISS=1`, `SOURCE_LATVIATRAVEL=1`, `SOURCE_TICKETSHOP=1`, `SOURCE_NICHE_BLUSA=1`.
- Geodata: `npm run geo` rebuilds Rīga apkaimes (Rīgas dome, CC BY 4.0) and towns (Wikidata, CC0).

## Tests

```bash
npm run check          # svelte-check, TypeScript
npm test               # 217 unit tests (Vitest)
npm run test:e2e       # 13 Playwright tests at 390×844, writes screenshots/
```

## Deploy

GitHub Pages, from `.github/workflows/site.yml`:

1. Push the repo to GitHub (public, so Pages is free).
2. Settings, Pages, Source: "GitHub Actions".
3. Every push to `main` builds and deploys. Every 6 hours the workflow fetches fresh events, deploys them and commits the data back.
4. A custom domain (for example iziet.lv) goes in Settings, Pages; the build then drops the `/iziet` sub-path by itself.

Optional sync: create the table in `docs/sync.sql` on Supabase (EU region), enable Google and Apple sign-in, then build with `VITE_FEATURE_SYNC=1`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Layout

| Path | What |
|---|---|
| `src/routes` | Pages: home, `saraksts`, `pasakums`, `meklet`, `saglabatie`, `iestatijumi`, `kategorijas`, `par` |
| `src/lib` | Ranking, formats, search, profile, stores, components |
| `src/lib/shared` | Types, categories, time and geo helpers shared with the pipeline |
| `locales/lv.json` | Every UI string |
| `pipeline` | Data pipeline and adapters |
| `research` | Research, questions and answers |
| `DECISIONS.md` | Every choice made during the build and why |
| `MORNING_REPORT.md` | What works, what does not, open decisions |
