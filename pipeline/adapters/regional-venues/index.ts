import type { Adapter } from '../types';
import {
	fetchCesis,
	fetchDobele,
	fetchGors,
	fetchJelgava,
	fetchLatgale,
	fetchLielaisDzintars,
	fetchTalsi,
	fetchTukums,
	fetchValmierasTeatris
} from './fetchers';

/**
 * Regional concert halls and tourism calendars. Skipped on purpose: Ventspils and the Rothko
 * centre answer with a Cloudflare 403 page, rezekne.lv/events disallows all bots in robots.txt.
 */
const adapters: Adapter[] = [
	{
		id: 'lielais-dzintars',
		name: 'Lielais dzintars',
		homepage: 'https://lielaisdzintars.lv/lv/kalendars',
		kind: 'html',
		fetch: fetchLielaisDzintars
	},
	{
		id: 'gors',
		name: 'Latgales vēstniecība GORS',
		homepage: 'https://www.latgalesgors.lv/lv/notikumi',
		kind: 'html',
		fetch: fetchGors
	},
	{
		id: 'cesis-koncertzale',
		name: 'Koncertzāle Cēsis',
		homepage: 'https://www.cesukoncertzale.lv/pasakumi',
		kind: 'html',
		defaultCategory: 'koncerti',
		fetch: fetchCesis
	},
	{
		id: 'valmieras-teatris',
		name: 'Valmieras Drāmas teātris',
		homepage: 'https://valmierasteatris.lv/kalendars/',
		kind: 'html',
		defaultCategory: 'teatris',
		fetch: fetchValmierasTeatris
	},
	{ id: 'dobele', name: 'Visit Dobele', homepage: 'https://visitdobele.lv/pasakumi', kind: 'html', fetch: fetchDobele },
	{ id: 'tukums', name: 'Visit Tukums', homepage: 'https://visittukums.lv/lv/Pasakumi', kind: 'html', fetch: fetchTukums },
	{ id: 'talsi', name: 'Visit Talsi', homepage: 'https://visittalsi.com/pasakumi/', kind: 'html', fetch: fetchTalsi },
	{ id: 'latgale', name: 'Latgale Travel', homepage: 'https://latgale.travel/notikumi/', kind: 'html', fetch: fetchLatgale },
	{ id: 'jelgava', name: 'Jelgavas pilsēta', homepage: 'https://www.jelgava.lv/pasakumi/', kind: 'html', fetch: fetchJelgava }
];

export default adapters;
