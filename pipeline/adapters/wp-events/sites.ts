import type { TecSite } from './parse';

export const TEC_SITES: TecSite[] = [
	{
		id: 'dzintari',
		name: 'Dzintaru koncertzāle',
		homepage: 'https://dzintarukoncertzale.lv/',
		apiUrl: 'https://dzintarukoncertzale.lv/wp-json/tribe/events/v1/events',
		town: 'Jūrmala',
		venuePrefix: 'Dzintaru koncertzāle',
		address: 'Turaidas iela 1, Jūrmala',
		defaultCategory: 'koncerti',
		languageCategories: { LV: 'lv', ENG: 'en', RU: 'ru' },
		removeTranslations: true
	},
	{
		id: 'aluksne',
		name: 'Alūksnes novada pasākumi',
		homepage: 'https://aluksne.lv/',
		apiUrl: 'https://aluksne.lv/index.php/wp-json/tribe/events/v1/events',
		town: 'Alūksne',
		lang: ['lv'],
		digest: true
	}
];
