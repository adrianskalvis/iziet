# Decisions

Choices made during the overnight build of 2026-11-20, with the reason for each. Research references point to `research/RESEARCH.md`.

## Product and language

| # | Decision | Reason |
|---|---|---|
| 1 | Name "Iziet", mascot Cielaviņa (white wagtail), original drawing | Owner answers 1 and 2. The Latvian Ornithological Society uses a wagtail emblem, so the drawing is a new cartoon. |
| 2 | Address the user with lowercase "tu"; buttons use the infinitive ("Meklēt", "Rādīt vairāk") | Answer 3; 18 of 22 Latvian sites use tu (section 6.1). |
| 3 | Time `19.00`, price `12 €`, `No 8 €`, `8,50 €`, `Bez maksas` | Answers 7 and 8; LVA answers Q400 and Q472. |
| 4 | Dates: `Šodien`, `Šovakar` (from 17.00), `Rīt`, `Parīt`, weekday adverb within 6 days, then `14. decembris`; ranges `12.–14. decembris`, `1.–31. dec.`, `28. nov. – 3. dec.`, ongoing `Līdz 6. decembrim` | Section 6.2 spec. Month and weekday names live in `locales/lv.json`. |
| 5 | 12 categories: Koncerti, Teātris, Izstādes un kino, Festivāli un svētki, Ģimenēm, Ēdiens un dzērieni, Zemnieku tirdziņi, Blusu tirgi, Sports, Radošās darbnīcas, Anime un spēles, Hobiji | Answer 4. Light shows go under festivals. |
| 6 | 48 niche and genre tags behind "Vēl intereses" (photography, perfume, collecting, vinyl, board games, cosplay, dance, astronomy and more), open list in `src/lib/shared/categories.ts` | Answer 4: "don't limit on niches". Users can follow any tag; tags are searchable and have their own lists on the categories page. |
| 7 | Companion options "Viens pats", "Ar draugiem", "Ar ģimeni"; kids' chips `0–6 g.`, `7–12 g.`, `13–17 g.` appear only after "Ar ģimeni" and are optional | Brief plus answer 5 ("don't make it annoying"). "Viens" alone also reads as "one". |
| 8 | Progressive questions: at most one per session, from the second session, as a dismissible card; two dismissals rest it for 30 days | Section 1. Order: kids ages (after 2 family opens), location, Rīga apkaime, travel time, time of day, price, install. |
| 9 | Skipped location defaults to Rīga centre, with "Mainīt" next to "Vieta: Rīga" | Answer 6; 32% of residents live in Rīga. |

## Ranking

| # | Decision | Reason |
|---|---|---|
| 10 | Score S = 0.30·D + 0.25·I + 0.15·F + 0.15·T + 0.10·P + 0.05·B, as one pure function in `src/lib/rank.ts` | Section 4.1. |
| 11 | "Tuvumā" candidates: within 10 km (Rīga), 15 km (state cities), 25 km (towns), 35 km (villages); widen ×2 when nothing scores ≥ 0.5; else show the nearest town with a fitting event | Resolves the radius conflict between sections 2 and 4: the radius picks, the decay ranks. |
| 12 | Interest is 0.5 for everyone when the user picked no interests | With I = 0 a skipped profile would rarely reach the 0.5 threshold. |
| 13 | Reason labels: at most 2. Label 1 is the strongest personal reason (Tuvu tev, Tev patīk …, Piemērots ģimenēm); label 2 is the first fact (Šovakar, Šodien, Rīt, Bez maksas, Nedēļas nogalē), else the next personal reason | Section 4.4. Code review pointed out the first build skipped the fact label. |
| 14 | In Rīga, the user's own apkaime fills first, then bordering apkaimes, then the city | Brief. Bordering is computed from the 58 official polygons. |

## Data

