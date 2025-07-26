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
): Promise<GamesConfig> {
	const logger = _logger.child({ label: `bundle:${name}` });
	const config: GamesConfig = {
		name,
		game: {},
		description: "Generated via bundler by niyrme (github: niyrme/archipelago-configs)",
		requires: { version },
		triggers: [],
		"x-bundleinfo": bundleInfo,
	};

	const plandoRequires = new Set<string>();

	type ParsedGameConfig = {
		game: string;
		requires?: {
			version?: Version;
			plando?: string;
		};
		name: string;
		triggers: Array<Record<string, unknown>>;
	} & { [k: string]: Record<string, unknown> };

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
		config.triggers!.push(
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
		const game = parsed[parsed.game];
		if (!game) {
			throw `Config ${name} is missing game config: ${parsed.game}`;
		}
		if (plandoRequires.size) {
			config.requires.plando = Array.from(plandoRequires.values()).join(", ");
		}
		config[parsed.game] = game;
	}

	if (Object.keys(config.game).length === 0) {
		throw `Bundle ${name} did not resolve any games!`;
	}

	if (!config.triggers!.length) {
		delete config.triggers;
	}
	return config;
}
