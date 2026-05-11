/**
 * Sticker / country code utilities.
 *
 * Search input shape (single-field mode, see plan §6.3):
 *   /^[A-Z]{3}-\d{1,2}$/i  → sticker code  → /s/[code]
 *   /^[A-Z]{3}$/i           → country code → /c/[code]
 *   else                     → fuzzy name match (handled in SearchBar)
 */

const STICKER_RE = /^([A-Z]{3})-(\d{1,2})$/i;
const COUNTRY_RE = /^[A-Z]{3}$/i;

export type ParsedInput =
	| { kind: 'sticker'; country: string; number: number; code: string }
	| { kind: 'country'; code: string }
	| { kind: 'name' };

export function parseInput(raw: string): ParsedInput {
	const trimmed = raw.trim().toUpperCase();
	const m = STICKER_RE.exec(trimmed);
	if (m) {
		const number = Number(m[2]);
		if (number >= 1 && number <= 20) {
			return { kind: 'sticker', country: m[1], number, code: `${m[1]}-${number}` };
		}
	}
	if (COUNTRY_RE.test(trimmed)) return { kind: 'country', code: trimmed };
	return { kind: 'name' };
}

/**
 * Map FIFA 3-letter codes (used by Panini) → ISO 3166-1 alpha-2 codes,
 * so we can derive the regional-indicator flag emoji. England + Scotland
 * have no ISO 2-letter code; they're flagged separately.
 */
const FIFA_TO_ISO: Readonly<Record<string, string>> = {
	ALG: 'DZ', ARG: 'AR', AUS: 'AU', AUT: 'AT', BEL: 'BE', BIH: 'BA',
	BRA: 'BR', CAN: 'CA', CIV: 'CI', COD: 'CD', COL: 'CO', CPV: 'CV',
	CRO: 'HR', CUW: 'CW', CZE: 'CZ', ECU: 'EC', EGY: 'EG', ESP: 'ES',
	FRA: 'FR', GER: 'DE', GHA: 'GH', HAI: 'HT', IRN: 'IR', IRQ: 'IQ',
	JOR: 'JO', JPN: 'JP', KOR: 'KR', KSA: 'SA', MAR: 'MA', MEX: 'MX',
	NED: 'NL', NOR: 'NO', NZL: 'NZ', PAN: 'PA', PAR: 'PY', POR: 'PT',
	QAT: 'QA', RSA: 'ZA', SEN: 'SN', SUI: 'CH', SWE: 'SE', TUN: 'TN',
	TUR: 'TR', URU: 'UY', USA: 'US', UZB: 'UZ'
};

// England and Scotland use unicode subdivision flag sequences.
// Renderer support varies (great on iOS/macOS/Android, spotty on Windows).
const SPECIAL_FLAGS: Readonly<Record<string, string>> = {
	ENG: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E0067}\u{E007F}', // 🏴󠁧󠁢󠁥󠁮󠁧󠁿
	SCO: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}' // 🏴󠁧󠁢󠁳󠁣󠁴󠁿
};

export function flagEmoji(fifaCode: string): string {
	const code = fifaCode.toUpperCase();
	if (SPECIAL_FLAGS[code]) return SPECIAL_FLAGS[code];
	const iso = FIFA_TO_ISO[code];
	if (!iso) return '🏳️';
	const A = 0x1f1e6;
	return String.fromCodePoint(A + (iso.charCodeAt(0) - 65), A + (iso.charCodeAt(1) - 65));
}
