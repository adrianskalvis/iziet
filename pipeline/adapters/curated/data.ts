import type { CategoryId } from '../../../src/lib/shared/types';

/** Weekday numbers follow ISO: 1 = Monday ... 7 = Sunday. */
export interface WeeklySlot {
	weekdays: number[];
	/** "HH:MM" Riga local time. */
	start: string;
	end: string;
}

export interface Recurrence {
	slots: WeeklySlot[];
	/** First and last day of the season, "YYYY-MM-DD", inclusive. */
	from?: string;
	to?: string;
	/** Days without an occurrence. */
	exclude?: string[];
	/** Replacement hours for single days, keyed by "YYYY-MM-DD". */
	overrides?: Record<string, { start: string; end: string }>;
}

export interface FixedDates {
	/** First day, "YYYY-MM-DD". */
	from: string;
	/** Last day for multi-day events. */
	to?: string;
	/** Daily hours. Without them the event is all day. */
	startTime?: string;
	endTime?: string;
}

export interface CuratedRecord {
	id: string;
	title: string;
	description: string;
	venue?: string;
	address?: string;
	town: string;
	lat?: number;
	lng?: number;
	category: CategoryId;
	tags: string[];
	free?: boolean;
	priceMin?: number;
	priceMax?: number;
	/** Organiser page that confirms the schedule. */
	url: string;
	tickets?: Array<{ seller: string; url: string }>;
	lang?: string[];
	/** Day the schedule was read on the organiser page. */
	confirmedOn: string;
	fixed?: FixedDates;
	recurrence?: Recurrence;
}

const SATURDAYS_OF_CHRISTMAS_MARKET = ['2026-11-28', '2026-12-05', '2026-12-12', '2026-12-19', '2026-12-26'];

