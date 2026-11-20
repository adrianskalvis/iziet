# Questions before the overnight build

15 questions. Each has a recommended default. Answer in [`ANSWERS.md`](ANSWERS.md): "ok" accepts the default, anything else replaces it. Evidence for each default is in [`RESEARCH.md`](RESEARCH.md); the section number is given.

## Product

**1. App name.** 5 options; `.lv` status from whois on 2026-11-20. The trademark register was not checked (section 6.6).

| Name | Meaning | Domain |
|---|---|---|
| **Sanāc** (default) | "come over", also "it works out" | sanac.lv and sanāc.lv free |
| Turpat | "right there, close by" | turpat.lv free |
| Nāc līdzi | "come along" | naclidzi.lv and nāclīdzi.lv free |
| Iziet | "to go out" | iziet.lv free |
| Ejam ārā | "let's go out" | ejamara.lv and ejamārā.lv free |

Default: **Sanāc**. 5 letters, easy to say at age 10 and 70. It still works typed without ā.

**2. Mascot.** Default: **yes, Mārīte** (two-spot ladybird, Latvia's national insect). It is small, round and red like the carmine accent. It appears only in onboarding, empty states and loading, never on event cards.
- Mārīte, divpunktu mārīte. The two spots can read as "you" and "the event" on a map pin.
- Cielaviņa, the white wagtail (national bird). The Latvian Ornithological Society already uses it, so the design must differ.
- Sprīdītis, Brigadere's boy hero. The 1903 text is public domain since 2004; the 1982 and 1985 film designs are not.

**3. Form of address.** Default: **tu, lowercase**, with neutral phrasing first (buttons use the infinitive: "Meklēt", "Rādīt vairāk"). 18 of 22 Latvian consumer sites use tu; SEB, Biļešu Serviss and Google use jūs. LVA reserves capital Tu and Jūs for letters (section 6.1).

**4. Categories.** Default: these **12** chips, renamed from the draft after sections 2 and 6.

| Draft | Default | Why |
|---|---|---|
| Ēdiens | Ēdiens un dzērieni | "Ēdiens" alone reads as "food" |
| Zemnieku tirdziņi | Zemnieku tirdziņi | keep |
| Blusu tirgi | Blusu tirgi | keep, separate from farmers' markets |
| Koncerti | Koncerti | keep |
| Ģimenēm | Ģimenēm | keep |
| Ko redzēt | Izstādes un kino | a question among nouns; light shows move to festivals |
| Teātris | Teātris | keep |
| Festivāli | Festivāli un svētki | town and parish festivals are the top outing at 50% |
| Sports | Sports | keep |
| Darbnīcas | Radošās darbnīcas | "darbnīca" also means a repair shop |
| Nišas (anime, spēles) | Anime un spēles | UniCon puts anime, cosplay and gaming in one event |
| Nišas (smaržas, kolekcionēšana) | Hobiji | "niša" first means a wall recess |

**5. Kids' age chips** (onboarding screen 2, shown after "Ar ģimeni"). Default: **3 chips by Latvian school stage**: `0–6 g.`, `7–12 g.`, `13–17 g.` Sections 1 and 2 disagree (5 chips vs 3 Eurostat bands). 3 chips are faster to tap.

**6. "Tuvumā" radius and skipped location.** Default:
- 10 km in Rīga, Jūrmala and Pierīga; 30 km elsewhere; widen to 60 km when fewer than 3 events match.
- In Rīga, the user's own apkaime ranks first, then all of Rīga.
- Skipped location means Rīga centre, with a visible "Mainīt pilsētu" link.
72% of Latvians attend events in their own town or parish (section 2).

## Formats

**7. Time format.** Default: **`19.00`**, the Latvian norm (LVA answer Q400; the colon is only a technical sign). The brief says `19:00`, which phones and Intl output. Card example: `14. decembris, 19.00`.

**8. Price format.** Default: **`12 €`, `No 8 €`, `8,50 €`, `Bez maksas`**, the Latvian norm since 2018 (LVA answer Q472, EU style guide 7.3.3). The brief's `€12` and `No €8` use English order.

## Data

**9. Sources for v1.** Default:
- Build adapters now for the open sources: Fienta API, Apollo Kino and Forum Cinemas feeds, Live Riga, Daugavpils, Liepāja, the WordPress event plugin group (6 sites), the KPanel group (Jēkabpils, Bauska), LNSO and Dailes teātris.
- Add the 16-item hand-entered seed list (markets, UniCon, marathons, Staro Rīga).
- Build adapters for Biļešu Serviss, latvia.travel and Ticketshop behind a flag that stays off until permission arrives. Big concerts still get ticket links through Live Riga.
- Draft the 3 permission emails in Latvian for you to send. Nothing is sent for you.

**10. Shared municipal platform check.** 24 of 42 municipalities, Rīga included, run one website platform. It timed out from this machine. Open `https://www.riga.lv/lv/notikumu-kalendars` on your phone or browser and answer "loads" or "fails". Default if unanswered: skip that adapter tonight and log it as blocked in `DECISIONS.md`.

**11. Event images.** Default: **use the image URL each source publishes for display** (Fienta `image_url`, cinema feed images, JSON-LD and `og:image`), credit the source, and link back. Nothing is re-hosted. A category illustration replaces any missing or broken image. Alternative: illustrations only, with zero image licensing risk (section 3A legal context).

## Tech

**12. Sign-in.** Default: **no sign-in in v1.** The profile lives in localStorage. Sync is built behind `FEATURE_SYNC=false`, prepared for Google and Apple sign-in through Supabase Auth in its EU region, with passkeys after that. It turns on only when you add keys.

**13. Tech stack.** Default: **SvelteKit (static adapter) and TypeScript**, Vitest for unit tests, Playwright for 390×844 screenshots and end-to-end tests, MiniSearch for search, Node TypeScript scripts for the adapters. Svelte ships the least JavaScript for the 70 KB budget (section 5), and SvelteKit's router restores scroll position on back. Alternative: React with Vite.

**14. Hosting and data refresh.** Default: **Cloudflare Pages** (static, free tier) plus a **GitHub Actions** job every 6 hours that runs the adapters and publishes the event JSON. Tonight's build runs and is tested locally only. Deploy files are written, and nothing is deployed until you connect your GitHub and Cloudflare accounts.

**15. Project folder.** This research sits in a temporary folder the app made for this session. Deleting the session deletes it. Default: **move to a new git folder `~/IdeaProjects/MP/sanac`** (named after question 1). Alternative: the existing `~/IdeaProjects/MP/lv-event-watch` folder, which this session has not opened.

## Defaults that need no answer

These go into `DECISIONS.md` unless you object:
- Font Nunito, body text 18px, 16px floor, tap targets 48px or more (hamburger hit area 56px).
- Palette: background `#ECD8C0`, card `#FBF4EA`, ink `#101824`, primary carmine `#A3243A`, flag Pantone 201 C (about `#9D2235`). Dark mode follows the phone setting.
- Each event card shows the event's language (LV, RU, EN, LTG). 34.6% of adults speak Russian at home, and the UI stays Latvian.
- A "Bez maksas" filter on every list.
- No analytics and no cookie banner in v1.
