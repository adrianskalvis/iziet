# Permission requests

Four adapters are built and tested but stay off until the source agrees. Each draft is in Latvian, ready to send from your own address. Nothing has been sent.

| Source | Flag | Why permission is needed | Draft |
|---|---|---|---|
| Biļešu Serviss | `SOURCE_BILESUSERVISS` | Terms 5.1 forbid copying and publishing data | [bilesuserviss.md](bilesuserviss.md) |
| latvia.travel (LIAA) | `SOURCE_LATVIATRAVEL` | Terms allow personal, non-commercial use only | [latvia-travel.md](latvia-travel.md) |
| Ticketshop | `SOURCE_TICKETSHOP` | Terms 5.2 restrict reuse | [ticketshop.md](ticketshop.md) |
| blusa.eu | `SOURCE_NICHE_BLUSA` | Terms page could not be read | [blusa.md](blusa.md) |

After a yes, set the repository variable to `1` in GitHub (Settings, Secrets and variables, Actions, Variables). The next data refresh picks it up.

## Sites that block GitHub's servers

Apollo Kino, Forum Cinemas, LNSO, Saulkrasti and Dzintaru koncertzāle allow IzietBot in robots.txt but show GitHub's servers a Cloudflare bot challenge. They come through the relay (`scripts/relay.sh`) until they allow IzietBot. Request draft: [cloudflare-allowlist.md](cloudflare-allowlist.md).
