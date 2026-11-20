import type { Adapter } from '../types';
import { JSONLD_SITES } from './sites';
import { buildJsonLdAdapter } from './site-adapter';

/** One adapter per schema.org Event JSON-LD site, built from the config list in sites.ts. */
const adapters: Adapter[] = JSONLD_SITES.map(buildJsonLdAdapter);

export default adapters;
