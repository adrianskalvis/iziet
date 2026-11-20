# Cloudflare allowlist request

Five sites show a Cloudflare bot challenge (HTTP 403, `cf-mitigated: challenge`) to GitHub's servers and answer a home connection. Until a site agrees, `scripts/relay.sh` fetches it from the owner's computer. One "yes" lets that site come straight from GitHub, and its id can then leave `RELAY_SOURCES` in `pipeline/relay.ts`.

| Site | What Iziet reads | Contact |
|---|---|---|
| Apollo Kino (apollokino.lv) | `/xml/Schedule`, the public cinema schedule feed | contact page on apollokino.lv |
| Forum Cinemas (forumcinemas.lv) | `/xml/Schedule/`, the public cinema schedule feed | contact page on forumcinemas.lv |
| LNSO (lnso.lv) | `/event-list/` and the event pages it links | contact page on lnso.lv |
| Saulkrasti novads (saulkrasti.lv) | `/events.ics`, the public calendar feed | contact page on saulkrasti.lv |
| Dzintaru koncertzāle (dzintarukoncertzale.lv) | `/wp-json/tribe/events/v1/events`, the events calendar API | contact page on dzintarukoncertzale.lv |

**Temats:** Lūgums atļaut Iziet robotam lasīt pasākumu kalendāru

Labdien!

Veidoju bezmaksas mobilo lietotni Iziet (adrianskalvis.github.io/iziet), kas palīdz cilvēkiem Latvijā atrast pasākumus. Pie katra pasākuma ir saite uz jūsu lapu un biļešu pirkšanu.

Mūsu robots `IzietBot/0.1 (+https://adrianskalvis.github.io/iziet/par)` lasa jūsu publisko pasākumu sarakstu ne biežāk kā reizi 6 stundās, ievēro robots.txt un sūta ne vairāk kā vienu pieprasījumu sekundē. Tas darbojas GitHub Actions serveros, un jūsu Cloudflare tos aptur ar robotu pārbaudi (kļūda 403).

Vai varat atļaut lietotāja aģentu `IzietBot` jūsu Cloudflare iestatījumos (Security, WAF, Custom rules: "User Agent contains IzietBot", darbība "Skip")? Ja vēlaties, lai mēs jūsu datus nerādām, atbildiet, un mēs tos izņemsim.

Paldies!
[Vārds Uzvārds]
[Kontakti]
