import type { CategoryId } from './types';

/**
 * Category and tag keyword tables. Keywords are folded (no diacritics, lowercase)
 * stems matched against folded text. Display labels live in locales/lv.json
 * under "cat.<id>" and "tag.<id>".
 */

export interface CategoryRule {
	id: CategoryId;
	/** CSS token suffix for the tint, for example "koncerti" → --cat-koncerti. */
	tint: string;
	keywords: string[];
}

/** Order matters for ties: earlier wins. */
export const CATEGORY_RULES: CategoryRule[] = [
	{
		id: 'blusu',
		tint: 'blusu',
		keywords: ['blusu', 'flea market', 'kramu tirg', 'antikvar', 'vintage', 'second hand', 'lietotu mantu', 'garazas izpardo', 'car boot', 'mantu tirg', 'kramu', 'kramin', 'krami ']
	},
	{
		id: 'tirdzini',
		tint: 'zemnieku',
		keywords: ['zemnieku tirg', 'tirdzin', 'farmers market', 'razotaju tirg', 'amatnieku tirg', 'gadatirg', 'ziemassvetku tirg', 'tirgus', 'market']
	},
	{
		id: 'anime',
		tint: 'anime',
		keywords: ['anime', 'manga', 'cosplay', 'kosplej', 'komiks', 'comic con', 'unicon', 'esport', 'e-sport', 'datorspel', 'videospel', 'video game', 'gaming', 'lan party', 'galda spel', 'board game', 'spelu vakar', 'dungeons', 'warhammer', 'magic: the gathering', 'pokemon', 'k-pop', 'kpop', 'japanas']
	},
	{
		id: 'darbnicas',
		tint: 'darbnicas',
		keywords: ['darbnic', 'workshop', 'meistarklas', 'master class', 'masterclass', 'nodarbib', 'radosa', 'radoso', 'kursi', 'apmacib', 'rokdarb', 'keramik', 'florist', 'zimesan', 'gleznosan', 'paint and', 'vina un makslas']
	},
	{
		id: 'gimenem',
		tint: 'gimenem',
		keywords: ['berniem', 'bernu', 'gimenem', 'gimenes', 'gimenu', 'family', 'kids', 'children', 'lellu', 'rotal', 'pasaka ', 'pasakas', 'pasaku ', 'multfilm', 'mazuli', 'zoo', 'zoodarz']
	},
	{
		id: 'sports',
		tint: 'sports',
		keywords: ['sport', 'skrejien', 'maraton', 'marathon', 'run ', 'futbol', 'football', 'hokej', 'hockey', 'basketbol', 'basketball', 'volejbol', 'sacensib', 'cempionat', 'velo', 'mtb', 'orient', 'peldesan', 'slepos', 'fitness', 'trail', 'triatlon', 'regat', 'cikss', 'turnirs']
	},
	{
		id: 'ediens',
		tint: 'ediens',
		keywords: ['ediens', 'edien', 'degustac', 'tasting', 'vina ', 'vins', 'wine', 'alus', 'beer', 'gastro', 'street food', 'food', 'restoran', 'kafij', 'coffee', 'brokast', 'vakarin', 'kulinar', 'sokolad', 'pavar', 'virtuv']
	},
	{
		id: 'festivali',
		tint: 'festivali',
		keywords: ['festival', 'svetki', 'svetku', 'svinib', 'gaismas', 'staro riga', 'jani', 'ligo', 'karneval', 'parade', 'pilsetas svetk', 'novada svetk', 'pagasta svetk']
	},
	{
		id: 'teatris',
		tint: 'teatris',
		keywords: ['teatr', 'izrade', 'izrad', 'theatre', 'theater', 'balet', 'ballet', 'opera', 'operete', 'muzikl', 'musical', 'stand-up', 'standup', 'komedij', 'cirk', 'circus', 'dramat', 'pirmizrad', 'performance']
	},
	{
		id: 'izstades',
		tint: 'ko-redzet',
		keywords: ['izstad', 'exhibition', 'ekspozic', 'muzej', 'museum', 'galerij', 'gallery', 'kino', 'filma', 'film', 'seanss', 'cinema', 'makslas', 'art ', 'instalac', 'planetarij', 'ekskursij', 'lekcij', 'lecture']
	},
	{
		id: 'koncerti',
		tint: 'koncerti',
		keywords: ['koncert', 'concert', 'live ', 'dziesm', 'orkestr', 'koris', 'kora ', 'dzez', 'jazz', 'rock', 'roks', 'pop ', 'hip hop', 'hip-hop', 'rap ', ' dj', 'muzik', 'music', 'simfon', 'ergel', 'organ', 'filharmon', ' band', 'akustisk', 'unplugged']
	},
	{
		id: 'hobiji',
		tint: 'nisas',
		keywords: ['fotograf', 'foto', 'smarz', 'parfim', 'perfum', 'kolekcion', 'numismat', 'filatel', 'vinil', 'vinyl', 'darzkop', 'stadu', 'putnu', 'dzivniek', 'astronom', 'zvaigzn', 'retro auto', 'moto', 'modelism', 'adisan', 'tamborej', 'sus', 'lasitaj', 'gramat', 'dzej', 'literatur', 'zinatn', 'science', 'tehnolog', 'robot', 'joga', 'yoga', 'meditac', 'sahs', 'chess', 'hobij']
	}
];

