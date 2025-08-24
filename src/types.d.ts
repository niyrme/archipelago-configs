export type Version = `${number}.${number}.${number}`;

export type SyncState = "sync" | "async";

export type GameOptions = Record<string, unknown>;

export type GamesOptions = Record<string, GameOptions>;

export interface TriggerObject extends Record<string, unknown> {
	option_category?: string;
	option_name: string;
	option_result: unknown;
	options: Record<string, unknown>;
}

export interface ExtraOption {
	enabled: boolean;
	options: Record<string, unknown>;
}

export type ExtraOptions = Record<string, ExtraOption>;

export interface ParsedGameConfig extends GamesOptions {
	game: string;
	name: string;
	requires?: {
		version?: Version;
		plando?: string;
	};
	triggers?: Array<TriggerObject>;
	"x-options"?: ExtraOptions;
	"x-options-sync"?: GamesOptions;
	"x-options-async"?: GamesOptions;
}