| # | Decision | Reason |
|---|---|---|
| 15 | 62 adapters, one folder each, discovered at run time; a broken adapter is skipped and logged | Brief: one adapter per source; keep going when one fails. |
| 16 | Biļešu Serviss, latvia.travel, Ticketshop and blusa.eu adapters are built and tested but off (`SOURCE_*` flags) | Their terms forbid copying or could not be read. Answer 9 asked for an ethical route: big concerts still arrive with ticket links through the venues' own sites (Xiaomi Arēna, Palladium, Hanzas Perons, LNOB, LNSO, Dailes) and through Live Riga. Permission request drafts are in `docs/permissions/`. |
| 17 | Shared municipal platform (24 municipalities incl. riga.lv): live path first; when the host does not answer, the newest Internet Archive snapshot of the calendar page | Answer 10. The platform times out from this machine. The live path takes over automatically when it answers from the server. |
| 18 | Images are hot-linked from the source over https, never re-hosted; CDNs with a width parameter get 240 px (thumbnails) or 720 px (hero) requests | Answer 11. One shape for all sources: 3:2 hero, 1:1 thumbnail; portrait posters show whole on a blurred copy of themselves; missing images show the category illustration. |
| 19 | Organiser emails and phone numbers are never stored | Fienta and blusa.eu responses contain them. |
| 20 | Coordinates: exact when the source gives them, copied between events at the same venue, else the town centre (`approx: true`, never used for apkaime or dedup) | Most municipal sources give only a town. |
| 21 | Dedup on the same day, venue, start within 30 minutes and title similarity (trigram ≥ 0.5 or every distinctive word matching); different cinemas never merge; the merged event takes the smallest member id and keeps the others as aliases | Section 4.8. The venue name must match at trigram ≥ 0.7. Aliases keep saved links working when a source drops out. |
| 22 | Data split: `events.json` (list fields, 125 KB gzip for 1,679 events) plus 16 detail shards loaded on the event page | Keeps the home page inside the performance budget. |
| 23 | Failed source → its last cached result up to 7 days old; a run that would shrink the data below 20% keeps the old file | Brief: use the last cached data. |
| 24 | No Nominatim geocoding in the pipeline | nominatim.openstreetmap.org robots.txt disallows bots. The curated agent looked up 5 market coordinates by hand. |
| 25 | Three Rīga venue addresses written from memory were wrong and are corrected from the venues' sites: Nacionālais teātris Kronvalda bulvāris 2, Xiaomi Arēna Skanstes iela 21, Hanzas Perons Hanzas iela 16a | Checked 2026-11-20. |

## Tech

| # | Decision | Reason |
|---|---|---|
| 26 | SvelteKit 2.70 with Svelte 5, Vite 7, TypeScript 5.9, adapter-static | Answer 13. SvelteKit 3.0 shipped on 2026-10-01; v2 was chosen for known, stable APIs. |
| 27 | Every route is prerendered; event and list pages read their state from the query string (`/pasakums?id=…`) | Works on any static host and offline without rewrite rules. |
| 28 | First-visit onboarding and the home skeleton are both in the prerendered HTML; an inline script picks one before first paint | No flash, and the first paint needs no JavaScript (Lighthouse home 100). |
| 29 | Riga time computed from the EU summer-time rule | Intl was 649 ms of main-thread work when ranking. Checked against Intl over 2025 to 2030. |
| 30 | Sign-in is off; Google and Apple via Supabase Auth behind `VITE_FEATURE_SYNC=1` plus keys; no SDK | Answer 12. Passkeys need provider support that was not verified, so the button is not shown. Schema in `docs/sync.sql`. |
| 31 | GitHub Pages for hosting; one GitHub Actions workflow builds on push and refreshes data every 6 hours | Owner asked for a live site through GitHub Actions on 2026-11-21. Cloudflare Pages still works with the same build (`static/_headers` applies there). |
| 32 | No analytics, no cookies, no cookie banner | Privacy promise in the app. |
| 33 | Work is on branch `build/v1`; `main` holds only the research | The repo started empty; the branch keeps the overnight work reviewable. |

