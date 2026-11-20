/**
 * Prints the source health report for static/data/meta.json to stdout: Markdown
 * when a source is stale, nothing when all are fresh. The Site workflow turns it
 * into the "source-health" GitHub issue.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DataMeta } from '../src/lib/shared/types';
import { healthReport } from './health';
import { RELAY_SOURCES } from './relay';

const META_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'static/data/meta.json');

const meta = JSON.parse(await readFile(META_FILE, 'utf8')) as DataMeta;
process.stdout.write(healthReport(meta, new Date(), RELAY_SOURCES));
