import * as yaml from "@eemeli/yaml";
import path from "node:path";
import type * as z from "zod/v4-mini";
import type { bundlesValidator } from "./config";

export type Bundles = z.infer<typeof bundlesValidator>;
export type Bundle = Bundles[keyof Bundles];

export type Version = `${number}.${number}.${number}`;

export interface BundleInfo extends Record<string, unknown> {
	"preset-name": string;
	"bundle-name": string;
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
	bundleInfo: BundleInfo
): Promise<GamesConfig> {
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
			plando?: string;
		};
		name: string;
		triggers: Array<Record<string, unknown>>;
	} & { [k: string]: Record<string, unknown> };

	for (const { file: fileName, weight } of bundle) {
		const file = Bun.file(path.resolve(baseDir, fileName));
		const parsed: ParsedGameConfig = yaml.parse(await file.text());
		config.game[parsed.game] = weight;
		config.triggers!.push(
			{
				option_name: "game",
				option_result: parsed.game,
				options: { "": { name: parsed.name } },
			} satisfies Triggers.Name,
			...(parsed.triggers ?? [])
		);
		const requiredPlando = parsed.requires?.plando?.split(",").map((s) => s.trim());
		if (requiredPlando?.length) {
			for (const value of requiredPlando) {
				if (!validPlandoRequires.has(value)) {
					Bun.stderr.write(`invalid plando option ${value}\n`);
				}
				plandoRequires.add(value);
			}
		}
		const game = parsed[parsed.game];
		if (!game) {
			throw new Error(`Config ${name} is missing game config: ${parsed.game}`);
		}
		if (plandoRequires.size) {
			config.requires.plando = Array.from(plandoRequires.values()).join(", ");
		}
		config[parsed.game] = game;
	}

	if (!config.triggers!.length) {
		delete config.triggers;
	}
	return config;
}
