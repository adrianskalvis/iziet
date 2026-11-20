import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Adapter } from './types';

const ADAPTERS_DIR = path.dirname(fileURLToPath(import.meta.url));

/**
 * Discovers adapters: every folder in pipeline/adapters with an index.ts whose
 * default export is an Adapter or an Adapter[]. Folders starting with "_" are skipped.
 */
export async function loadAdapters(only?: string[]): Promise<Adapter[]> {
	const entries = await readdir(ADAPTERS_DIR);
	const adapters: Adapter[] = [];
	for (const entry of entries.sort()) {
		if (entry.startsWith('_') || entry.startsWith('.')) continue;
		const dir = path.join(ADAPTERS_DIR, entry);
		if (!(await stat(dir)).isDirectory()) continue;
		const indexFile = path.join(dir, 'index.ts');
		try {
			await stat(indexFile);
		} catch {
			continue;
		}
		let exported: Adapter | Adapter[] | undefined;
		try {
			const module = (await import(pathToFileURL(indexFile).href)) as { default?: Adapter | Adapter[] };
			exported = module.default;
		} catch (error) {
			// One broken adapter must not stop the others.
			console.error(`Adapter folder ${entry} failed to load: ${(error as Error).message}`);
			continue;
		}
		if (!exported) {
			console.error(`Adapter folder ${entry} has no default export`);
			continue;
		}
		for (const adapter of Array.isArray(exported) ? exported : [exported]) {
			if (!only || only.includes(adapter.id)) adapters.push(adapter);
		}
	}
	const ids = new Set<string>();
	for (const adapter of adapters) {
		if (ids.has(adapter.id)) throw new Error(`Duplicate adapter id: ${adapter.id}`);
		ids.add(adapter.id);
	}
	return adapters;
}

/** True when the adapter may run: no flag, or its flag variable equals "1". */
export function isEnabled(adapter: Adapter, env: NodeJS.ProcessEnv = process.env): boolean {
	return !adapter.flag || env[adapter.flag] === '1';
}