export const CURATED_RECORDS: CuratedRecord[] = [
	{
		id: 'kalnciema-tirgus',
		title: 'Kalnciema kvartāla tirgus',
		description:
			'Sestdienu zemnieku un amatnieku tirgus Kalnciema kvartāla pagalmā: maize, kūkas, kūpinājumi, sieri, amatnieku un dizaineru darinājumi, vinils, augi un stādi. Radošās darbnīcas bērniem.',
		venue: 'Kalnciema kvartāls',
		address: 'Kalnciema iela 35',
		town: 'Rīga',
		lat: 56.9431852,
		lng: 24.0668447,
		category: 'tirdzini',
		tags: [],
		url: 'https://www.kalnciemaiela.lv/lv/aktualitates/kalnciema-kvartala-tirgus-sestdienas-/',
		lang: ['lv'],
		confirmedOn: '2026-11-20',
		recurrence: {
			slots: [{ weekdays: [6], start: '10:00', end: '16:00' }],
			exclude: SATURDAYS_OF_CHRISTMAS_MARKET
		}
	},
	{
		id: 'kalnciema-ziemassvetku-tirgus',
		title: 'Kalnciema kvartāla Ziemassvētku tirgus',
		description:
			'Ziemassvētku tirgus Kalnciema kvartālā sestdienās no 28. novembra līdz 26. decembrim. Stundas nav norādītas lapā, tiek rādītas parastā sestdienas tirgus stundas.',
		venue: 'Kalnciema kvartāls',
		address: 'Kalnciema iela 35',
		town: 'Rīga',
		lat: 56.9431852,
		lng: 24.0668447,
		category: 'tirdzini',
		tags: [],
		url: 'https://www.kalnciemaiela.lv/lv/aktualitates/ziemassvetku-tirgus-no-2811-lidz-2612-sestdienas/',
		lang: ['lv'],
		confirmedOn: '2026-11-20',
		recurrence: {
			slots: [{ weekdays: [6], start: '10:00', end: '16:00' }],
			from: '2026-11-28',
			to: '2026-12-26'
		}
	},
	{
		id: 'vecrigas-ziemassvetku-tirdzins',
		title: 'Vecrīgas Ziemassvētku tirdziņš',
		description:
			'Ziemassvētku tirdziņš Doma laukumā, no 27. novembra līdz 3. janvārim. Darba laiks: pirmdien līdz ceturtdien 11.00 līdz 21.00, piektdien 11.00 līdz 22.00, sestdien 10.00 līdz 22.00, svētdien 10.00 līdz 20.00.',
		venue: 'Doma laukums',
		town: 'Rīga',
		lat: 56.9496496,
		lng: 24.1052324,
		category: 'tirdzini',
		tags: [],
		url: 'https://vzt.lv/en/',
		lang: ['lv', 'en'],
		confirmedOn: '2026-11-20',
		recurrence: {
			slots: [
				{ weekdays: [1, 2, 3, 4], start: '11:00', end: '21:00' },
				{ weekdays: [5], start: '11:00', end: '22:00' },
				{ weekdays: [6], start: '10:00', end: '22:00' },
				{ weekdays: [7], start: '10:00', end: '20:00' }
			],
			from: '2026-11-27',
			to: '2027-01-03',
			overrides: {
				'2026-12-24': { start: '10:00', end: '20:00' },
				'2026-12-25': { start: '10:00', end: '20:00' },
				'2026-12-26': { start: '10:00', end: '22:00' },
				'2027-01-01': { start: '12:00', end: '20:00' }
			}
		}
	},
	{
		id: 'latgalite',
		title: 'Latgales tirgus (Latgalīte)',
		description:
			'Rīgas pilsētas lietoto un vecu mantu tirgus ar rūpniecības, saimniecības un antīkām precēm. Darba laiks: pirmdien līdz sestdien 8.00 līdz 17.00, svētdien 8.00 līdz 16.00.',
		venue: 'Tirgus "Latgale"',
		address: 'Firsa Sadovņikova iela 9A',
		town: 'Rīga',
		lat: 56.9426781,
		lng: 24.1290675,
		category: 'blusu',
		tags: [],
		url: 'https://www.rigasnami.lv/lv/parvalda-un-apsaimnieko/tirgi/latgales-tirgus',
		lang: ['lv', 'ru'],
		confirmedOn: '2026-11-20',
		recurrence: {
			slots: [
				{ weekdays: [1, 2, 3, 4, 5, 6], start: '08:00', end: '17:00' },
				{ weekdays: [7], start: '08:00', end: '16:00' }
			]
		}
	},
	{
		id: 'unicon-winter-2027',
		title: 'UniCon Winter 2027',
		description:
			'Fanu rīkota konvencija: cosplay, komiksi, K-pop, anime, manga, videospēles, esports, galda lomu spēles, MTG, mākslinieku aleja un tirdziņš. Biļetes: piektdiena 23 EUR, sestdiena 30 EUR, nedēļas nogale 40 EUR, trīs dienas 50 EUR.',
		venue: 'Starptautiskais izstāžu centrs Ķīpsala',
		address: 'Ķīpsalas iela 8',
		town: 'Rīga',
		lat: 56.9555908,
		lng: 24.0792629,
		category: 'anime',
		tags: ['anime', 'cosplay', 'komiksi', 'datorspeles', 'esports', 'galda-speles'],
		priceMin: 23,
		priceMax: 50,
		url: 'https://www.unicon.lv/?lang=lv',
		tickets: [{ seller: 'UniCon', url: 'https://www.unicon.lv/?lang=lv' }],
		lang: ['lv', 'en', 'ru'],
		confirmedOn: '2026-11-20',
		fixed: { from: '2027-01-08', to: '2027-01-10' }
	},
	{
		id: 'rimi-rigas-maratons-2027',
		title: 'Rimi Rīgas maratons 2027',
		description:
			'Rimi Rīgas maratons notiek 15. un 16. maijā. Distances: maratons, pusmaratons, jūdze, bērnu diena, 42 km un 21 km stafetes. Datumi no organizatoru bieži uzdoto jautājumu sadaļas.',
		town: 'Rīga',
		category: 'sports',
		tags: [],
		url: 'https://rimirigamarathon.com/lv/',
		tickets: [{ seller: 'Rimi Rīgas maratons', url: 'https://rimirigamarathon.com/lv/' }],
		lang: ['lv', 'en'],
		confirmedOn: '2026-11-20',
		fixed: { from: '2027-05-15', to: '2027-05-16' }
	}
];
