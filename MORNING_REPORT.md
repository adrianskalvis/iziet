# Morning report: Iziet, overnight build of 2026-11-20

Iziet runs: 1,680 real events from 40 Latvian sources, a Latvian mobile UI, offline support and 240 passing tests. Everything is on branch `build/v1` in `~/IdeaProjects/MP/iziet`. Nothing is deployed, and no email was sent.

## How to run it

```bash
cd ~/IdeaProjects/MP/iziet
npm install
npm run dev
```

Open http://localhost:5173 on your phone or in a 390 px wide window. Other commands are in `README.md`. Screenshots at 390×844 are in `screenshots/`.

## What works

| Area | State |
|---|---|
| Onboarding | 3 skippable screens: place (location button or 8 city chips plus search across 100 places), companions with optional kids' ages, 12 categories plus 48 niche tags. Cielaviņa greets on screen 1. |
| Home | Search bar with Tuvumā / Visa Latvija, "Tuvumā" with 1 to 3 cards, "Citur Latvijā" with 3 cards from different towns, "Rādīt vairāk" on both, category chips. Empty "Tuvumā" names the nearest town with a fitting event. |
| Ranking | Research formula (distance, interests, family fit, date, price, sources). In Rīga the own apkaime fills first, then bordering apkaimes. Up to 2 reason labels per card. |
| Lists | Filters for date, free entry, families, category and sort; "Rādīt vēl" paging; back keeps length and scroll position (e2e tested). |
| Event page | Photo, date with weekday, all show times, place and distance, price range, one button per ticket seller, directions, add to calendar (.ics), share, save, description, language, ages, links to every source. |
| Search | Instant, typo tolerant, works without diacritics ("riga", "jurmala", "koncrets" all match). |
| Latvian | Every string in `locales/lv.json`, tu form, `19.00`, `12 €`, `No 8 €`, `Bez maksas`, `14. decembris`, `12.–14. decembris`, `Līdz 6. decembrim`, three plural forms. |
| Profile | localStorage only; settings page edits place, apkaime, companions, interests and text size (normal or large). |
| Progressive questions | One per session from the second visit, dismissible: kids' ages, location, apkaime, travel time, time of day, price, install. |
| PWA | Manifest, icons, service worker; works offline after the first visit (e2e tested). |
| Sync | Built behind `VITE_FEATURE_SYNC=1` with Supabase (Google and Apple, PKCE). Off: no keys. |
| Design | Beige `#ECD8C0`, ink `#101824`, carmine `#A3243A`, Nunito, rounded cards, soft shadows, light and dark mode, animated hamburger to X, full-screen menu, waving flag. |

## Data

- 62 adapters; 40 returned events in the last run, 4 are off pending permission, 18 returned nothing.
- 1,680 events in 59 towns after merging 104 duplicates. 1,613 have an image and 197 are free.
- Biggest sources: Liepāja 281, Fienta 217, Live Riga 152, Daugavpils iCal 126, Dailes teātris 106, Valmieras teātris 90, cinemas 169.
- Big international concerts arrive through Xiaomi Arēna (25), Palladium (16) and Live Riga, each with ticket links to the seller.
- Refresh: `npm run data`, or the GitHub Action every 6 hours once the repo is on GitHub.

## What does not work yet

| Gap | Cause | Next step |
|---|---|---|
| 17 municipal calendars on the shared platform return nothing; Rīga, Jūrmala and 5 more return 1 to 5 events from archive snapshots | The platform (212.70.163.179) times out from this Mac; Internet Archive copies are 1 to 6 months old | Run `npm run data` once from GitHub Actions or another network. If the live site answers, the same adapters read it. |
| Biļešu Serviss, latvia.travel, Ticketshop, blusa.eu are off | Their terms need permission | Send the drafts in `docs/permissions/`, then set the repository variables. |
| Blusu tirgi has 2 events, Anime un spēles 1 | blusa.eu is off; anime, board game and collector events live mostly on Facebook and Instagram | Permission from blusa.eu; see `pipeline/adapters/niche/CANDIDATES.md`. |
| 1,412 of 1,680 events have only town-centre coordinates | Most municipal sources give no address coordinates; public Nominatim forbids bots | A small venue coordinate table, or a self-hosted geocoder. |
| Search page Lighthouse performance 83 to 87 | Its largest element is a thumbnail from the organiser's server | An image proxy (Cloudflare Images) would fix it, but that re-hosts images (your answer 11 said hotlink). |
| Mežaparka Lielā estrāde returns 0 | No winter events; the full calendar needs a POST request | Revisit in spring. |
| Sync is untested against a live Supabase project | No keys | Create the project with `docs/sync.sql` and test sign-in once. |

## Tests and audits

| Check | Result |
|---|---|
| Unit tests (Vitest) | 227 of 227 pass, including fixture tests for every adapter |
| End-to-end (Playwright, 390×844) | 13 of 13 pass: onboarding skip and save, home cards, menu, search, back scroll, filters, event page, saving, offline |
| Type check (svelte-check) | 0 errors |
| Lighthouse mobile, home | Performance 100, accessibility 100, best practices 100, SEO 100; LCP 0.9 s |
| Lighthouse mobile, list | 92, 100, 100, 100 |
| Lighthouse mobile, event page | 91, 100, 100, 100 |
| Lighthouse mobile, search | 84, 100, 100, 100 |
| Code review | 20 findings (4 high), all fixed |
| Security review | 12 findings (2 high: link scheme bypass, sign-in token injection), all fixed; CSP added |

## Open decisions for you

1. Send the 4 permission emails in `docs/permissions/`? They are written from your name and address.
2. Merge `build/v1` into `main`, push to GitHub and connect Cloudflare Pages? Nothing is public yet.
3. Buy `iziet.lv`? It was free on 2026-11-20 (whois).
4. Image proxy for speed and privacy, or keep hot-linking? Hot-linking shows the organiser's server your visitors' IP addresses.
5. Upgrade to SvelteKit 3 (released 2026-10-01) later? The build uses 2.70 for stable, known APIs.

## Where things are

| Path | What |
|---|---|
| `DECISIONS.md` | 33 decisions with reasons |
| `research/` | Research, questions, your answers |
| `docs/permissions/` | Permission request drafts in Latvian |
| `docs/sync.sql` | Optional sync database schema |
| `reports/` | Lighthouse JSON reports |
| `screenshots/` | 13 screenshots at 390×844 |
| `data/last-run.log` | Log of the last live data run (not committed) |
