# Review of 2026-11-21

Six Latvian personas used the live site at 390×844 (one at 360×740) through scripted browsers, and one audit read all 2,643 events. This file lists what they found, what was fixed the same day, and what is still open.

## Plan

| Step | Who | What |
|---|---|---|
| 1 | Ausma, 71, Cēsis | Weak eyesight (text at 130%), wants a concert or theatre nearby, afraid of wrong taps. |
| 2 | Jānis, 64, near Kuldīga | Slow mobile internet (400 kbps) and offline, wants Saturday markets. |
| 3 | Līga, 38, Jelgava | Two children (5 and 9), plans the weekend, price-sensitive, saves and shares. |
| 4 | Markuss, 11, Rīga | Skips onboarding, taps fast, wants games, anime, sports. |
| 5 | Elza, 24, Rīga | Tonight with friends, searches with typos and no diacritics, dark mode. |
| 6 | Artjoms, 17, Daugavpils | Latvian as second language, 360 px phone, wants free events and sports. |
| 7 | Data audit | Categories, towns, dates, duplicates, titles, prices, images, links, descriptions, coverage. |
| 8 | Fix | Every finding below marked "Fixed". |
| 9 | Verify | 262 unit tests, 17 browser tests, type check, live check after deploy. |

## Taps to the first useful event

| Persona | Taps | Note |
|---|---|---|
| Ausma | 5 | Tonight's jazz concert in Cēsis. |
| Jānis | 5 | Nearest market 78 km away; Kuldīga has no market source. |
| Līga | 8 | All 8 are onboarding choices; the first weekend family event took 4 more. |
| Markuss | 3 to skip, about 6 more to a fitting event | Home showed nothing for him. |
| Elza | 7 on the short route | No "Šovakar" filter existed. |
| Artjoms | 5 | A hockey game today. |

## Findings

| # | Finding | Found by | Status |
|---|---|---|---|
| 1 | Every town-centre event showed "50 m" (90% of events have only a town). | Līga | Fixed: no distance under 3 km, "ap 12 km" above. |
| 2 | Lists past the user's area ignored distance: 193 km and 348 km events led for Daugavpils. | Artjoms, Ausma, Līga | Fixed: whole-country lists rank nearer events first. |
| 3 | A weekend filter led with courses that run for weeks. | Līga | Fixed: events that start in the chosen period come first. |
| 4 | No "Šovakar" filter. | Elza | Fixed. |
| 5 | Council and committee meetings, residents' meetings and teacher training were listed as events (about 40). | Līga, audit | Fixed: dropped in `normalize.ts`. |
| 6 | 347 titles lost their closing quote. | Audit | Fixed. |
| 7 | All-capitals titles lost personal names ("Egils siliņš"). | Ausma | Fixed: each word capitalised, acronyms kept. |
| 8 | 63 venue names showed `&quot;`. | Audit, Ausma, Artjoms | Fixed. |
| 9 | 42 descriptions held phone numbers; words ran together ("dalībniekiem!Izzini"). | Audit, Līga | Fixed. |
| 10 | Football games sat under "Radošās darbnīcas". | Audit | Fixed: sports keywords added. |
| 11 | 59 events state free entry only in the description. | Audit | Fixed for plain "ieeja bez maksas" wording. |
| 12 | Event page showed no price line when the price is unknown. | Ausma | Fixed: "Cena nav norādīta". |
| 13 | "Saglabāt" ran off the screen at 130% text. | Ausma | Fixed: actions wrap to two rows. |
| 14 | A film page had 2 identical "Pirkt biļetes: Apollo Kino" buttons. | Elza | Fixed: one button per seller. |
| 15 | Description cut at "…" with no way to read on. | Līga | Fixed: "Lasīt vairāk avota lapā". |
| 16 | "foto izstade" returned film showings. | Elza | Fixed: films and exhibitions are indexed apart. |
| 17 | "jurmala" in "Tuvumā" missed Jūrmala events. | Elza | Fixed: a town named in the query is shown at any distance. |
| 18 | "Bez maksas" appeared twice on a card. | Artjoms | Fixed. |
| 19 | Source links had a stray comma; the footer note was bureaucratic; "Vēl" was unclear; "Saglabāt" did not change after saving. | Artjoms, Ausma, Līga | Fixed. |
| 20 | An empty filtered list offered only "Notīrīt filtrus". | Līga | Fixed: "Meklēt visā Latvijā" keeps the filters. |

## Open

| # | Finding | Why it is open |
|---|---|---|
| 1 | 90% of events have only a town-centre coordinate. | Nominatim's robots.txt disallows bots (decision 24). Needs a geocoder with terms that allow it. |
| 2 | Few markets: 4 weekend markets in all, none near Kuldīga; "Anime un spēles" has 4 events. | Needs new sources. blusa.eu waits for permission. |
| 3 | 65% of events have no price; 27% have no description. | The sources do not publish them in the list data. |
| 4 | Russian search words ("футбол") find nothing. | The app is Latvian only by brief. |
| 5 | "Kā nokļūt" opens a Google consent page for a first-time visitor. | Google's page, outside the app. |
| 6 | 9 duplicates across the two Talsi sources; one wrong merge. | Low count; needs a town-alias rule in `dedupe.ts`. |
| 7 | On a 400 kbps connection the first tap answers after about 4 s. | Text shows at 0.7 s; the script takes the rest. |
| 8 | Text size setting sits at the bottom of "Mani iestatījumi". | Not changed: the owner asked to keep the rest as is. |
| 9 | A hypnosis show is tagged "Ģimenēm" by its source. | Source label; 3 events. |
