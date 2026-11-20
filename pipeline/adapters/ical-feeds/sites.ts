import type { IcalSite } from './parse';

export const ICAL_SITES: IcalSite[] = [
	{
		id: 'daugavpils-ical',
		name: 'Visit Daugavpils',
		homepage: 'https://www.visitdaugavpils.lv/pasakumi/',
		feedUrl: 'https://www.visitdaugavpils.lv/events.ics',
		town: 'Daugavpils'
	},
	{
		id: 'saulkrasti',
		name: 'Saulkrastu novads',
		homepage: 'https://saulkrasti.lv/events/',
		feedUrl: 'https://saulkrasti.lv/events.ics',
		town: 'Saulkrasti',
		townFromLocation: true
	}
];