## Owner tweaks of 2026-11-21

| # | Decision | Reason |
|---|---|---|
| 34 | Top bar reads "Iziet.lv"; the flag is a plain 2:1 rectangle with 2:1:2 stripes | Owner request. |
| 35 | Cielaviņa redrawn from the owner's reference photo: slim diagonal body, round white face, black crown and bib, white-edged wings, long tail; about 25% smaller | Owner request; the tail wag stays. |
| 36 | "Atpakaļ" on a page opened from the menu reopens the menu | Owner request. |
| 37 | List filters sit behind one "Filtri" button; options wrap, nothing scrolls sideways; chosen filters show as removable chips | Owner asked whether older users know sideways scrolling. |
| 38 | "Pārlūkot pēc kategorijas" shows the user's interests first, 6 chips in all, plus "Visas kategorijas" | Owner request. |
| 39 | The scope toggle opens search with the best events for that scope before any typing; "Nekas netika atrasts" is gone | Owner reported "Visa Latvija" did nothing. |
| 40 | "Kā nokļūt" uses venue and address text when only the town centre is known; town matching skips "… novads" and street names | Owner found Neonija (Dzērbene) routed to Cēsis centre. A test checks every event. |
| 41 | Public repo `adrianskalvis/iziet` holds normalised `static/data` only; raw source responses stay in the GitHub Actions cache; the Live Riga screenshot stays local | Raw Fienta responses contain an organiser email. A third-party screenshot does not belong in a public repo. |
| 42 | Five sources that show GitHub's servers a Cloudflare bot challenge (Apollo Kino, Forum Cinemas, LNSO, Saulkrasti, Dzintari) come through a relay: the owner's computer fetches them twice a day as IzietBot with the same robots.txt rules and rate limit, scrubs emails and phone numbers, and uploads them to the `relay` release. No disguise, proxy pool or challenge solving | Their robots.txt allows IzietBot and they answer it from a home connection. Allowlist requests are drafted in `docs/permissions/cloudflare-allowlist.md`; a source leaves the relay when it says yes, and is dropped if it says no. |
| 43 | The top-bar flag is a map of Latvia (Natural Earth 1:50m outline, 58 points) filled with the flag stripes | Owner request with a reference image. |
| 44 | Cielaviņa redrawn flat from the reference photo; every 7 seconds a 4-unit hop with two wing flicks; the outline is lighter in the dark theme | Owner asked for a simple bird and a minimal animation. Reduced-motion users see none. |
| 45 | Home shows one event per category in "Tuvumā", "Citur Latvijā" and "Visā Latvijā", unless the event matches the user's own interests | Owner saw 3 concerts for Cēsis and wanted the first one only. |
| 46 | "Tuvumā" and "Visa Latvija" on home swap the sections in place; "Visā Latvijā" lists 6 events, one per town | Owner found the jump to the search page confusing. |
| 47 | List filters are multi-choice, joined by commas in the URL (`kad=sodien,rit`); "Drīzākie" with "Tuvākie" sorts by day, then distance; "Šovakar" starts at 17.00 | Owner request; the review asked for "Šovakar". |
| 48 | Upkeep: relay files stay usable 30 days; one GitHub issue (label `source-health`) opens when a source has no fresh events for 3 days (10 for relay sources) and closes itself; actions run on their Node 24 versions | Owner asked for an app that runs with very little effort. |
| 49 | Persona review of 2026-11-21: 6 personas and a data audit, 20 findings fixed, 9 open, recorded in `research/REVIEW.md` | Owner request. |
| 50 | An event with only a town-centre coordinate shows no distance under 3 km and "ap N km" above; whole-country lists use the wide distance curve (half weight at 120 km) | Review: every such event showed "50 m", and far events led the lists. |
| 51 | Council, committee and residents' meetings and teacher training are dropped; all-capitals titles get capitalised words with a short acronym list | Review: about 40 non-leisure entries; names such as "Egils Siliņš" were lowercased. |

