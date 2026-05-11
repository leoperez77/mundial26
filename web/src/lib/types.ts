export type StickerType = 'emblem' | 'team_photo' | 'player';

export interface Sticker {
	number: number;
	code: string;
	name: string;
	type: StickerType;
}

export interface Country {
	code: string;
	name: string;
	page: number | null;
	group: string | null;
	sticker_count: number;
	stickers: Sticker[];
}

export interface Special {
	code: string;
	name: string;
}

export interface AlbumData {
	album: string;
	release_date: string;
	generated_at: string;
	total_stickers: number;
	total_teams: number;
	stickers_per_team: number;
	source: string;
	source_url: string;
	notes: string[];
	countries: Country[];
	specials: {
		intro: Special[];
		fifa_world_cup: Special[];
		host_countries: Special[];
		world_cup_history: Special[];
		extra_stickers_purple: string[];
	};
}
