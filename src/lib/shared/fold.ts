/**
 * Folds Latvian (and other Latin) diacritics for matching:
 * "Rīga" and "riga" both become "riga", "Ķīpsala" becomes "kipsala".
 * NFD splits ā into a + U+0304, č into c + U+030C, ģ into g + U+0327;
 * the \p{M} class removes every combining mark.
 */
export function fold(input: string): string {
	return input.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Folds, strips punctuation and collapses whitespace. */
export function foldWords(input: string): string {
	return fold(input)
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}