export const CATEGORY_TINT: Record<CategoryId, string> = Object.fromEntries(
	CATEGORY_RULES.map((rule) => [rule.id, rule.tint])
) as Record<CategoryId, string>;

export interface TagRule {
	id: string;
	/** Category used when this tag is the only signal. */
	cat: CategoryId;
	keywords: string[];
}

/**
 * Niche and genre tags. The list is open: add a row and a "tag.<id>" label.
 * Users can follow any tag; search also matches tags.
 */
export const TAGS: TagRule[] = [
	{ id: 'fotografija', cat: 'hobiji', keywords: ['fotograf', 'photo', 'foto '] },
	{ id: 'smarzas', cat: 'hobiji', keywords: ['smarz', 'parfim', 'perfum', 'aromat'] },
	{ id: 'kolekcionesana', cat: 'hobiji', keywords: ['kolekcion', 'numismat', 'filatel', 'monetu', 'pastmark', 'antikvar'] },
	{ id: 'vinils', cat: 'hobiji', keywords: ['vinil', 'vinyl', 'platu tirg'] },
	{ id: 'galda-speles', cat: 'anime', keywords: ['galda spel', 'board game', 'spelu vakar', 'dungeons', 'warhammer'] },
	{ id: 'anime', cat: 'anime', keywords: ['anime', 'manga', 'japanas popkult'] },
	{ id: 'cosplay', cat: 'anime', keywords: ['cosplay', 'kosplej'] },
	{ id: 'komiksi', cat: 'anime', keywords: ['komiks', 'comic'] },
	{ id: 'datorspeles', cat: 'anime', keywords: ['datorspel', 'videospel', 'video game', 'gaming', 'lan party'] },
	{ id: 'esports', cat: 'anime', keywords: ['esport', 'e-sport'] },
	{ id: 'rokdarbi', cat: 'darbnicas', keywords: ['rokdarb', 'adisan', 'tamborej', 'izsus', 'aust', 'pinum'] },
	{ id: 'keramika', cat: 'darbnicas', keywords: ['keramik', 'mala darbn', 'podnie'] },
	{ id: 'floristika', cat: 'darbnicas', keywords: ['florist', 'ziedu kompoz', 'vainag'] },
	{ id: 'zimesana', cat: 'darbnicas', keywords: ['zimesan', 'gleznosan', 'akvarel', 'kaligraf'] },
	{ id: 'kulinarija', cat: 'ediens', keywords: ['kulinar', 'pavarmak', 'cooking', 'cepam', 'gatavosim'] },
	{ id: 'vins', cat: 'ediens', keywords: ['vina degust', 'vins', 'wine'] },
	{ id: 'alus', cat: 'ediens', keywords: ['alus', 'beer', 'craft beer'] },
	{ id: 'kafija', cat: 'ediens', keywords: ['kafij', 'coffee'] },
	{ id: 'joga', cat: 'hobiji', keywords: ['joga', 'yoga', 'meditac', 'elpos'] },
	{ id: 'deja', cat: 'hobiji', keywords: ['deju', 'dejas', 'dance', 'salsa', 'tango', 'bachata', 'balle'] },
	{ id: 'literatura', cat: 'hobiji', keywords: ['gramat', 'dzej', 'literatur', 'lasijum', 'book'] },
	{ id: 'zinatne', cat: 'hobiji', keywords: ['zinatn', 'science', 'eksperiment'] },
	{ id: 'tehnologijas', cat: 'hobiji', keywords: ['tehnolog', 'programm', 'robot', 'hakaton', 'hackathon', ' ai ', 'maksligais intelekts'] },
	{ id: 'astronomija', cat: 'hobiji', keywords: ['astronom', 'zvaigzn', 'planetarij', 'teleskop'] },
	{ id: 'daba', cat: 'hobiji', keywords: ['dabas tak', 'pargajien', 'hike', 'hiking', 'mezs', 'purv'] },
	{ id: 'putni', cat: 'hobiji', keywords: ['putnu', 'birdwatch', 'ornitolog'] },
	{ id: 'dzivnieki', cat: 'hobiji', keywords: ['dzivniek', 'sunu', 'kaku izstad', 'zirgu', 'zoo'] },
	{ id: 'auto-moto', cat: 'hobiji', keywords: ['retro auto', 'auto izstad', 'moto', 'rallij', 'drift', 'oldtimer'] },
	{ id: 'darzs', cat: 'hobiji', keywords: ['darzkop', 'stadu', 'garden', 'augu tirg'] },
	{ id: 'vesture', cat: 'izstades', keywords: ['vestur', 'rekonstrukc', 'arheolog', 'viduslaik'] },
	{ id: 'sahs', cat: 'hobiji', keywords: ['sahs', 'saha', 'chess'] },
	{ id: 'klasika', cat: 'koncerti', keywords: ['simfon', 'kamermuzik', 'ergel', 'organ', 'filharmon', 'klasisk', 'lnso', 'kvartet'] },
	{ id: 'dzezs', cat: 'koncerti', keywords: ['dzez', 'jazz', 'blues', 'blūz'] },
	{ id: 'roks', cat: 'koncerti', keywords: ['rock', 'roks', 'metal', 'punk', 'grunge'] },
	{ id: 'elektroniska', cat: 'koncerti', keywords: [' dj', 'techno', 'house', 'electronic', 'elektronisk', 'rave'] },
	{ id: 'tautas-muzika', cat: 'koncerti', keywords: ['folklor', 'tautas muz', 'tautasdziesm', 'kokl', 'etno'] },
	{ id: 'kori', cat: 'koncerti', keywords: ['koris', 'kora ', 'koru', 'choir'] },
	{ id: 'opera', cat: 'teatris', keywords: ['opera', 'operete'] },
	{ id: 'balets', cat: 'teatris', keywords: ['balet', 'ballet', 'deju izrad'] },
	{ id: 'stand-up', cat: 'teatris', keywords: ['stand-up', 'standup', 'komedij', 'humor'] },
	{ id: 'cirks', cat: 'teatris', keywords: ['cirk', 'circus', 'akrobat'] },
	{ id: 'kino', cat: 'izstades', keywords: ['kino', 'filma', 'film', 'seanss', 'cinema'] },
	{ id: 'maksla', cat: 'izstades', keywords: ['makslas', 'glezn', 'skulptur', 'galerij', 'art '] },
	{ id: 'dizains', cat: 'izstades', keywords: ['dizain', 'design', 'arhitekt'] },
	{ id: 'mode', cat: 'hobiji', keywords: ['mode', 'fashion', 'apgerb'] },
	{ id: 'labsajuta', cat: 'hobiji', keywords: ['labsajut', 'wellness', 'pirts', 'spa '] },
	{ id: 'ekskursijas', cat: 'izstades', keywords: ['ekskursij', 'tour of', 'pastaig', 'gida'] },
	{ id: 'lekcijas', cat: 'izstades', keywords: ['lekcij', 'lecture', 'saruna', 'diskusij', 'talk'] }
];

export const TAG_IDS = TAGS.map((tag) => tag.id);
