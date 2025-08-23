import type winston from "winston";
import logging from "./logging";
import type {
	ExtraOptions,
	GameOptions,
	GamesOptions,
	ParsedGameConfig,
	SyncState,
	TriggerObject,
	Version,
} from "../types";
import { Trigger } from "./Trigger";

const LabelOptions = "x-options";
const OptionLabelSyncState = "sync-state";

interface BundleInfo extends Record<string, unknown> {
	"preset-name": string;
}

interface BundleOptions extends Record<string, unknown> {
	[OptionLabelSyncState]: SyncState;
}

export interface BundleConfig extends Record<string, unknown> {
	name: string;
	game: Record<string, number>;
	description: string;
	requires: {
		version: Version;
		plando?: string;
	};
	"x-bundleinfo": BundleInfo;
	[LabelOptions]: BundleOptions;
	triggers?: Array<Trigger | TriggerObject>;
}

const validPlandoRequires = new Set<string>(["bosses", "items", "texts", "connections"]);

export class Bundle {
	protected readonly games: Map<
		string,
		{
			slotName: string;
			weight: number;
			gameOptions: GameOptions;
			extraOptions?: ExtraOptions;
		}
	>;
	protected readonly gameOptionsSync: Map<string, GameOptions>;
	protected readonly gameOptionsAsync: Map<string, GameOptions>;
	protected readonly logger: winston.Logger;
	protected readonly triggers: Array<Trigger | TriggerObject>;
	protected readonly requiredPlando: Set<string>;

	constructor(
		public readonly name: string,
		public readonly version: Version,
		public readonly syncState: SyncState,
		protected readonly bundleInfo: BundleInfo,
	) {
		this.games = new Map();
		this.gameOptionsSync = new Map();
		this.gameOptionsAsync = new Map();
		this.logger = logging.child({ label: `bundle:${name}` });
		this.triggers = [];
		this.requiredPlando = new Set();
	}

	/**
	 * @param game name of the game
	 * @param weight weight of this game being selected
	 * @param parsedGameConfig
	 */
	addGame(game: string, weight: number, parsedGameConfig: ParsedGameConfig): void {
		const gameOptions = parsedGameConfig[game];
		if (!gameOptions) {
			this.logger.error(`Game ${game} not found`);
			return;
		}
		if (!weight) {
			this.logger.warn(`Skipping game with weight 0: ${game}`);
			return;
		}
		this.logger.info(`Adding game ${game} (${parsedGameConfig.name}; weight: ${weight})`);
		if (this.games.has(game)) {
			this.logger.warn(`Adding duplicate game: ${game}`);
		}

		this.games.set(game, {
			slotName: parsedGameConfig.name,
			weight,
			gameOptions,
			extraOptions: parsedGameConfig["x-options"],
		});

		if (parsedGameConfig.triggers?.length) {
			this.triggers.push(...parsedGameConfig.triggers);
		}
		if (parsedGameConfig["x-options-sync"] && Object.keys(parsedGameConfig["x-options-sync"]).length) {
			this.gameOptionsSync.set(game, parsedGameConfig["x-options-sync"]);
		}
		if (parsedGameConfig["x-options-async"] && Object.keys(parsedGameConfig["x-options-async"]).length) {
			this.gameOptionsAsync.set(game, parsedGameConfig["x-options-async"]);
		}

		const plando = parsedGameConfig.requires?.plando?.split(",").map(String.prototype.trim) ?? [];
		for (const option of plando) {
			if (validPlandoRequires.has(option)) {
				this.requiredPlando.add(option);
			} else {
				this.logger.warn(`Invalid plando option ${option}`);
			}
		}
	}

	toJSON(): BundleConfig {
		if (!this.games.size) {
			throw `Bundle ${this.name} did not resolve any games`;
		}

		const triggers: Array<Trigger | TriggerObject> = [];

		const games: GamesOptions = {};

		const extraOptionsValues: Record<string, unknown> = {};
		const extraOptionsTriggers: Array<Trigger | TriggerObject> = [];

		for (const [game, { slotName, gameOptions, extraOptions }] of this.games.entries()) {
			games[game] = gameOptions;
			triggers.push(Trigger.Name(game, slotName));
			if (extraOptions) {
				for (const [name, option] of Object.entries(extraOptions)) {
					extraOptionsValues[name] = option.enabled;
					extraOptionsTriggers.push(new Trigger(name, true, option.options, "x-options"));
				}
			}
		}

		if (this.gameOptionsSync.size) {
			triggers.push(Trigger.Sync(Object.fromEntries(this.gameOptionsSync.entries())));
		}
		if (this.gameOptionsAsync.size) {
			triggers.push(Trigger.Async(Object.fromEntries(this.gameOptionsAsync.entries())));
		}

		triggers.push(...this.triggers, ...extraOptionsTriggers);

		return {
			name: this.name,
			game: Object.fromEntries(
				Array.from(this.games.entries()).map<[string, number]>(([name, { weight }]) => [name, weight]),
			),
			description: "Generated via bundler by niyrme (github: niyrme/archipelago-configs)",
			requires: {
				version: this.version,
				plando: this.requiredPlando.size ? Array.from(this.requiredPlando.values()).join(", ") : undefined,
			},
			[LabelOptions]: {
				[OptionLabelSyncState]: this.syncState,
				...extraOptionsValues,
			},
			"x-bundleinfo": this.bundleInfo,
			triggers,
			...games,
		};
	}
}
