import * as yaml from "@eemeli/yaml";
import path from "node:path";
import type * as z from "zod/v4-mini";
import type { bundlesValidator } from "./config";
import _logger from "./logging";

export type Bundles = z.infer<typeof bundlesValidator>;
export type Bundle = Bundles[keyof Bundles];

export type Version = `${number}.${number}.${number}`;

export interface BundleInfo extends Record<string, unknown> {
	"preset-name": string;
}

const SyncStateOption = "sync-state";
export type SyncState = "sync" | "async";

type BundleOptions = {
	[SyncStateOption]: SyncState;
};

export interface GamesConfig extends Record<string, unknown> {
	name: string;
	game: Record<string, number>;
	description: string;
	requires: {
		version: Version;
		plando?: string;
	};
	triggers?: Array<Record<string, unknown>>;
	"x-bundleinfo": BundleInfo;
	"x-options": BundleOptions;
}

namespace Triggers {
	export interface Name {
		option_name: "game";
		option_result: string;
		options: { "": { name: string } };
	}
}

const validPlandoRequires = new Set<string>(["bosses", "items", "texts", "connections"]);

export async function makeBundle(
	name: string,
	bundle: Bundle,
	version: Version,
	baseDir: string,
	bundleInfo: BundleInfo,
	syncState: SyncState,
): Promise<GamesConfig> {
	const logger = _logger.child({ label: `bundle:${name}` });
	const config: GamesConfig = {
		name,
		game: {},
		description: "Generated via bundler by niyrme (github: niyrme/archipelago-configs)",
		requires: { version },
		"x-options": { [SyncStateOption]: syncState },
		"x-bundleinfo": bundleInfo,
		triggers: [],
	};
	const triggers: Array<Record<string, unknown>> = [];

	const plandoRequires = new Set<string>();

	type SyncAsyncTrigger = {
		option_category: "x-options";
		option_name: typeof SyncStateOption;
		option_result: SyncState;
		options: Record<string, Record<string, unknown>>;
	};

	type ParsedGameConfig = {
		game: string;
		requires?: {
			version?: Version;
			plando?: string;
		};
		name: string;
		triggers: Array<Record<string, unknown>>;
		"x-options-sync"?: Record<string, unknown>;
		"x-options-async"?: Record<string, unknown>;
	} & { [k: string]: Record<string, unknown> };

	const syncOptions: Record<string, Record<string, unknown>> = {};
	const asyncOptions: Record<string, Record<string, unknown>> = {};

	for (const { file: fileName, weight } of bundle) {
		if (weight === 0) {
			logger.warn(`Skipping file with weight 0: ${fileName}`);
			continue;
		}
		const file = Bun.file(path.resolve(baseDir, fileName));
		const parsed: ParsedGameConfig = yaml.parse(await file.text());
		logger.info(`Adding game ${parsed.game} (${parsed.name}; weight ${weight})`);
		if (!parsed.requires?.version) {
			logger.warn(`Config ${name} does not have a version requires set.`);
		}
		if (parsed.requires?.version && parsed.requires.version !== version) {
			throw `Config version mismatch (${name}): Global requries ${version}, but yaml has ${parsed.requires.version}`;
		}
		config.game[parsed.game] = weight;
		triggers.push(
			{
				option_name: "game",
				option_result: parsed.game,
				options: { "": { name: parsed.name } },
			} satisfies Triggers.Name,
			...(parsed.triggers ?? []),
		);
		const requiredPlando = parsed.requires?.plando?.split(",").map((s) => s.trim());
		if (requiredPlando?.length) {
			for (const value of requiredPlando) {
				if (!validPlandoRequires.has(value)) {
					logger.warn(`Invalid plando option ${value}`);
				}
				plandoRequires.add(value);
			}
		}
		const gameOptions = parsed[parsed.game];
		if (!gameOptions) {
			throw `Config ${name} is missing game config: ${parsed.game}`;
		}
		if (parsed["x-options-sync"] && Object.keys(parsed["x-options-sync"]).length) {
			syncOptions[parsed.game] = parsed["x-options-sync"];
		}
		if (parsed["x-options-async"] && Object.keys(parsed["x-options-async"]).length) {
			asyncOptions[parsed.game] = parsed["x-options-async"];
		}

		if (plandoRequires.size) {
			config.requires.plando = Array.from(plandoRequires.values()).join(", ");
		}
		config[parsed.game] = gameOptions;
	}

	if (Object.keys(config.game).length === 0) {
		throw `Bundle ${name} did not resolve any games!`;
	}

	if (Object.keys(syncOptions).length) {
		triggers.push({
			option_category: "x-options",
			option_name: SyncStateOption,
			option_result: "sync",
			options: syncOptions,
		} satisfies SyncAsyncTrigger);
	}
	if (Object.keys(asyncOptions).length) {
		triggers.push({
			option_category: "x-options",
			option_name: SyncStateOption,
			option_result: "async",
			options: asyncOptions,
		} satisfies SyncAsyncTrigger);
	}

	if (triggers.length) {
		config.triggers = triggers;
	} else {
		delete config.triggers;
	}
	return config;
}
