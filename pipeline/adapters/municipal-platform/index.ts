import type { Adapter } from '../types';
import { fetchMunicipality } from './fetch';
import type { Municipality } from './parse';

/** 24 municipalities on the shared state platform. Calendar path: /lv/notikumu-kalendars. */
export const MUNICIPALITIES: Municipality[] = [
	{ slug: 'riga', name: 'Rīga', host: 'www.riga.lv', town: 'Rīga' },
	{ slug: 'jurmala', name: 'Jūrmala', host: 'www.jurmala.lv', town: 'Jūrmala' },
	{ slug: 'ogre', name: 'Ogres novads', host: 'www.ogresnovads.lv', town: 'Ogre' },
	{ slug: 'jekabpils', name: 'Jēkabpils', host: 'www.jekabpils.lv', town: 'Jēkabpils' },
	{ slug: 'marupe', name: 'Mārupes novads', host: 'www.marupe.lv', town: 'Mārupe' },
	{ slug: 'adazi', name: 'Ādažu novads', host: 'www.adazunovads.lv', town: 'Ādaži' },
	{ slug: 'bauska', name: 'Bauskas novads', host: 'www.bauskasnovads.lv', town: 'Bauska' },
	{ slug: 'dobele', name: 'Dobeles novads', host: 'www.dobele.lv', town: 'Dobele' },
	{ slug: 'gulbene', name: 'Gulbenes novads', host: 'www.gulbene.lv', town: 'Gulbene' },
	{ slug: 'limbazi', name: 'Limbažu novads', host: 'www.limbazunovads.lv', town: 'Limbaži' },
	{ slug: 'ludza', name: 'Ludzas novads', host: 'www.ludzasnovads.lv', town: 'Ludza' },
	{ slug: 'smiltene', name: 'Smiltenes novads', host: 'www.smiltenesnovads.lv', town: 'Smiltene' },
	{ slug: 'talsi', name: 'Talsu novads', host: 'www.talsunovads.lv', town: 'Talsi' },
	{ slug: 'tukums', name: 'Tukuma novads', host: 'www.tukums.lv', town: 'Tukums' },
	{ slug: 'aizkraukle', name: 'Aizkraukles novads', host: 'www.aizkraukle.lv', town: 'Aizkraukle' },
	{ slug: 'balvi', name: 'Balvu novads', host: 'www.balvi.lv', town: 'Balvi' },
	{ slug: 'dienvidkurzeme', name: 'Dienvidkurzemes novads', host: 'www.dkn.lv', town: 'Grobiņa' },
	{ slug: 'jelgavas-novads', name: 'Jelgavas novads', host: 'www.jelgavasnovads.lv', town: 'Jelgava' },
	{ slug: 'kraslava', name: 'Krāslavas novads', host: 'www.kraslava.lv', town: 'Krāslava' },
	{ slug: 'livani', name: 'Līvānu novads', host: 'www.livani.lv', town: 'Līvāni' },
	{ slug: 'preili', name: 'Preiļu novads', host: 'www.preili.lv', town: 'Preiļi' },
	{ slug: 'ropazi', name: 'Ropažu novads', host: 'www.ropazi.lv', town: 'Ropaži' },
	{ slug: 'valka', name: 'Valkas novads', host: 'www.valka.lv', town: 'Valka' },
	{ slug: 'ventspils-novads', name: 'Ventspils novads', host: 'www.ventspilsnovads.lv', town: 'Ventspils' }
];

const adapters: Adapter[] = MUNICIPALITIES.map((muni) => ({
	id: `muni-${muni.slug}`,
	name: `${muni.name} (pašvaldība)`,
	homepage: `https://${muni.host}/lv/notikumu-kalendars`,
	kind: 'html',
	fetch: (ctx) => fetchMunicipality(muni, ctx)
}));

export default adapters;
