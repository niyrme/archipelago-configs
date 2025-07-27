export type Version = `${number}.${number}.${number}`;

export type SyncState = "sync" | "async";

export type GameOptions = Record<string, unknown>;

export type GamesOptions = { [game: string]: GameOptions };

export type TriggerObject = {
	option_category?: string;
	option_name: string;
	option_result: unknown;
	options: Record<string, unknown>;
};

export type ParsedGameConfig = {
	game: string;
	name: string;
	requires?: {
		version?: Version;
		plando?: string;
	};
	triggers?: Array<TriggerObject>;
	"x-options-sync"?: GameOptions;
	"x-options-async"?: GameOptions;
} & GamesOptions;
