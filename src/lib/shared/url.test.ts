import { describe, expect, test } from 'vitest';
import { safeHttpsUrl, safeHttpUrl } from './url';

describe('safeHttpUrl', () => {
	test('keeps absolute and relative http(s) links', () => {
		expect(safeHttpUrl('https://www.liveriga.com/lv/x')).toBe('https://www.liveriga.com/lv/x');
		expect(safeHttpUrl('/event/1', 'https://www.lnso.lv/list/')).toBe('https://www.lnso.lv/event/1');
	});

	test('rejects script, data and obfuscated schemes', () => {
		for (const bad of ['javascript:alert(1)', 'java\tscript:alert(1)', ' JaVaScRiPt:alert(1)', 'data:text/html,x', 'vbscript:x', 'mailto:a@b.lv']) {
			expect(safeHttpUrl(bad, 'https://example.lv/')).toBeUndefined();
		}
	});

	test('upgrades images to https', () => {
		expect(safeHttpsUrl('http://img.example.lv/a.jpg')).toBe('https://img.example.lv/a.jpg');
	});
});
