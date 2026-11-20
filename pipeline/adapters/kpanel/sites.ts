import type { KpanelSite } from './parse';

export const KPANEL_SITES: KpanelSite[] = [
	{
		id: 'jekabpils',
		name: 'Visit Jēkabpils',
		homepage: 'https://visit.jekabpils.lv/lv/visi-pasakumi/',
		origin: 'https://visit.jekabpils.lv',
		listPath: '/lv/visi-pasakumi/',
		town: 'Jēkabpils'
	},
	{
		id: 'bauska',
		name: 'Visit Bauska',
		homepage: 'https://visit.bauska.lv/lv/pasakumi/',
		origin: 'https://visit.bauska.lv',
		listPath: '/lv/pasakumi/',
		town: 'Bauska'
	}
];
