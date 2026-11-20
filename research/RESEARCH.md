# Research: Latvian event discovery app

Date: 2026-11-20. Seven research passes ran in parallel, one per topic. Each pass opened its sources and cites them inline. Claims seen only in search snippets carry the tag "(snippet, unverified)". Judgement calls carry "(opinion)". The sections hold about 26,000 words and 347 numbered sources.

Contents:

- [Summary: what the research supports](#summary-what-the-research-supports)
- [Conflicts between sections and the default chosen](#conflicts-between-sections-and-the-default-chosen)
- [Verification log](#verification-log)
- [1. Onboarding friction](#1-onboarding-friction)
- [2. Audience segments and personas](#2-audience-segments-and-personas)
- [3A. Event sources: national aggregators, ticket sellers, venues](#3a-event-sources-national-aggregators-ticket-sellers-venues)
- [3B. Event sources: cities, regions and niche communities](#3b-event-sources-cities-regions-and-niche-communities)
- [4. Recommendation logic, geodata and search](#4-recommendation-logic-geodata-and-search)
- [5. Accessibility, visual design and performance](#5-accessibility-visual-design-and-performance)
- [6. Latvian UI language](#6-latvian-ui-language)

Design reference images and their sampled colours are in [`design-refs/README.md`](../design-refs/README.md).

## Summary: what the research supports

### Onboarding (section 1)

- 3 skippable screens and zero tutorial screens. In an NN/g test (n=70), users who skipped tutorials reached 94% task success against 91%.
- No account at any point. 18% of shoppers abandon checkout over forced account creation (Baymard). Duolingo's deferred sign-up added about 20% daily active users.
- The location button opens the browser prompt only on tap, with a one-line reason. In context with a rationale, 92% granted access; upfront without one, 74% (Elbitar et al. 2021, n=473).
- Interest chips are ordered by popularity with no minimum. Skipping falls back to a popular, varied mix, as Netflix and TikTok do.
- Later questions come one per session at most, as a dismissible card. Section 1 lists 9 of them, each with a trigger.

### Audience (section 2)

- 72% of Latvians attended events in their own town or parish in 2024; 27% went to another region (Kultūras barometrs, n=1,050).
- Town and parish festivals are the top outing at 50%. The draft category list has no chip for them.
- Rīga holds 32.0% of residents, so it is the default city when onboarding is skipped.
- 34.6% of adults aged 18 to 69 speak Russian at home; Daugavpils is 46.7% Russian. Event cards should show the event's language.
- 47% of people aged 65 to 75 want more free events. A "Bez maksas" filter serves them.
- 87.3% of domestic trips last 1 to 3 nights. "Citur Latvijā" should favour Friday to Sunday.
- 17 personas with a summary table, including flea market, perfume, anime and gaming fans.

### Sources (sections 3A and 3B)

- Usable now without permission (robots.txt allows, terms do not forbid):
  - Fienta public API, 543 events with `country=LV`, no key.
  - Apollo Kino (JSON) and Forum Cinemas (XML) schedule feeds, one parser.
  - Live Riga HTML via sitemap, 289 events with ticket links and coordinates.
  - Daugavpils (JSON-LD and iCal) and Liepāja (JSON-LD).
  - WordPress event plugins on 6 sites, Dzintaru koncertzāle included.
  - KPanel CMS on 2 tourism sites (Jēkabpils, Bauska).
  - LNSO and Dailes teātris event JSON-LD.
- Usable only after written permission:
  - Biļešu Serviss (772 events, the main arena concert seller; terms 5.1 ban copying).
  - latvia.travel (terms allow non-commercial use only).
  - Ticketshop (terms 5.2).
  - Biļešu Paradīze (returns 403 to scripts).
  - 5 robots-blocked hosts (Rēzekne among them) and 4 Cloudflare-blocked hosts (Ventspils among them).
- 24 of 42 municipalities share one website platform, Rīga and Jūrmala included. One adapter could cover them all. The platform timed out from this machine, so its fields, robots.txt and terms are unverified.
- Big international concerts still get ticket links in v1: Live Riga detail pages link to the Biļešu Serviss event page.
- Closed or paid: Eventbrite, Bandsintown, Songkick, Resident Advisor, Facebook, Meetup.
- Niche events (markets, anime, board games, perfume workshops) have no feeds. Section 3B gives a 16-item seed list for manual entry.

### Ranking and search (section 4)

- Score: S = 0.30·D + 0.25·I + 0.15·F + 0.15·T + 0.10·P + 0.05·B, each term 0 to 1. The weights are starting values (opinion).
- Distance uses a log-logistic curve D = 1/(1+(d/d50)²). d50 is 4 km in Rīga, 8 km in state cities, 12 km in county towns and 20 km in villages.
- Date uses T = 0.5^(days/7) plus a weekend bonus. MMR with λ = 0.7 keeps the 3 cards varied.
- Reason labels name content or facts ("Piemērots ģimenēm", "Šovakar", "Bez maksas"). Labels built on average ratings scored below no explanation (Herlocker 2000).
- Search: MiniSearch 7.2.0, 5.9 KB gzipped. It passed 10 of 10 Latvian test queries at 0.37 ms per query on 5,000 events. NFD folding handles all 22 Latvian letters.
- Geodata: Rīga's 58 apkaimes and the VZD address register, both CC BY 4.0 on data.gov.lv.
- Dedup: compare events on the same date, within 200 m and 30 minutes. Merge at trigram similarity 0.5 or more. Keep every ticket link.

### Accessibility and design (section 5)

- The owner's ink `#101824` on beige `#ECD8C0` reaches 12.86:1. Long text goes on a lighter card `#FBF4EA` (16.32:1).
- `#ECD8C0` is nearly Latvijas Pasts' `--color-neutral-200` `#EDD8C1`. Pasts.lv uses blue `#0079BA` as primary, so carmine keeps the app distinct.
- Primary action colour: carmine `#A3243A` (5.28:1 as text on beige). Flag colour: Pantone 201 C, about `#9D2235`.
- Body text 18px with a 16px floor. Seniors succeeded on 55.3% of tasks against 74.5% and took 43% longer (NN/g).
- 75% of people tap with one thumb. The top-left hamburger keeps a 56 to 64 px hit area.
- Font: Nunito. It covers every Latvian letter and costs 74.6 KB. Fredoka lacks ā č ē ģ ī ķ ļ ņ ū.
- Budget: 170 KB critical path, 350 KB home total, LCP 2.0 s, TBT under 200 ms, CLS 0.05.

### Language (section 6)

- 18 of 22 Latvian consumer sites address the user as tu; 3 use jūs (SEB, Biļešu Serviss, Google).
- The Latvian norm writes time as `19.00`. The colon is allowed only as a technical sign (LVA Q400).
- The Latvian norm puts the euro sign after the amount with a no-break space: `12 €`, `No 8 €` (LVA Q472).
- Date labels take the nominative (`14. decembris`). Intl's short range `1.–31. dec.` matches the draft.
- Plurals have 3 forms: `1 pasākums`, `2 pasākumi`, `0 pasākumu` (and 11 to 20).
- "Nišas" reads as a wall recess. "Hobiji" replaces it.
- 9 of 10 name candidates have a free `.lv` domain. Brigadere's "Sprīdītis" text has been public domain since 1 January 2004.

## Conflicts between sections and the default chosen

| Topic | One source says | Another says | Default until answered |
|---|---|---|---|
| "Tuvumā" radius | Section 2: hard radius 10 km in Rīga, Jūrmala and Pierīga, 30 km elsewhere, widen to 60 km below 3 matches | Section 4: smooth decay with d50 of 4 to 20 km and a score floor of 0.5 | Section 2's radius picks the candidates. Section 4's decay orders them. In Rīga the user's own apkaime comes first. |
| Kids' age chips | Section 1: 5 chips (0 to 2, 3 to 5, 6 to 8, 9 to 12, 13 to 17) | Section 2: 3 bands from Eurostat (0 to 5, 6 to 11, 12 to 17) | 3 chips by Latvian school stage: 0 to 6, 7 to 12, 13 to 17 (opinion). See QUESTIONS.md. |
| Category list | The brief: 11 categories | Section 2 adds "Svētki" and splits "Anime un spēles". Section 6 renames 5. | 12 categories, see QUESTIONS.md. |
| Time format | The brief: `19:00` | LVA norm: `19.00` | Owner's choice, see QUESTIONS.md. |
| Price format | The brief: `€12`, `No €8` | LVA norm: `12 €`, `No 8 €` | Owner's choice, see QUESTIONS.md. |
| Capital T in Tu | The brief writes "Tu" | LVA ties capitals to letters. Section 6 recommends lowercase in UI. | Owner's choice, see QUESTIONS.md. |
| Body text size | The brief: at least 16px | Section 5: 18px body, 16px floor | 18px body, 16px for secondary text. |
| Apollo Kino history | The research prompt said "formerly Forum Cinemas" | Section 3A: they are separate operators | Section 3A is right. The prompt was wrong. |

## Verification log

Spot-checks run from the main session on 2026-11-20, all confirmed:

- The Fienta API with `country=LV` returns 543 events. Its fields include organiser email and phone, which the adapter must drop.
- Live Riga shows "Rezultāti 1-24 no 289", and its robots.txt says `Allow: /`.
- Apollo Kino `/xml/Schedule` returns JSON with UTC show times.
- Biļešu Serviss terms clause 5.1 forbids copying and publishing its data.
- LVA answers Q400 (time with a period), Q472 (currency after the amount) and Q964 (capital Tu and Jūs in letters) match section 6.

Hosts unreachable from this machine (TLS timeout): the shared municipal platform at 212.70.163.179 (riga.lv, ogresnovads.lv and 22 more), stat.gov.lv, likumi.lv and some other gov.lv sites. CSP figures therefore come from Web Archive copies, Eurostat and data.gov.lv. The built-in browser also failed to open ogresnovads.lv.

---

## 1. Onboarding friction

### Key findings

- Field count predicts abandonment better than step count. The average 2024 checkout has 11.3 fields where 8 suffice ([Baymard 2024](https://baymard.com/blog/checkout-flow-average-form-fields)). Twitter added a topic step in 2010 and completions rose 29% ([Wroblewski 2010](https://articles.centercentre.com/?p=223)).
- Forced accounts are the largest avoidable wall. 18% of US shoppers abandoned a checkout because "the site wanted me to create an account" ([Baymard 2026](https://baymard.com/lists/cart-abandonment-rate)). Duolingo moved sign-up behind the first lesson and saw "about a 20% increase in DAUs" ([First Round Review 2017](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)).
- Instructional screens add cost and no benefit. In an NN/g test (n=70, 4 apps), the group that skipped tutorials had 94% task success versus 91%, and rated tasks easier (5.49 versus 4.92 of 7) ([Kendrick 2020b](https://www.nngroup.com/articles/mobile-tutorials/)).
- Choice overload is conditional, and new users meet its main condition. The 2010 meta-analysis (50 experiments, N=5,036) found a mean effect near zero ([Scheibehenne et al. 2010](https://edoc.unibas.ch/48789)). The 2015 meta-analysis (99 observations, N=7,202) found a reliable effect once preference uncertainty and task difficulty are high ([Chernev et al. 2015](https://www.kellogg.northwestern.edu/academics-research/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual/)).
- Popular items first cut elicitation effort by 3.7 times. In MovieLens (351 new users, 2002), popularity-ordered items needed 1.9 pages to collect 10 ratings versus 7.0 for the random baseline, and dropout fell from 21% to 11% ([Rashid et al. 2002](https://cs.fit.edu/~pkc/apweb/related/rashid-iui02.pdf)).
- Permission timing and an explanation change grant rates. In a 473-person study, permissions asked upfront without a rationale were granted 74% of the time, versus 92% in context with a rationale ([Elbitar et al. 2021](https://www.usenix.org/system/files/sec21-elbitar.pdf)).
- Peer apps ask little and fall back to popular content. Netflix makes its title picks optional and serves a "diverse and popular set" when skipped ([Netflix Help](https://help.netflix.com/en/node/100639)). TikTok serves "a generalized feed of popular videos" when no categories are picked ([TikTok 2020](https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you/)).
- Age changes speed and choice tolerance. Seniors (65+) were 43% slower and succeeded on 55.3% of tasks versus 74.5% for ages 21 to 55 ([Nielsen 2013](https://www.nngroup.com/articles/usability-seniors-improvements/)). Children and seniors suffer fewer overload effects than teens and adults ([Misuraca et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11111947/)).
- Each added tour step costs completion. Chameleon's 2023 data (nearly 300 million interactions) shows 33.5% average tour completion and 21.6% for five-step tours ([Chameleon 2024](https://www.chameleon.io/benchmark-report-24)).

### 1.1 Question count versus drop-off

Baymard's 2024 benchmark counts 5.1 checkout steps and 11.3 fields, and says field count matters more than step count ([Baymard 2024](https://baymard.com/blog/checkout-flow-average-form-fields)). In its abandonment survey, 18% cite forced account creation and 17% a long checkout. Survey year and sample size are not stated ([Baymard 2026](https://baymard.com/lists/cart-abandonment-rate)).

HubSpot's analysis of over 40,000 landing pages found conversion fell "slightly" per added field, with larger drops for multiple drop-downs and text areas ([Zarrella, HubSpot](https://blog.hubspot.com/blog/tabid/6307/bid/6746/Which-Types-of-Form-Fields-Lower-Landing-Page-Conversions.aspx)). Zuko finds form length "makes almost no difference" to completion. Its onboarding forms convert at 35.33% on mobile versus 50.8% on desktop ([Zuko 2025](https://zuko.io/blog/8-surprising-insights-from-zukos-benchmarking-data)). Formisimo field-level data: not found.

Gradual engagement lets people use a service and collects details only when needed ([Wroblewski 2008](https://alistapart.com/article/signupforms/)). Twitter's 2010 topic step raised completions 29% despite adding a screen ([Wroblewski 2010](https://articles.centercentre.com/?p=223)). Pinterest reportedly raised completion 11% by adding a gender step (snippet, unverified). A question that visibly improves the next screen can raise completion.

NN/g calls content customization appropriate at first launch. It asks for a "highly visible Skip option" and for deferring data that launch cannot justify ([Kendrick 2020a](https://www.nngroup.com/articles/mobile-app-onboarding/)).

AppsFlyer's Q3 2024 data (11,000 apps, 10.6 billion installs) shows Day 1 retention of 23.9% on iOS and 20.3% on Android ([Getstream 2026, citing AppsFlyer](https://getstream.io/blog/app-retention-guide/)). PWA retention benchmarks: not found. A dataset of loss per extra onboarding screen: not found. Pendo and Mixpanel onboarding-length benchmarks: not found.

### 1.2 Choice overload and options per screen

The jam study showed 24 jams drew 60% of passers-by and 6 jams drew 40%. Buyers were 3% at the large display and 30% at the small one ([Misuraca et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11111947/), describing Iyengar & Lepper 2000). Chernev et al. named four moderators: choice set complexity, task difficulty, preference uncertainty and an effort-minimizing goal ([Chernev et al. 2015](https://www.kellogg.northwestern.edu/academics-research/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual/)). A first-time user has both preference uncertainty and an effort-minimizing goal.

Bollen et al. compared Top-5 and Top-20 recommendation sets. Larger attractive sets did not raise satisfaction, because choice difficulty and search time rose with attractiveness ([Bollen et al. 2010](https://research.tue.nl/en/publications/understanding-choice-overload-in-recommender-systems/)). Participant count: not found in the abstract. This supports the 1 to 3 plus 3 home layout.

The Hick-Hyman law grows decision time with log2(n+1) for familiar options. Scanning an unfamiliar list costs linear time, and the law "does not apply" ([Wikipedia, Hick's law](https://en.wikipedia.org/wiki/Hick's_law)). Eleven familiar words with icons stay cheap. Eleven vague labels do not.

Peer apps:

| App | What it asks | Count | Source |
|---|---|---|---|
| Netflix | Titles you like, optional | "a few" | [Netflix Help](https://help.netflix.com/en/node/100639) |
| Spotify | Artists you like | "five or more" (2018) | [Spotify Newsroom](https://newsroom.spotify.com/tag/taste-onboarding/) |
| TikTok | Categories of interest, e.g. pets, travel | not stated | [TikTok 2020](https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you/) |
| Duolingo | Source, reason, level, daily goal, start point | 5 screens with 10, 7, 5, 4 and 2 options | [Screenrove 2026](https://screenrove.com/duolingo/flows) |
| Pinterest | Topics for the home feed | not verified | (snippet, unverified) |
| Reddit | Topics at account creation | not verified | (snippet, unverified) |

A study that sets the best number of interest chips on one mobile screen: not found. Rashid et al. used pages of 10 items per screen ([Rashid et al. 2002](https://cs.fit.edu/~pkc/apweb/related/rashid-iui02.pdf)). Duolingo's largest single-choice screen has 10 options ([Screenrove 2026](https://screenrove.com/duolingo/flows)). Both sit near the 11 draft categories.

### 1.3 Skip rates and the location permission

A cross-app rate for skipped optional onboarding: not found. NN/g states that "users frequently skip" tutorials and recommends help shown when context signals need ([Laubheimer 2023](https://www.nngroup.com/articles/onboarding-tutorials/)). Self-triggered tours complete at 64% in Chameleon's data, against 33.5% for all tours ([Chameleon 2024](https://www.chameleon.io/benchmark-report-24)).

Browser prompts are mostly ignored. In Chrome's Windows data, users allowed 6.69% of notification prompts, blocked 9.20%, dismissed 35.76% and ignored 47.19% ([Chrome Developers 2022](https://developer.chrome.com/blog/permissions-chip)). A geolocation grant rate for Chrome: not found. Geolocation is Chrome's second most requested permission. Chrome's model picks the prompt UI for 24% of desktop geolocation prompts and quiets 81% of those, and sites with the lowest grant rates get the quietest UI ([Harbach et al. 2024a](https://www.ndss-symposium.org/wp-content/uploads/2024-108-paper.pdf)). In 25,706 experience-sampling responses, contextual information from the site was associated with allowing access ([Harbach et al. 2024b](https://research.google/pubs/websites-need-your-permission-too-user-sentiment-and-decision-making-on-web-permission-prompts-in-desktop-chrome/)).

Elbitar et al. tested timing and rationale on about 1,800 requests. In-context requests raised grant odds 1.48 times, and rationales raised them 2.73 times ([Elbitar et al. 2021](https://www.usenix.org/system/files/sec21-elbitar.pdf)). 70% of 2,569 permission requests in top Google Play apps were still shown upfront ([Elbitar et al. 2021](https://www.usenix.org/system/files/sec21-elbitar.pdf)).

Platform guidance agrees. Apple says "Avoid requesting permission at launch unless the data or resource is required." A custom pre-prompt screen gets one button labelled "Continue" or "Next", never "Allow" ([Apple HIG, Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy)). Android's approximate location is accurate to about 3 square kilometres, and apps must still work with it ([Android Developers](https://developer.android.com/training/location/permissions)). That is precise enough to rank "Tuvumā" (opinion). web.dev calls a permission request on landing "the worst thing you can do" and recommends a custom pre-prompt before the browser dialog ([Gaunt, web.dev](https://web.dev/articles/push-notifications-permissions-ux)).

### 1.4 Progressive profiling

Marketo shows queued fields only while they are blank. Its documented example reveals 1 new blank field per return visit ([Adobe Marketo](https://experienceleague.adobe.com/en/docs/marketo/using/product-docs/demand-generation/forms/form-actions/configure-form-progressive-profiling)). HubSpot shows a queued field only if it was never answered, in legacy forms only ([HubSpot KB](https://knowledge.hubspot.com/forms/use-progressive-fields-in-forms)).

Recommender research supports asking about items users can answer. Rashid et al. compared strategies on 351 new MovieLens users over 10 days ([Rashid et al. 2002](https://cs.fit.edu/~pkc/apweb/related/rashid-iui02.pdf)):

| Strategy | Users | Dropouts | Mean pages to 10 ratings |
|---|---|---|---|
| Popularity | 91 | 10 (11%) | 1.9 |
| Item-item (personalized) | 92 | 10 (11%) | 2.3 |
| log Pop*Ent | 92 | 13 (14%) | 4.0 |
| Classique (mostly random) | 76 | 16 (21%) | 7.0 |

Elahi, Ricci and Rubens survey such "active learning" strategies and note that the value of each answer varies ([Elahi et al. 2016](https://bia.unibz.it/esploro/outputs/journalArticle/A-survey-of-active-learning-in/991006479696201241)). Netflix states that later engagement will "supersede" initial picks ([Netflix Help](https://help.netflix.com/en/node/100639)).

Duolingo's deferred sign-up uses "soft walls" with a "Later" button before one hard wall. Wall tuning added 8.2% DAUs, and hard walls did worse without soft walls first ([First Round Review 2017](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)).

### 1.5 Age: children 10 to 12, teens, adults 65+

- Children. NN/g tested 125 children aged 3 to 12, treats 9 to 12 as a separate "older" group, and found children type slowly and skip long instructions ([Sherwin & Nielsen 2019](https://www.nngroup.com/articles/childrens-websites-usability-issues/)).
- Teens. NN/g tested 100 teens aged 13 to 17. Teens are impatient, read less, and hesitate to enter personal information ([Kendrick & Nielsen 2019](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/)). NN/g calls the word "kid" a teen repellent and advises against drop-downs and small buttons on mobile ([Kendrick & Nielsen 2019](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/)). A family option labelled "Ar bērniem" fits. A "Bērniem" label aimed at teen users does not (opinion).
- Seniors. In 2013, 31 seniors took 7 min 49 s per task versus 5 min 28 s for 20 younger users. Seniors were nearly twice as likely to quit a task ([Nielsen 2013](https://www.nngroup.com/articles/usability-seniors-improvements/)). NN/g's later work (123 participants aged 65+, oldest 89) flags small, light text and small tap targets ([Kane 2019](https://www.nngroup.com/articles/usability-for-senior-citizens/)).
- Choice load by age. Misuraca et al. (2016) found adolescents suffer from large assortments like adults, while children and seniors suffer fewer negative effects ([Misuraca et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11111947/)).

### Recommended 3-screen skippable onboarding

Each screen shows "Izlaist" top right, a progress indicator ("1/3"), and a "Tālāk" button in the thumb zone. No text input, no drop-downs, no minimum selection.

| # | Question (UI) | Options | Layout | Default when skipped |
|---|---|---|---|---|
| 1 | "Kur meklēt pasākumus?" | 1 button "Izmantot manu atrašanās vietu" (opens the browser prompt only on tap, with a one-line reason above it) plus 6 to 8 city chips (largest cities, to be confirmed against population data) plus "Cita vieta" search | Full-width button, then 2-column chips | No city. "Tuvumā" shows the city chips inline as its own content. "Citur Latvijā" shows popular events nationwide |
| 2 | "Ar ko tu parasti ej?" | 4 multi-select buttons: "Viens pats", "Ar draugiem", "Ar partneri", "Ar bērniem". Choosing "Ar bērniem" reveals 5 age chips: "0-2", "3-5", "6-8", "9-12", "13-17" | 4 large stacked buttons, age chips appear inline | No companion weighting. "Ģimenēm" is neither boosted nor hidden |
| 3 | "Kas tevi interesē?" | 11 multi-select chips: Ēdiens, Zemnieku tirdziņi, Blusu tirgi, Koncerti, Ģimenēm, Ko redzēt, Teātris, Festivāli, Sports, Darbnīcas, Nišas | 2-column grid, icon plus 1 to 2 words, all visible without scrolling, ordered by expected popularity | Popular and varied mix across categories, the Netflix and TikTok fallback |

The age chips follow NN/g's 3 to 5, 6 to 8 and 9 to 12 groups, plus toddlers and teens. "Nišas" fails the familiar-label test of section 1.2 and needs a 5-user label test (opinion).

### Progressive questions after onboarding

Rules: one question per session at most, shown as a dismissible card in the feed with "Vēlāk". After two dismissals of one question, wait 30 days (opinion). The one-per-visit rule follows Marketo's 1-blank-field example ([Adobe Marketo](https://experienceleague.adobe.com/en/docs/marketo/using/product-docs/demand-generation/forms/form-actions/configure-form-progressive-profiling)).

| # | Question | Trigger | Reason |
|---|---|---|---|
| 1 | "Rādīt, kas notiek tieši tev blakus?" then the browser location prompt | First tap on the "Tuvumā" header, a distance label or "Kā nokļūt", when no GPS location is stored | In context with a rationale: 92% versus 74% grant ([Elbitar et al. 2021](https://www.usenix.org/system/files/sec21-elbitar.pdf)) |
| 2 | "Cik veci ir bērni?" (5 age chips) | 3rd event opened in Ģimenēm with no ages stored | Asked once family intent is shown ([Kendrick 2020a](https://www.nngroup.com/articles/mobile-app-onboarding/)) |
| 3 | "Cik tālu esi gatavs braukt?" (līdz 30 min, līdz 1 h, līdz 2 h, visa Latvija) | 2nd event opened from "Citur Latvijā" | Sets the radius for that block from shown intent (opinion) |
| 4 | "Kad tev parasti ir laiks?" (darbdienu vakari, sestdiena, svētdiena, jebkad) | 3rd session, or first use of a date filter | Time fit filters the 1 to 3 "Tuvumā" slots (opinion) |
| 5 | "Cik esi gatavs maksāt?" (tikai bezmaksas, līdz 10 €, līdz 30 €, nav svarīgi) | 3rd opened event with a ticket price, or first tap on a price filter | Helps only once paid events appear (opinion) |
| 6 | Sub-category chips, 4 to 6 (e.g. Koncerti: klasika, roks, džezs, tautas mūzika) | 3rd event opened in one category | Personalized item choice cut effort 2.3 versus 7.0 pages ([Rashid et al. 2002](https://cs.fit.edu/~pkc/apweb/related/rashid-iui02.pdf)) |
| 7 | "Rādīt mazāk: Sports?" (jā, nē) | Cards of one category passed without a tap in 3 sessions | Behaviour should override first picks ([Netflix Help](https://help.netflix.com/en/node/100639)) |
| 8 | "Atgādināt dienu iepriekš?" then the browser notification prompt | First tap on "Saglabāt" or "Atgādināt" on an event | Chrome users allowed 6.69% of notification prompts ([Chrome Developers 2022](https://developer.chrome.com/blog/permissions-chip)) |
| 9 | "Pievienot sākuma ekrānam?" | 2nd visit within 7 days with at least 1 event opened | Soft wall with "Vēlāk", Duolingo's pattern ([First Round Review 2017](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)) |

### Implications for v1

- Keep exactly 3 customization screens and zero tutorial or feature-tour screens ([Kendrick 2020b](https://www.nngroup.com/articles/mobile-tutorials/)).
- Make every screen skippable, and make skipping all three land on a useful home screen within one tap.
- Never call the geolocation API on page load. Use a user-tapped button with a one-line reason, and keep a city picker as the fallback ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/privacy)).
- Order interest chips and fallback content by popularity ([Rashid et al. 2002](https://cs.fit.edu/~pkc/apweb/related/rashid-iui02.pdf)).
- Use large chips with icons and no typing, so ages 10 to 12 and 65+ can finish ([Nielsen 2013](https://www.nngroup.com/articles/usability-seniors-improvements/)).
- Treat onboarding answers as a prior that clicks override. Log each answer with a timestamp in localStorage so the ranking rules can decay it.
- Instrument per-screen skip and completion. No public benchmark for a no-account PWA was found.

### Sources

1. "Cart Abandonment Rate: 50 Statistics & Why People Abandon (2026)", Baymard Institute (Richard Lam), 2026, https://baymard.com/lists/cart-abandonment-rate, accessed 2026-11-20.
2. "Checkout Optimization: 5 Ways to Minimize Form Fields in Checkout", Baymard Institute (Edward Scott), 2024, https://baymard.com/blog/checkout-flow-average-form-fields, accessed 2026-11-20.
3. "Mobile-App Onboarding: An Analysis of Components and Techniques" (Kendrick 2020a), Nielsen Norman Group, 2020, https://www.nngroup.com/articles/mobile-app-onboarding/, accessed 2026-11-20.
4. "Mobile Tutorials: Wasted Effort or Efficiency Boost?" (Kendrick 2020b), Nielsen Norman Group, 2020, https://www.nngroup.com/articles/mobile-tutorials/, accessed 2026-11-20.
5. "Onboarding Tutorials vs. Contextual Help" (Laubheimer), Nielsen Norman Group, 2023, https://www.nngroup.com/articles/onboarding-tutorials/, accessed 2026-11-20.
6. "Sign Up Forms Must Die" (Wroblewski), A List Apart, 2008, https://alistapart.com/article/signupforms/, accessed 2026-11-20.
7. "Gradual Engagement Boosts Twitter Sign-Ups by 29%" (Wroblewski), Center Centre (originally LukeW, 2010), 2010, https://articles.centercentre.com/?p=223, accessed 2026-11-20.
8. "Which Types of Form Fields Lower Landing Page Conversions?" (Zarrella), HubSpot, updated 2025, https://blog.hubspot.com/blog/tabid/6307/bid/6746/Which-Types-of-Form-Fields-Lower-Landing-Page-Conversions.aspx, accessed 2026-11-20.
9. "8 surprising insights from Zuko's benchmarking data", Zuko, 2025, https://zuko.io/blog/8-surprising-insights-from-zukos-benchmarking-data, accessed 2026-11-20.
10. "The Chameleon Benchmark Report 2024", Chameleon, 2024, https://www.chameleon.io/benchmark-report-24, accessed 2026-11-20.
11. "2026 Guide to App Retention" (cites AppsFlyer 2025 retention benchmarks), Stream, 2026, https://getstream.io/blog/app-retention-guide/, accessed 2026-11-20.
12. Misuraca et al., "On the advantages and disadvantages of choice: future research directions in choice overload and its moderators", Frontiers in Psychology, 2024, https://pmc.ncbi.nlm.nih.gov/articles/PMC11111947/, accessed 2026-11-20.
13. Scheibehenne, Greifeneder & Todd, "Can there ever be too many options? A meta-analytic review of choice overload", University of Basel repository, 2010, https://edoc.unibas.ch/48789, accessed 2026-11-20.
14. Chernev, Böckenholt & Goodman, "When Product Assortment Leads to Choice Overload: A Conceptual Review and Meta-Analysis", Kellogg School of Management, 2015, https://www.kellogg.northwestern.edu/academics-research/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual/, accessed 2026-11-20.
15. Bollen, Knijnenburg, Willemsen & Graus, "Understanding choice overload in recommender systems", TU Eindhoven research portal (RecSys 2010), 2010, https://research.tue.nl/en/publications/understanding-choice-overload-in-recommender-systems/, accessed 2026-11-20.
16. "Hick's law", Wikipedia, 2026, https://en.wikipedia.org/wiki/Hick's_law, accessed 2026-11-20.
17. Rashid et al., "Getting to Know You: Learning New User Preferences in Recommender Systems", IUI 2002 (PDF hosted by Florida Tech), 2002, https://cs.fit.edu/~pkc/apweb/related/rashid-iui02.pdf, accessed 2026-11-20.
18. Elahi, Ricci & Rubens, "A survey of active learning in collaborative filtering recommender systems", Computer Science Review (unibz repository), 2016, https://bia.unibz.it/esploro/outputs/journalArticle/A-survey-of-active-learning-in/991006479696201241, accessed 2026-11-20.
19. "How Netflix's Recommendations System Works", Netflix Help Center, n.d., https://help.netflix.com/en/node/100639, accessed 2026-11-20.
20. "Taste onboarding" tag page (article of 2018-08-27), Spotify Newsroom, 2018, https://newsroom.spotify.com/tag/taste-onboarding/, accessed 2026-11-20.
21. "How TikTok recommends videos #ForYou", TikTok Newsroom, 2020, https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you/, accessed 2026-11-20.
22. "Duolingo Onboarding Flow", Screenrove (capture of 2026-09-24), 2026, https://screenrove.com/duolingo/flows, accessed 2026-11-20.
23. "The Tenets of A/B Testing from Duolingo's Master Growth Hacker", First Round Review, 2017, https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker, accessed 2026-11-20.
24. "Use progressive fields in forms", HubSpot Knowledge Base, 2026, https://knowledge.hubspot.com/forms/use-progressive-fields-in-forms, accessed 2026-11-20.
25. "Configure Form Progressive Profiling", Adobe Experience League (Marketo Engage), n.d., https://experienceleague.adobe.com/en/docs/marketo/using/product-docs/demand-generation/forms/form-actions/configure-form-progressive-profiling, accessed 2026-11-20.
26. "Permissions request chip" (Steiner), Chrome for Developers, updated 2022, https://developer.chrome.com/blog/permissions-chip, accessed 2026-11-20.
27. Harbach et al., "Don't Interrupt Me: A Large-Scale Study of On-Device Permission Prompt Quieting in Chrome" (Harbach et al. 2024a), NDSS Symposium, 2024, https://www.ndss-symposium.org/wp-content/uploads/2024-108-paper.pdf, accessed 2026-11-20.
28. "Websites Need Your Permission Too: User Sentiment and Decision Making on Web Permission Prompts in Desktop Chrome" (Harbach et al. 2024b), Google Research (CHI 2024), 2024, https://research.google/pubs/websites-need-your-permission-too-user-sentiment-and-decision-making-on-web-permission-prompts-in-desktop-chrome/, accessed 2026-11-20.
29. Elbitar et al., "Explanation Beats Context: The Effect of Timing & Rationales on Users' Runtime Permission Decisions", USENIX Security 2021, 2021, https://www.usenix.org/system/files/sec21-elbitar.pdf, accessed 2026-11-20.
30. "Privacy", Apple Human Interface Guidelines, n.d., https://developer.apple.com/design/human-interface-guidelines/privacy, accessed 2026-11-20.
31. "Request location permissions", Android Developers, n.d., https://developer.android.com/training/location/permissions, accessed 2026-11-20.
32. "Permission UX" (Gaunt), web.dev, n.d., https://web.dev/articles/push-notifications-permissions-ux, accessed 2026-11-20.
33. "Children's UX: Usability Issues in Designing for Young People" (Sherwin & Nielsen), Nielsen Norman Group, 2019, https://www.nngroup.com/articles/childrens-websites-usability-issues/, accessed 2026-11-20.
34. "Teenager's UX: Designing for Teens" (Kendrick & Nielsen), Nielsen Norman Group, 2019, https://www.nngroup.com/articles/usability-of-websites-for-teenagers/, accessed 2026-11-20.
35. "Usability for Senior Citizens: Improved, But Still Lacking" (Nielsen), Nielsen Norman Group, 2013, https://www.nngroup.com/articles/usability-seniors-improvements/, accessed 2026-11-20.
36. "Usability for Older Adults: Challenges and Changes" (Kane), Nielsen Norman Group, 2019, https://www.nngroup.com/articles/usability-for-senior-citizens/, accessed 2026-11-20.


---

## 2. Audience segments and personas

### Key findings

- Rīga holds 595,053 of Latvia's 1,860,565 residents (32.0%) on 1 January 2025; 30.3% live in rural areas ([CSP Demogrāfija 2025](http://web.archive.org/web/20261116211439/https://stat.gov.lv/system/files/publication/2025-10/Nr_04_Demografija_2025_%2825_00%29_LV_6.pdf)). The total fell to 1.845 million in 2026 ([CSP, 2026](http://web.archive.org/web/20261020013600/https://stat.gov.lv/lv/statistikas-temas/iedzivotaji/iedzivotaju-skaits/preses-relizes/27583-iedzivotaju-skaita-izmainas)).
- People go out near home. In 2024, 72% attended events in their own town or parish, 35% in their region and 27% in another region (n=1,050, ages 15 to 75) ([Kultūras aktivitātes barometrs 2024](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).
- The top outing is a town or parish festival (50%), then popular music concerts (34%) ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)). The draft category list has no chip for local festivals.
- Age cuts attendance. In 2022, 40.2% of people aged 16 to 24 skipped cinema, live shows and cultural sites, against 74.3% at 65 to 74 ([Eurostat ilc_scp03](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_scp03?geo=LV&geo=EU27_2020&time=2022&isced11=TOTAL&sex=T&frequenc=NM12&unit=PC)).
- Place cuts it too. Non-participation among couples with children is 27.7% in cities and 66.8% in rural areas ([Eurostat ilc_scp04](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_scp04?geo=LV&time=2022&frequenc=NM12&unit=PC&acl00=AC52A)).
- 68.6% of people aged 65 to 74 used the internet on a smartphone in 2025 ([Eurostat isoc_ci_dev_i](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/isoc_ci_dev_i?geo=LV&time=2025&unit=PC_IND&indic_is=I_IUG_MP)). 47% of people aged 65 to 75 want more free events ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).
- 34.6% of adults aged 18 to 69 speak Russian at home (2022, sample 8,764) ([CSP](http://web.archive.org/web/20261003083505/https://stat.gov.lv/lv/statistikas-temas/izglitiba-kultura-zinatne/izglitibas-limenis/preses-relizes/21052-dzimta-un-majas)). Daugavpils is 46.7% Russian and 21.4% Latvian ([Liepāja overview, CSP data](https://faili.liepaja.lv/Bildes/Dokumenti/Dokumentu-biblioteka/Statistika/Soc_ek/Iedzivotaji.pdf)).
- Residents made 3.14 million domestic overnight trips in 2025; 87.3% lasted 1 to 3 nights, at €68.24 per short trip ([Eurostat tour_dem_tttot](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tour_dem_tttot?geo=LV&sinceTimePeriod=2023&c_dest=DOM&c_dest=WORLD&purpose=TOTAL&purpose=PER), [tour_dem_extot](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tour_dem_extot?geo=LV&sinceTimePeriod=2023&c_dest=DOM&purpose=TOTAL&expend=TOTXDUR)).
- 218,400 of 888,000 households (24.6%) have dependent children. The youngest child is under 6 in 81,600, aged 6 to 11 in 75,900 and 12+ in 60,900 ([Eurostat lfst_hhnhtych](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfst_hhnhtych?geo=LV&time=2025)).

### Where people live and how old they are

State city populations on 1 January 2025: Rīga 595,053; Daugavpils 78,126; Liepāja 67,421; Jelgava 54,834; Jūrmala 52,001; Ventspils 32,723; Rēzekne 26,429; Valmiera 22,812. Rīga region (Rīga, Jūrmala, 7 municipalities) holds 850,455 ([CSP Demogrāfija 2025](http://web.archive.org/web/20261116211439/https://stat.gov.lv/system/files/publication/2025-10/Nr_04_Demografija_2025_%2825_00%29_LV_6.pdf)). Cēsu novads had 41,324 people. Cēsis town had about 15,000 in the CSP experimental geospatial estimate; the town code LV0026200 is inferred from the code structure ([CSP RIG010 via data.gov.lv](https://data.gov.lv/dati/dataset/ac38cc49-fb8c-492f-817b-4595a3576c04/resource/83da473d-68e1-4120-93f4-817bafce88a2/download/rig010_01.csv)).

Age groups in 2025: 10 to 14: 99,243 (5.3%); 15 to 24: 189,300 (10.2%); 25 to 44: 476,381 (25.6%); 45 to 64: 507,179 (27.3%); 65+: 406,827 (21.9%) ([Eurostat demo_pjangroup](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjangroup?geo=LV&sex=T&time=2025&unit=NR)). Seniors reached 22.4% in 2026: 25.3% in Latgale, 25.5% in Daugavpils. Mārupe has the most children, 24.7% ([CSP, 2026](http://web.archive.org/web/20261020013600/https://stat.gov.lv/lv/statistikas-temas/iedzivotaji/iedzivotaju-skaits/preses-relizes/27583-iedzivotaju-skaita-izmainas)). Among state cities, Jelgava (17.1%) and Valmiera (17.0%) have the highest child share and Daugavpils the lowest (13.6%) ([Liepāja overview](https://faili.liepaja.lv/Bildes/Dokumenti/Dokumentu-biblioteka/Statistika/Soc_ek/Iedzivotaji.pdf)). Half of households (440,600) are one adult ([Eurostat](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfst_hhnhtych?geo=LV&time=2025)).

### Phones, income and travel

Internet use in 2025: 99.5% at 16 to 24, 91.9% at 55 to 64, 80.6% at 65 to 74 ([Eurostat isoc_ci_ifp_iu](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/isoc_ci_ifp_iu?geo=LV&time=2025&unit=PC_IND)). Smartphone internet use: 98.9%, 83.6% and 68.6% for the same groups ([Eurostat](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/isoc_ci_dev_i?geo=LV&time=2025&unit=PC_IND&indic_is=I_IUG_MP)). Social network use: 94.1% at 16 to 24, 53.0% at 65 to 74 ([Eurostat isoc_ci_ac_i](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/isoc_ci_ac_i?geo=LV&time=2025&unit=PC_IND&indic_is=I_IUSNET&indic_is=I_IUBK&indic_is=I_IUOLC)). Sample sizes: not stated in the tables.

Disposable income per household member in 2024: €950 nationally, €1,135 in Rīga region (€1,090 in the city), €866 Zemgale, €816 Kurzeme, €800 Vidzeme, €673 Latgale, €625 in pensioner households ([CSP, 2025](http://web.archive.org/web/20260221082934/https://stat.gov.lv/lv/statistikas-temas/iedzivotaji/monetara-nabadziba-nevienlidziba-un-sociala-atstumtiba/preses-23)). Latvia had 435 cars per 1,000 people in 2025; the EU had 584 ([Eurostat road_eqs_carhab](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/road_eqs_carhab?geo=LV&geo=EU27_2020&sinceTimePeriod=2023)). Car ownership by region and same-day domestic trips: not found.

### Who goes out, by age, income and place

- Non-participation in cultural activities, 2022: 40.2% at 16 to 24, 42.8% at 25 to 34, 51.4% at 35 to 49, 62.9% at 50 to 64, 59.9% overall. 87.6% attended no live sports ([Eurostat ilc_scp03](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_scp03?geo=LV&geo=EU27_2020&time=2022&isced11=TOTAL&sex=T&frequenc=NM12&unit=PC)). EU-SILC 2022 still reflects post-pandemic recovery.
- Lowest income quintile 79.5%, highest 35.9%. Cities 52.5%, rural areas 71.6% ([Eurostat ilc_scp04](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_scp04?geo=LV&time=2022&frequenc=NM12&unit=PC&acl00=AC52A)).
- 20.9% of rural cinema non-goers say no cinema is nearby; 5.7% in cities ([Eurostat ilc_scp06](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_scp06?geo=LV&time=2022&unit=PC)).
- In 2024, 21% attended no event: 41% at 65 to 75, 30% of non-Latvian speakers at home, 38% of people living alone, 27% in Latgale. 46% attended something in Rīga; other state cities drew 10% or less. 29% buy tickets online ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).
- Seniors learn about events from Latvijas Radio 1, culture-house posters, venue and municipality Facebook pages, local papers and family; they coordinate in WhatsApp groups. Children organise outings for 22% of people aged 65 to 75 ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).
- Latvians cite fewer barriers than the EU: lack of time 37% (EU 45%), distance 21% (EU 34%), lack of information 11% (EU 22%) (Special Eurobarometer 562, February to April 2025) ([European Commission](https://catalogus.boekman.nl/pub/barometer_europeansattitudeculture2025.pdf)).

### Language

62.0% of adults speak Latvian at home and 34.6% Russian; 8.8% of Latgale residents speak Latgalian ([CSP](http://web.archive.org/web/20261003083505/https://stat.gov.lv/lv/statistikas-temas/izglitiba-kultura-zinatne/izglitibas-limenis/preses-relizes/21052-dzimta-un-majas)). Russians made up 34.4% of Rīga, 40.4% of Rēzekne and 46.7% of Daugavpils in early 2025 ([Liepāja overview](https://faili.liepaja.lv/Bildes/Dokumenti/Dokumentu-biblioteka/Statistika/Soc_ek/Iedzivotaji.pdf)). City-level home-language data newer than the 2011 census: not found.

### Recurring events checked for 2025 to 2027

- Staro Rīga: 15 to 18 November 2026 ([staroriga.lv](https://staroriga.lv/en/home/)); 2025 ran 15 to 18 November (snippet, unverified).
- Vecrīgas Ziemassvētku tirdziņš, Doma laukums: 27 November 2026 to 3 January 2027 ([vzt.lv](https://vzt.lv/en/)).
- Rīgas svētki: all of August 2026 for Rīga's 825th birthday, main day 15 August ([riga.lv, archived](http://web.archive.org/web/20260818165158/https://www.riga.lv/en/article/riga-celebrate-its-825th-anniversary-year)).
- Jāņi: 23 to 24 June 2026 at Grīziņkalns, Dzegužkalns and Mežaparks Zaļais teātris ([Apollo/LETA](https://www.apollo.lv/8496068/kur-ligot-riga-iepazisties-ar-si-gada-svetku-programmu)).
- Song and Dance cycle: the XIII School Youth festival ran 5 to 13 July 2025 ([VISC, archived](http://web.archive.org/web/20251112231343/https://www.visc.gov.lv/lv/latvijas-skolu-jaunatnes-dziesmu-un-deju-svetki)) with 38,000+ participants; the next general festival is in 2028 ([LNKC, archived](http://web.archive.org/web/20260616062200/https://www.lnkc.gov.lv/lv/jaunums/dziesmu-un-deju-svetku-padomes-sede-atskatas-uz-xiii-latvijas-skolu-jaunatnes-dziesmu-un-deju-svetkiem-un-iezime-gatavosanos-nakamajiem-dziesmu-un-deju-svetkiem-2028-gada)).
- "Riga Comic Con" 2025 or 2026: not found. UniCon, billed as Latvian Comic Con, ran 14 to 16 August 2026 ([Biļešu Serviss](https://www.bilesuserviss.lv/en/series/ZER5HGGUAI/unicon-2026-latvian-comic-con)); UniCon Winter runs 8 to 10 January 2027 ([unicon.lv](https://www.unicon.lv/?lang=lv)).
- Summer Sound, Liepāja: 31 July to 1 August 2026 ([summersound.lv](https://summersound.lv/en/)).
- Liepāja 2027 European Capital of Culture: free opening weekend, 22 to 24 January 2027 ([liepaja2027.lv](https://liepaja2027.lv/en/events/concert-series-stars-in-amber/)).

### Personas

Radius, budget and habits are design assumptions. Linked facts are cited.

**1. Andris, 58, flea market fan, Rīga (Avoti).** Empty nester, goes alone. Wants Blusu tirgi, Nišas (kolekcionēšana). Travel: 2 km on foot weekdays; 40 km (45 min by car) weekends. Budget €10 to €40. When: weekend mornings, April to October. Venues: [Latgalīte](https://www.rigasnami.lv/lv/parvalda-un-apsaimnieko/tirgi/latgales-tirgus) (daily, 8:00 to 17:00, Sunday to 16:00); [Rīgas krāmu tirgus, Spīķeri](https://www.spikeri.lv/notikumi/rigas-kramu-tirgus-2026/) (free, 10:00 to 16:00). Finds events: spikeri.lv, [tirguscelvedis.lv](https://tirguscelvedis.lv/tirgi/lielais-brivdabas-muzeja-gadatirgus). Closes the app: market card without hours. Onboarding: Rīga, "viens", Blusu tirgi. Evidence: 62.9% of people aged 50 to 64 skip all cultural venues ([Eurostat](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_scp03?geo=LV&geo=EU27_2020&time=2022&isced11=TOTAL&sex=T&frequenc=NM12&unit=PC)).

**2. Laura, 31, perfume lover, Rīga centre.** Single, goes with one friend. Wants Nišas (smaržas), Darbnīcas. Travel: 5 km weekday evenings, 15 km weekends. Budget €40 to €70. When: weekday evenings, autumn and winter. Venues: [Latvian Aroma-Essence](https://www.aromaessence.lv/radosadarbnica) (€40 to €67, 3 to 12 people, 16+, no solo bookings); [BONNE](https://www.bonne.lv/) (private workshops). Finds events: Instagram, gift-voucher sites. Closes the app: hidden price or group rules. Onboarding: Rīga, "ar draugiem", smaržas, Darbnīcas. Evidence: Rīga income €1,090 per member a month ([CSP](http://web.archive.org/web/20260221082934/https://stat.gov.lv/lv/statistikas-temas/iedzivotaji/monetara-nabadziba-nevienlidziba-un-sociala-atstumtiba/preses-23)).

**3. Artūrs, 19, gamer and esports fan, Rīga (Purvciems).** First job, goes with 2 or 3 friends. Wants Nišas (spēles), Sports. Travel: 30 min by bus anywhere in Rīga. Budget €0 to €30. When: weekend afternoons, peaks in January and August. Venues: [Urban Riga Open](https://lente.lv/sports/raksts/riga-nosledzies-urban-riga-open-2-e-sporta-turnirs-uzvaru-izcina-akademijas-komanda-mouz-nxt-91867.html) (CS2, 12 teams, live audience, Cyber Empire); [UniCon esports](https://www.bilesuserviss.lv/en/series/ZER5HGGUAI/unicon-2026-latvian-comic-con) (day tickets €19 to €30). Finds events: Discord, Instagram; @uniconlv has 14,000 followers (snippet, unverified). Closes the app: no game title. Onboarding: Rīga, "ar draugiem", Spēles. Evidence: 94.1% of 16 to 24 year olds use social networks ([Eurostat](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/isoc_ci_ac_i?geo=LV&time=2025&unit=PC_IND&indic_is=I_IUSNET&indic_is=I_IUBK&indic_is=I_IUOLC)).

**4. Elīza, 23, anime and cosplay fan, Rīga (Āgenskalns).** Part-time student, goes with a cosplay group. Wants Nišas (anime), Festivāli. Travel: Rīga only. Budget €30 to €80 per convention. When: August and January. Venues: [UniCon 2026](https://www.bilesuserviss.lv/en/series/ZER5HGGUAI/unicon-2026-latvian-comic-con) (14th edition, fan ticket €75 to €80); [UniCon Winter 2027](https://www.unicon.lv/?lang=lv) (under 7 free). Finds events: Instagram, TikTok. Closes the app: anime buried in a generic list. Onboarding: Rīga, "ar draugiem", anime. Evidence: 42.8% non-participation at 25 to 34, the second most active group ([Eurostat](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_scp03?geo=LV&geo=EU27_2020&time=2022&isced11=TOTAL&sex=T&frequenc=NM12&unit=PC)).

**5. Valentīna, 71, senior, Rīga (Purvciems).** Widow, goes with a friend or senior club. Wants Teātris, Koncerti, Christmas markets. Travel: 5 km, 30 min by tram, weekdays. Budget €0 to €20. When: weekday afternoons, Advent. Venues: [LNOB](https://www.opera.lv/lv/biletes/atlaides/) (15% pensioner discount); [Vecrīgas Ziemassvētku tirdziņš](https://vzt.lv/en/). Finds events: Latvijas Radio 1, posters, venue Facebook pages. Closes the app: small text, login wall. Onboarding: Rīga, "viens", Teātris. Evidence: 41% of people aged 65 to 75 attended nothing in 2024; 27% want events closer to home ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).

**6. Ilze (38) and Pēteris (41), rural family, Rēzeknes novads.** Children 5 and 9. Want Ģimenēm, local svētki, Darbnīcas. Travel: 30 km (30 min) to Rēzekne on weekends. Budget €20 to €50 per family. When: Saturday daytime, summer. Venues: [GORS](https://biletes.latgalesgors.lv/lv/gimenem) (free children's room, ages 3 to 7, during events); [GORS family film, 20 November 2026](https://www.latgalesgors.lv/lv/notikumi). Find events: municipality site, Facebook. Close the app: "Tuvumā" shows only Rīga. Onboarding: geolocation, kids 0 to 5 and 6 to 11, Ģimenēm. Evidence: Latgale income €673 per member, the lowest ([CSP](http://web.archive.org/web/20260221082934/https://stat.gov.lv/lv/statistikas-temas/iedzivotaji/monetara-nabadziba-nevienlidziba-un-sociala-atstumtiba/preses-23)).

**7. Rihards, 21, university student, Rīga (Teika).** From Valmiera, goes with friends. Wants Koncerti, Ko redzēt (kino, izstādes). Travel: 30 min by bike or bus. Budget €0 to €30. When: Thursday to Saturday nights, September to May. Venues: [Skaņu Mežs](https://www.skanumezs.lv/en/festival2026/) (9 to 10 October 2026, Hanzas Perons, €60 for 2 days); [LNOB](https://www.opera.lv/lv/biletes/atlaides/) (15% student discount). Finds events: Instagram, Biļešu Serviss. Closes the app: free events not flagged. Onboarding: Rīga, "ar draugiem", Koncerti. Evidence: 15 to 24 year olds attend most ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).

**8. Kristīne (45) and Juris (47), weekend tourists, Rīga to Liepāja.** Couple. Want Festivāli, Koncerti, Ēdiens. Travel: about 3 hours, overnight, planned 2 to 6 weeks ahead. Budget €70 per person plus tickets. When: Friday to Sunday. Venues: [Liepāja 2027 opening weekend](https://liepaja2027.lv/en/events/concert-series-stars-in-amber/) (free); Rufus Wainwright at Lielais dzintars, 30 January 2027 (€30 to €80, same page). Find events: liepaja2027.lv, Biļešu Serviss. Close the app: no way to save a future weekend. Onboarding: Rīga, "ar partneri"; "Citur Latvijā" matters most. Evidence: short domestic trips cost €68.24 in 2025 ([Eurostat](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tour_dem_extot?geo=LV&sinceTimePeriod=2023&c_dest=DOM&purpose=TOTAL&expend=TOTXDUR)).

**9. Markuss, 14, teen, Ogre.** Goes with friends within parents' limits. Wants Sports (ielu sports), Festivāli, Spēles. Travel: bike locally; train to Rīga on weekend days. Budget €0 to €15. When: after school, weekends, summer. Venues: [Ghetto Games Forget The Winter](https://play.ghetto.lv/en/72d4af5d-a4db-11f0-830c-70f39512fe4b) (Ķīpsala, 9 December 2025, free up to U16); [Riga Football Festival](http://web.archive.org/web/20260818165158/https://www.riga.lv/en/article/riga-celebrate-its-825th-anniversary-year) (15 to 16 August 2026). Finds events: TikTok, school. Closes the app: results look like parents' events. Onboarding: Ogre, "ar draugiem", age 13 to 16 hides 18+. Evidence: organisers report falling interest at 13 to 25 ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).

**10. Anna (32) and Mārtiņš (34), young parents, Mārupe (Pierīga).** Daughter aged 2. Want Ģimenēm, Zemnieku tirdziņi, Ēdiens. Travel: 15 km (25 min) into Rīga on Saturdays. Budget €0 to €30. When: Saturday 9:00 to 13:00, before the nap. Venues: [Kalnciema kvartāla tirgus](https://www.latvia.travel/en/event/kalnciema-quarter-market) (Saturdays 10:00 to 16:00, free children's workshops); [Rimi Bērnu diena](https://www.rimi.lv/rimi-riga-maratons) (16 May 2026, capped at 10,000 children). Find events: parents' Facebook groups, Instagram. Close the app: events starting after 19:00. Onboarding: geolocation, kids 0 to 5. Evidence: Mārupe has 24.7% children ([CSP](http://web.archive.org/web/20261020013600/https://stat.gov.lv/lv/statistikas-temas/iedzivotaji/iedzivotaju-skaits/preses-relizes/27583-iedzivotaju-skaita-izmainas)).

**11. Santa (40) and Edgars (42), school-age family, Jelgava.** Children 8 and 11. Want Ģimenēm, Festivāli, Sports. Travel: 5 km in town; about 45 km to Rīga on weekends. Budget €30 to €70 per family. When: weekend daytime, school holidays. Venues: [Ice Sculpture Festival](https://kultura.jelgava.lv/en/2026/11/19/pasaules-karnevals-ledu-jelgava-norisinasies-28-starptautiskais-ledus-skulpturu-festivals/) (6 to 7 February 2027, children's ice masterclass); [Vecrīgas Ziemassvētku tirdziņš](https://vzt.lv/en/). Find events: kultura.jelgava.lv, Facebook. Close the app: no family price. Onboarding: Jelgava, kids 6 to 11. Evidence: 75,900 households have a youngest child aged 6 to 11 ([Eurostat](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfst_hhnhtych?geo=LV&time=2025)).

**12. Dace, 44, farmers' market foodie, Rīga (Āgenskalns).** Goes with her partner. Wants Zemnieku tirdziņi, Ēdiens. Travel: 2 km on foot; 30 km for big fairs. Budget €20 to €60. When: Saturday mornings; June and Advent peaks. Venues: [Kalnciema kvartāla tirgus](https://www.latvia.travel/en/event/kalnciema-quarter-market); [Brīvdabas muzeja Gadatirgus](https://tirguscelvedis.lv/tirgi/lielais-brivdabas-muzeja-gadatirgus) (6 to 7 June 2026, 500+ sellers). Finds events: market newsletters, tirguscelvedis.lv. Closes the app: weekly market shown as a one-off. Onboarding: Rīga, "ar partneri", Zemnieku tirdziņi. Evidence: local festivals are the top outing at 50% ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).

**13. Toms, 29, big concerts fan, Valmiera.** Goes with 2 friends. Wants Koncerti, Festivāli. Travel: about 1.5 hours to Rīga. Budget €60 to €150. When: summer weekends, buys months ahead. Venues: [Xiaomi Arēna](https://xiaomi-arena.com/en/) (Bryan Adams 9 May 2027, Nickelback 4 July 2027); [Mežaparka Lielā estrāde](https://mezaparks.eu/pasakums/koncerts-calvin-harris/) (Calvin Harris, 6 August 2026, from €69). Finds events: Biļešu Serviss, artist Instagram. Closes the app: only tonight's events shown. Onboarding: Valmiera, "ar draugiem", Koncerti. Evidence: 34% attended popular music concerts in 2024 ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).

**14. Gints, 47, sports fan, Jūrmala.** Goes with his son, 12. Wants Sports (basketbols, hokejs). Travel: about 25 km to Rīga on weekday evenings. Budget €10 to €45. When: 19:00 to 21:30, September to May. Venues: [Xiaomi Arēna](https://xiaomi-arena.com/en/) (Latvia vs Germany, FIBA qualifier, 27 November 2026; Rīgas Zeļļi EuroCup); [LHF](https://www.lhf.lv/lv/jaunumi/sakam-bilesu-tirdzniecibu-uz-latvijas-hokeja-izlases-spelem) (hockey €5 to €41, children 30% off). Finds events: club sites. Closes the app: missing start times. Onboarding: Jūrmala, kids 12+, Sports. Evidence: 87.6% of adults attended no live sports in 2022 ([Eurostat](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_scp03?geo=LV&geo=EU27_2020&time=2022&isced11=TOTAL&sex=T&frequenc=NM12&unit=PC)), so fans are a small, loyal group.

**15. Olga, 55, Russian-speaking resident, Daugavpils.** Goes with her husband. Wants Teātris, Koncerti, kino. Travel: 5 km by tram. Budget €8 to €25. When: Friday to Sunday evenings, October to April. Venues: [Daugavpils theatre and Daugavpils Kino](https://www.visitdaugavpils.lv/pasakumi/2026-03-04/) (plays in Latvian, Russian and Latgalian; 96-seat cinema, Friday to Sunday). Finds events: visitdaugavpils.lv, friends. Closes the app: show language unclear. Onboarding: Daugavpils, "ar partneri", Teātris. Evidence: 30% of people who do not speak Latvian at home attended no event ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).

**16. Marta, 36, craft workshop lover, Cēsis.** Goes alone or with her daughter, 7. Wants Darbnīcas, Zemnieku tirdziņi, Ģimenēm. Travel: 5 km locally; Rīga for big fairs. Budget €15 to €40. When: weekends, June and September. Venues: [Gadatirgus](https://tirguscelvedis.lv/tirgi/lielais-brivdabas-muzeja-gadatirgus) (craft demonstrations, masterclasses); [Čello Cēsis](https://www.cesukoncertzale.lv/festivali/cello-cesis) (children's concert, 7 September 2026). Finds events: cesis.lv, Instagram. Closes the app: workshop without a booking link. Onboarding: Cēsis, kids 6 to 11, Darbnīcas. Evidence: 6% of residents do crafts themselves ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).

**17. Raimonds, 46, active outdoor person, Liepāja.** Goes with his running club. Wants Sports (taku skriešana). Travel: 100 to 250 km for race weekends. Budget €25 to €50 per race. When: weekend mornings, March to October. Venues: [Stirnu buks](https://www.stirnubuks.lv/nolikums-2026/) (6 stages, 28 March to 10 October 2026, walking distances too); [Rimi Rīgas maratons](https://www.rimi.lv/rimi-riga-maratons) (16 to 17 May 2026, 40,000+ runners). Finds events: stirnubuks.lv. Closes the app: no registration deadline. Onboarding: Liepāja, "ar draugiem", Sports. Evidence: 14% did sports activities in 2024 ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).

### Summary table

| Persona | Age | Travel radius | Budget per outing | Main categories | Timing |
|---|---|---|---|---|---|
| Andris, flea fan, Rīga | 58 | 2 km weekday, 40 km weekend | €10 to €40 | Blusu tirgi, Nišas | Weekend mornings, Apr to Oct |
| Laura, perfume, Rīga | 31 | 5 to 15 km | €40 to €70 | Nišas, Darbnīcas | Weekday evenings, winter |
| Artūrs, gamer, Rīga | 19 | Rīga, 30 min | €0 to €30 | Nišas, Sports | Weekends, Jan and Aug |
| Elīza, anime, Rīga | 23 | Rīga | €30 to €80 | Nišas, Festivāli | Aug and Jan |
| Valentīna, senior, Rīga | 71 | 5 km, 30 min | €0 to €20 | Teātris, Koncerti | Weekday afternoons |
| Ilze and Pēteris, Rēzeknes novads | 38, 41 | 30 km | €20 to €50 family | Ģimenēm, Festivāli | Saturdays, summer |
| Rihards, student, Rīga | 21 | Rīga, 30 min | €0 to €30 | Koncerti, Ko redzēt | Thu to Sat nights |
| Kristīne and Juris, tourists | 45, 47 | 3 hours, overnight | €70 per person plus tickets | Festivāli, Koncerti, Ēdiens | Planned weekends |
| Markuss, teen, Ogre | 14 | Bike, train to Rīga | €0 to €15 | Sports, Festivāli | After school, summer |
| Anna and Mārtiņš, Mārupe | 32, 34 | 15 km | €0 to €30 | Ģimenēm, Zemnieku tirdziņi | Saturday mornings |
| Santa and Edgars, Jelgava | 40, 42 | 45 km weekend | €30 to €70 family | Ģimenēm, Festivāli | Weekends, holidays |
| Dace, foodie, Rīga | 44 | 2 to 30 km | €20 to €60 | Zemnieku tirdziņi, Ēdiens | Saturday mornings |
| Toms, concerts, Valmiera | 29 | 1.5 hours | €60 to €150 | Koncerti | Summer weekends |
| Gints, sports, Jūrmala | 47 | 25 km | €10 to €45 | Sports | Weekday evenings, Sep to May |
| Olga, Daugavpils | 55 | 5 km | €8 to €25 | Teātris, Ko redzēt | Fri to Sun evenings |
| Marta, crafts, Cēsis | 36 | 5 km, Rīga for fairs | €15 to €40 | Darbnīcas, tirdziņi | Weekends, Jun and Sep |
| Raimonds, outdoor, Liepāja | 46 | 100 to 250 km | €25 to €50 | Sports | Weekend mornings, Mar to Oct |

### Segments by distance tolerance

- Neighbourhood, 5 km or less: Valentīna, Olga, Dace, Andris on weekdays. "Tuvumā" must mean walking or one tram ride.
- City, about 30 min: Laura, Artūrs, Elīza, Rihards, Markuss. All of Rīga counts as near.
- Day trip, 25 to 110 km: Anna and Mārtiņš, Santa and Edgars, Gints, Marta, Toms, Ilze and Pēteris. One planned outing per weekend.
- Overnight, 150 km and more: Kristīne and Juris, Raimonds. They plan weeks ahead through "Citur Latvijā".

### Implications for v1

- Default city when onboarding is skipped: Rīga, with 32% of residents ([CSP](http://web.archive.org/web/20261116211439/https://stat.gov.lv/system/files/publication/2025-10/Nr_04_Demografija_2025_%2825_00%29_LV_6.pdf)); 46% attended events there in 2024 ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).
- Default "Tuvumā" radius: 10 km in Rīga, Jūrmala and Pierīga, 30 km elsewhere, widening to 60 km when fewer than 3 events match. 72% attend in their own town or parish ([barometrs](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).
- Kids' age groups: 0 to 5, 6 to 11, 12 to 17, matching the Eurostat youngest-child bands ([Eurostat](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfst_hhnhtych?geo=LV&time=2025)).
- Add a "Svētki" chip for town and parish festivals, the top outing at 50%.
- Give "Anime un spēles" its own chip; UniCon puts anime, cosplay and esports in one event. Perfume and collecting stay under "Nišas".
- Keep Blusu tirgi and Zemnieku tirdziņi separate. Latgalīte runs daily and Kalnciema on Saturdays, so cards need opening hours.
- Add a "Bezmaksas" filter: 47% of people aged 65 to 75 want more free events.
- Tag event language (LV, RU, EN, LTG) on cards. The UI stays Latvian, and 34.6% of adults speak Russian at home.
- A 13 to 16 profile hides 18+ events. A 65+ profile gets larger text and no login wall.
- "Citur Latvijā" should favour Friday to Sunday events and allow saving; 87.3% of domestic trips are 1 to 3 nights.
- Gaps: stat.gov.lv and gov.lv sites refused connections here, so CSP figures come from archived copies, Eurostat and data.gov.lv.

### Sources

1. Demogrāfija 2025, informatīvais apskats. Centrālā statistikas pārvalde, 2025. http://web.archive.org/web/20261116211439/https://stat.gov.lv/system/files/publication/2025-10/Nr_04_Demografija_2025_%2825_00%29_LV_6.pdf (archived copy), accessed 2026-11-20.
2. Latvijā dzīvo 1,845 miljoni iedzīvotāju. CSP, 2026. http://web.archive.org/web/20261020013600/https://stat.gov.lv/lv/statistikas-temas/iedzivotaji/iedzivotaju-skaits/preses-relizes/27583-iedzivotaju-skaita-izmainas, accessed 2026-11-20.
3. 64 % Latvijas iedzīvotāju dzimtā valoda ir latviešu. CSP, 2023. http://web.archive.org/web/20261003083505/https://stat.gov.lv/lv/statistikas-temas/izglitiba-kultura-zinatne/izglitibas-limenis/preses-relizes/21052-dzimta-un-majas, accessed 2026-11-20.
4. Mājsaimniecību ienākumi turpina augt. CSP, 2025. http://web.archive.org/web/20260221082934/https://stat.gov.lv/lv/statistikas-temas/iedzivotaji/monetara-nabadziba-nevienlidziba-un-sociala-atstumtiba/preses-23, accessed 2026-11-20.
5. RIG010_01 population by age group, experimental statistics. CSP via data.gov.lv, 2026. https://data.gov.lv/dati/dataset/ac38cc49-fb8c-492f-817b-4595a3576c04/resource/83da473d-68e1-4120-93f4-817bafce88a2/download/rig010_01.csv, accessed 2026-11-20.
6. Liepājas valstspilsētas sociālekonomiskais pārskats 2024, Iedzīvotāji. Liepājas valstspilsētas pašvaldība, 2025. https://faili.liepaja.lv/Bildes/Dokumenti/Dokumentu-biblioteka/Statistika/Soc_ek/Iedzivotaji.pdf, accessed 2026-11-20.
7. Kultūras aktivitātes barometrs 2024. Latvijas Kultūras akadēmija and SKDS for Kultūras ministrija, 2025. https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf, accessed 2026-11-20.
8. Special Eurobarometer 562, Europeans' attitudes towards culture. European Commission, 2025 (copy hosted by Boekman). https://catalogus.boekman.nl/pub/barometer_europeansattitudeculture2025.pdf, accessed 2026-11-20.
9. Population by age group (demo_pjangroup). Eurostat, 2026. https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjangroup?geo=LV&sex=T&time=2025&unit=NR, accessed 2026-11-20.
10. Internet use (isoc_ci_ifp_iu). Eurostat, 2026. https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/isoc_ci_ifp_iu?geo=LV&time=2025&unit=PC_IND, accessed 2026-11-20.
11. Devices used to access the internet (isoc_ci_dev_i). Eurostat, 2026. https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/isoc_ci_dev_i?geo=LV&time=2025&unit=PC_IND&indic_is=I_IUG_MP, accessed 2026-11-20.
12. Internet activities (isoc_ci_ac_i). Eurostat, 2026. https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/isoc_ci_ac_i?geo=LV&time=2025&unit=PC_IND&indic_is=I_IUSNET&indic_is=I_IUBK&indic_is=I_IUOLC, accessed 2026-11-20.
13. Non-participation in cultural activities by age (ilc_scp03). Eurostat, 2023. https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_scp03?geo=LV&geo=EU27_2020&time=2022&isced11=TOTAL&sex=T&frequenc=NM12&unit=PC, accessed 2026-11-20.
14. Non-participation by income, household type, urbanisation (ilc_scp04). Eurostat, 2023. https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_scp04?geo=LV&time=2022&frequenc=NM12&unit=PC&acl00=AC52A, accessed 2026-11-20.
15. Reasons for non-participation (ilc_scp06). Eurostat, 2023. https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_scp06?geo=LV&time=2022&unit=PC, accessed 2026-11-20.
16. Households by composition and children (lfst_hhnhtych). Eurostat, 2026. https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfst_hhnhtych?geo=LV&time=2025, accessed 2026-11-20.
17. Trips by residents (tour_dem_tttot). Eurostat, 2026. https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tour_dem_tttot?geo=LV&sinceTimePeriod=2023&c_dest=DOM&c_dest=WORLD&purpose=TOTAL&purpose=PER, accessed 2026-11-20.
18. Expenditure on trips (tour_dem_extot). Eurostat, 2026. https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tour_dem_extot?geo=LV&sinceTimePeriod=2023&c_dest=DOM&purpose=TOTAL&expend=TOTXDUR, accessed 2026-11-20.
19. Passenger cars per 1,000 inhabitants (road_eqs_carhab). Eurostat, 2026. https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/road_eqs_carhab?geo=LV&geo=EU27_2020&sinceTimePeriod=2023, accessed 2026-11-20.
20. Staro Rīga 2026. Staro Rīga, 2026. https://staroriga.lv/en/home/, accessed 2026-11-20.
21. Vecrīgas Ziemassvētku tirdziņš. VZT, 2026. https://vzt.lv/en/, accessed 2026-11-20.
22. Riga to celebrate its 825th anniversary this year. Rīgas valstspilsētas pašvaldība, 2026. http://web.archive.org/web/20260818165158/https://www.riga.lv/en/article/riga-celebrate-its-825th-anniversary-year, accessed 2026-11-20.
23. Kur līgot Rīgā? Apollo.lv (LETA), 2026. https://www.apollo.lv/8496068/kur-ligot-riga-iepazisties-ar-si-gada-svetku-programmu, accessed 2026-11-20.
24. Latvijas Skolu jaunatnes dziesmu un deju svētki. VISC, 2025. http://web.archive.org/web/20251112231343/https://www.visc.gov.lv/lv/latvijas-skolu-jaunatnes-dziesmu-un-deju-svetki, accessed 2026-11-20.
25. Dziesmu un deju svētku padomes sēde. LNKC, 2025. http://web.archive.org/web/20260616062200/https://www.lnkc.gov.lv/lv/jaunums/dziesmu-un-deju-svetku-padomes-sede-atskatas-uz-xiii-latvijas-skolu-jaunatnes-dziesmu-un-deju-svetkiem-un-iezime-gatavosanos-nakamajiem-dziesmu-un-deju-svetkiem-2028-gada, accessed 2026-11-20.
26. UniCon 2026 Latvian Comic Con. Biļešu Serviss, 2026. https://www.bilesuserviss.lv/en/series/ZER5HGGUAI/unicon-2026-latvian-comic-con, accessed 2026-11-20.
27. UniCon. UniCon Latvia, 2026. https://www.unicon.lv/?lang=lv, accessed 2026-11-20.
28. Summer Sound Festival. Summer Sound, 2026. https://summersound.lv/en/, accessed 2026-11-20.
29. Koncerts Calvin Harris. Mežaparka Attīstības biedrība, 2026. https://mezaparks.eu/pasakums/koncerts-calvin-harris/, accessed 2026-11-20.
30. Concert series Stars in Amber. Liepāja 2027, 2026. https://liepaja2027.lv/en/events/concert-series-stars-in-amber/, accessed 2026-11-20.
31. Latgales tirgus. Rīgas nami, 2026. https://www.rigasnami.lv/lv/parvalda-un-apsaimnieko/tirgi/latgales-tirgus, accessed 2026-11-20.
32. Rīgas krāmu tirgus 2026. Spīķeri, 2026. https://www.spikeri.lv/notikumi/rigas-kramu-tirgus-2026/, accessed 2026-11-20.
33. Lielais Brīvdabas muzeja Gadatirgus. Tirgus ceļvedis, 2026. https://tirguscelvedis.lv/tirgi/lielais-brivdabas-muzeja-gadatirgus, accessed 2026-11-20.
34. Smaržu darbnīcas. Latvian Aroma-Essence, 2026. https://www.aromaessence.lv/radosadarbnica, accessed 2026-11-20.
35. BONNE smaržu darbnīca. BONNE, 2026. https://www.bonne.lv/, accessed 2026-11-20.
36. Rīgā noslēdzies Urban Riga Open 2. Lente.lv, 2026. https://lente.lv/sports/raksts/riga-nosledzies-urban-riga-open-2-e-sporta-turnirs-uzvaru-izcina-akademijas-komanda-mouz-nxt-91867.html, accessed 2026-11-20.
37. Atlaides. Latvijas Nacionālā opera un balets, 2026. https://www.opera.lv/lv/biletes/atlaides/, accessed 2026-11-20.
38. Ģimenēm. Latgales vēstniecība GORS, 2026. https://biletes.latgalesgors.lv/lv/gimenem, accessed 2026-11-20.
39. Notikumi. Latgales vēstniecība GORS, 2026. https://www.latgalesgors.lv/lv/notikumi, accessed 2026-11-20.
40. Skaņu Mežs Festival 2026. Skaņu mežs, 2026. https://www.skanumezs.lv/en/festival2026/, accessed 2026-11-20.
41. Ghetto Basket Forget The Winter. Ghetto Games, 2025. https://play.ghetto.lv/en/72d4af5d-a4db-11f0-830c-70f39512fe4b, accessed 2026-11-20.
42. Rimi Rīgas maratons 2026. Rimi Latvia, 2026. https://www.rimi.lv/rimi-riga-maratons, accessed 2026-11-20.
43. Kalnciema kvartāla tirgus. Latvia.travel, 2025. https://www.latvia.travel/en/event/kalnciema-quarter-market, accessed 2026-11-20.
44. 28. Starptautiskais Ledus skulptūru festivāls. Jelgavas kultūras nams, 2026. https://kultura.jelgava.lv/en/2026/11/19/pasaules-karnevals-ledu-jelgava-norisinasies-28-starptautiskais-ledus-skulpturu-festivals/, accessed 2026-11-20.
45. Xiaomi Arēna events. Arena Riga, 2026. https://xiaomi-arena.com/en/, accessed 2026-11-20.
46. Biļešu tirdzniecība uz Latvijas hokeja izlases spēlēm. Latvijas Hokeja federācija, 2025. https://www.lhf.lv/lv/jaunumi/sakam-bilesu-tirdzniecibu-uz-latvijas-hokeja-izlases-spelem, accessed 2026-11-20.
47. Pasākumi. VisitDaugavpils, 2026. https://www.visitdaugavpils.lv/pasakumi/2026-03-04/, accessed 2026-11-20.
48. Festivāli, Čello Cēsis. Vidzemes koncertzāle Cēsis, 2026. https://www.cesukoncertzale.lv/festivali/cello-cesis, accessed 2026-11-20.
49. Stirnu buks nolikums 2026. Stirnubuks.lv, 2026. https://www.stirnubuks.lv/nolikums-2026/, accessed 2026-11-20.


---

## 3A. Event sources: national aggregators, ticket sellers, venues

All checks ran on 2026-11-20 (server clocks showed 2026-11-19 evening, Rīga time). Counts are snapshots from that day.

### Key findings

- Biļešu Serviss is the main seller for arena concerts. Its "All events" listing reports 772 items ([listing](https://www.bilesuserviss.lv/biletes/visi)). Event pages carry schema.org `Event` JSON-LD with ISO start and end times and venue coordinates ([Fatboy Slim page](https://www.bilesuserviss.lv/biletes/WAHYBEP5O7/fatboy-slim-crave-night-palladium)). The [Xiaomi Arena home page](https://xiaomi-arena.com/) links to bilesuserviss.lv 41 times, Biļešu Paradīze 12 times, Ticketshop 2 times. Its terms ban copying and publishing its data, so v1 needs written permission.
- Fienta has an open JSON API with no key. `?country=LV` returned 543 events (522 starting on or after 2026-11-20) with ticket URL, price, categories and image ([API response](https://fienta.com/api/v1/public/events?country=LV)).
- latvia.travel (LIAA) loads its events page from a public JSON endpoint. It returned 78 upcoming events in Latvian and 31 in English, each with coordinates and admission fee ([lv JSON](https://www.latvia.travel/lv/jsonapi/events/42), [en JSON](https://www.latvia.travel/en/jsonapi/events/42)).
- Live Riga lists 289 events ("Rezultāti 1-24 no 289") with no JSON-LD ([listing](https://www.liveriga.com/lv/3-pasakumi)). Detail pages expose price range, a Biļešu Serviss ticket link and coordinates. robots.txt allows everything.
- Both Rīga multiplex chains publish machine schedules. Apollo Kino `/xml/Schedule` returns JSON (91 shows for 2026-11-19 across 3 cinemas) ([feed](https://www.apollokino.lv/xml/Schedule)). Forum Cinemas returns XML (77 shows across 2 cinemas) ([feed](https://www.forumcinemas.lv/xml/Schedule/)). Apollo Kino and Forum Cinemas are separate operators. Kino Citadele was renamed Forum Cinemas in 2023 (snippet, unverified).
- Biļešu Paradīze (Dailes teātris, Nacionālais teātris, JRT, Mežaparks) answers curl with a Cloudflare challenge (HTTP 403, `cf-mitigated: challenge`). Its sitemap stays open: 2,962 event URLs and 1,147 performance URLs in Latvian ([sitemap](https://www.bilesuparadize.lv/sitemap.xml)). Dailes teātris embeds JSON-LD that links to Biļešu Paradīze event IDs with prices ([home](https://www.dailesteatris.lv/lv/)).
- National open data has no consumer event feed. data.gov.lv returns 29 datasets for "pasākumi". The only event dataset is LIAA's business calendar (XLSX) ([search](https://data.gov.lv/dati/api/3/action/package_search?q=pas%C4%81kumi&rows=50)). Kultūras karte (kulturaskarte.lv) failed the TLS handshake from this network.
- International feeds are closed or paid. Eventbrite shut its event search API in December 2019. Bandsintown serves artists only. Songkick requires a paid licence. Resident Advisor and Eventbrite block curl and ban scraping in their terms. Ticketmaster Discovery lists LV as a country code; Latvian coverage was not tested because it needs a key.
- Ticket URLs work as cross-source dedupe keys. Live Riga links carry the Biļešu Serviss code `WAHYBEP5O7`. Live Nation links carry the Piletilevi code `VD3FQVCJBR` shared by bilesuserviss.lv and piletilevi.ee ([Live Nation page](https://www.livenation.ee/en/xiaomi-arena-tickets-vdp1646842)).

### Summary table

| Source | Coverage | Upcoming events | Access method | Robots verdict | Priority | Difficulty |
|---|---|---|---|---|---|---|
| Biļešu Serviss | Latvia, all categories, arena concerts | 772 (All events listing) | Event JSON-LD, sitemap | Allowed (`/search`, `/beta/` blocked; SEO bots blocked) | P1 after permission | Low |
| Fienta | Latvia via `country=LV`; small organisers, tours, workshops | 543 | Public JSON API, no key | Allowed (`/orders/`, `/attendees/` blocked) | P1 | Low |
| latvia.travel (LIAA) | Latvia, curated highlights | 78 lv, 31 en | JSON endpoint behind page | Allowed (Drupal defaults) | P1 | Low |
| Live Riga | Rīga, all categories | 289 | HTML, sitemap | Allow all | P1 | Medium |
| Apollo Kino | 3 Rīga cinemas | 91 shows (one day) | JSON schedule feed | Allowed (`/websales/` blocked) | P1 | Low |
| Forum Cinemas | 2 Rīga cinemas | 77 shows (one day) | XML schedule feed | Allowed; AI training bots blocked | P1 | Low |
| Ticketshop | Latvia | 157 (lv sitemap) | Event JSON-LD with offers, sitemap | Allowed | P2 | Low |
| Biļešu Paradīze | Latvia, theatre and classical | 2,962 event URLs (lv sitemap) | Sitemap; HTML challenged; venue JSON-LD | `/api` disallowed; HTML returns 403 | P2 | High |
| Dailes teātris | 1 theatre | not counted | Event JSON-LD with offers | Allowed | P2 | Low |
| LNSO | National orchestra | not counted | MusicEvent JSON-LD | Allow all | P2 | Low |
| LNOB (opera.lv) | Opera and ballet | not found | HTML calendar | Allowed (`/system/` blocked) | P2 | Medium |
| Cinamon | Cinemas | not found | HTML; `/api/` disallowed | Partly blocked | P2 | Medium |
| Xiaomi Arena | Largest arena | not counted | HTML linking to sellers | Allow all | P3 (use sellers) | Medium |
| Other venues (Nacionālais teātris, JRT, LNMM, Mežaparka Lielā estrāde, Palladium) | 5 venues | not counted | HTML | Mixed, see notes | P3 | Medium |
| Splendid Palace, Kino Bize | 2 art cinemas | not counted | HTML | No rules returned | P3 | Medium |
| eKase.lv, Aula.lv, TicketStore.lv | Smaller sellers | not found | HTML | Mostly allowed | P3 | Medium |
| data.gov.lv | National open data | 0 consumer event datasets | CKAN API, CSV | Not applicable | P2 (venue gazetteer) | Low |
| Kultūras karte | Culture objects | not found | Unreachable | not found | P3 | Not assessed |
| Media guides (Delfi, TVNET, LSM, Jauns.lv, 1188.lv) | Editorial | not found | Articles only | AI bots blocked (Delfi, TVNET); LSM 403 | Skip | High |
| Ticketmaster Discovery | LV code listed | not tested | REST API, key | Not applicable | P3 | Low |
| Eventbrite, Resident Advisor, Songkick, Bandsintown, Facebook, Meetup | International | not found | Closed, paid or blocked | Blocked or ToS ban | Skip | High |

### Biļešu Serviss (bilesuserviss.lv)

- Operator: BIĻEŠU SERVISS PLG, part of the Piletilevi group. JSON-LD `workTranslation` points to piletilevi.ee, bilietai.lt and bilete.ro ([event page](https://www.bilesuserviss.lv/biletes/WAHYBEP5O7/fatboy-slim-crave-night-palladium)).
- Coverage: music, theatre, sports, cinema, festivals, family. The "All events" page payload reports 772 items in 22 pages of 36 ([listing](https://www.bilesuserviss.lv/biletes/visi)).
- Update: sitemap index lastmod 2026-11-19T03:10Z ([index](https://www.bilesuserviss.lv/sitemap/index.xml)). The event page sent `Last-Modified` 2026-11-19 23:22 GMT and `max-age=300`. `EVENT_1.xml` holds only 180 URLs and `SERIES_1.xml` 127, fewer than the listing ([EVENT_1](https://www.bilesuserviss.lv/sitemap/EVENT_1.xml)). The listing crawl is required for full coverage.
- Fields (JSON-LD): name, description, startDate, endDate with offset, eventStatus, venue name, street address, latitude, longitude, image, URL. Price is absent from JSON-LD and present in the page payload. Languages lv, en, ru.
- robots.txt: `Disallow: /search` and `/beta/`; dotbot, AhrefsBot, MJ12bot, PetalBot and others fully blocked; no AI bot rules ([robots](https://www.bilesuserviss.lv/robots.txt)).
- Terms: section 5.1 bans "kopēšana, reproducēšana, piemērošana, lietošana un datu publicēšana jelkādos nolūkos ir aizliegta". Section 4.10 requires written permission for commercial use ([terms](https://www.bilesuserviss.lv/vispareja-informacija/howtobuy/408/noteikumi)).
- Live Nation: livenation.lv did not resolve. Live Nation's Estonian site sells the Nickelback Xiaomi Arena show through bilesuserviss.lv ([page](https://www.livenation.ee/en/xiaomi-arena-tickets-vdp1646842)). Biļešu Serviss lists "Live Nation Estonia OÜ" as a promoter (snippet, unverified).
- Verdict: P1, low difficulty, blocked on a permission or affiliate agreement.

### Fienta (fienta.com)

- Operator: Fienta Ticketing OÜ, Tallinn, Estonia ([terms](https://fienta.com/lv/palidziba/juridiska/bilesu-pirceja-noteikumi)).
- Access: `GET /api/v1/public/events` returns "published, non-private upcoming events" for an organiser ([help](https://fienta.com/help/displaying-events-on-your-website)). The developer page shows a `country` parameter and says "Fienta provides an API for integrating event and ticketing data into your own systems." ([developers](https://fienta.com/help/organisers/for-developers)). `country=LV` returned 543 events in one 1.7 MB response, no key ([API](https://fienta.com/api/v1/public/events?country=LV)).
- Fields: title, starts_at, ends_at, venue, address, postal code, HTML description, url, buy_tickets_url, image_url, categories, price_from_string, sale and event status. No coordinates. `venue_id` looks like a Google Place ID. Organiser phone and email are included; the app should drop them.
- Noise: gift cards appear as events (one runs 2020-09-01 to 2029-09-01).
- robots.txt: blocks `/orders/` and `/attendees/` only ([robots](https://fienta.com/robots.txt)).
- Terms: section 4.1 says users "nedrīkst kopēt, lejupielādēt, izmantot, pārveidot, pārformatēt vai reproducēt nevienu no platformas materiāliem" without permission. No rate limit stated.
- Verdict: P1, low.

### latvia.travel (LIAA)

- Listing: [events page](https://www.latvia.travel/en/events-latvia-riga). `/lv/pasakumi` returns 404.
- Access: page settings point to `jsonapi/events/42`. The endpoint returns `results`, `pager` (20 per page) and 15 keys per event, including id, title, category, municipality, venue_name, region, city, display date string, admission fee, link, image HTML, coordinates, isFree. Count: 78 lv, 31 en. `Last-Modified` 2026-11-19 16:06 GMT, `max-age=3600`.
- Detail pages have no JSON-LD and show a "Purchase tickets" link ([Grandbrothers](https://www.latvia.travel/en/event/grandbrothers)). Sitemap index lastmod 2026-11-19 ([sitemap](https://www.latvia.travel/sitemap.xml)).
- robots.txt: Drupal defaults (`/admin/`, `/search/`, `/user/`); no AI rules; `jsonapi` not disallowed ([robots](https://www.latvia.travel/robots.txt)).
- Terms: use allowed "for personal, non-commercial and informative purposes"; republishing needs LIAA consent; no scraping clause ([terms](https://www.latvia.travel/en/terms-use)).
- Verdict: P1, low, ask LIAA for reuse permission.

### Live Riga (liveriga.com)

- Operator: Rīgas investīciju un tūrisma aģentūra (Riga municipality).
- Coverage: Rīga, 289 events in categories such as concerts, theatre, opera and ballet, exhibitions, fairs ([listing](https://www.liveriga.com/lv/3-pasakumi)).
- Fields (HTML): title, date, price range ("EUR 59.98 - EUR 105.96"), ticket link to bilesuserviss.lv, address, coordinates in a Google Maps link, `og:image`, category in the URL path ([detail](https://www.liveriga.com/lv/apmekle/pasakumi/koncerti-sovi/fatboy-slim-koncerts)). No JSON-LD; no RSS or iCal link on the listing.
- Sitemap: 4,578 URLs in lv, en, de, lt, ee (no ru); 1,357 lv; lastmod up to 2026-11-19 ([sitemap](https://www.liveriga.com/sitemap.xml)).
- robots.txt: `User-Agent: *` and `Allow: /` ([robots](https://www.liveriga.com/robots.txt)).
- Terms: not found. The footer states all rights reserved.
- Verdict: P1, medium (HTML parser).

### Ticketshop (ticketshop.lv)

- Operator: SIA "FIRST ROW TECHNOLOGY" ([terms](https://ticketshop.lv/lv/terms)).
- Access: detail pages carry `Event` JSON-LD with startDate, endDate, venue, address, geo, image, description and `AggregateOffer` prices in EUR ([event 108000](https://ticketshop.lv/lv/events/108000)). The lv sitemap lists 157 event URLs, lastmod 2026-11-11 ([sitemap](https://ticketshop.lv/sitemap_lv.xml)). lv, en and ru sitemaps exist.
- robots.txt: blocks `/profile/`, `/restore/`, `/unsubscribe/` ([robots](https://www.ticketshop.lv/robots.txt)).
- Terms: clause 5.2 bans "Jebkāda e-veikala darbības, datu vai dizaina pārraudzība, kopēšana, reproducēšana". Clause 5.3 bans heavy data flows.
- Verdict: P2, low.

### Biļešu Paradīze (bilesuparadize.lv)

- HTML pages return a Cloudflare challenge to curl and to WebFetch ([home](https://www.bilesuparadize.lv/lv)).
- Sitemap: 14,168 URLs; Latvian set has 2,962 `/event/` and 1,147 `/performance/` URLs, 274 locations, 302 organisers; hreflang lv, en, ru; no lastmod ([sitemap](https://www.bilesuparadize.lv/sitemap.xml)).
- robots.txt: blocks `/api`, `/v1.0`, `/v2.0`, `/v0.9`, search, cart, user ([robots](https://www.bilesuparadize.lv/robots.txt)).
- API: a "Public API" page describes `GET /api/venue/{id}/repertoire` for venues and organisers that meet prerequisites (snippet, unverified). The page itself was blocked.
- Indirect route: Dailes teātris JSON-LD gives name, start time, address, image, price and `https://www.bilesuparadize.lv/lv/event/{id}` ([Dailes](https://www.dailesteatris.lv/lv/)).
- Terms: not reachable.
- Verdict: P2, high; pursue a partner feed.

### Eventbrite

- The Riga listing returned HTTP 405 with an AWS WAF "Human Verification" page ([listing](https://www.eventbrite.com/d/latvia--riga/all-events/)). robots.txt does not block `/d/` for generic agents ([robots](https://www.eventbrite.com/robots.txt)).
- Event search API: shut down "at 11:59 pm PT on Thursday, December 12, 2019" ([announcement](https://groups.google.com/g/eventbrite-api/c/FT2MsDswdrA)).
- Terms 13.1 bar users who "scrape, crawl, or employ any automated means to extract data from the Sites." ([ToS](https://www.eventbrite.com/help/en-us/articles/251210/)).
- Count: not found. Verdict: skip.

### Other Latvian ticket platforms

- [eKase.lv](https://www.ekase.lv/), [Aula.lv](https://www.aula.lv/) and [TicketStore.lv](https://ticketstore.lv/) home pages loaded. eKase and Aula carry no JSON-LD; TicketStore has one JSON-LD block (type not checked). Aula's robots.txt blocks `/test-api/*` and admin paths. BezRindas.lv and tickets.paysera.com also sell Latvian events (snippet, unverified). Verdict: P3.

### Media guides

- Delfi publishes weekly "nedēļas nogale" round-up articles, not a structured calendar (snippet, unverified). Its robots.txt gives GPTBot `Disallow: /` and lists ClaudeBot, CCBot, anthropic-ai, Google-Extended, PerplexityBot and Bytespider ([robots](https://www.delfi.lv/robots.txt)).
- TVNET groups ClaudeBot, anthropic-ai, CCBot and GPTBot under `Disallow: *` ([robots](https://www.tvnet.lv/robots.txt)).
- LSM has a "Kas notiek Latvijā? / Kalendārs" page; it returned Cloudflare 403, and so did robots.txt ([page](https://www.lsm.lv/kas-notiek-latvija/kalendars/)).
- Jauns.lv: `Crawl-delay: 5`; no event calendar found ([robots](https://jauns.lv/robots.txt)).
- 1188.lv: `/pasakumi` returns 404 and `/iesaka/pasakumi` renders the home page ([page](https://www.1188.lv/iesaka/pasakumi)). Event listing: not found.
- riga.wtf and lv.mticket.eu run competing aggregators (snippet, unverified).
- Verdict: skip for v1.

### Cinemas

- Apollo Kino (Akropole Rīga, Rīga Plaza, Domina): `/xml/Schedule` returns JSON despite the path. Fields: local and UTC start and end, title, original title, year, length, rating, genres, cinema, hall, 2D/3D, ShowURL (ticket), EventURL, spoken and subtitle language codes, images ([feed](https://www.apollokino.lv/xml/Schedule), [areas](https://www.apollokino.lv/xml/TheatreAreas)). Date and area parameters were not tested. robots.txt blocks `/account/`, `/mypage/`, `/websales/` ([robots](https://www.apollokino.lv/robots.txt)). P1, low.
- Forum Cinemas (Centrs 41 shows, Alfa 36): same schema in XML, 77 shows ([feed](https://www.forumcinemas.lv/xml/Schedule/)). robots.txt uses Cloudflare `Content-Signal: search=yes,ai-train=no,use=reference` and blocks ClaudeBot, GPTBot, CCBot and Google-Extended ([robots](https://www.forumcinemas.lv/robots.txt)). P1, low.
- Cinamon: no JSON-LD on the home page; robots.txt blocks `/api/`, `/_nuxt/` and booking paths ([robots](https://www.cinamonkino.com/robots.txt)). P2, medium.
- [Splendid Palace](https://www.splendidpalace.lv/lv) and [Kino Bize](https://www.kinobize.lv/): HTML only. robots.txt returned no rules. P3.

### Big venues

- Xiaomi Arena: links out to ticket sellers; one non-Event JSON-LD block; robots.txt `Disallow:` empty ([home](https://xiaomi-arena.com/), [robots](https://xiaomi-arena.com/robots.txt)). Ingest through Biļešu Serviss.
- LNOB: own ticketing at biletes.opera.lv; HTML calendar without JSON-LD ([calendar](https://www.opera.lv/lv/kalendars/)); robots.txt blocks `/system/` ([robots](https://www.opera.lv/robots.txt)).
- LNSO: WordPress; event pages carry `MusicEvent` JSON-LD with startDate, organizer, performer, place and offer ([event](https://www.lnso.lv/event-list/lnso-bramsa-pirmais-un-malera-piekta/)). `/wp-json/` returns 403. robots.txt allows all ([robots](https://www.lnso.lv/robots.txt)). Lielā ģilde: separate source not found.
- Dailes teātris: `Event` JSON-LD per performance with Biļešu Paradīze offer and price ([home](https://www.dailesteatris.lv/lv/)); robots.txt blocks `/admin.php` and search ([robots](https://www.dailesteatris.lv/robots.txt)).
- Latvijas Nacionālais teātris: WordPress REST open, no event route ([wp-json](https://teatris.lv/wp-json/)); links to Biļešu Paradīze ([home](https://teatris.lv/)).
- Jaunais Rīgas teātris: links to Biļešu Paradīze; Cloudflare `ai-train=no`; ClaudeBot, GPTBot and anthropic-ai blocked ([robots](https://www.jrt.lv/robots.txt)).
- LNMM: no JSON-LD; `Crawl-delay: 10` for ClaudeBot and GPTBot, 5 for others ([robots](https://lnmm.gov.lv/robots.txt)).
- Mežaparka Lielā estrāde: WordPress with a `/wp/v2/events` route that returns 401 ([route](https://estrade.riga.lv/wp-json/wp/v2/events?per_page=5)); HTML calendar links to Biļešu Paradīze ([events](https://estrade.riga.lv/pasakumi/)).
- Palladium Riga: HTML news pages, no JSON-LD ([home](https://www.palladium.lv/)). Its events appear in Biļešu Serviss JSON-LD with coordinates.

### Open data and Kultūras karte

- data.gov.lv: "pasākumi" gives 29 datasets, "events" gives 3, none a consumer calendar ([events search](https://data.gov.lv/dati/api/3/action/package_search?q=events&rows=50)). "LIAA pasākumu kalendārs" is an XLSX of business events from business.gov.lv, modified 2026-10-16, CC0 ([dataset](https://data.gov.lv/dati/api/3/action/package_show?id=liaa-pasakumu-kalendars)). "Latvijas kultūras institūcijas" is a CC0 CSV of institutions with addresses and coordinates, modified 2026-03-24, usable as a venue gazetteer ([kultūra search](https://data.gov.lv/dati/api/3/action/package_search?q=kult%C5%ABra&rows=50)).
- Kultūras karte: `www.kulturaskarte.lv` and `kulturasdati.lv` failed with curl error 35 (TLS) and WebFetch "Socket is closed" ([site](https://www.kulturaskarte.lv/)). An LSM "De facto" report says the significant-events section was empty (snippet, unverified). Open data export: not found.

### International artist feeds

- Bandsintown: endpoints are per artist (artist info, artist events with offers); no location search ([docs](https://help.artists.bandsintown.com/en/articles/9186477-api-documentation)). Access "only allows artists and anyone working on their behalf" ([access](https://help.artists.bandsintown.com/en/articles/3372745-can-i-have-access-to-the-api-and-an-api-key-if-i-m-not-an-artist)). Skip.
- Songkick: access is "subject to the standard terms of our partnership agreement and a license fee" ([developer](https://www.songkick.com/developer)). The Riga metro page returned 406 to curl ([metro](https://www.songkick.com/metro-areas/30848-latvia-riga)). Skip.
- Ticketmaster Discovery API v2: key required; "5000 API calls per day and rate limitation of 5 requests per second"; LV, EE and LT appear in Supported Country Codes ([docs](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)). Latvian event count: not tested. P3.
- Resident Advisor: `/events/lv/riga` returned 403 with a JS challenge ([page](https://ra.co/events/lv/riga)); robots.txt blocks `/api/` ([robots](https://ra.co/robots.txt)); terms 4.4(a) forbid "any automated system or software to extract content or data from our Website" ([terms](https://ra.co/terms)). Skip.
- Facebook: the 2018 changes removed "Support for finding pages, groups, events, users using search." and put Events API access behind app review ([Meta](https://developers.facebook.com/blog/post/2018/04/04/facebook-api-platform-product-changes/)). Skip.
- Meetup: GraphQL only; the page says "Get API access and more with Meetup Pro." ([docs](https://www.meetup.com/api/general/)). Skip.

### Legal context

This section is not legal advice.

- Directive 96/9/EC, Article 7, gives a database maker with "substantial investment" in obtaining, verification or presentation the right to prevent extraction or re-utilisation of a substantial part. Article 7(5) also bars repeated and systematic extraction of insubstantial parts. Protection runs 15 years and renews with substantial updates ([Directive](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:31996L0009)). A ticket seller's catalogue likely qualifies (opinion), because the seller verifies dates, venues and prices.
- CJEU C-762/19, CV-Online Latvia v Melons (3 June 2021): a specialised search engine that copies and indexes a whole or substantial part of a freely accessible database "is 'extracting' and 're-utilising' that content". The maker may prohibit this only where it creates a risk to redeeming its investment ([judgment](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:62019CJ0762)). An event app that mirrors a seller's full catalogue matches this pattern. Deep links that send buyers to the seller reduce the harm argument (opinion).
- CJEU C-30/14, Ryanair v PR Aviation (15 January 2015): for a database without copyright or sui generis protection, the Directive does not stop the maker "laying down contractual limitations on its use by third parties" ([judgment](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:62014CJ0030)). Terms clauses at Biļešu Serviss (5.1), Ticketshop (5.2), Fienta (4.1), Eventbrite (13.1) and RA (4.4) can bind the app even where the database right fails. Enforceability depends on national contract law.
- Autortiesību likums: Article 57 grants the database maker rights against extraction and re-utilisation of a substantial part. 57(4) bars repeated and systematic taking of insubstantial parts. Article 58 lets a lawful user take insubstantial parts for any purpose. Article 60 sets 15 years ([text](https://wikisource.org/wiki/Autorties%C4%ABbu_likums); Wikisource copy, may lag the consolidated version).
- For this app (opinion): titles, dates, venue names and addresses are facts and carry low copyright risk one by one. The risk comes from the systematic copy of a whole catalogue. Long descriptions are literary works; store a short summary or none. Images are copyright works of photographers or promoters. Re-hosting creates a copy and needs a licence. Hotlinking avoids storing a copy, but depends on the source's terms and breaks when URLs change. Use images supplied through APIs meant for display (Fienta `image_url`, Apollo and Forum `Images`), credit the source and link back.

### Recommended adapter order for v1

1. Fienta public API (`country=LV`). No key, explicit developer invitation, ticket URL and price included. Drop organiser contact fields.
2. Apollo Kino and Forum Cinemas schedule feeds. One parser covers both (JSON and XML of the same schema).
3. latvia.travel JSON endpoint. Ask LIAA for reuse consent first, because terms limit use to non-commercial purposes.
4. Live Riga HTML via sitemap. Municipal source with ticket links and coordinates; request a feed from the agency in parallel.
5. Biļešu Serviss JSON-LD. Highest value for international concerts; start only after a written permission or affiliate agreement with PLG. Crawl the listing, since the sitemap lists 307 event and series URLs against 772 listing items.
6. Venue JSON-LD: LNSO and Dailes teātris. Dailes gives Biļešu Paradīze event IDs and prices without touching the challenged seller.
7. Ticketshop JSON-LD with sitemap, after permission under clause 5.2.
8. Biļešu Paradīze through a partner or repertoire API agreement. Do not attempt to pass the Cloudflare challenge.
9. Ticketmaster Discovery: test Latvian coverage with a key in v1.1.

Skip in v1: Eventbrite, Resident Advisor, Songkick, Bandsintown, Facebook, Meetup, media guides, Kultūras karte. Load the data.gov.lv cultural institutions CSV once as a venue gazetteer.

### Sources

1. Pasākumi, Live Riga (Rīgas investīciju un tūrisma aģentūra), https://www.liveriga.com/lv/3-pasakumi, accessed 2026-11-20.
2. Fatboy Slim koncerts, Live Riga, https://www.liveriga.com/lv/apmekle/pasakumi/koncerti-sovi/fatboy-slim-koncerts, accessed 2026-11-20.
3. robots.txt, Live Riga, https://www.liveriga.com/robots.txt, accessed 2026-11-20.
4. sitemap.xml, Live Riga, https://www.liveriga.com/sitemap.xml, accessed 2026-11-20.
5. Events in Latvia, latvia.travel (LIAA), https://www.latvia.travel/en/events-latvia-riga, accessed 2026-11-20.
6. Events JSON (lv), latvia.travel, https://www.latvia.travel/lv/jsonapi/events/42, accessed 2026-11-20.
7. Events JSON (en), latvia.travel, https://www.latvia.travel/en/jsonapi/events/42, accessed 2026-11-20.
8. Grandbrothers, latvia.travel, https://www.latvia.travel/en/event/grandbrothers, accessed 2026-11-20.
9. robots.txt, latvia.travel, https://www.latvia.travel/robots.txt, accessed 2026-11-20.
10. sitemap.xml, latvia.travel, https://www.latvia.travel/sitemap.xml, accessed 2026-11-20.
11. Terms of use, latvia.travel, https://www.latvia.travel/en/terms-use, accessed 2026-11-20.
12. package_search "pasākumi", data.gov.lv, https://data.gov.lv/dati/api/3/action/package_search?q=pas%C4%81kumi&rows=50, accessed 2026-11-20.
13. package_search "events", data.gov.lv, https://data.gov.lv/dati/api/3/action/package_search?q=events&rows=50, accessed 2026-11-20.
14. package_search "kultūra", data.gov.lv, https://data.gov.lv/dati/api/3/action/package_search?q=kult%C5%ABra&rows=50, accessed 2026-11-20.
15. LIAA pasākumu kalendārs, data.gov.lv, https://data.gov.lv/dati/api/3/action/package_show?id=liaa-pasakumu-kalendars, accessed 2026-11-20.
16. Kultūras karte home (unreachable), Kultūras ministrija, https://www.kulturaskarte.lv/, accessed 2026-11-20.
17. Visi pasākumi, Biļešu Serviss, https://www.bilesuserviss.lv/biletes/visi, accessed 2026-11-20.
18. Fatboy Slim, Crave Night @ Palladium, Biļešu Serviss, https://www.bilesuserviss.lv/biletes/WAHYBEP5O7/fatboy-slim-crave-night-palladium, accessed 2026-11-20.
19. robots.txt, Biļešu Serviss, https://www.bilesuserviss.lv/robots.txt, accessed 2026-11-20.
20. Sitemap index, Biļešu Serviss, https://www.bilesuserviss.lv/sitemap/index.xml, accessed 2026-11-20.
21. EVENT_1.xml, Biļešu Serviss, https://www.bilesuserviss.lv/sitemap/EVENT_1.xml, accessed 2026-11-20.
22. Noteikumi, Biļešu Serviss, https://www.bilesuserviss.lv/vispareja-informacija/howtobuy/408/noteikumi, accessed 2026-11-20.
23. Xiaomi Arena tickets, Live Nation Estonia, https://www.livenation.ee/en/xiaomi-arena-tickets-vdp1646842, accessed 2026-11-20.
24. Home (Cloudflare challenge), Biļešu Paradīze, https://www.bilesuparadize.lv/lv, accessed 2026-11-20.
25. robots.txt, Biļešu Paradīze, https://www.bilesuparadize.lv/robots.txt, accessed 2026-11-20.
26. sitemap.xml, Biļešu Paradīze, https://www.bilesuparadize.lv/sitemap.xml, accessed 2026-11-20.
27. Home, ticketshop.lv, https://ticketshop.lv/lv, accessed 2026-11-20.
28. Baltic International Airshow 2027, ticketshop.lv, https://ticketshop.lv/lv/events/108000, accessed 2026-11-20.
29. sitemap_lv.xml, ticketshop.lv, https://ticketshop.lv/sitemap_lv.xml, accessed 2026-11-20.
30. robots.txt, ticketshop.lv, https://www.ticketshop.lv/robots.txt, accessed 2026-11-20.
31. Noteikumi, ticketshop.lv (SIA First Row Technology), https://ticketshop.lv/lv/terms, accessed 2026-11-20.
32. Public events API response, Fienta, https://fienta.com/api/v1/public/events?country=LV, accessed 2026-11-20.
33. Displaying events on your website, Fienta, https://fienta.com/help/displaying-events-on-your-website, accessed 2026-11-20.
34. For developers, Fienta, https://fienta.com/help/organisers/for-developers, accessed 2026-11-20.
35. Biļešu pircēja noteikumi, Fienta, https://fienta.com/lv/palidziba/juridiska/bilesu-pirceja-noteikumi, accessed 2026-11-20.
36. robots.txt, Fienta, https://fienta.com/robots.txt, accessed 2026-11-20.
37. Riga all events (WAF page), Eventbrite, https://www.eventbrite.com/d/latvia--riga/all-events/, accessed 2026-11-20.
38. robots.txt, Eventbrite, https://www.eventbrite.com/robots.txt, accessed 2026-11-20.
39. Event Search API to be Shut Down on Dec 12, 2019, Eventbrite API Google Group, https://groups.google.com/g/eventbrite-api/c/FT2MsDswdrA, accessed 2026-11-20.
40. Eventbrite Terms of Service, Eventbrite, https://www.eventbrite.com/help/en-us/articles/251210/, accessed 2026-11-20.
41. Home, eKase.lv, https://www.ekase.lv/, accessed 2026-11-20.
42. Home, Aula.lv, https://www.aula.lv/, accessed 2026-11-20.
43. Home, TicketStore.lv, https://ticketstore.lv/, accessed 2026-11-20.
44. robots.txt, Delfi, https://www.delfi.lv/robots.txt, accessed 2026-11-20.
45. robots.txt, TVNET, https://www.tvnet.lv/robots.txt, accessed 2026-11-20.
46. Kas notiek Latvijā? Kalendārs (403), LSM, https://www.lsm.lv/kas-notiek-latvija/kalendars/, accessed 2026-11-20.
47. robots.txt, Jauns.lv, https://jauns.lv/robots.txt, accessed 2026-11-20.
48. Iesaka: pasākumi, 1188.lv, https://www.1188.lv/iesaka/pasakumi, accessed 2026-11-20.
49. Schedule feed, Apollo Kino, https://www.apollokino.lv/xml/Schedule, accessed 2026-11-20.
50. TheatreAreas feed, Apollo Kino, https://www.apollokino.lv/xml/TheatreAreas, accessed 2026-11-20.
51. robots.txt, Apollo Kino, https://www.apollokino.lv/robots.txt, accessed 2026-11-20.
52. Schedule feed, Forum Cinemas, https://www.forumcinemas.lv/xml/Schedule/, accessed 2026-11-20.
53. robots.txt, Forum Cinemas, https://www.forumcinemas.lv/robots.txt, accessed 2026-11-20.
54. robots.txt, Cinamon, https://www.cinamonkino.com/robots.txt, accessed 2026-11-20.
55. Home, Splendid Palace, https://www.splendidpalace.lv/lv, accessed 2026-11-20.
56. Home, Kino Bize, https://www.kinobize.lv/, accessed 2026-11-20.
57. Home and robots.txt, Xiaomi Arena, https://xiaomi-arena.com/ and https://xiaomi-arena.com/robots.txt, accessed 2026-11-20.
58. Kalendārs and robots.txt, Latvijas Nacionālā opera un balets, https://www.opera.lv/lv/kalendars/ and https://www.opera.lv/robots.txt, accessed 2026-11-20.
59. LNSO, Brāmsa Pirmais un Mālera Piektā, LNSO, https://www.lnso.lv/event-list/lnso-bramsa-pirmais-un-malera-piekta/, accessed 2026-11-20.
60. robots.txt, LNSO, https://www.lnso.lv/robots.txt, accessed 2026-11-20.
61. Home and robots.txt, Dailes teātris, https://www.dailesteatris.lv/lv/ and https://www.dailesteatris.lv/robots.txt, accessed 2026-11-20.
62. Home and wp-json, Latvijas Nacionālais teātris, https://teatris.lv/ and https://teatris.lv/wp-json/, accessed 2026-11-20.
63. robots.txt, Jaunais Rīgas teātris, https://www.jrt.lv/robots.txt, accessed 2026-11-20.
64. robots.txt, Latvijas Nacionālais mākslas muzejs, https://lnmm.gov.lv/robots.txt, accessed 2026-11-20.
65. Pasākumi and wp/v2/events, Mežaparka Lielā estrāde, https://estrade.riga.lv/pasakumi/ and https://estrade.riga.lv/wp-json/wp/v2/events?per_page=5, accessed 2026-11-20.
66. Home, Palladium Riga, https://www.palladium.lv/, accessed 2026-11-20.
67. API documentation, Bandsintown, https://help.artists.bandsintown.com/en/articles/9186477-api-documentation, accessed 2026-11-20.
68. Can I have access to the API if I'm not an artist, Bandsintown, https://help.artists.bandsintown.com/en/articles/3372745-can-i-have-access-to-the-api-and-an-api-key-if-i-m-not-an-artist, accessed 2026-11-20.
69. Developer, Songkick, https://www.songkick.com/developer, accessed 2026-11-20.
70. Riga metro area (406), Songkick, https://www.songkick.com/metro-areas/30848-latvia-riga, accessed 2026-11-20.
71. Discovery API v2, Ticketmaster, https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/, accessed 2026-11-20.
72. Riga events (403), Resident Advisor, https://ra.co/events/lv/riga, accessed 2026-11-20.
73. robots.txt, Resident Advisor, https://ra.co/robots.txt, accessed 2026-11-20.
74. Terms of use, Resident Advisor, https://ra.co/terms, accessed 2026-11-20.
75. Facebook API Platform Product Changes (2018-04-04), Meta for Developers, https://developers.facebook.com/blog/post/2018/04/04/facebook-api-platform-product-changes/, accessed 2026-11-20.
76. API general, Meetup, https://www.meetup.com/api/general/, accessed 2026-11-20.
77. Directive 96/9/EC on the legal protection of databases, EUR-Lex, https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:31996L0009, accessed 2026-11-20.
78. Judgment C-762/19 CV-Online Latvia v Melons, EUR-Lex, https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:62019CJ0762, accessed 2026-11-20.
79. Judgment C-30/14 Ryanair v PR Aviation, EUR-Lex, https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:62014CJ0030, accessed 2026-11-20.
80. Autortiesību likums, Wikisource, https://wikisource.org/wiki/Autorties%C4%ABbu_likums, accessed 2026-11-20.


---

## 3B. Event sources: cities, regions and niche communities

Scope: municipal calendars, city tourism portals, regional concert halls, planning-region portals and niche communities. National aggregators, ticket sellers, cinemas and big Rīga venues are in section 3A. All probes ran on 2026-11-20 with `curl -A "Mozilla/5.0 (research; event-app-feasibility)"`, at most about 5 requests per site.

### Key findings

- Latvia has 42 local governments (35 novadi and 7 valstspilsētas). Varakļāni stopped existing on 1 July 2025 and joined Madona ([Wikipedia, Administrative divisions of Latvia](https://en.wikipedia.org/wiki/Administrative_divisions_of_Latvia)).
- 24 municipalities share one website platform. Their domains resolve to one IP address (212.70.163.179), the same address as the platform operator mk.gov.lv (DNS lookup, 2026-11-20). 18 of them show the same calendar path `/lv/notikumu-kalendars` in search results (snippet, unverified). One adapter could cover 24 of 42 municipalities, Rīga and Jūrmala included. Every host on that IP timed out in the TLS handshake from this environment and from WebFetch, so robots.txt, fields and terms are not verified.
- 7 sources outside that platform publish machine-readable events with real dates. They cover 6 municipalities: Daugavpils (JSON-LD and iCal), Liepāja (JSON-LD plus per-event iCal), Jūrmala (Dzintaru koncertzāle, The Events Calendar REST), Alūksne (The Events Calendar REST), Saulkrasti (Events Manager iCal) and Rēzekne (iCal, blocked by robots.txt).
- WordPress is the second repeated pattern. 3 sites run The Events Calendar, 2 run Events Manager, 1 runs WP Event Manager. A generic WordPress-plugin adapter covers 6 sites. 4 more WordPress sites expose an events post type over REST, and jelgava.lv over RSS, without the event date.
- One small CMS (generator tag "KPanel") runs both visit.jekabpils.lv and visit.bauska.lv with the same URL scheme `/pasakumi/YYYY-MM-DD/ID`. One adapter fits both.
- 5 event hosts disallow all generic crawlers in robots.txt: rezekne.lv, salaspils.lv, lof.lv, skriesim.lv and estlatbl.com. 4 more return a Cloudflare 403 page to curl: ventspils.lv, visitventspils.com, rothkomuseum.com and rigazoo.lv. These need permission or manual entry.
- Planning-region and regional tourism portals add little. An event calendar was not found for Kurzeme or Zemgale. latgale.travel lists 17 items and the Vidzeme planning region 7.
- Niche events are mostly recurring schedules or social posts, not feeds. Kalnciema kvartāls runs every Saturday 10:00 to 16:00. UniCon (Latvia's Comic Con) runs twice a year. Perfume workshops are sold as undated gift vouchers. Board game, anime and collector meetups are announced on Facebook and Instagram (snippet, unverified).
- New Latvian aggregators exist for niches: blusa.eu (flea markets), pasakumiii.lv (20 schema.org Events on one page), noskrien.lv (running). They are competitors or partners, not primary sources.

### Summary tables

Legend. Access: JSON-LD = schema.org Event in HTML; TEC = The Events Calendar REST `/wp-json/tribe/events/v1/events`; EM = Events Manager; WP REST = `/wp-json/wp/v2/<type>`. Counts are upcoming items seen on 2026-11-20 unless marked "total".

#### Table 1. Ten cities in depth

The ten are the six valstspilsētas outside Rīga plus Valmiera, Jēkabpils, Ogre and Cēsis. A population ranking was not checked.

| City | Source and operator | Access | Count | Fields | robots.txt | Priority, difficulty |
|---|---|---|---|---|---|---|
| Daugavpils | [daugavpils.lv/afisa](https://www.daugavpils.lv/afisa/), municipality | JSON-LD ItemList of Event | 20 current + 24 long-running | name, url, image, startDate (date only), endDate (with time), venue, postcode. No price, no ticket link | Allow for `*`; ClaudeBot, CCBot and other AI bots blocked by name ([robots](https://www.daugavpils.lv/robots.txt)) | P1, low |
| Daugavpils | [visitdaugavpils.lv/pasakumi](https://www.visitdaugavpils.lv/pasakumi/), tourism portal | EM iCal [/events.ics](https://www.visitdaugavpils.lv/events.ics) | 169 VEVENT | start, end (TZID Europe/Riga), title, URL | Event paths allowed; `/feed/` disallowed ([robots](https://www.visitdaugavpils.lv/robots.txt)) | P1, low |
| Liepāja | [kalendars.liepaja.lv](https://kalendars.liepaja.lv/lv/), municipality | JSON-LD Event on detail pages; per-event iCal `ical.php?event=&day=` | 25 events on first view | ISO start and end with offset, description, image, venue, price range, ticket button ([example](https://kalendars.liepaja.lv/lv/2026-11-21:50526:210658/)) | No robots.txt (HTML returned) | P1, low |
| Liepāja | [liepaja.travel](https://liepaja.travel/notikumu-kalendars/), tourism | Links to kalendars.liepaja.lv | n/a | n/a | Allow | P3 (duplicate) |
| Jelgava | [jelgava.lv/pasakumi](https://www.jelgava.lv/pasakumi/), municipality, WordPress | HTML; [RSS](https://www.jelgava.lv/pasakumi/feed/) has 12 items by publish date; post type not in [REST](https://www.jelgava.lv/wp-json/wp/v2/types) | 42 | date and time without year, venue and address, price, image, category, organizer ([example](https://www.jelgava.lv/pasakumi/deju-kolektivu-koncerts-rudens-danci-2/)) | Allow, Crawl-delay 5 | P1, medium |
| Jelgava | [visit.jelgava.lv](https://visit.jelgava.lv/), Joomla | Monthly news article, no calendar | n/a | n/a | Allow | P3 |
| Jūrmala | jurmala.lv, shared platform | Unreachable (TLS timeout) | not found | not found | not found | P1 if reachable |
| Jūrmala | [Dzintaru koncertzāle](https://dzintarukoncertzale.lv/) | [TEC REST](https://dzintarukoncertzale.lv/wp-json/tribe/events/v1/events?per_page=3) and `?ical=1` | 106 (total upcoming) | title, start, end, cost, URL, ticket URL (bilesuparadize.lv), image, venue object | Allow for `*`; AI bots blocked by name | P1, low |
| Ventspils | ventspils.lv and visitventspils.com | Cloudflare 403 "Attention Required" | not found | not found | not readable | P2, high |
| Ventspils | [Jūras vārti](https://jurasvarti.lv/), theatre house, WordPress | HTML; Yoast WebPage JSON-LD only ([example](https://jurasvarti.lv/pasakums/2027-igo-65-labakas-dziesmas/)) | 32 | title, date, ticket link | Allow | P2, medium |
| Rēzekne | [rezekne.lv/events](https://rezekne.lv/events/), municipality | TEC with `?ical=1`, 19 JSON-LD Events on listing | 19 | full TEC set | `Disallow: /` for `*`; only Googlebot, Bingbot, facebookexternalhit, Twitterbot allowed ([robots](https://rezekne.lv/robots.txt)) | P1 after written permission, low |
| Rēzekne | [visit.rezekne.lv/events](https://visit.rezekne.lv/events/), tourism | [WP REST event_listing](https://visit.rezekne.lv/wp-json/wp/v2/event_listing?per_page=2) | 62 (total) | title, content, link, type taxonomy. Event date not in REST | Allow | P2, medium |
| Valmiera | [visit.valmiera.lv/pasakumi](https://visit.valmiera.lv/pasakumi/) and [valmierasnovads.lv norišu kalendārs](https://www.valmierasnovads.lv/aktualitates/norisu-kalendars/) | [WP REST events](https://visit.valmiera.lv/wp-json/wp/v2/events?per_page=2) on both | 9,023 posts (total, all years) | title, content, link, image, events_type, territory. Event date only in HTML | Allow | P1, medium |
| Jēkabpils | jekabpils.lv, shared platform | Unreachable | not found | not found | not found | P1 if reachable |
| Jēkabpils | [visit.jekabpils.lv](https://visit.jekabpils.lv/lv/visi-pasakumi/), KPanel | HTML, date in URL | 42 | date, ID, title | Allow except `/core/`, `/ienakt/` | P1, medium |
| Jēkabpils | [jkp.lv kalendārs](https://www.jkp.lv/sakums/kalendars/), culture board, WordPress | HTML | not counted | not checked | Crawl-delay 5 | P3 |
| Ogre | ogresnovads.lv, shared platform | Unreachable | not found | not found | not found | P1 if reachable |
| Ogre | [okultura.lv/lv/pasakumi](https://www.okultura.lv/lv/pasakumi/), culture centre | HTML, custom CMS | 49 | title, date, hall | No robots.txt | P2, medium |
| Cēsis | [pasakumi.cesis.lv](http://pasakumi.cesis.lv/), municipality, WordPress by Grandem | HTML plus `admin-ajax.php` actions `pces_loadmore`, `pces_filter` with a nonce; JS template uses `event.url`, `event.ticket_url` | 177 event links on front page | title, date, ticket URL | Allow | P1, medium |
| Cēsis | [cesis.lv pasākumi](https://www.cesis.lv/lv/kultura-73495/pasakumi/) | Festival pages, links to pasakumi.cesis.lv | n/a | n/a | Allow | P3 |

#### Table 2. Other listed cities, one row each

| City | Best source | Access and notes | robots.txt | Priority, difficulty |
|---|---|---|---|---|
| Sigulda | sigulda.lv/pasakumi, tourism.sigulda.lv/events | Both unreachable (TLS timeout) | not found | P2, unknown |
| Kuldīga | [kalendars.kuldigasnovads.lv](https://kalendars.kuldigasnovads.lv/), WordPress with ova-events plugin | HTML, 27 event links, no JSON-LD, event type not in REST | Allow; main site kuldigasnovads.lv has Crawl-delay 10 and disallows `/wp-json/` | P2, medium |
| Talsi | talsunovads.lv (shared platform); [visittalsi.com/pasakumi](https://visittalsi.com/pasakumi/) | WordPress HTML, 13 events | Allow | P2, medium |
| Tukums | tukums.lv (shared platform); [visittukums.lv](https://visittukums.lv/lv/Pasakumi) | Custom HTML, 13 events | No robots.txt | P2, medium |
| Bauska | bauskasnovads.lv (shared platform); [visit.bauska.lv](https://visit.bauska.lv/lv/pasakumi/) | KPanel, same adapter as Jēkabpils | Allow | P2, low after KPanel adapter |
| Dobele | dobele.lv (shared platform); [visitdobele.lv/pasakumi](https://visitdobele.lv/pasakumi) | Custom HTML, 28 events, URL `/pasakumi/<id>/<slug>` | Allow | P2, medium |
| Smiltene | smiltenesnovads.lv (shared platform); [visit.smiltene.lv](https://visit.smiltene.lv/) links there | Platform only | Allow | P1 via platform |
| Madona | [madona.lv/lat/pasakumi](https://www.madona.lv/lat/pasakumi) | Custom HTML, 14 events, `?fu=read&id=` | Allow | P2, medium |
| Gulbene | gulbene.lv (shared platform); [visitgulbene.lv](https://www.visitgulbene.lv/) has no events path (404) | Platform only | Allow | P1 via platform |
| Alūksne | [aluksne.lv](https://aluksne.lv/), WordPress with TEC | [TEC REST](https://aluksne.lv/index.php/wp-json/tribe/events/v1/events?per_page=2), 18 upcoming; venue often null | Allow | P1, low |
| Limbaži | limbazunovads.lv (shared platform); [visitlimbazi.lv](https://visitlimbazi.lv/lv/pasakumi-drizuma) has a submit form | Platform only | No robots.txt | P1 via platform |
| Ludza | ludzasnovads.lv (shared platform); [visitludza.lv/pasakumi](https://visitludza.lv/pasakumi/) shows a 2023 page | Stale tourism page | Allow | P1 via platform |
| Krāslava | kraslava.lv and visitkraslava.com, both on the shared IP | Unreachable | not found | P1 via platform |
| Saulkrasti | [saulkrasti.lv](https://saulkrasti.lv/), WordPress with EM | [iCal](https://saulkrasti.lv/events.ics), 28 VEVENT; [visitsaulkrasti.lv REST](https://www.visitsaulkrasti.lv/wp-json/wp/v2/notikums?per_page=2) 43 total without dates | Allow for `*`; AI bots blocked by name | P1, low |
| Salaspils | [salaspils.lv](https://www.salaspils.lv/), Drupal 8 | No event calendar found on homepage | `Disallow: /` for `*` | P3, blocked |
| Mārupe | marupe.lv (shared platform) | Unreachable | not found | P1 via platform |
| Ķekava | kekava.lv | Unreachable (TLS timeout, separate host) | not found | P2, unknown |
| Ādaži | adazunovads.lv (shared platform) | Unreachable | not found | P1 via platform |

#### Table 3. Regional concert halls and culture centres

Most halls sell through Biļešu paradīze or Biļešu serviss. Section 3A adapters may already capture them, so these are deduplication targets.

| Venue | URL | Access | Count | robots.txt | Priority, difficulty |
|---|---|---|---|---|---|
| Lielais dzintars, Liepāja | [lielaisdzintars.lv/lv/kalendars](https://lielaisdzintars.lv/lv/kalendars) | Custom HTML | 30 | Allow | P2, medium |
| Latgales vēstniecība GORS, Rēzekne | [latgalesgors.lv/lv/notikumi](https://www.latgalesgors.lv/lv/notikumi). gors.lv belongs to an unrelated aluminium company | Drupal HTML | not counted | Crawl-delay 10 ([robots](https://www.latgalesgors.lv/robots.txt)) | P2, medium |
| Vidzemes koncertzāle "Cēsis" | [cesukoncertzale.lv](https://www.cesukoncertzale.lv/) | Custom HTML | not counted | Allow for `*`; AI bots blocked | P2, medium |
| Dzintaru koncertzāle | See Table 1 | TEC REST | 106 | Allow | P1, low |
| Jūras vārti, Ventspils | See Table 1 | HTML | 32 | Allow | P2, medium |
| Daugavpils Marka Rotko mākslas centrs | Now rothkomuseum.com; rothkocenter.com root returns 404 | Cloudflare 403 | not found | not readable | P3; Rotko events already appear in daugavpils.lv JSON-LD |
| Valmieras teātris | [valmierasteatris.lv](https://valmierasteatris.lv/) | WordPress HTML, `/izrade/<slug>/` | not counted | Allow | P2, medium |

#### Table 4. Planning regions and regional tourism portals

| Region | URL | Events | Priority |
|---|---|---|---|
| Vidzeme | [vidzeme.lv](https://www.vidzeme.lv/pasakumi/2026/11) (planning region) | 7 items, mostly region projects | P3 |
| Vidzeme | [vidzeme.com](https://vidzeme.com/) (tourism) | Event calendar not found | P3 |
| Gauja area | [entergauja.com](https://www.entergauja.com/) | News and events section `/lv/jaunumi-un-notikumi/notikumi` | P3 |
| Kurzeme | [kurzemesregions.lv](https://kurzemesregions.lv/) | Event calendar not found | none |
| Zemgale | zemgale.lv, on the shared IP | Unreachable | not found |
| Latgale | [latgale.travel/notikumi](https://latgale.travel/notikumi/) | 17 items, WordPress, no event REST type | P3 |
| Latgale | visitlatgale.com | 403 | not found |

#### Table 5. Repeated CMS patterns

| Pattern | Sites | Adapter |
|---|---|---|
| Shared state and municipal platform, path `/lv/notikumu-kalendars` | 24 municipalities: Ādaži, Aizkraukle, Balvi, Bauska, Dienvidkurzeme, Dobele, Gulbene, Jēkabpils, Jelgavas novads, Jūrmala, Krāslava, Limbaži, Līvāni, Ludza, Mārupe, Ogre, Preiļi, Rīga, Ropaži, Smiltene, Talsi, Tukums, Valka, Ventspils novads | One adapter. Snippets show "Datums", "Laiks", "Atrašanās vieta" and a `?categories=` filter (snippet, unverified) |
| WordPress The Events Calendar | rezekne.lv, aluksne.lv, dzintarukoncertzale.lv | One adapter: REST or `?ical=1` |
| WordPress Events Manager | visitdaugavpils.lv, saulkrasti.lv | One adapter: `/events.ics` |
| WordPress custom post types without event dates | REST: visit.valmiera.lv, valmierasnovads.lv, visit.rezekne.lv, visitsaulkrasti.lv. RSS: jelgava.lv | REST or RSS for discovery, HTML detail page for dates |
| KPanel | visit.jekabpils.lv, visit.bauska.lv | One HTML adapter |
| Custom calendars | kalendars.liepaja.lv, daugavpils.lv, okultura.lv, madona.lv, visitdobele.lv, visittukums.lv, lielaisdzintars.lv | One adapter each |

#### Table 6. Niche communities

| Niche | Main sources | Machine-readable? | Where announced | Priority |
|---|---|---|---|---|
| Farmers' markets | [Kalnciema kvartāls](https://www.kalnciemaiela.lv/): Saturdays 10:00 to 16:00; Christmas market Saturdays 28 Nov to 26 Dec 2026. [Rīgas Centrāltirgus](https://centraltirgus.lv/): news section only | No | Own site, newsletter | Seed as recurring rules |
| Regional and Christmas markets | Municipal calendars (for example a Gulbene second-hand market, snippet, unverified); Ventspils extended market days on visitventspils.com (snippet, unverified) | Through municipal adapters | Municipal sites | Covered by P1 adapters |
| Flea markets | Latgalīte: daily market on Firsa Sadovņikova iela (snippet, unverified). [Spīķeri krāmu tirgus](https://www.spikeri.lv/notikumi/rigas-kramu-tirgus-2026/): Lastādijas iela 8, 10:00 to 16:00, free. [blusa.eu](https://blusa.eu/markets): flea market calendar, React app, no public API found | blusa.eu only, no feed | Facebook, blusa.eu | Seed; ask blusa.eu for a feed |
| Collector fairs | coinstore.lv names a collector meeting at ATTA Centre on 08.11.2026 (snippet, unverified). Vinyl and stamp fairs: not found | No | Shop sites, Facebook | Seed manually |
| Anime, cosplay, comics | [UniCon](https://unicon.lv/lv): UniCon Winter 8 to 10 January 2027 at Ķīpsala; summer edition in August. Facebook page about 7,700 followers, Instagram about 14,000 (snippet, unverified) | No (Webflow site) | UniCon site, Facebook, Instagram, ticket sellers | Seed |
| Board games | [Brain Games pasākumi](https://www.brain-games.lv/blogs/pasakumi): Shopify blog with Atom feed `/blogs/pasakumi.atom`, but dates are in post text. Facebook page about 24,800 followers (snippet, unverified) | Partial | Brain Games blog, Facebook | P3 |
| Esports, LAN | Federation site esportstev.lv shows news, no calendar (snippet, unverified). LSM reports CS2 tournaments in Ventspils and Rīga (snippet, unverified) | No | Discord, Facebook | Seed per event |
| Perfume and beauty | Perfume workshops (BONNE, Latvian Aroma-Essence) are booked on request or sold as gift vouchers on davanuserviss.lv and lieliskadavana.lv (snippet, unverified). [BT1 fair list](https://www.bt1.lv/?link=00700000) covers Baltic Beauty (Ķīpsala, November) | No dated events for workshops | Facebook, gift voucher sites | Seed fairs only |
| Craft workshops | [Art&Wine](https://artandwine.club/lv/artwine) (Tilda site; also sells on Biļešu serviss), [LeMade](https://www.lemade.lv/nodarbibas) (own calendar, weekly Tuesday 19:00 group), Rozenthal studio | No | Own booking pages | P3, or via ticket sellers |
| Family | Rīga ZOO "Ziemas naktis" 18 Dec 2026 to 10 Jan 2027 (snippet, unverified; rigazoo.lv returns 403). [Kids Expo Riga](https://www.bt1.lv/?link=00700000) 6 to 7 March 2027 | No | Zoo site, riga.lv | Seed |
| Running, trail | [Rimi Rīgas maratons](https://rimirigamarathon.com/lv/) 15 to 16 May 2027. [Stirnu buks](https://www.stirnubuks.lv/): 2026 season ended 10 October in Priekuļi with 3,695 runners; 2027 dates not found. [noskrien.lv kalendārs](https://www.noskrien.lv/kalendars/): community running calendar. [skriesim.lv](https://skriesim.lv/calendar) blocks crawlers | No | Organiser sites | Seed; noskrien.lv P3 |
| Orienteering | [LOF kalendārs](https://lof.lv/os-kalendars) with RSS `rss2.php` | RSS (news) | LOF site | Permission needed: `Disallow: /` for `*` ([robots](https://lof.lv/robots.txt)) |
| Hockey | [LHF Optibet Hokeja līga spēles](https://www.lhf.lv/lv/turniri/optibet-hokeja-liga/speles): date, time, teams, arena in HTML | HTML | LHF | P2, medium |
| Basketball | [estlatbl.com kalendārs](https://www.estlatbl.com/lv/schedule): date, time, venue | HTML | League site | Permission needed: `Disallow: /` for `*`, Crawl-delay 30 ([robots](https://www.estlatbl.com/robots.txt)) |
| Football | Virslīga schedule: not checked | not found | not found | Open question |
| Light shows | [Staro Rīga](https://staroriga.lv/en/home/) 15 to 18 November 2026, 17:00 to 23:00 (passed); 2027 dates not found. Regional light festivals: not found | No | riga.lv, Live Riga | Seed yearly |

### Notes

Network caveat. TLS handshakes to 212.70.163.179 timed out from curl and from WebFetch. The same happened for likumi.lv, varam.gov.lv, valmiera.lv, sigulda.lv, kekava.lv, visitogre.lv and visitjurmala.lv. Other Latvian hosts answered normally from the same machine. The cause is unknown (likely a firewall that rejects some client fingerprints or address ranges). Next step: open one platform calendar (for example ogresnovads.lv/lv/notikumu-kalendars) in a normal browser and from the planned production server. Then read its robots.txt and check for an RSS or JSON view. The 24-municipality adapter depends on that test.

Data quality. daugavpils.lv writes `startDate` as a bare date with a trailing space and puts the time only in `endDate`. jelgava.lv shows "28.11. 17:00" with no year. visit.valmiera.lv exposes 9,023 event posts over REST, but the REST date is the publish date. These sources need date parsing from HTML and year inference. kalendars.liepaja.lv is the cleanest: ISO dates with a +02:00 offset.

Duplicates. Daugavpils events appear twice (daugavpils.lv and visitdaugavpils.lv). Valmiera events appear on visit.valmiera.lv and valmierasnovads.lv. Saulkrasti appears on saulkrasti.lv and visitsaulkrasti.lv. Concert halls also appear on ticket sellers. Deduplicate on normalised title, start time and venue.

AI-bot rules. daugavpils.lv, dzintarukoncertzale.lv, cesukoncertzale.lv, saulkrasti.lv and rigazoo.lv block ClaudeBot, CCBot, Bytespider and similar by name but allow `*`. pasakumiii.lv adds a Content-Signal line `ai-train=no`. The app crawler should send its own product User-Agent with a contact page. It should not reuse an AI crawler name.

Terms. Few event pages link to terms. The Liepāja calendar terms ([noteikumi](https://kalendars.liepaja.lv/lv/noteikumi/)) say its purpose is to "vienkopus apkopot Liepājā notiekošos pasākumus" and to allow sharing. They give no explicit reuse licence. visitdaugavpils.lv requires a hyperlink on republication: "pārpublicēšanas gadījumā hipersaite uz portālu visitdaugavpils.lv ir obligāta". daugavpils.lv shows "All rights reserved". Dzintaru koncertzāle links only house rules. For all other sources a terms page was not found. Linking back to each original page fits the visitdaugavpils.lv condition. Store titles and dates and short summaries. Do not copy full descriptions or images without permission.

Update frequency. Newest items were published on 19 November 2026 on visit.valmiera.lv, visit.rezekne.lv and visitsaulkrasti.lv. The Jelgava events RSS shows items from 16 and 17 November 2026. Other sources were not measured. A daily crawl at night, with the stated crawl delays (Jelgava and jkp.lv 5 s, rezeknesnovads.lv 2 s, GORS 10 s), fits all sources.

Submission channels. kalendars.liepaja.lv has "Pievienot savu pasākumu" and visitlimbazi.lv has "piesaki-pasakumu". Organisers already submit to municipal calendars. The app can point small organisers there and avoid running its own moderation in v1.

### Curated seed list

These sources have no feasible adapter in v1. Enter them by hand, as recurring rules where possible, each with a link to the original page.

1. Kalnciema kvartāls market, Kalnciema iela 35, Rīga (address: snippet, unverified). Every Saturday 10:00 to 16:00. Christmas market Saturdays 28 Nov to 26 Dec 2026 ([kalnciemaiela.lv](https://www.kalnciemaiela.lv/)). Category: Zemnieku tirdziņi.
2. Spīķeri krāmu tirgus, Lastādijas iela 8, Rīga. 10:00 to 16:00, free. Dates per season from [spikeri.lv](https://www.spikeri.lv/notikumi/rigas-kramu-tirgus-2026/). Category: Blusu tirgi.
3. Latgalīte (Latgales tirgus), Firsa Sadovņikova iela 9A, Rīga. Daily market (address and schedule: snippet, unverified). Category: Blusu tirgi.
4. UniCon Winter 2027, Ķīpsala, 8 to 10 January 2027 ([unicon.lv](https://unicon.lv/lv)). UniCon summer edition, August (2027 dates not found). Category: Nišas (anime, spēles).
5. Rimi Rīgas maratons, 15 to 16 May 2027 ([rimirigamarathon.com](https://rimirigamarathon.com/lv/)). Category: Sports.
6. Stirnu buks trail series. 2027 dates not found. Check [stirnubuks.lv](https://www.stirnubuks.lv/) in early 2027. Category: Sports.
7. LOF orienteering calendar. Ask LOF for permission or a feed ([lof.lv](https://lof.lv/os-kalendars)). Category: Sports.
8. Latvian-Estonian basketball league home games of Latvian clubs. Ask the league for permission ([estlatbl.com](https://www.estlatbl.com/lv/schedule)). Category: Sports.
9. Rīga ZOO "Ziemas naktis", 18 Dec 2026 to 10 Jan 2027 (snippet, unverified). Category: Ģimenēm.
10. BT1 fairs at Ķīpsala: Balttour 5 to 7 Feb 2027, Skola 18 to 20 Feb 2027, Kids Expo Riga 6 to 7 Mar 2027 ([bt1.lv](https://www.bt1.lv/?link=00700000)). Baltic Beauty each November. Categories: Ģimenēm, Nišas (smaržas).
11. Staro Rīga, each November around 18 November. 2027 dates not found ([staroriga.lv](https://staroriga.lv/en/home/)). Category: Ģimenēm.
12. Brain Games board game nights and tournaments ([blog](https://www.brain-games.lv/blogs/pasakumi)). Category: Nišas (spēles).
13. Art&Wine and LeMade open workshops ([artandwine.club](https://artandwine.club/lv/artwine), [lemade.lv](https://www.lemade.lv/nodarbibas)). Category: Darbnīcas.
14. Rēzekne municipal calendar. Request written permission, since its robots.txt blocks all generic crawlers ([rezekne.lv/events](https://rezekne.lv/events/)).
15. Ventspils city and tourism calendars. Request access, since Cloudflare blocks automated requests.
16. blusa.eu. Ask for a partner feed of flea and car-boot markets ([blusa.eu/markets](https://blusa.eu/markets)).

### Sources

1. Administrative divisions of Latvia. Wikipedia. https://en.wikipedia.org/wiki/Administrative_divisions_of_Latvia. Accessed 2026-11-20.
2. Pasākumi (afiša). Daugavpils valstspilsētas pašvaldība. https://www.daugavpils.lv/afisa/. Accessed 2026-11-20.
3. robots.txt. daugavpils.lv. https://www.daugavpils.lv/robots.txt. Accessed 2026-11-20.
4. Pasākumi. VisitDaugavpils. https://www.visitdaugavpils.lv/pasakumi/. Accessed 2026-11-20.
5. events.ics. VisitDaugavpils. https://www.visitdaugavpils.lv/events.ics. Accessed 2026-11-20.
6. robots.txt. visitdaugavpils.lv. https://www.visitdaugavpils.lv/robots.txt. Accessed 2026-11-20.
7. Liepājas pasākumu kalendārs. Liepājas valstspilsētas pašvaldība. https://kalendars.liepaja.lv/lv/. Accessed 2026-11-20.
8. Sarkangalvīte 2+ (event page). Liepājas pasākumu kalendārs. https://kalendars.liepaja.lv/lv/2026-11-21:50526:210658/. Accessed 2026-11-20.
9. Lietošanas noteikumi. Liepājas pasākumu kalendārs. https://kalendars.liepaja.lv/lv/noteikumi/. Accessed 2026-11-20.
10. Notikumu kalendārs. Liepaja.travel. https://liepaja.travel/notikumu-kalendars/. Accessed 2026-11-20.
11. Pasākumi. Jelgavas valstspilsētas pašvaldība. https://www.jelgava.lv/pasakumi/. Accessed 2026-11-20.
12. Pasākumi RSS. jelgava.lv. https://www.jelgava.lv/pasakumi/feed/. Accessed 2026-11-20.
13. WP REST types. jelgava.lv. https://www.jelgava.lv/wp-json/wp/v2/types. Accessed 2026-11-20.
14. Deju kolektīvu koncerts "Rudens danči". jelgava.lv. https://www.jelgava.lv/pasakumi/deju-kolektivu-koncerts-rudens-danci-2/. Accessed 2026-11-20.
15. Visit Jelgava. Jelgavas tūrisma centrs. https://visit.jelgava.lv/. Accessed 2026-11-20.
16. Dzintaru koncertzāle. Dzintaru koncertzāle. https://dzintarukoncertzale.lv/. Accessed 2026-11-20.
17. TEC events API. Dzintaru koncertzāle. https://dzintarukoncertzale.lv/wp-json/tribe/events/v1/events?per_page=3. Accessed 2026-11-20.
18. Jūras vārti. Teātra nams "Jūras vārti". https://jurasvarti.lv/. Accessed 2026-11-20.
19. 2027 IGO 65 Labākās dziesmas (event page). Jūras vārti. https://jurasvarti.lv/pasakums/2027-igo-65-labakas-dziesmas/. Accessed 2026-11-20.
20. Events. Rēzeknes valstspilsētas pašvaldība. https://rezekne.lv/events/. Accessed 2026-11-20.
21. robots.txt. rezekne.lv. https://rezekne.lv/robots.txt. Accessed 2026-11-20.
22. Events. visit.rezekne.lv. https://visit.rezekne.lv/events/. Accessed 2026-11-20.
23. WP REST event_listing. visit.rezekne.lv. https://visit.rezekne.lv/wp-json/wp/v2/event_listing?per_page=2. Accessed 2026-11-20.
24. Pasākumi. Visit Valmiera. https://visit.valmiera.lv/pasakumi/. Accessed 2026-11-20.
25. WP REST events. Visit Valmiera. https://visit.valmiera.lv/wp-json/wp/v2/events?per_page=2. Accessed 2026-11-20.
26. Norišu kalendārs. Valmieras novada pašvaldība. https://www.valmierasnovads.lv/aktualitates/norisu-kalendars/. Accessed 2026-11-20.
27. Visi pasākumi. Visit Jēkabpils. https://visit.jekabpils.lv/lv/visi-pasakumi/. Accessed 2026-11-20.
28. Kalendārs. Jēkabpils Kultūras pārvalde. https://www.jkp.lv/sakums/kalendars/. Accessed 2026-11-20.
29. Pasākumi. Ogres novada Kultūras centrs. https://www.okultura.lv/lv/pasakumi/. Accessed 2026-11-20.
30. Pasākumi. Cēsu novada pašvaldība. http://pasakumi.cesis.lv/. Accessed 2026-11-20.
31. Pasākumi (kultūra). cesis.lv. https://www.cesis.lv/lv/kultura-73495/pasakumi/. Accessed 2026-11-20.
32. Kuldīgas novada pasākumu kalendārs. Kuldīgas novada pašvaldība. https://kalendars.kuldigasnovads.lv/. Accessed 2026-11-20.
33. Pasākumi. Visit Talsi. https://visittalsi.com/pasakumi/. Accessed 2026-11-20.
34. Pasākumi. Visit Tukums. https://visittukums.lv/lv/Pasakumi. Accessed 2026-11-20.
35. Pasākumi. Visit Bauska. https://visit.bauska.lv/lv/pasakumi/. Accessed 2026-11-20.
36. Pasākumi. Visit Dobele. https://visitdobele.lv/pasakumi. Accessed 2026-11-20.
37. Visit Smiltene. Smiltenes novada TIC. https://visit.smiltene.lv/. Accessed 2026-11-20.
38. Pasākumi. Madonas novada pašvaldība. https://www.madona.lv/lat/pasakumi. Accessed 2026-11-20.
39. Visit Gulbene. Gulbenes novada TIC. https://www.visitgulbene.lv/. Accessed 2026-11-20.
40. Alūksnes novada pašvaldība (homepage). aluksne.lv. https://aluksne.lv/. Accessed 2026-11-20.
41. TEC events API. aluksne.lv. https://aluksne.lv/index.php/wp-json/tribe/events/v1/events?per_page=2. Accessed 2026-11-20.
42. Pasākumi drīzumā. Visit Limbaži. https://visitlimbazi.lv/lv/pasakumi-drizuma. Accessed 2026-11-20.
43. Pasākumi. Visit Ludza. https://visitludza.lv/pasakumi/. Accessed 2026-11-20.
44. Saulkrastu novada pašvaldība (homepage). saulkrasti.lv. https://saulkrasti.lv/. Accessed 2026-11-20.
45. events.ics. saulkrasti.lv. https://saulkrasti.lv/events.ics. Accessed 2026-11-20.
46. WP REST notikums. Visit Saulkrasti. https://www.visitsaulkrasti.lv/wp-json/wp/v2/notikums?per_page=2. Accessed 2026-11-20.
47. Salaspils novada pašvaldība (homepage). salaspils.lv. https://www.salaspils.lv/. Accessed 2026-11-20.
48. Kalendārs. Iedzīvotājiem, Rēzeknes novada pašvaldība. https://rezeknesnovads.lv/iedzivotajiem/kalendars/. Accessed 2026-11-20.
49. Kalendārs. Koncertzāle "Lielais dzintars". https://lielaisdzintars.lv/lv/kalendars. Accessed 2026-11-20.
50. Notikumi. Latgales vēstniecība GORS. https://www.latgalesgors.lv/lv/notikumi. Accessed 2026-11-20.
51. robots.txt. latgalesgors.lv. https://www.latgalesgors.lv/robots.txt. Accessed 2026-11-20.
52. Vidzemes koncertzāle "Cēsis". cesukoncertzale.lv. https://www.cesukoncertzale.lv/. Accessed 2026-11-20.
53. Valmieras teātris. valmierasteatris.lv. https://valmierasteatris.lv/. Accessed 2026-11-20.
54. Pasākumi 2026/11. Vidzemes plānošanas reģions. https://www.vidzeme.lv/pasakumi/2026/11. Accessed 2026-11-20.
55. Vidzeme tourism portal. vidzeme.com. https://vidzeme.com/. Accessed 2026-11-20.
56. Enter Gauja. entergauja.com. https://www.entergauja.com/. Accessed 2026-11-20.
57. Kurzemes plānošanas reģions. kurzemesregions.lv. https://kurzemesregions.lv/. Accessed 2026-11-20.
58. Notikumi. Latgale.travel. https://latgale.travel/notikumi/. Accessed 2026-11-20.
59. Kalnciema kvartāls. kalnciemaiela.lv. https://www.kalnciemaiela.lv/. Accessed 2026-11-20.
60. Rīgas Centrāltirgus. centraltirgus.lv. https://centraltirgus.lv/. Accessed 2026-11-20.
61. Rīgas krāmu tirgus 2026. Spīķeri. https://www.spikeri.lv/notikumi/rigas-kramu-tirgus-2026/. Accessed 2026-11-20.
62. Blusu tirgi kalendārs. Blusa.eu. https://blusa.eu/markets. Accessed 2026-11-20.
63. Ziemassvētku tirdziņi 2026. pasakumiii.lv. https://pasakumiii.lv/ziemassvetku-tirdzini. Accessed 2026-11-20.
64. UniCon Winter 2027. UniCon. https://unicon.lv/lv. Accessed 2026-11-20.
65. Izstāžu saraksti. BT 1. https://www.bt1.lv/?link=00700000. Accessed 2026-11-20.
66. Pasākumi. Brain Games LV. https://www.brain-games.lv/blogs/pasakumi. Accessed 2026-11-20.
67. Art&Wine atvērtās meistarklases. Art&Wine. https://artandwine.club/lv/artwine. Accessed 2026-11-20.
68. Nodarbības. LeMade School. https://www.lemade.lv/nodarbibas. Accessed 2026-11-20.
69. Rimi Rīgas maratons. rimirigamarathon.com. https://rimirigamarathon.com/lv/. Accessed 2026-11-20.
70. Stirnu buks. stirnubuks.lv. https://www.stirnubuks.lv/. Accessed 2026-11-20.
71. Kalendārs. noskrien.lv. https://www.noskrien.lv/kalendars/. Accessed 2026-11-20.
72. Kalendārs. skriesim.lv. https://skriesim.lv/calendar. Accessed 2026-11-20.
73. Kalendārs. Latvijas Orientēšanās federācija. https://lof.lv/os-kalendars. Accessed 2026-11-20.
74. robots.txt. lof.lv. https://lof.lv/robots.txt. Accessed 2026-11-20.
75. Optibet Hokeja līga, spēles. Latvijas Hokeja federācija. https://www.lhf.lv/lv/turniri/optibet-hokeja-liga/speles. Accessed 2026-11-20.
76. Kalendārs. Latvijas-Igaunijas Basketbola līga. https://www.estlatbl.com/lv/schedule. Accessed 2026-11-20.
77. robots.txt. estlatbl.com. https://www.estlatbl.com/robots.txt. Accessed 2026-11-20.
78. Staro Rīga, Home. Staro Rīga. https://staroriga.lv/en/home/. Accessed 2026-11-20.

Search snippets used and tagged "(snippet, unverified)" in the text: shared platform calendar pages such as ogresnovads.lv/lv/notikumu-kalendars, valka.lv joining the platform on 14 March 2023, mk.gov.lv platform description, Latgalīte opening hours, coinstore.lv collector meeting, UniCon and Brain Games follower counts, perfume workshop listings, Rīga ZOO winter schedule, esports reports. These pages were not opened.


---

## 4. Recommendation logic, geodata and search

### Key findings

- One additive score serves both home blocks: S = 0.30·D + 0.25·I + 0.15·F + 0.15·T + 0.10·P + 0.05·B, each term 0..1. The weights are starting values (opinion) tied to the evidence below.
- Distance should decay smoothly with a flat start. On Montreal commute data the "popular negative exponential decay function" fit worst, and log-logistic or Gaussian curves fit better ([Santana Palacios & El-Geneidy 2022](https://findingspress.org/article/32444.pdf)). 15 US arts organisations drew audiences from a median 10.5 and 9.5 miles (17 and 15 km) ([Ostrower & Marti 2025](https://wallacefoundation.org/sites/default/files/2025-10/proximity-and-performing-arts-attendance.doi_.10.59656%252FA-AD3981.001_0.pdf)).
- Latvians ask for cheaper and closer events. In the 2025 culture barometer (n=1,050), 46% named more free events and 34% more events closer to home ([LKA & SKDS 2025](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)).
- Reason labels should name content and facts. In Herlocker's 21-interface test (78 users), "Overall average rating" scored 3.94 of 7, below the 4.51 to 4.53 no-explanation baseline ([Herlocker et al. 2000](https://grouplens.org/site-content/uploads/explain-CSCW-20001.pdf)).
- Rīga's 58 apkaimes ([data.gov.lv](https://data.gov.lv/dati/eng/dataset/rigas_apkaimes)) and the daily VZD address register ([data.gov.lv](https://data.gov.lv/dati/lv/dataset/varis-atvertie-dati)) are open under CC BY 4.0. Public Nominatim bans client-side autocomplete ([OSMF](https://operations.osmfoundation.org/policies/nominatim/)).
- MiniSearch 7.2.0 wins the search test: 5.9 KB gzipped, 10 of 10 Latvian queries, 0.37 ms per query on 5,000 events. Fuse.js also scored 10 of 10 at 34 ms per query.
- `normalize('NFD')` plus stripping combining marks folds all 22 Latvian diacritic letters correctly in Node 26.
- Dedup blocks on date, venue within 200 m and start within 30 minutes. Trigram Jaccard ≥ 0.5 or a full token match merges, 0.3 to 0.5 goes to review. On 9 test pairs: 4 of 5 duplicates merged, 0 of 4 distinct events merged.

### 4.1 The score

| Term | Weight | Definition |
|---|---|---|
| D distance | 0.30 | 1 / (1 + (d / d50)²). Rīga: D = 1 inside the own apkaime. d50 × (1 + 0.4·B) |
| I interest | 0.25 | 1 if the primary category is a chosen chip, 0.5 for a secondary tag, else 0 |
| F family | 0.15 | "ar ģimeni": share of kids' age groups fully inside the event age range. Unknown 0.5. Other profiles 0.5 |
| T date | 0.15 | min(1, 0.5^(Δdays/7) + 0.1·W). W = 1 for Friday 17:00 to Sunday 23:59 |
| P price | 0.10 | Per person: free 1.0, ≤10 € 0.7, ≤25 € 0.4, >25 € 0.2, unknown 0.5 |
| B boost | 0.05 | max(editorial pick 1, min(1, (sources listing it − 1) / 3)) |

Hard filters run first. Past and cancelled events go. 18+ events go for families. Child-only events (maximum age ≤ 12) go for "viens" and "ar draugiem". "Tuvumā" shows only events with S ≥ 0.5, so it shows 1 to 3 cards. Ties after rounding S to 3 decimals: earlier start, shorter distance, more sources, lower id.

Evidence per component:

- Interest is the only taste signal v1 has. Minkov et al. found "collaborative ranking predictions of future events are more effective than pure content-based recommendation" ([Minkov et al. 2010](https://dspace.mit.edu/handle/1721.1/62811)). Collaborative signals need history, so they wait for v2. Macedo et al. combined content, RSVP, group, location and time-preference signals ([RecSys 2015](https://recsys.acm.org/recsys15/session-3/)). Their per-signal gains: not found.
- Date: 57% of US music tickets sold a week or less before the show in early 2024 ([Pollstar 2024](https://news.pollstar.com/2024/06/04/last-minute-ticket-buying-eventbrite-releases-study-at-niva-24/)). In the Nordics, 3,074,676 of "nearly seven million" 2023 to 2024 orders came in the final week, at least 44% ([MarketHype](https://www.markethype.io/en/blog-news/pickup-time-what-why-track)). A 7-day half-life fits. The weekend bonus is opinion. Latvian weekday data: not found.
- Price: free events are the top request, at 46% overall and 47% for ages 65 to 75 ([LKA & SKDS 2025](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)). The euro tiers are opinion.
- Family: the same barometer lists more events for the whole family and children among factors named more often over four years.
- Boost: "Recommended by movie critics" (4.21) also scored below baseline ([Herlocker et al. 2000](https://grouplens.org/site-content/uploads/explain-CSCW-20001.pdf)), so popularity gets 5%. Popularity does stretch travel: predicted median distance rose from 6.1 to 8.8 miles from low to high popularity ([Ostrower & Marti 2025](https://wallacefoundation.org/sites/default/files/2025-10/proximity-and-performing-arts-attendance.doi_.10.59656%252FA-AD3981.001_0.pdf)). 8.8 / 6.1 = 1.44, hence d50 × (1 + 0.4·B).

### 4.2 Distance and the "Tuvumā" radius

Getzner found distance "negatively correlated with the frequency of attendance" in Austria ([Getzner 2020](https://ideas.repec.org/a/gam/jsusta/v12y2020i23p10023-d454311.html)). The log-logistic curve keeps D near 1 for short trips and halves it at d50.

Latvian data: 72% attended events in their own town or parish, 29% only there, and 46% attended an event in Rīga ([LKA & SKDS 2025](https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf)). The CSP 2021 mobility survey reports 32.2 km and 80 minutes of travel per resident per day (snippet, unverified; csp.gov.lv refused connections). Leisure distance per trip: not found.

| User location | Candidate area | d50 |
|---|---|---|
| Rīga | Ring 1 own apkaime, ring 2 bordering apkaimes, ring 3 all Rīga | 4 km |
| Other valstspilsēta | Town + 15 km | 8 km |
| Novada pilsēta | Town + 25 km | 12 km |
| Ciems or rural | 35 km | 20 km |

These values are opinion. In Rīga the block fills ring 1 first, then ring 2, then ring 3. Ring adjacency is computed once from the polygons. The ten valstspilsētas are Daugavpils, Jelgava, Jēkabpils, Jūrmala, Liepāja, Ogre, Rēzekne, Rīga, Valmiera and Ventspils (snippet, unverified).

Fallback when nothing reaches S ≥ 0.5 within 14 days: double the radius once. If still empty, take the nearest town centroid with a qualifying event and show "Tuvākie pasākumi: Sigulda, 18 km". The block is never empty.

"Citur Latvijā" reuses the formula outside the "Tuvumā" area, with a 30-day window, a 14-day half-life and d50 = 120 km. Each pick needs I = 1, or F = 1 for families, and comes from a different town.

### 4.3 Diversity

Maximal Marginal Relevance picks the next item by λ·relevance − (1 − λ)·max similarity to items already picked ([Carbonell & Goldstein 1998](https://www.cs.cmu.edu/~jgc/publication/MMR_DiversityBased_Reranking_SIGIR_1998.pdf)). The authors suggest λ = 0.3 to explore and 0.7 to focus. In their pilot, 80% of 5 users chose MMR. Use greedy MMR over the top 20, λ = 0.7. Similarity is 1 for the same category or venue, else 0. In "Citur Latvijā", the same town adds 0.5. A same-category item then needs a score 0.43 higher (0.3 / 0.7) to win, which acts as a soft category cap.

### 4.4 Reason labels

Tintarev and Masthoff's explanation aims include transparency, trust and scrutability, defined as "Allow users to tell the system it is wrong" ([Nunes & Jannach 2020](https://arxiv.org/pdf/2006.08672)). Herlocker's content explanations beat the baseline: "Similarity to other movies rated" 4.97, "Favorite actor or actress" 4.92. 86% of 97 exit-survey users wanted their explanation added to MovieLens ([Herlocker et al. 2000](https://grouplens.org/site-content/uploads/explain-CSCW-20001.pdf)).

| Label | Condition (must be a checkable fact) |
|---|---|
| Šovakar / Šodien / Rīt | Starts today from 17:00 / today before 17:00 / tomorrow, Europe/Riga time |
| Bez maksas | Every source stating a price says 0, and at least one does |
| Piemērots ģimenēm | "ar ģimeni" and F = 1 |
| Tuvu Tev | Same apkaime in Rīga, else d ≤ 1.5 km |
| Tev patīk koncerti (teātris, izstādes, festivāli, daba, sports) | Primary category is that chip. Text from a fixed table |

A card shows two labels at most. Label 1 is the eligible personal label (Tuvu Tev, Tev patīk …, Piemērots ģimenēm) with the largest w·s. Label 2 is the first eligible time or price fact, else the next personal label. "Populārs" is never shown.

### 4.5 Worked example

Profile: Āgenskalns, "ar ģimeni", kids 4-6 and 7-12, chips koncerti, teātris, daba. Now: Friday 2026-11-20, 12:00.

| Event | Facts | D | I | F | T | P | B | S |
|---|---|---|---|---|---|---|---|---|
| Kora koncerts, Āgenskalna baznīca | Own apkaime, Sun 16:00, free, all ages, 1 source | 1.000 | 1 | 1 | 0.907 | 1.0 | 0 | 0.936 |
| Leļļu izrāde "Sniegbaltīte", Leļļu teātris | 3.1 km, Sat 12:00, 12 €, 4+, 3 sources | 0.728 | 1 | 1 | 1.000 | 0.4 | 0.667 | 0.842 |
| Zinātnes lekcija, Ķīpsala | 2.5 km, today 18:00, 5 €, 12+, 2 sources | 0.767 | 0 | 0 | 1.000 | 0.7 | 0.333 | 0.467 |
| Ģimeņu sporta diena, Imanta | 5.0 km, Sat 28 Nov 11:00, free, all ages | 0.390 | 0 | 1 | 0.555 | 1.0 | 0 | 0.450 |

"Tuvumā" shows two cards. The concert gets "Tuvu Tev · Bez maksas". The puppet show gets "Tev patīk teātris · Rīt". The lecture and sports day fall below 0.5. Scores were computed with a Node script.

### 4.6 Geodata for Latvia

| Need | Source | Facts | Licence |
|---|---|---|---|
| Rīga apkaimes | Rīgas dome ([data.gov.lv](https://data.gov.lv/dati/eng/dataset/rigas_apkaimes)) | 58 polygons. SHP, GPKG, DXF, KML, no GeoJSON. LKS-2020 TM. Modified 2026-10-12 | CC BY 4.0 |
| Towns, villages, addresses | VZD ([data.gov.lv](https://data.gov.lv/dati/lv/dataset/varis-atvertie-dati)) | CSVs: Pilsētas, Novadi, Pagasti, Ciemi un mazciemi, Ielas, Ēku un zemes vienību adreses, Vietu centroidi. SHP archive. Daily. LKS-2020 TM since 07.10.2026. Centroid columns not verified | CC BY 4.0 |
| Town populations | CSP: not found (site unreachable) | Use legal place type instead | n/a |
| Geocoding | Nominatim ([OSMF](https://operations.osmfoundation.org/policies/nominatim/)) | "an absolute maximum of 1 request per second". Cache results. No client autocomplete | ODbL |
| Drive time | OSRM ([GitHub](https://github.com/Project-OSRM/osrm-backend)) | route, table, nearest. Demo: 1 request/s, "reasonable, non-commercial" ([wiki](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server)) | BSD-2-Clause |
| Drive time | GraphHopper ([GitHub](https://github.com/graphhopper/graphhopper)) | Car, bike, foot. Isochrones open. Matrix in the commercial API | Apache 2.0 |
| Roads | OpenStreetMap ([copyright](https://www.openstreetmap.org/copyright)) | Attribution notice required | ODbL |

The 58-apkaime division was finalised in 2012 ([Wikipedia](https://en.wikipedia.org/wiki/Neighbourhoods_in_Riga)). Convert both layers to GeoJSON in EPSG:4326 with GDAL at build time. The phone matches its location to a polygon or centroid offline. Venue geocoding runs server-side, VAR first, cached Nominatim second. v1 uses straight-line distance.

### 4.7 Client-side search

Test set: 5,000 and 8,000 synthetic Latvian events, 10 queries (folding, typos, prefix, two words). Pass means precision@10 and recall ≥ 0.9. Node v26.13.0, Apple M3, esbuild minify, gzip -9.

| Library (licence) | Min+gzip | Fuzzy method | Pass | Build 5k | Query 5k / 8k |
|---|---|---|---|---|---|
| MiniSearch 7.2.0 (MIT) | 5.9 KB | Edit distance, prefix, `processTerm` | 10 | 36 ms | 0.37 / 0.34 ms |
| Fuse.js 7.5.0 (Apache 2.0) | 9.6 KB | Bitap, `ignoreDiacritics` | 10 | 7 ms | 34.3 / 44.5 ms |
| FlexSearch 0.8.212 (Apache 2.0) | 17.2 KB | Phonetic encoders | 9 | 46 ms | 0.31 / 0.28 ms |
| Orama 3.1.18 (Apache 2.0) | 22.1 KB | Levenshtein `tolerance` | 3, or 9 pre-folded | 99 ms | 0.64 / 0.89 ms |

- FlexSearch has no edit-distance search, only phonetic encoders and a tolerant tokenizer ([FlexSearch](https://github.com/nextapps-de/flexsearch)). Normalize, LatinBalance and LatinAdvanced returned 0 hits for "koncrets", "jurmla", "liepja". LatinExtra fixed them, but "riga" then ranked "Rokmūzikas" first.
- Orama has no Latvian tokenizer. Its English splitter keeps only àèéìòóù among accented letters ([languages.ts](https://github.com/oramasearch/orama/blob/main/packages/orama/src/components/tokenizer/languages.ts)), so "Rīga" splits at "ī". Pre-folded, tolerance 1 still missed "koncrets", a transposition worth 2 edits.
- MiniSearch caught "koncrets" because fractional `fuzzy` is "approximated to the nearest integer": 0.2 × 8 gives 2 ([MiniSearch docs](https://lucaong.github.io/minisearch/types/MiniSearch.SearchOptions.html)). Its README targets "memory-constrained use cases like mobile browsers" ([MiniSearch](https://github.com/lucaong/minisearch)).
- Fuse.js ([GitHub](https://github.com/krisk/Fuse)) went from 34 to 44 ms between 5,000 and 8,000 events. A phone would probably exceed a 100 ms keystroke budget (opinion).

Recommended config (tested, 10 of 10):

```js
import MiniSearch from 'minisearch'
const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const index = new MiniSearch({
  fields: ['title', 'venue', 'place'],
  storeFields: ['id', 'lat', 'lon'],
  processTerm: fold,
  searchOptions: {
    prefix: (term) => term.length >= 2,
    fuzzy: (term) => (term.length >= 4 ? 0.2 : false),
    boost: { title: 2 },
    combineWith: 'AND',
  },
})
index.addAll(events)
// Tuvumā: index.search(q, { filter: (r) => haversineKm(user, r) <= radiusKm })
```

The serialised index is 551 KB of JSON for 5,000 events. Building it on the phone takes 36 ms on the M3, so ship the event list only.

Folding test: NFD maps ā ē ī ū to base + U+0304, č š ž to base + U+030C, and ģ ķ ļ ņ to base + U+0327. `/\p{M}/gu` and `/[̀-ͯ]/g` both strip them, for lower and upper case. "Ķīpsala" becomes "kipsala". NFC and NFD input fold identically. ß ø ł æ stay unchanged.

### 4.8 Deduplication

Fellegi and Sunter (1969) use two thresholds: matches above, non-matches below, and between them "possible matches that may require manual review" ([Wikipedia](https://en.wikipedia.org/wiki/Record_linkage)). Splink says to set thresholds "based on the false-positive and false-negative trade-off" ([Splink](https://moj-analytical-services.github.io/splink/topic_guides/comparisons/choosing_comparators.html)).

- Cohen et al. found SoftTFIDF best among hybrid metrics. It treats tokens as shared above Jaro-Winkler θ = 0.9 ([Cohen et al. 2003](https://www.cs.cmu.edu/afs/cs/Web/People/wcohen/postscript/kdd-2003-match-ws.pdf)).
- pg_trgm's default similarity threshold is 0.3 ([PostgreSQL](https://www.postgresql.org/docs/current/pgtrgm.html)).
- For web places, Cousseau and Barbosa blocked on 6-character geohashes (about 0.67 × 0.61 km at 57° N, computed). They found duplicates only above Jaro-Winkler 0.8 ([Cousseau & Barbosa 2021](https://profluciano.github.io/home/pub/place_matching.pdf)).
- Whole-string Jaro-Winkler boosts the first 4 characters with p = 0.1 ([Wikipedia](https://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance)). Splink says it "should be used with caution" ([Splink](https://moj-analytical-services.github.io/splink/topic_guides/comparisons/comparators.html)).

Test pairs (blocking assumed passed):

| Pair | Truth | JW full | Trigram | Tokens | Decision |
|---|---|---|---|---|---|
| Ziemassvētku koncerts "Gaismas ceļš" / Gaismas ceļš. Ziemassvētku koncerts | same | 0.80 | 1.00 | 1.00 | merge |
| Prāta Vētra / PRĀTA VĒTRA - koncerts Arēnā Rīga | same | 0.87 | 0.38 | 1.00 | merge |
| Leļļu teātra izrāde "Sniegbaltīte" / Sniegbaltīte (Latvijas Leļļu teātris) | same | 0.64 | 0.55 | 1.00 | merge |
| Ērģeļmūzikas koncerts Doma baznīcā / Ergelmuzikas koncerts Doma baznica | same | 1.00 | 1.00 | 1.00 | merge |
| Jazz Evening with Kristīne Prauliņa / Džeza vakars: Kristīne Prauliņa | same | 0.69 | 0.37 | 0.50 | review |
| Rīta koncerts / Vakara koncerts | different | 0.80 | 0.43 | 0.00 | review |
| Bērnu rīts: pasaku stunda / Bērnu rīts: zīmēšanas darbnīca | different | 0.86 | 0.25 | 0.50 | review |
| Riekstkodis / Gulbju ezers | different | 0.45 | 0.00 | 0.00 | distinct |
| Latvijas Radio koris. Ziemassvētki / Latvijas Radio bigbends. Ziemassvētki | different | 0.92 | 0.65 | 0.75 | review |

Whole-string Jaro-Winkler scores two different ensembles 0.92 and a reordered duplicate 0.80. Nine pairs only illustrate the rule. Calibrate on about 200 labelled pairs from real feeds.

Rule:

1. Fold diacritics, lowercase, strip punctuation. Ignore generic words (koncerts, izrāde, izstāde, festivāls, un, ar) in token matching.
2. Block: same local date; venue within 200 m or same venue id (no coordinates: same town and venue-name trigram ≥ 0.5); start times within 30 minutes when both exist.
3. Merge when trigram ≥ 0.5, or when every distinctive token of the shorter title has a Jaro-Winkler ≥ 0.9 partner. Veto the merge when both titles keep an unmatched token of 5+ letters ("koris" and "bigbends").
4. Review when trigram is 0.3 to 0.5 or token match ≥ 0.5. Events stay separate until confirmed.
5. Cluster with union-find. Keep all source records and the cluster id, so a wrong merge can be split.

Merge rules: keep every ticket link as {source, url, price_min, price_max, seen_at}, dropping only exact duplicates after removing utm_* parameters. Title and description come from the organiser or venue, then the ticket seller, then aggregators. The shown price is the lowest price_min. A start-time conflict over 30 minutes keeps the organiser's time and flags the cluster. The source count feeds B.

### Implications for v1

- Ship the score as one pure function with weights in config. Log all six components per shown card for later tuning.
- Bundle the 58 apkaimes and VAR town centroids as static GeoJSON, crediting Rīgas dome and VZD (CC BY 4.0). Locate users offline.
- Never call public Nominatim from the client. Geocode venues server-side, VAR first, with caching.
- Use straight-line distance. Self-host OSRM only if drive time proves necessary.
- Use MiniSearch with the NFD fold, about 6 KB gzipped, index built on the phone.
- Deduplicate at ingest with the two-threshold rule, a manual review queue and every ticket link kept.
- Show at most two rule-based labels per card. No popularity labels.
- Log opens and ticket clicks from day one, so v2 can add collaborative signals.

### Sources

1. "The Use of MMR, Diversity-Based Reranking for Reordering Documents and Producing Summaries", Jaime Carbonell and Jade Goldstein, SIGIR, 1998, https://www.cs.cmu.edu/~jgc/publication/MMR_DiversityBased_Reranking_SIGIR_1998.pdf, accessed 2026-11-20.
2. "Explaining Collaborative Filtering Recommendations", Jonathan L. Herlocker, Joseph A. Konstan, John Riedl, CSCW, 2000, https://grouplens.org/site-content/uploads/explain-CSCW-20001.pdf, accessed 2026-11-20.
3. "A Systematic Review and Taxonomy of Explanations in Decision Support and Recommender Systems", Ingrid Nunes and Dietmar Jannach, arXiv, 2020, https://arxiv.org/pdf/2006.08672, accessed 2026-11-20.
4. "Collaborative future event recommendation", Einat Minkov, Ben Charrow, Jonathan Ledlie, Seth Teller, Tommi Jaakkola, CIKM (MIT DSpace record), 2010, https://dspace.mit.edu/handle/1721.1/62811, accessed 2026-11-20.
5. "RecSys 2015 Session 3: Distinguished Papers" (Macedo, Marinho, Santos, "Context-Aware Event Recommendation in Event-based Social Networks"), ACM RecSys, 2015, https://recsys.acm.org/recsys15/session-3/, accessed 2026-11-20.
6. "Proximity and Performing Arts Attendance: What Leads Audiences to Go the Extra Mile?", Francie Ostrower and C. Nathan Marti, The Wallace Foundation, 2025, https://wallacefoundation.org/sites/default/files/2025-10/proximity-and-performing-arts-attendance.doi_.10.59656%252FA-AD3981.001_0.pdf, accessed 2026-11-20.
7. "Spatially Disaggregated Cultural Consumption: Empirical Evidence of Cultural Sustainability from Austria", Michael Getzner, Sustainability (IDEAS/RePEc record), 2020, https://ideas.repec.org/a/gam/jsusta/v12y2020i23p10023-d454311.html, accessed 2026-11-20.
8. "Cumulative versus Gravity-based Accessibility Measures: Which One to Use?", Manuel Santana Palacios and Ahmed El-Geneidy, Findings, 2022, https://findingspress.org/article/32444.pdf, accessed 2026-11-20.
9. "Kultūras aktivitātes barometrs 2024. Kultūras patēriņa un līdzdalības ietekmes pētījums", Latvijas Kultūras akadēmija and SKDS for the Kultūras ministrija, 2025, https://ppdb.mk.gov.lv/wp-content/uploads/2025/04/Kulturas_barometrs_2025.pdf, accessed 2026-11-20.
10. "Last-Minute Ticket Buying: Eventbrite Releases Study at NIVA '24", Pollstar, 2024, https://news.pollstar.com/2024/06/04/last-minute-ticket-buying-eventbrite-releases-study-at-niva-24/, accessed 2026-11-20.
11. "Pickup time: what it is, why to track it", MarketHype, year not stated (data 2023 to 2024), https://www.markethype.io/en/blog-news/pickup-time-what-why-track, accessed 2026-11-20.
12. "Rīgas apkaimes", Rīgas dome via Latvijas Atvērto datu portāls, 2024 (modified 2026), https://data.gov.lv/dati/eng/dataset/rigas_apkaimes, accessed 2026-11-20.
13. "Neighbourhoods in Riga", Wikipedia, 2026, https://en.wikipedia.org/wiki/Neighbourhoods_in_Riga, accessed 2026-11-20.
14. "Valsts adrešu reģistra atvērtie dati", Valsts zemes dienests via Latvijas Atvērto datu portāls, 2026, https://data.gov.lv/dati/lv/dataset/varis-atvertie-dati, accessed 2026-11-20.
15. "Nominatim Usage Policy (aka Geocoding Policy)", OpenStreetMap Foundation, 2026, https://operations.osmfoundation.org/policies/nominatim/, accessed 2026-11-20.
16. "Copyright and License", OpenStreetMap Foundation, 2026, https://www.openstreetmap.org/copyright, accessed 2026-11-20.
17. "osrm-backend", Project OSRM, 2026, https://github.com/Project-OSRM/osrm-backend, accessed 2026-11-20.
18. "Demo server", Project OSRM wiki, 2026, https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server, accessed 2026-11-20.
19. "graphhopper", GraphHopper GmbH, 2026, https://github.com/graphhopper/graphhopper, accessed 2026-11-20.
20. "MiniSearch", Luca Ongaro, 2026, https://github.com/lucaong/minisearch, accessed 2026-11-20.
21. "SearchOptions", MiniSearch API documentation, Luca Ongaro, 2026, https://lucaong.github.io/minisearch/types/MiniSearch.SearchOptions.html, accessed 2026-11-20.
22. "Fuse", Kiro Risk, 2026, https://github.com/krisk/Fuse, accessed 2026-11-20.
23. "FlexSearch", Nextapps GmbH (Thomas Wilkerling), 2026, https://github.com/nextapps-de/flexsearch, accessed 2026-11-20.
24. "languages.ts" (Orama tokenizer), Orama, 2026, https://github.com/oramasearch/orama/blob/main/packages/orama/src/components/tokenizer/languages.ts, accessed 2026-11-20.
25. "A Comparison of String Metrics for Matching Names and Records", William W. Cohen, Pradeep Ravikumar, Stephen E. Fienberg, KDD Workshop on Data Cleaning and Object Consolidation, 2003, https://www.cs.cmu.edu/afs/cs/Web/People/wcohen/postscript/kdd-2003-match-ws.pdf, accessed 2026-11-20.
26. "Linking Place Records Using Multi-view Encoders" (author manuscript; journal year 2021 from a search snippet, unverified), Vinícius Cousseau and Luciano Barbosa, 2021, https://profluciano.github.io/home/pub/place_matching.pdf, accessed 2026-11-20.
27. "F.35. pg_trgm", PostgreSQL Global Development Group, 2026, https://www.postgresql.org/docs/current/pgtrgm.html, accessed 2026-11-20.
28. "Record linkage", Wikipedia, 2026, https://en.wikipedia.org/wiki/Record_linkage, accessed 2026-11-20.
29. "Jaro-Winkler distance", Wikipedia, 2026, https://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance, accessed 2026-11-20.
30. "String comparators", Splink documentation, UK Ministry of Justice Analytical Services, 2026, https://moj-analytical-services.github.io/splink/topic_guides/comparisons/comparators.html, accessed 2026-11-20.
31. "Choosing String Comparators", Splink documentation, UK Ministry of Justice Analytical Services, 2026, https://moj-analytical-services.github.io/splink/topic_guides/comparisons/choosing_comparators.html, accessed 2026-11-20.
32. Benchmark and test scripts (this study), Node v26.13.0 on Apple M3, 2026, /private/tmp/claude-501/searchbench/scripts/ (bench3.mjs, sketch.mjs, nfd.mjs, dedup.mjs), run 2026-11-20.


---

## 5. Accessibility, visual design and performance

### Key findings

- The owner's anchors pass easily. Ink #101824 on beige #ECD8C0 measures 12.86:1, above the 7:1 AAA line ([W3C 2024](https://www.w3.org/TR/WCAG22/)). On a lighter card #FBF4EA the same ink reaches 16.32:1 (computed, section 5.9).
- #ECD8C0 is not too saturated for reading. Its OKLCH chroma is 0.039, below the Peach #EDD1B0 (chroma 0.054) that sped up reading for 341 readers with and without dyslexia ([Rello & Bigham 2017](https://www.changedyslexia.org/publications/pdfs/2017-ASSETS-Good%20Background%20Colors.pdf)). Its luminance (0.71 of white) is the real cost, so long text belongs on the lighter card.
- #ECD8C0 is effectively the Latvijas Pasts token `--color-neutral-200: #EDD8C1` (1 unit apart in red and blue) ([pasts.lv CSS](https://pasts.lv/build/website/css/abovethefold.Dusl0GHu.css)). Pasts.lv uses it as a panel tint on a white page with blue #0079BA as primary, so the app still reads as its own product.
- Older users fail more and need bigger text. Seniors (65+) succeeded on 55.3% of tasks against 74.5% for ages 21 to 55, and took 43% longer ([Nielsen 2013](https://www.nngroup.com/articles/usability-seniors-improvements/)). Set body text at 18px and keep 16px as the floor (opinion).
- Thumbs prefer the centre. 75% of people touch with one thumb, and corner targets need about 12 mm against 7 mm in the centre ([Hoober 2017](https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php)). A top-left hamburger works if its hit area grows to 56 to 64px and category chips stay visible in the content.
- Nunito is the recommended font. It renders all 22 Latvian letters with comma accents, and Latvian text costs 74.6 KB (latin 39.2 KB plus latin-ext 35.5 KB, variable weight). Fredoka fails: its Google Fonts files lack ā č ē ģ ī ķ ļ ņ ū.
- Carmine red and success green have the same lightness (1.03:1 between #A3243A and #285F33). About 8% of men see red and green poorly ([Colour Blind Awareness](https://www.colourblindawareness.org/colour-blindness/)), so every status needs an icon and a word.
- Lighthouse mobile weights TBT 30%, LCP 25%, CLS 25%, FCP 10%, SI 10% under 150 ms RTT, 1.6 Mbps and 4x CPU slowdown ([Lighthouse source](https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/core/config/default-config.js), [throttling doc](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)). A 2 s home load at 200 KB/s allows about 170 KB on the critical path.
- The legal flag colour is Pantone 201 C plus Pantone White, stripes 2:1:2, proportions 1:2 ([Nacionālā enciklopēdija 2025](https://enciklopedija.lv/skirklis/8867-Latvijas-valsts-karogs)). The law gives no hex. #9D2235 is the conversion quoted from Pantone's tool ([Vikipēdija](https://lv.wikipedia.org/wiki/Latvijas_karogs)).

### 5.1 WCAG 2.2 and platform target sizes

| Rule | Level | Requirement | Source |
|---|---|---|---|
| 1.4.3 Contrast (Minimum) | AA | Text 4.5:1, large text 3:1 | [W3C 2024](https://www.w3.org/TR/WCAG22/) |
| 1.4.6 Contrast (Enhanced) | AAA | Text 7:1, large text 4.5:1 | [W3C 2024](https://www.w3.org/TR/WCAG22/) |
| 1.4.11 Non-text Contrast | AA | UI parts and graphics 3:1 against adjacent colours | [W3C 2024](https://www.w3.org/TR/WCAG22/) |
| 1.4.4 Resize Text | AA | Text resizes to 200% without loss | [W3C 2024](https://www.w3.org/TR/WCAG22/) |
| 1.4.12 Text Spacing | AA | Layout survives line height 1.5, paragraph spacing 2, letter spacing 0.12, word spacing 0.16 (times font size) | [W3C 2024](https://www.w3.org/TR/WCAG22/) |
| 2.3.3 Animation from Interactions | AAA | Motion triggered by interaction can be turned off | [W3C 2024](https://www.w3.org/TR/WCAG22/) |
| 2.5.8 Target Size (Minimum) | AA | 24 by 24 CSS px, or 24px spacing circles that do not overlap | [W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) |
| 2.5.5 Target Size (Enhanced) | AAA | 44 by 44 CSS px | [W3C Understanding 2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) |
| 1.4.1 Use of Color | A | Colour is not the only visual means of conveying information | [W3C Understanding 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) |

Large text means 18pt, or 14pt bold, which the W3C equates to "approximately 18.5px and 24px" ([W3C Understanding 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)). The same page says 4.5:1 compensates for contrast loss that "typically accompanies aging". Apple sets 44x44 pt as the default iOS control size and 28x28 pt as the minimum, with about 12 pt padding around bezeled controls and 24 pt around borderless ones ([Apple HIG data](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json)). Apple's iOS default text size is 17 pt, minimum 11 pt (same source). Android recommends a 48dp by 48dp touch target, and "Larger is even better" ([Android Developers](https://developer.android.com/guide/topics/ui/accessibility/apps)).

The brief's 48px target clears 2.5.8 and 2.5.5. Chips and buttons need `min-height` with padding, never a fixed height, so 1.4.12 spacing overrides do not clip Latvian diacritics. The viewport meta must not block zoom, or 1.4.4 fails (both opinion).

### 5.2 Older adults and ageing vision

NN/g tested 75 seniors aged 65+ in two rounds, plus control users aged 21 to 55 ([Nielsen 2013](https://www.nngroup.com/articles/usability-seniors-improvements/)). In 2013 seniors averaged 55.3% success, 7:49 per task and 2.4 errors. The control group averaged 74.5%, 5:28 and 1.1 errors. The article asks for "at least 12-point fonts as the default", large click targets, spaced links, and no pull-down or cascading menus.

Vision science explains the gap:

- Contrast sensitivity falls at intermediate and high spatial frequencies, and the loss grows with spatial frequency ([Owsley 2011](https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC3049199/unicode)).
- Older eyes receive less light because of pupillary miosis and denser lenses. They also scatter more light inside the eye, which lowers image contrast (same source).
- The lens absorbs more short-wavelength blue light with age, and transmittance falls ([Eto et al. 2020](https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC7536217/unicode)).
- Blue to yellow discrimination changes after age 35, while red to green matching stays stable to 55 (Lakowski, cited in [Shinomori et al. 2016](https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC5316232/unicode)). That study of 162 people aged 16 to 88 found thresholds rising on all three colour axes. Tritan loss accelerates after 60 (Paramei, snippet, unverified).

Font size: a 2022 systematic review found that older adults prefer larger fonts, up to a critical size where readability declines ([Hou et al. 2022](https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC9376262/unicode)). One tablet study in the review found 18 pt text was read faster than 14 or 16 pt, in the UK and Thailand.

Design consequences (opinion): 18px body, 1.5 line height, weight 400 to 500 (Nunito 300 strokes are too thin for low contrast sensitivity), no blue-only cues, and no pale blue text. Meaning that relies on yellow versus beige (Ģimenēm, Blusu tirgi, the canvas) needs icons and labels.

### 5.3 Children 10 to 12 and teens

Children reach adult-level physical interaction "Around the age of 11 years" ([Liu 2018](https://www.nngroup.com/articles/children-ux-physical-development/)). Young children need 2 cm by 2 cm targets, four times the 1 cm by 1 cm adult figure (same source). For 10 to 12 year olds the 48px floor is adequate (opinion).

NN/g tested 125 children aged 3 to 12 in three studies ([Sherwin & Nielsen 2019](https://nngroup.com/articles/childrens-websites-usability-issues)). Older children read by scanning, scroll "Some", and suit 12 point fonts. Children cannot tell ads from content, and redundant navigation is "Very confusing" for them. Sponsored events therefore need a visible "Reklāma" label (opinion).

Teens (100 participants aged 13 to 17) have weaker reading skills than adults ([Kendrick & Nielsen 2019](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/)). The authors recommend a 6th-grade reading level and note teens "dislike tiny font sizes as much as adults do". Teens scroll as well as adults.

### 5.4 One-handed use and the top-left hamburger

Hoober observed 1,333 people in public, 780 of them touching a screen ([Hoober 2013](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)). 49% held the phone one-handed, 36% cradled it and 15% used two hands. One-handed users tapped with the right thumb 67% of the time. Hoober later disowned his thumb-zone drawings: "Please, please everyone ignore those drawings" (comment on the same page).

His 2017 synthesis says 75% of touches come from one thumb, users prefer the screen centre, and grip changes happen unnoticed ([Hoober 2017](https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php)). Centre targets work at 7 mm, corner targets need about 12 mm. He calls charts showing an unreachable upper-left corner incorrect.

The trade-off: a top-left hamburger costs a grip change for right-thumb users and needs a larger target than the centre. Hidden navigation also lowers discovery. In NN/g's 179-user study, mobile navigation use reached 44% and 56% on two hidden-menu sites against 89% on a combo site ([Pernice & Budiu 2016](https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/)).

Mitigation that keeps the brief (opinion):

1. Keep the 24px icon, but make the hit area 56 to 64px square and flush to the top-left screen edge.
2. Use combo navigation. A visible row of category chips sits below the top bar, so the hamburger holds secondary items only.
3. Lay out the full-screen menu bottom-weighted. Items are 56px tall, the five most-used sit in the lower two thirds, and a full-width "Aizvērt" bar at the bottom duplicates the X.
4. Keep the menu one level deep. NN/g found cascading menus hard for seniors ([Nielsen 2013](https://www.nngroup.com/articles/usability-seniors-improvements/)).
5. Animate the icon to X in 200ms with `transform`, and drop the motion under `prefers-reduced-motion` (WCAG 2.3.3).
6. Skip an edge-swipe gesture, because it competes with the system back gesture.

### 5.5 Dyslexia and colour vision deficiency

The British Dyslexia Association Style Guide 2023 ([BDA 2023](https://lbhfinspirehub.com/wp-content/uploads/2024/05/BDA-Style-Guide-2023.pdf)) recommends:

- Sans serif fonts (Arial, Verdana, Tahoma, Century Gothic, Trebuchet, Calibri, Open Sans and others).
- Size 12 to 14 pt, given as 16 to 19 px or 1 to 1.2 em.
- Letter spacing near 35% of average letter width, word spacing at least 3.5 times letter spacing, line spacing 1.5.
- Bold for emphasis, with no underlining, italics or all-caps text.
- Headings at least 20% larger than body text.
- Single-colour backgrounds with no patterns, and dark text on a light background that is not white. "Use cream or a soft pastel colour".
- No green or red/pink colours (hard for colour-blind readers), left-aligned text, 60 to 70 characters per line.

The owner's speckled texture conflicts with "no patterns", so it stays out from behind text (top bar, empty states, margins only). The carmine primary conflicts with the red advice, so red never carries meaning without a text label (opinion).

Colour vision deficiency affects "approximately 1 in 12 men (8%) and 1 in 200 women" ([Colour Blind Awareness](https://www.colourblindawareness.org/colour-blindness/)). Latvian prevalence data: not found. The palette's red primary and green success differ by 1.03:1 in luminance, so protan and deutan users rely on shape and text. Category chips carry an icon and a Latvian label. Date states ("Šodien", "Beidzies") use words.

### 5.6 Warm beige, white or blue

- Background hue. Warm Peach, Orange and Yellow backgrounds beat Blue, Blue Grey and Green on reading time, for readers with and without dyslexia alike ([Rello & Bigham 2017](https://www.changedyslexia.org/publications/pdfs/2017-ASSETS-Good%20Background%20Colors.pdf)). The study did not test white. Its Peach is #EDD1B0, close to the owner's #ECD8C0.
- Polarity and brightness. Dark text on a light background beat the reverse for younger and older adults alike ([Piepenbrock et al. 2013](https://docserv.uni-duesseldorf.de/servlets/DerivateServlet/Derivate-31413)). The authors argue brighter displays offset reduced retinal illuminance in older eyes. In the same thesis, the advantage grows as character size shrinks.
- Glare. The BDA says white "can appear too dazzling" ([BDA 2023](https://lbhfinspirehub.com/wp-content/uploads/2024/05/BDA-Style-Guide-2023.pdf)). Owsley documents increased intraocular scatter with age ([Owsley 2011](https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC3049199/unicode)).
- Preference. Across 48 adults aged 18 to 71, preference peaked at blue and was lowest for dark yellow (olive) and dark orange (brown) ([Palmer & Schloss 2010](https://palmerlab.berkeley.edu/pdf/Palmer%26Schloss%282010%29.pdf)). Age-specific preference data: not found. Older adults prefer light mode to avoid fatigue (2023 Ergonomics study, snippet, unverified).

Answer for #ECD8C0 next to a lighter card: the hue and chroma are inside the range that helped readers. Its relative luminance is 0.708 against 1.0 for white, so it delivers less light to older eyes than a near-white card (0.912 for #FBF4EA). Use #ECD8C0 as the canvas and put paragraphs and event details on #FBF4EA cards (opinion). The card edge is 1.27:1 against the canvas, so a soft shadow and a 1px #D6C0A6 border mark the card. Dark mode stays near-neutral (chroma 0.009) to avoid the disliked browns.

### 5.7 Fonts with Latvian support

Method: each font's Google Fonts latin and latin-ext woff2 files were downloaded and their cmap checked for ā č ē ģ ī ķ ļ ņ š ū ž and capitals. A CoreText render confirmed comma-below Ķ Ļ Ņ ķ ļ ņ Ģ and the turned comma above ģ. Latvian text always loads the latin-ext file, because every Latvian diacritic sits above U+00FF.

| Font | Feel | Latvian | latin + latin-ext (woff2) | Note |
|---|---|---|---|---|
| [Nunito](https://fonts.googleapis.com/css2?family=Nunito:wght@400..800&display=swap) | Rounded terminals | Complete, comma forms | 39.2 + 35.5 = 74.6 KB (variable 400 to 800) | Also Cyrillic for a later Russian UI |
| [Quicksand](https://fonts.googleapis.com/css2?family=Quicksand:wght@400..700&display=swap) | Round geometric | Complete, comma forms | 28.3 + 26.6 = 54.9 KB | Thin strokes at 400 (opinion: weak for older readers) |
| [Atkinson Hyperlegible Next](https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400..700&display=swap) | Neutral, legibility-first | Complete, comma forms | 34.0 + 19.1 = 53.1 KB | Not rounded. Fallback choice for body text |
| [Baloo 2](https://fonts.googleapis.com/css2?family=Baloo+2:wght@400..700&display=swap) | Chunky, cartoonish | Complete, comma forms | 33.1 + 27.5 = 60.6 KB | Heavy, display use only |
| [Varela Round](https://fonts.googleapis.com/css2?family=Varela+Round&display=swap) | Rounded | Complete, comma forms | 15.9 + 13.8 = 29.7 KB | One weight only |
| [Fredoka](https://fonts.googleapis.com/css2?family=Fredoka:wght@400..700&display=swap) | Rounded display | Missing ā č ē ģ ī ķ ļ ņ ū | 29.7 + 4.6 KB | Reject |

Recommendation: Nunito for headings and body. It carries the rounded, friendly tone in one family, and its full weight range costs one 74.6 KB pair (opinion). Requesting weights 400 and 700 returns the same two files. Atkinson Hyperlegible Next is the swap if testing with 65+ users shows legibility problems.

### 5.8 Reference palettes (extracted, not copied)

Latvijas Pasts ([HTML](https://pasts.lv/), [CSS](https://pasts.lv/build/website/css/abovethefold.Dusl0GHu.css), [theme CSS](https://pasts.lv/build/website/css/theme.BmGz4gh3.css)):

- Primary blue `--color-primary-500: #0079BA`, logo `#0C72BA`.
- Body text `--color-text-primary` is gray-650 `#475467` (7.69:1 on white). Dark text is `#101010`.
- Neutrals: `#F6F5F3`, `#F3EAE0`, `#EDD8C1`. White is the most used background (46 rules).
- Radii 6, 8, 12, 16, 24, 32 and 64px. Body font is Degular (Adobe Fonts) at 17px, weight 475.

Anthropic ([CSS](https://www.anthropic.com/_next/static/chunks/1dbqihqf7xwy_.css)):

- Ivory: `--color-ivory-light: #faf9f5`, `--color-ivory-medium: #f0eee6`, `--color-ivory-dark: #e8e6dc`. Oat: `--color-oat: #e3dacc`.
- Near-black: `--color-slate-950: #141413` (17.50:1 on ivory-light).
- Accent clay `#d97757`. Focus colour `#2c84db` is blue.

The anthropic beiges are low-chroma (oat chroma 0.021). Pasts.lv's #EDD8C1 matches the owner's sample.

### 5.9 Proposed palette and contrast

The palette is original apart from the owner's two anchors. Ratios were computed with the WCAG 2.x relative luminance formula in a Node script (scripts kept in the scratchpad).

| Mode | Pair | Colours | Ratio | Needs | Result |
|---|---|---|---|---|---|
| Light | Body text on page | #101824 on #ECD8C0 | 12.86:1 | 4.5 | Pass (AAA) |
| Light | Body text on card | #101824 on #FBF4EA | 16.32:1 | 4.5 | Pass (AAA) |
| Light | Muted text on page | #5A5046 on #ECD8C0 | 5.67:1 | 4.5 | Pass |
| Light | Muted text on card | #5A5046 on #FBF4EA | 7.20:1 | 4.5 | Pass (AAA) |
| Light | Link text on page | #A3243A on #ECD8C0 | 5.28:1 | 4.5 | Pass |
| Light | Link text on card | #A3243A on #FBF4EA | 6.70:1 | 4.5 | Pass |
| Light | Button label | #FFF8F0 on #A3243A | 6.94:1 | 4.5 | Pass |
| Light | Button label, pressed | #FFF8F0 on #8A1D30 | 8.67:1 | 4.5 | Pass |
| Light | Input border on page / card | #7E6E5E | 3.54 / 4.49:1 | 3 | Pass |
| Light | Focus ring on page / card | #101824 | 12.86 / 16.32:1 | 3 | Pass |
| Light | Success text on page / card | #285F33 | 5.46 / 6.93:1 | 4.5 | Pass |
| Light | Warning text on page / card | #7F4705 | 5.40 / 6.85:1 | 4.5 | Pass |
| Light | Ink on success / warning tint | #DCEBD5 / #F8E3C3 | 14.33 / 14.23:1 | 4.5 | Pass |
| Light | Flag white stripe on page | #FFFFFF on #ECD8C0 | 1.39:1 | 3 | Fail, add 1px #7E6E5E outline |
| Dark | Body text on page / card | #F2E6D6 on #1B1814 / #27231E | 14.37 / 12.68:1 | 4.5 | Pass |
| Dark | Muted text on page / card | #BFB2A2 | 8.51 / 7.51:1 | 4.5 | Pass |
| Dark | Link text on page / card | #EE7F8D | 6.78 / 5.99:1 | 4.5 | Pass |
| Dark | Button label | #101824 on #EE7F8D | 6.84:1 | 4.5 | Pass |
| Dark | Input border on page / card | #857868 | 4.11 / 3.63:1 | 3 | Pass |
| Dark | Focus ring on page / card | #F2E6D6 | 14.37 / 12.68:1 | 3 | Pass |
| Dark | Success / warning text on page | #8FD3A0 / #F2BE6B | 10.10 / 10.40:1 | 4.5 | Pass |
| Dark | Flag red on page | #9D2235 on #1B1814 | 2.29:1 | 3 | White stripe carries it (17.69:1), keep the outline |

The primary #A3243A is a slightly lighter carmine than the flag's #9D2235, so links pass on both surfaces. The focus ring is the ink colour: a 3px outline with a 2px canvas-coloured offset, which separates it from the red button.

Category colours. Labels use ink text on the tint. Icons use the darker colour, which clears 3:1 on card and page and 4.5:1 on card.

| Category | Light tint | Ink on tint | Icon colour | Icon on card / page | Dark tint | Text on dark tint | Dark icon | Icon on dark card / page |
|---|---|---|---|---|---|---|---|---|
| Festivāli | #FED3D7 | 13.17 | #9F3D4F | 5.91 / 4.65 | #522A30 | 9.85 | #F7A3AD | 8.03 / 9.09 |
| Ēdiens | #FFD7BC | 13.32 | #964C04 | 5.77 / 4.55 | #502F17 | 9.70 | #F0AD7F | 8.17 / 9.25 |
| Blusu tirgi | #FDE4BF | 14.45 | #835A01 | 5.61 / 4.42 | #49340E | 9.58 | #E1B671 | 8.27 / 9.37 |
| Ģimenēm | #F7E9A7 | 14.57 | #736304 | 5.47 / 4.31 | #40380E | 9.53 | #CFBF71 | 8.43 / 9.55 |
| Zemnieku tirdziņi | #CDEABF | 13.68 | #40731A | 5.22 / 4.11 | #2A3F1E | 9.33 | #A2CD8B | 8.65 / 9.80 |
| Darbnīcas | #BEEBDE | 13.69 | #017460 | 5.24 / 4.13 | #084236 | 9.26 | #71D3BA | 8.72 / 9.88 |
| Sports | #BBE9F5 | 13.65 | #016F82 | 5.35 / 4.21 | #003F4B | 9.41 | #69CEE6 | 8.60 / 9.75 |
| Ko redzēt | #CCE2FF | 13.49 | #2863AB | 5.55 / 4.37 | #223956 | 9.55 | #92C1FD | 8.38 / 9.49 |
| Teātris | #E1DAFF | 13.30 | #6A51A4 | 5.78 / 4.56 | #3A3154 | 9.77 | #C2B1F8 | 8.13 / 9.21 |
| Koncerti | #FCD1EC | 13.13 | #92417A | 5.90 / 4.65 | #4C2B42 | 9.86 | #EAA4D2 | 7.98 / 9.04 |
| Nišas | #E8E0D8 | 13.65 | #706052 | 5.52 / 4.35 | #3D3730 | 9.55 | #C9BBAD | 8.32 / 9.43 |

Tints share OKLCH lightness 0.905 to 0.93, with hues about 35 degrees apart. The closest pair (Festivāli and Koncerti) is only 0.031 apart in OKLab, so tint alone does not separate categories. Icon and label do.

### 5.10 Latvian flag colour

The national encyclopedia states red-white-red stripes in 2:1:2, width to length 1:2, and colours "Pantone 201C un Pantone white", under the State Flag Law of 29.10.2009 ([Nacionālā enciklopēdija 2025](https://enciklopedija.lv/skirklis/8867-Latvijas-valsts-karogs)). Latvian Wikipedia reports a 2019 amendment to Cabinet Regulation No. 405. Under it, fabric flags use Pantone 19-1629 TPX or TC, and printed or digital images use 201 C ([Vikipēdija](https://lv.wikipedia.org/wiki/Latvijas_karogs)). The same page lists 201 C as RGB 157 34 53, #9D2235, citing Pantone's colour tool.

Gaps:

- The regulation text on likumi.lv could not be opened (TLS connection refused from this network).
- Pantone's 201 C page hides its hex behind a login ([Pantone](https://www.pantone.com/connect/201-C)).
- Flag sites list #9E3039 (snippet, unverified).

Use #9D2235 and #FFFFFF in a 2:1:2 SVG at 1:2 proportions, with a 1px outline.

### 5.11 Performance budget

Lighthouse 13.6 scores mobile with the weights above ([default-config.js](https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/core/config/default-config.js)). Throttling is simulated: 150 ms latency, 1.6 Mbps down, 750 Kbps up, 4x CPU ([throttling doc](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)). The emulated screen is 412 by 823 at DPR 1.75 ([constants.js](https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/core/config/constants.js)). Bands: 90 to 100 good ([Chrome for Developers](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)).

Each metric scores 0.90 at its p10 control point ([LCP source](https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/core/audits/metrics/largest-contentful-paint.js), [TBT source](https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/core/audits/metrics/total-blocking-time.js)):

| Metric | Weight | Score 0.90 at | Score 0.50 at |
|---|---|---|---|
| FCP | 10% | 1.8 s | 3.0 s |
| Speed Index | 10% | 3.4 s | 5.8 s |
| LCP | 25% | 2.5 s | 4.0 s |
| TBT | 30% | 200 ms | 600 ms |
| CLS | 25% | 0.1 | 0.25 |

Core Web Vitals "good" is LCP 2.5 s or less, INP 200 ms or less and CLS 0.1 or less, at the 75th percentile, mobile and desktop separately ([web.dev Vitals](https://web.dev/articles/vitals)). Google's default budget is under 170 KB of critical-path resources ([web.dev budgets](https://web.dev/articles/performance-budgets-101)).

Back-of-envelope for "home under 2 s on 4G" (opinion):

- 1.6 Mbps is 200 KB/s.
- Connection setup costs about 4 round trips (600 ms) before the first HTML byte.
- That leaves roughly 1.2 s, about 240 KB at full speed. TCP ramp-up loses part of it.

Proposed budget (compressed transfer, first visit):

| Item | Budget |
|---|---|
| HTML with first 8 to 10 events server-rendered | 20 KB |
| CSS (critical part inlined) | 25 KB |
| JavaScript before interaction | 70 KB, no single task over 50 ms, TBT under 200 ms |
| Fonts (Nunito latin + latin-ext) | 75 KB, `font-display: swap` with `size-adjust` fallback |
| LCP image | 40 KB AVIF |
| Critical path total | 170 KB |
| Whole home page | 350 KB, 25 requests |
| Targets | LCP 2.0 s, CLS 0.05, INP 200 ms |

Subsetting Nunito to Latin plus Latvian would cut the font line, but the saving was not measured (opinion).

### 5.12 Images, install and offline

Images:

- AVIF works in Chrome since 2020, Firefox since 2021 and Safari since 2022 ([web.dev AVIF](https://web.dev/learn/images/avif)).
- Serve `<picture>` with AVIF, then WebP, then JPEG (opinion).
- `srcset` with `sizes` lets the browser pick the source ([web.dev responsive images](https://web.dev/learn/images/responsive-images)). Lighthouse's 412px screen at DPR 1.75 needs about 720px for a full-width card, so a 360/540/720/1080w set fits.
- "Never lazy-load your LCP image". Give it `fetchpriority="high"` ([web.dev LCP](https://web.dev/articles/optimize-lcp)).
- Set `width` and `height` on every image. Animate with `transform` only ([web.dev CLS](https://web.dev/articles/optimize-cls)).

Chrome installability requires all of these ([web.dev install criteria](https://web.dev/articles/install-criteria)):

- HTTPS.
- A manifest with `name` or `short_name`, 192px and 512px icons, `start_url`, and `display` set to `standalone`, `fullscreen`, `minimal-ui` or `window-controls-overlay`.
- `prefer_related_applications` absent or false.
- At least one tap and 30 seconds of viewing.

Offline caching with Workbox:

- `StaleWhileRevalidate` returns the cache and refreshes it in the background ([Workbox strategies](https://developer.chrome.com/docs/workbox/modules/workbox-strategies)). It fits the event JSON. Add `ExpirationPlugin` with `maxEntries: 50` and `maxAgeSeconds` of 7 days, and filter past events on the client (opinion).
- `CacheFirst` fits images. Use `ExpirationPlugin` with `maxEntries` of 150, `maxAgeSeconds` of 30 days and `purgeOnQuotaError: true` ([Workbox expiration](https://developer.chrome.com/docs/workbox/modules/workbox-expiration)).
- Precache the shell, CSS, JS and both font files. Show "Atjaunots pirms X min" when serving cached events (opinion).

### Design tokens

```css
:root {
  color-scheme: light dark;
  /* Surfaces and text (light) */
  --color-bg: #ECD8C0;            /* owner anchor, canvas only */
  --color-surface: #FBF4EA;       /* cards, menu, long text */
  --color-text: #101824;          /* owner anchor ink: 12.86 on bg, 16.32 on surface */
  --color-text-muted: #5A5046;    /* 5.67 on bg, 7.20 on surface */
  --color-border: #7E6E5E;        /* inputs and UI edges: 3.54 on bg */
  --color-border-subtle: #D6C0A6; /* decorative card edge */
  --color-primary: #A3243A;       /* carmine action, 5.28 on bg */
  --color-primary-pressed: #8A1D30;
  --color-on-primary: #FFF8F0;    /* 6.94 on primary */
  --color-focus: #101824;
  --color-success: #285F33;
  --color-success-tint: #DCEBD5;
  --color-warning: #7F4705;
  --color-warning-tint: #F8E3C3;
  --color-flag-red: #9D2235;      /* Pantone 201 C conversion */
  --color-flag-white: #FFFFFF;
  --shadow-card: 0 1px 2px rgb(16 24 36 / 0.06), 0 6px 16px rgb(16 24 36 / 0.08);

  /* Category tints (chip background) and icon colours */
  --cat-festivali: #FED3D7;  --cat-festivali-icon: #9F3D4F;
  --cat-ediens: #FFD7BC;     --cat-ediens-icon: #964C04;
  --cat-blusu: #FDE4BF;      --cat-blusu-icon: #835A01;
  --cat-gimenem: #F7E9A7;    --cat-gimenem-icon: #736304;
  --cat-zemnieku: #CDEABF;   --cat-zemnieku-icon: #40731A;
  --cat-darbnicas: #BEEBDE;  --cat-darbnicas-icon: #017460;
  --cat-sports: #BBE9F5;     --cat-sports-icon: #016F82;
  --cat-ko-redzet: #CCE2FF;  --cat-ko-redzet-icon: #2863AB;
  --cat-teatris: #E1DAFF;    --cat-teatris-icon: #6A51A4;
  --cat-koncerti: #FCD1EC;   --cat-koncerti-icon: #92417A;
  --cat-nisas: #E8E0D8;      --cat-nisas-icon: #706052;

  /* Type, shape, touch, motion */
  --font-sans: "Nunito", ui-rounded, system-ui, sans-serif;
  --text-body: 1.125rem;          /* 18px */
  --text-min: 1rem;               /* 16px floor */
  --text-h2: 1.375rem;            /* 22px, at least 1.2x body */
  --leading-body: 1.5;
  --weight-body: 450;
  --radius-chip: 999px;
  --radius-card: 20px;
  --radius-button: 16px;
  --tap-min: 48px;
  --tap-corner: 56px;             /* hamburger and flag hit areas */
  --focus-ring: 3px solid var(--color-focus);
  --focus-offset: 2px;
  --motion-fast: 200ms;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg: #1B1814;
    --color-surface: #27231E;
    --color-text: #F2E6D6;          /* 14.37 on bg */
    --color-text-muted: #BFB2A2;    /* 8.51 on bg */
    --color-border: #857868;        /* 4.11 on bg */
    --color-border-subtle: #3A342D;
    --color-primary: #EE7F8D;       /* 6.78 on bg */
    --color-primary-pressed: #F59AA4;
    --color-on-primary: #101824;    /* 6.84 on primary */
    --color-focus: #F2E6D6;
    --color-success: #8FD3A0;
    --color-success-tint: #203A26;
    --color-warning: #F2BE6B;
    --color-warning-tint: #3E2F12;
    --shadow-card: 0 1px 2px rgb(0 0 0 / 0.4);
    --cat-festivali: #522A30;  --cat-festivali-icon: #F7A3AD;
    --cat-ediens: #502F17;     --cat-ediens-icon: #F0AD7F;
    --cat-blusu: #49340E;      --cat-blusu-icon: #E1B671;
    --cat-gimenem: #40380E;    --cat-gimenem-icon: #CFBF71;
    --cat-zemnieku: #2A3F1E;   --cat-zemnieku-icon: #A2CD8B;
    --cat-darbnicas: #084236;  --cat-darbnicas-icon: #71D3BA;
    --cat-sports: #003F4B;     --cat-sports-icon: #69CEE6;
    --cat-ko-redzet: #223956;  --cat-ko-redzet-icon: #92C1FD;
    --cat-teatris: #3A3154;    --cat-teatris-icon: #C2B1F8;
    --cat-koncerti: #4C2B42;   --cat-koncerti-icon: #EAA4D2;
    --cat-nisas: #3D3730;      --cat-nisas-icon: #C9BBAD;
  }
}
/* Repeat the dark block under :root[data-theme="dark"] for a manual toggle. */

@media (prefers-reduced-motion: reduce) {
  :root { --motion-fast: 0ms; }
}
```

### Sources

1. "Web Content Accessibility Guidelines (WCAG) 2.2", W3C, 2024, https://www.w3.org/TR/WCAG22/, accessed 2026-11-20.
2. "Understanding SC 1.4.3 Contrast (Minimum)", W3C WAI, undated, https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html, accessed 2026-11-20.
3. "Understanding SC 2.5.8 Target Size (Minimum)", W3C WAI, undated, https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html, accessed 2026-11-20.
4. "Understanding SC 2.5.5 Target Size (Enhanced)", W3C WAI, undated, https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html, accessed 2026-11-20.
5. "Understanding SC 1.4.1 Use of Color", W3C WAI, undated, https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html, accessed 2026-11-20.
6. "Accessibility", Human Interface Guidelines, Apple, undated, https://developer.apple.com/design/human-interface-guidelines/accessibility (read via https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json), accessed 2026-11-20.
7. "Make apps more accessible", Android Developers, Google, undated, https://developer.android.com/guide/topics/ui/accessibility/apps, accessed 2026-11-20.
8. "Usability for Senior Citizens: Improved, But Still Lacking" (Nielsen), Nielsen Norman Group, 2013, https://www.nngroup.com/articles/usability-seniors-improvements/, accessed 2026-11-20.
9. "Design for Kids Based on Their Stage of Physical Development" (Liu), Nielsen Norman Group, 2018, https://www.nngroup.com/articles/children-ux-physical-development/, accessed 2026-11-20.
10. "Children's UX: Usability Issues in Designing for Young People" (Sherwin & Nielsen), Nielsen Norman Group, 2019, https://nngroup.com/articles/childrens-websites-usability-issues, accessed 2026-11-20.
11. "Teenager's UX: Designing for Teens" (Kendrick & Nielsen), Nielsen Norman Group, 2019, https://www.nngroup.com/articles/usability-of-websites-for-teenagers/, accessed 2026-11-20.
12. "Beyond the Hamburger: What Makes Navigation Discoverable on Mobile" (Pernice & Budiu), Nielsen Norman Group, 2016, https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/, accessed 2026-11-20.
13. "How Do Users Really Hold Mobile Devices?" (Hoober), UXmatters, 2013, https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php, accessed 2026-11-20.
14. "Design for Fingers, Touch, and People, Part 1" (Hoober), UXmatters, 2017, https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php, accessed 2026-11-20.
15. "Aging and vision" (Owsley), Vision Research 51(13), 2011, PMC3049199, read via https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC3049199/unicode, accessed 2026-11-20.
16. "A Purkinje image-based system for an assessment of the density and transmittance spectra of the human crystalline lens in vivo" (Eto, Teikari, Najjar et al.), Scientific Reports, 2020, PMC7536217, read via https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC7536217/unicode, accessed 2026-11-20.
17. "Discrimination thresholds of normal and anomalous trichromats: Model of senescent changes in ocular media density on the Cambridge Colour Test" (Shinomori, Panorgias, Werner), JOSA A 33(3), 2016, PMC5316232, read via https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC5316232/unicode, accessed 2026-11-20.
18. "How to design font size for older adults: A systematic literature review with a mobile device" (Hou, Anicetus, He), Frontiers in Psychology, 2022, PMC9376262, read via https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC9376262/unicode, accessed 2026-11-20.
19. "Positive display polarity is advantageous for both younger and older adults" (Piepenbrock, Mayr, Mund, Buchner), Ergonomics 56, 2013, reprinted in Piepenbrock's dissertation, Heinrich-Heine-Universität Düsseldorf, https://docserv.uni-duesseldorf.de/servlets/DerivateServlet/Derivate-31413, accessed 2026-11-20.
20. "Good Background Colors for Readers: A Study of People with and without Dyslexia" (Rello & Bigham), ASSETS 2017, ACM, 2017, https://www.changedyslexia.org/publications/pdfs/2017-ASSETS-Good%20Background%20Colors.pdf, accessed 2026-11-20.
21. "An ecological valence theory of human color preference" (Palmer & Schloss), PNAS 107(19), 2010, https://palmerlab.berkeley.edu/pdf/Palmer%26Schloss%282010%29.pdf, accessed 2026-11-20.
22. "Dyslexia Style Guide 2023", British Dyslexia Association, 2023, copy at https://lbhfinspirehub.com/wp-content/uploads/2024/05/BDA-Style-Guide-2023.pdf (BDA's own CDN copy returned Access Denied), accessed 2026-11-20.
23. "Colour Blindness", Colour Blind Awareness, undated, https://www.colourblindawareness.org/colour-blindness/, accessed 2026-11-20.
24. Latvijas Pasts homepage and stylesheets, Latvijas Pasts, 2026, https://pasts.lv/, https://pasts.lv/build/website/css/abovethefold.Dusl0GHu.css, https://pasts.lv/build/website/css/theme.BmGz4gh3.css, accessed 2026-11-20.
25. Anthropic homepage stylesheet, Anthropic, 2026, https://www.anthropic.com/_next/static/chunks/1dbqihqf7xwy_.css (file name changes with each build), accessed 2026-11-20.
26. "Latvijas valsts karogs" (Pumpuriņš), Nacionālā enciklopēdija, Latvijas Nacionālā bibliotēka, 2025, https://enciklopedija.lv/skirklis/8867-Latvijas-valsts-karogs, accessed 2026-11-20.
27. "Latvijas karogs", Vikipēdija, undated, https://lv.wikipedia.org/wiki/Latvijas_karogs, accessed 2026-11-20.
28. "Pantone 201 C", Pantone, undated, https://www.pantone.com/connect/201-C (hex hidden), accessed 2026-11-20.
29. Google Fonts CSS API responses for Nunito, Quicksand, Atkinson Hyperlegible Next, Baloo 2, Varela Round and Fredoka, Google, 2026, https://fonts.googleapis.com/css2?family=Nunito:wght@400..800&display=swap (and the other URLs in section 5.7), accessed 2026-11-20.
30. "Lighthouse performance scoring", Chrome for Developers, undated, https://developer.chrome.com/docs/lighthouse/performance/performance-scoring, accessed 2026-11-20.
31. "Network Throttling" docs, GoogleChrome/lighthouse, GitHub, undated, https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md, accessed 2026-11-20.
32. Lighthouse source (default-config.js, constants.js, largest-contentful-paint.js, total-blocking-time.js and the other metric files), GoogleChrome/lighthouse v13.6.0, GitHub, 2026, https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/core/config/default-config.js, accessed 2026-11-20.
33. "Web Vitals", web.dev, Google, undated, https://web.dev/articles/vitals, accessed 2026-11-20.
34. "Performance budgets 101", web.dev, Google, undated, https://web.dev/articles/performance-budgets-101, accessed 2026-11-20.
35. "Optimize Largest Contentful Paint", web.dev, Google, undated, https://web.dev/articles/optimize-lcp, accessed 2026-11-20.
36. "Optimize Cumulative Layout Shift", web.dev, Google, undated, https://web.dev/articles/optimize-cls, accessed 2026-11-20.
37. "Image formats: AVIF", Learn Images, web.dev, Google, undated, https://web.dev/learn/images/avif, accessed 2026-11-20.
38. "Responsive images", Learn Images, web.dev, Google, undated, https://web.dev/learn/images/responsive-images, accessed 2026-11-20.
39. "What does it take to be installable?", web.dev, Google, undated, https://web.dev/articles/install-criteria, accessed 2026-11-20.
40. "workbox-strategies", Chrome for Developers, undated, https://developer.chrome.com/docs/workbox/modules/workbox-strategies, accessed 2026-11-20.
41. "workbox-expiration", Chrome for Developers, undated, https://developer.chrome.com/docs/workbox/modules/workbox-expiration, accessed 2026-11-20.


---

## 6. Latvian UI language

### Key findings

- Tu wins the market. 18 of 22 reachable Latvian consumer sites address the user with tu, 3 use jūs (SEB, Biļešu Serviss, Google) and 1 mixes (Live Riga). Recommendation: lowercase tu, with neutral phrasing first (6.1).
- Microsoft's Latvian guide prescribes lowercase jūs for software ([Microsoft, p. 48](https://download.microsoft.com/download/c/9/c/c9c901d9-8d73-4a07-bda2-e9177cc0e965/lav-lva-StyleGuide.pdf)). The Latviešu valodas aģentūra (LVA) ties capital Tu/Jūs to letters and leaves ads free ([LVA Q964](https://www.valodaskonsultacijas.lv/lv/questions/964)).
- The time norm is `19.00`. The colon is allowed only as a technical sign ([LVA Q400](https://www.valodaskonsultacijas.lv/lv/questions/400)). Node Intl and CLDR output `19:00`, so the app must override it.
- The price norm puts the sign after the amount with a no-break space: `12 €`, `No 8 €` ([LVA Q472](https://www.valodaskonsultacijas.lv/lv/questions/472)). The owner's `€12` and `No €8` use the English order. VVC's expert commission dropped that order in 2014, and EU Latvian texts followed on 1 January 2018 ([EU style guide 7.3.3](https://style-guide.europa.eu/lv/content/-/isg/topic?identifier=7.3.3-rules-for-expressing-monetary-units)).
- "Bez maksas" is correct as a standalone price chip. "Bezmaksas" goes only before a noun ([LVA Q864](https://www.valodaskonsultacijas.lv/lv/questions/864)).
- Date labels take the nominative (`14. decembris`), sentences the locative (`14. decembrī`) ([LVA Q879](https://www.valodaskonsultacijas.lv/lv/questions/879)). Intl's short range `1.–31. dec.` matches the owner's draft. Intl's long-month range outputs `decembris 1–31` and must be avoided.
- `Intl.PluralRules('lv')` returns zero (0, 10 to 20, 30, 100, 111), one (1, 21, 101) and other (2, 22). The strings are `pasākumu`, `pasākums`, `pasākumi`.
- 9 of 10 name candidates have a free `.lv` domain. Top picks: Sanāc, Nāc līdzi, Turpat. "Kurp ejam" collides with the event site [Kurp.es](https://kurpes.lv/).
- Baltā cielava and divpunktu mārīte are confirmed national symbols ([Nacionālā enciklopēdija](https://enciklopedija.lv/skirklis/5068-Latvijas-nacion%C4%81lie-simboli)). Brigadere's "Sprīdītis" text has been public domain since 1 January 2004.
- "Nišas" fails as a category: the first dictionary sense of "niša" is a wall recess ([Tēzaurs](https://tezaurs.lv/ni%C5%A1a)). "Hobiji" replaces it.

### 6.1 Tu vs Jūs

Method. 23 Latvian pages were fetched on 2026-11-20 with curl, then scanned for pronouns (tu, tev, tavs; jūs, jums, jūsu) and imperatives (`-i` vs `-iet`). LMT and Tele2 render with JavaScript, so their text was read through a WebFetch render. The column lists the observed word forms.

| Site | Form | Observed form |
|---|---|---|
| [Swedbank](https://www.swedbank.lv/private?language=LAT) | Tu | `tavu plānu`; browser warning in jūs |
| [SEB](https://www.seb.lv/) | Jūs | `Jums ērti`, `Lejupielādējiet`; youth offer `Tev` |
| [Citadele](https://www.citadele.lv/lv/) | Tu | `tev palīdzēt` |
| [Luminor](https://www.luminor.lv/lv) | Tu | `Tava iespēja` |
| [Rimi](https://www.rimi.lv/), [Mans Rimi](https://www.rimi.lv/mansrimi) | Tu | `Iepērcies`, `Lejupielādē`; error page in jūs |
| [Maxima](https://www.maxima.lv/) | Tu | `Tavā viedtālrunī`; form reply in jūs |
| [Lidl](https://www.lidl.lv/) | Tu | `Piesakies`; browser warning in jūs |
| [Bolt](https://bolt.eu/lv-lv/) | Tu | `tev vajadzīgs` |
| [Wolt](https://wolt.com/lv/lva) | Tu | `Izbaudi`, `tavā pilsētā` |
| [Latvijas Pasts](https://pasts.lv/lv/) | Tu | `Gaidām Tevi` |
| [LMT](https://www.lmt.lv/lv/) | Tu | `atradīsi` |
| [Tele2](https://www.tele2.lv/) | Tu | `piepildi to` |
| [Bite](https://www.bite.lv/lv) | Tu | `tu saņemsi` |
| [Tet](https://www.tet.lv/) | Tu | `Tavs pieteikums`, `tev piezvanīsim` |
| [airBaltic](https://www.airbaltic.com/lv-LV/index) | Tu | `Pieslēdzies`; one promo `jūsu vajadzībām` |
| [Live Riga](https://www.liveriga.com/lv/) | Mixed | `Jūs esiet pierakstījies`, `Atrodi mūs` |
| [Biļešu Serviss](https://www.bilesuserviss.lv/lat/) | Jūs | `jūs piekrītat`, `Sekojiet mums` |
| [Delfi](https://www.delfi.lv/) | Tu | `Lasi vēl` |
| [Elektrum](https://www.elektrum.lv/lv/) | Tu | `Tev ir gāzes katls`; one `jūsu ierīcēm` |
| [Circle K](https://www.circlek.lv/) | Tu | `aizpildīsi` |
| Google ([sign-in](https://accounts.google.com/ServiceLogin?hl=lv), [help](https://support.google.com/accounts/answer/27441?hl=lv)) | Jūs | `jūsu dators`, `izmantojiet` |
| Facebook ([terms](https://lv-lv.facebook.com/legal/terms)) | Tu | `kā tu lieto Facebook` |
| latvija.gov.lv | not found | TLS handshake refused |

| Form | Count | Share of 22 |
|---|---|---|
| Tu | 18 | 82% |
| Jūs | 3 | 14% |
| Mixed | 1 | 5% |

6 of the 18 tu sites leak jūs into at least one string, such as a browser warning, error page, form reply or promo (Swedbank, Rimi, Maxima, Lidl, airBaltic, Elektrum). Capitalisation drifts too: Maxima, Bolt, Latvijas Pasts, Bite and Tet write `Tev` mid-sentence, and Tet uses both cases.

Norms.
- Microsoft says translated software "should use the polite form of "you" (jūs)", lowercase except in letters ([Microsoft, pp. 37, 48](https://download.microsoft.com/download/c/9/c/c9c901d9-8d73-4a07-bda2-e9177cc0e965/lav-lva-StyleGuide.pdf)). It renders commands as infinitives, for example `Saglabāt` (p. 77). [Microsoft Learn](https://learn.microsoft.com/en-us/globalization/reference/microsoft-style-guides) links the guide.
- LVA: capitals are customary in letters, no fixed norm covers other texts, and ads may use either case ([LVA Q964](https://www.valodaskonsultacijas.lv/lv/questions/964)). The MLVV dictionary prescribes capital Jūs when writing to a person, for example in a letter ([MLVV](https://mlvv.tezaurs.lv/j%C5%ABs:1)).
- LVA or VVC guidance specific to apps or digital services: not found.

Audience fit. An LVA collection notes that tu personalises an ad, that excess familiarity can backfire, and that lowercase jūs addresses no one personally ([Ločmele 2010, PDF p. 18](https://www.valodaskonsultacijas.lv/uploads/suggested_sources/5/pdf/valodas_prakse_Nr5.pdf)). In the same volume, 38% of surveyed teachers addressed pupils with tu, and children learn to address adults with jūs ([Blūmane 2010, pp. 33 to 34](https://www.valodaskonsultacijas.lv/uploads/suggested_sources/5/pdf/valodas_prakse_Nr5.pdf)). Teens expect tu. Some users over 70 may find tu over-familiar.

Recommendation: tu, lowercase, neutral first.
1. Tu matches what users aged 15 to 70 read daily from Rimi, Maxima, Lidl, Latvijas Pasts and LMT.
2. Lowercase follows LVA, which ties capitals to letters, and avoids Tet-style drift.
3. Buttons take the infinitive (`Pirkt biļetes`). Messages take impersonal or "mēs" forms (`Neizdevās ielādēt pasākumus`). Tu then appears only in hints and empty states.
4. The jūs column in 6.5 stays ready as a switch if senior usability tests show friction (opinion).

### 6.2 Dates and times

Norms.
- Month and weekday names are lowercase ([Microsoft, p. 36](https://download.microsoft.com/download/c/9/c/c9c901d9-8d73-4a07-bda2-e9177cc0e965/lav-lva-StyleGuide.pdf)). A standalone date is nominative (Microsoft: `2022. gada 17. februāris`). In a sentence it is locative (`2002. gada 21. septembrī`, [EU style guide 10.5.2](https://style-guide.europa.eu/lv/content/-/isg/topic?identifier=10.5.2-number-date-time-units-usage)).
- A range with an unspaced en dash takes the locative (`11.–22. jūnijā`). "No ... līdz" takes the dative, and "no" never stands alone ([LVA Q879](https://www.valodaskonsultacijas.lv/lv/questions/879)). Two consecutive days read `11. un 12. jūlijā` (EU guide 10.5.2).
- Time takes a point, per VVC LVEK protocol 42 of 13.05.2015 ([LVA Q400](https://www.valodaskonsultacijas.lv/lv/questions/400)). This holds after weekdays (`trešdien pulksten 21.15`, [LVA Q915](https://www.valodaskonsultacijas.lv/lv/questions/915)) and in ranges (`9.00–17.00`, [LVA Q702](https://www.valodaskonsultacijas.lv/lv/questions/702)).
- `šovakar` ([Tēzaurs](https://tezaurs.lv/%C5%A1ovakar)), `nedēļas nogale` ([Tēzaurs](https://tezaurs.lv/nogale)) and the adverb `sestdien` ([Tēzaurs](https://tezaurs.lv/sestdien)) are standard.
- Practice uses the colon: [Biļešu Serviss](https://www.bilesuserviss.lv/lat/) `S 12.12.2026 • 20:00`, [Ticketshop](https://www.ticketshop.lv/) `20.11.26 20:00`, [Kas? Kur? Kad?](https://www.kaskurkad.lv/) `19:00`. [Pasakumitukuma.lv](https://pasakumitukuma.lv/) writes `piektdiena, 20. novembris 2026`. Kas? Kur? Kad? filters by `Šodien`, `Rīt`, `Šonedēļ`.

Intl output (node v26.13.0, ICU 79.1, CLDR 49.0, `lv-LV`, Riga time, Monday 14 December 2026 19.00):

| Options | Output |
|---|---|
| `day, month:'long'` | `14. decembris` |
| `day, month:'short'` | `14. dec.` |
| `weekday:'long', day, month:'long'` | `pirmdiena, 14. decembris` |
| `weekday:'short', day, month:'short'` | `pirmd., 14. dec.` |
| `weekday:'long'` alone | `Pirmdiena` (stand-alone form, capitalised) |
| `day, month:'long', hour, minute` | `14. decembris 19:00` |
| `formatRange` 1 to 31 Dec, short | `1.–31. dec.` |
| `formatRange` 1 to 31 Dec, long | `decembris 1–31` |
| `formatRange` 28 Nov to 3 Dec, short | `28. nov. – 3. dec.` (thin spaces U+2009) |
| `RelativeTimeFormat` day -1 to 2 | `vakar`, `šodien`, `rīt`, `parīt` |
| `ListFormat` | `12., 14. un 16. decembris` |

Month abbreviations are `janv., febr., marts, apr., maijs, jūn., jūl., aug., sept., okt., nov., dec.`, identical in [CLDR 49](https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-dates-full/main/lv/ca-gregorian.json). CLDR explains both quirks: the same-month interval pattern is `MMMM d–d`, and the short time pattern is `HH:mm`. CLDR's two-letter weekdays are `Pr Ot Tr Ce Pk Se Sv`. Biļešu Serviss uses `O T C Pk S Sv` (no Monday listing seen).

Formatting spec (sentence case):

| Case | Card label | Detail or sentence |
|---|---|---|
| Single day | `14. decembris, 19.00` | `14. decembrī plkst. 19.00` |
| With weekday | `Pirmdiena, 14. decembris, 19.00`; compact `Pirmd., 14. dec., 19.00` | same |
| Two days | `12. un 13. decembris` | `12. un 13. decembrī` |
| Consecutive days | `12.–14. decembris` | `12.–14. decembrī` |
| Non-consecutive | `12., 14. un 16. decembris` | `12., 14. un 16. decembrī` |
| Long range | `1.–31. dec.` | `No 1. līdz 31. decembrim` |
| Cross-month | `28. nov. – 3. dec.` | `No 28. novembra līdz 3. decembrim` |
| Open-ended | `Līdz 6. decembrim` | same |
| Today | `Šodien, 19.00`; after 17.00 `Šovakar, 19.00` | same |
| Tomorrow, day after | `Rīt, 19.00`; `Parīt, 19.00` | same |
| Within 6 days | `Sestdien, 19.00` | same |
| Time range | `19.00–21.30` | `no 19.00 līdz 21.30` |

Implementation: format parts with Intl, swap `:` for `.`, capitalise the first character, and build long-month same-month ranges by hand. The draft `12., 13., 14. dec.` becomes `12.–14. dec.`.

### 6.3 Prices and numbers

- Norm: VVC LVEK protocol 33 of 12.03.2014 moved all currency codes and symbols after the amount with a no-break space, for example `5678,90 $` ([LVA Q472](https://www.valodaskonsultacijas.lv/lv/questions/472)). An entry fee is `5 EUR` or `5 eiro` ([LVA Q968](https://www.valodaskonsultacijas.lv/lv/questions/968)). The EU guide writes `350 €` and allows € in popular and advertising texts ([7.3.3](https://style-guide.europa.eu/lv/content/-/isg/topic?identifier=7.3.3-rules-for-expressing-monetary-units)).
- The decimal mark is a comma. CLDR groups digits with U+00A0 from five digits up ([CLDR lv numbers](https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-numbers-full/main/lv/numbers.json)), as Microsoft does (p. 60).
- Intl `currency:'EUR'` gives `12,00 €` by default. With `trailingZeroDisplay:'stripIfInteger'` it gives `12 €`, `8,50 €`, `1234,50 €`. `currencyDisplay:'code'` gives `12,00 EUR`, `'name'` gives `12,00 eiro`, and `formatRange(8, 25)` gives `8–25 €`.
- Practice: Ticketshop `no 12,00 EUR`; pasakumitukuma.lv `Biļetes 4 EUR`, `60 €`, `Ieeja par ziedojumiem`, `Ieeja brīva.`; Biļešu Serviss `34.84 - 110.63` (decimal point, no currency). [Ogrenet](https://www.ogrenet.lv/kultura/nedelas-nogale-ogres-novada-prieces-ziemassvetkiem-veltiti-koncerti-un-tirdzini-12341) prints `Ieeja bez maksas.` and `Ieeja brīva.` on one page. [LNMM](https://www.lnmm.lv/lv/pasakumi) uses `Bezmaksas ieeja`.
- Minimum price: an LVA ruling on `No 8 €` vs `Sākot no 8 €` was not found. LVA's "no needs līdz" rule covers date ranges. Ticketshop shows the lone price `no` in use.

Spec: `12 €`, `8,50 €`, `No 8 €`, or `8–25 €` when the maximum is known. `Bez maksas` stands alone, `Bezmaksas` precedes a noun, `Par ziedojumu` marks donation entry. `Sākot no` adds 6 characters for no gain (opinion). The draft breaks the norm twice: `€12` becomes `12 €`, and `No €8` becomes `No 8 €`.

### 6.4 Plurals and units

`Intl.PluralRules('lv')` returns `zero`, `one`, `other`. Results: 0, 10, 11, 12, 20, 30, 111 and 1000 are zero; 1, 21 and 101 are one; 2, 22 and 2.5 are other. This matches [CLDR](https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-core/supplemental/plurals.json). Zero covers numbers ending in indeclinable numerals (desmit, -padsmit, simt), after which LVA allows genitive or nominative ([LVA Q764](https://valodaskonsultacijas.lv/lv/questions/764)). Intl's unit strings use the genitive: `1 gads`, `2 gadi`, `10 gadu`, `21 gads`.

| Category | String | Examples |
|---|---|---|
| one | `{n} pasākums` | 1, 21, 101 |
| other | `{n} pasākumi` | 2, 5, 22 |
| zero | `{n} pasākumu` | 10, 11, 30, 100 |
| n = 0 | `Pasākumu nav` | text replaces the number |

Distance: Intl gives `2,5 km`, `0,8 km`, `800 m` with a no-break space. Show metres under 1 km, one decimal under 10 km, whole kilometres above. Kids' ages: chips `0–2 gadi`, `3–6 gadi`, `7–12 gadi`, `13–17 gadi`, `18+`; card minimum `No 6 gadiem` (singular `No 1 gada`). [LMT](https://www.lmt.lv/lv/) labels use the same pattern: `Skolēnam (līdz 18 g.v.)`.

### 6.5 Microcopy glossary

The jūs column is filled only where it differs.

| Intent | Tu (recommended) | Jūs |
|---|---|---|
| Nearby / elsewhere | Tuvumā / Citur Latvijā | |
| Show more | Rādīt vairāk | |
| Filters | Filtri | |
| Today / tonight / tomorrow | Šodien / Šovakar / Rīt | |
| This weekend | Šajā nedēļas nogalē (chip: Nedēļas nogalē) | |
| This week | Šonedēļ | |
| Free | Bez maksas | |
| Buy tickets | Pirkt biļetes | |
| Search | Meklēt | |
| Search hint | Meklē pasākumu vai vietu | Meklējiet pasākumu vai vietu |
| Menu / close / back | Izvēlne / Aizvērt / Atpakaļ | |
| Use location | Izmantot atrašanās vietu | |
| Location prompt | Atļauj piekļuvi atrašanās vietai, lai redzētu pasākumus tuvumā. | Atļaujiet piekļuvi ... |
| Location denied | Atrašanās vieta nav pieejama. Izvēlies pilsētu. | ... Izvēlieties pilsētu. |
| Skip / continue / done | Izlaist / Turpināt / Gatavs | |
| Family friendly | Piemērots ģimenēm | |
| Alone | Vienatnē ("Viens" also reads as "one") | |
| With friends / family | Ar draugiem / Ar ģimeni | |
| Save / saved tab | Saglabāt / Saglabātie | |
| Share | Dalīties | |
| Add to calendar | Pievienot kalendāram | |
| Directions | Kā nokļūt | |
| Clear filters | Notīrīt filtrus | |
| Show results | Rādīt rezultātus (24) | |
| Settings | Iestatījumi | |
| Sold out / cancelled | Biļetes izpārdotas / Atcelts | |
| Registration needed | Nepieciešama reģistrācija | |
| Interests question | Kas tevi interesē? | Kas jūs interesē? |
| Empty: nothing today | Šodien tuvumā pasākumu nav. Paskaties citur Latvijā. | ... Paskatieties citur Latvijā. |
| Empty: no results | Nekas netika atrasts. Pārbaudi rakstību. | ... Pārbaudiet rakstību. |
| Empty: nothing saved | Saglabāto pasākumu vēl nav. | |
| Offline banner | Nav interneta savienojuma. Rādām iepriekš ielādētos pasākumus. | |
| Back online | Savienojums atjaunots. | |
| Load error | Neizdevās ielādēt pasākumus. [Mēģināt vēlreiz] | |
| Generic error | Radās kļūda. Mēģini vēlreiz pēc brīža. | ... Mēģiniet vēlreiz pēc brīža. |

Category review:

| Draft | Verdict | Suggestion |
|---|---|---|
| Ēdiens | Reads as "food" | Ēdiens un dzērieni |
| Zemnieku tirdziņi, Blusu tirgi, Koncerti, Ģimenēm, Teātris, Festivāli, Sports | Natural | keep |
| Ko redzēt | A question among nouns, vague | Izstādes un kino; light shows go under Festivāli |
| Darbnīcas | Also means a repair shop | Radošās darbnīcas (Kas? Kur? Kad? uses `Radošās nodarbības`) |
| Nišas | First sense is a wall recess | Hobiji; [Tēzaurs](https://tezaurs.lv/hobijs) gives "vaļasprieks" as synonym |

### 6.6 Names and mascot

Checks on 2026-11-20: `whois -h whois.nic.lv NAME.lv`, with IDN names in punycode (`xn--sanc-ssa.lv` for `sanāc.lv`), and one Brave web search per name. The trademark register was not checked.

| Name | Meaning | ASCII .lv | IDN .lv | Brand search |
|---|---|---|---|---|
| Sanāc | "come over"; colloquially "it works out" | free | sanāc.lv free | none found |
| Nāc līdzi | "come along" | naclidzi.lv free | nāclīdzi.lv free | none found |
| Turpat | "right there, close by" | free | n/a | none found |
| Iziet | "to go out" (also "to pass") | free | n/a | none found |
| Plakāts | "poster" | plakats.lv free | plakāts.lv free | generic word, print shops |
| Ejam ārā | "let's go out" | ejamara.lv free | ejamārā.lv free | everyday phrase, no brand |
| Kopā būt | "being together" | kopabut.lv free | kopābūt.lv free | Song Festival line "Kopā būt, kopā just" (snippet, unverified) |
| Satiekamies | "let's meet" | free | n/a | none found; 11 letters |
| Kurp ejam | "where are we going" | kurpejam.lv free; kurp.lv active | n/a | collides with [Kurp.es](https://kurpes.lv/) |
| Notiek | "it's happening" | notiek.lv active | n/a | taken; no site responded |

Competitors seen: [Kas? Kur? Kad?](https://www.kaskurkad.lv/), [Kurp.es](https://kurpes.lv/), [pasakumitukuma.lv](https://pasakumitukuma.lv/), Noktirne app (snippet, unverified).

Mascot ideas:
1. Cielaviņa, the white wagtail. Ornithologists chose baltā cielava in 1965, and the International Council for Bird Preservation approved it in 1969 ([Nacionālā enciklopēdija](https://enciklopedija.lv/skirklis/5068-Latvijas-nacion%C4%81lie-simboli)). It lives near farmsteads all over Latvia, which fits "Tuvumā". The Latvian Ornithological Society and the Natural History Museum use it as an emblem, so the design must differ. cielava.lv is taken.
2. Mārīte, the two-spot ladybird. The Latvian Entomological Society proposed divpunktu mārīte in 1991 and uses it as its symbol (same source). Two spots can mark "you" and "the event" on a map pin (opinion). marite.lv is taken, and "mārīte" is also a regional name for the daisy.
3. Sprīdītis, the boy hero of Anna Brigadere's 1903 play ([enciklopēdija](https://enciklopedija.lv/skirklis/128907-%E2%80%9CSpr%C4%ABd%C4%ABtis%E2%80%9D)). Brigadere died on 25.06.1933 ([enciklopēdija](https://enciklopedija.lv/skirklis/105653-Anna-Brigadere)). Copyright lasts for life plus 70 years (Art. 36) and runs from 1 January after death (Art. 38) ([Autortiesību likums, WIPO Lex](https://www.wipo.int/wipolex/en/legislation/details/15457)). The text is therefore free since 1 January 2004. Art. 39 still protects the author's name and the work's integrity. The 1982 animation (Ansis Bērziņš) and 1985 film (Gunārs Piesis) are separate works, so their character designs are off limits. A publisher named "Sprīdītis" ran from 1990 to 1996. The play was staged and filmed in Soviet Latvia, so the extension for banned works probably does not apply (inference, not verified).

### Sources

1. "Latvian Localization Style Guide", Microsoft, undated, https://download.microsoft.com/download/c/9/c/c9c901d9-8d73-4a07-bda2-e9177cc0e965/lav-lva-StyleGuide.pdf, accessed 2026-11-20.
2. "Microsoft Localization Style Guides", Microsoft Learn, 2025, https://learn.microsoft.com/en-us/globalization/reference/microsoft-style-guides, accessed 2026-11-20.
3. "Vai vienmēr vietniekvārdi tu un jūs rakstāmi ar lielo sākumburtu?", LVA Q964, 2025, https://www.valodaskonsultacijas.lv/lv/questions/964, accessed 2026-11-20.
4. "jūs", MLVV, Tēzaurs, 2026, https://mlvv.tezaurs.lv/j%C5%ABs:1, accessed 2026-11-20.
5. "Valodas prakse Nr. 5" (Ločmele; Blūmane), LVA, 2010, https://www.valodaskonsultacijas.lv/uploads/suggested_sources/5/pdf/valodas_prakse_Nr5.pdf, accessed 2026-11-20.
6. "Pulksteņa laiks: 13.15 vai 13:15?", LVA Q400, 2025, https://www.valodaskonsultacijas.lv/lv/questions/400, accessed 2026-11-20.
7. "Trešdien pulksten 21:15 vai 21.15?", LVA Q915, 2025, https://www.valodaskonsultacijas.lv/lv/questions/915, accessed 2026-11-20.
8. "Kā pierakstīt pulksteņa laiku", LVA Q702, 2025, https://www.valodaskonsultacijas.lv/lv/questions/702, accessed 2026-11-20.
9. "Izstāde skatāma `11.–22. jūnijam` vai `11.–22. jūnijā`?", LVA Q879, 2025, https://www.valodaskonsultacijas.lv/lv/questions/879, accessed 2026-11-20.
10. "Kā norādīt valūtas kodu un grafisko simbolu?", LVA Q472, 2025, https://www.valodaskonsultacijas.lv/lv/questions/472, accessed 2026-11-20.
11. "Ieejas maksa EUR 5 vai 5 EUR?", LVA Q968, 2025, https://www.valodaskonsultacijas.lv/lv/questions/968, accessed 2026-11-20.
12. "Bez maksas pārbaude vai bezmaksas pārbaude?", LVA Q864, 2025, https://www.valodaskonsultacijas.lv/lv/questions/864, accessed 2026-11-20.
13. "Divdesmittūkstoš dalībnieki vai dalībnieku?", LVA Q764, 2025, https://valodaskonsultacijas.lv/lv/questions/764, accessed 2026-11-20.
14. "7.3.3. Noteikumi par naudas vienību attēlošanu", EU Publications Office, 2026, https://style-guide.europa.eu/lv/content/-/isg/topic?identifier=7.3.3-rules-for-expressing-monetary-units, accessed 2026-11-20.
15. "10.5.2. Skaitļu, datumu un laika vienību lietošanas īpatnības", EU Publications Office, 2026, https://style-guide.europa.eu/lv/content/-/isg/topic?identifier=10.5.2-number-date-time-units-usage, accessed 2026-11-20.
16. "lv ca-gregorian.json", Unicode CLDR 49, 2026, https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-dates-full/main/lv/ca-gregorian.json, accessed 2026-11-20.
17. "lv numbers.json", Unicode CLDR 49, 2026, https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-numbers-full/main/lv/numbers.json, accessed 2026-11-20.
18. "plurals.json", Unicode CLDR 49, 2026, https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-core/supplemental/plurals.json, accessed 2026-11-20.
19. Tēzaurs entries "šovakar", "nogale", "sestdien", "niša", "hobijs", Tēzaurs.lv, 2026, https://tezaurs.lv/%C5%A1ovakar, https://tezaurs.lv/nogale, https://tezaurs.lv/sestdien, https://tezaurs.lv/ni%C5%A1a, https://tezaurs.lv/hobijs, accessed 2026-11-20.
20. "Latvijas nacionālie simboli", Nacionālā enciklopēdija, 2026, https://enciklopedija.lv/skirklis/5068-Latvijas-nacion%C4%81lie-simboli, accessed 2026-11-20.
21. "Anna Brigadere", Nacionālā enciklopēdija, 2026, https://enciklopedija.lv/skirklis/105653-Anna-Brigadere, accessed 2026-11-20.
22. "Sprīdītis", Nacionālā enciklopēdija, 2026, https://enciklopedija.lv/skirklis/128907-%E2%80%9CSpr%C4%ABd%C4%ABtis%E2%80%9D, accessed 2026-11-20.
23. "Autortiesību likums", WIPO Lex, 2011 consolidation, https://www.wipo.int/wipolex/en/legislation/details/15457, accessed 2026-11-20.
24. Bank sites: https://www.swedbank.lv/private?language=LAT, https://www.seb.lv/, https://www.citadele.lv/lv/, https://www.luminor.lv/lv, 2026, accessed 2026-11-20.
25. Retail sites: https://www.rimi.lv/, https://www.rimi.lv/mansrimi, https://www.maxima.lv/, https://www.lidl.lv/, https://www.circlek.lv/, 2026, accessed 2026-11-20.
26. Transport and delivery: https://bolt.eu/lv-lv/, https://wolt.com/lv/lva, https://www.airbaltic.com/lv-LV/index, https://pasts.lv/lv/, 2026, accessed 2026-11-20.
27. Telecom and energy: https://www.lmt.lv/lv/, https://www.tele2.lv/, https://www.bite.lv/lv, https://www.tet.lv/, https://www.elektrum.lv/lv/, 2026, accessed 2026-11-20.
28. Media and tickets: https://www.liveriga.com/lv/, https://www.bilesuserviss.lv/lat/, https://www.delfi.lv/, https://www.ticketshop.lv/, 2026, accessed 2026-11-20.
29. Platforms: https://accounts.google.com/ServiceLogin?hl=lv, https://support.google.com/accounts/answer/27441?hl=lv, https://lv-lv.facebook.com/legal/terms, 2026, accessed 2026-11-20.
30. Event listings: https://www.kaskurkad.lv/, https://pasakumitukuma.lv/, https://kurpes.lv/, https://www.lnmm.lv/lv/pasakumi, 2026, accessed 2026-11-20.
31. "Nedēļas nogalē Ogres novadā priecēs Ziemassvētkiem veltīti koncerti un tirdziņi", Ogrenet, 2026, https://www.ogrenet.lv/kultura/nedelas-nogale-ogres-novada-prieces-ziemassvetkiem-veltiti-koncerti-un-tirdzini-12341, accessed 2026-11-20.


---

