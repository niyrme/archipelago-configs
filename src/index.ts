import * as yaml from "@eemeli/yaml";
import WaitGroup from "@niyrme/wait-group";
import assert from "node:assert/strict";
import path from "node:path";
import * as z from "zod/v4-mini";
import { getTaggedLabeledErrorFunctionContext, type getLabeledErrorFunction } from "./lib/labeled-error-function";
import { prettyZodError } from "./lib/zod";

const optionsValidator = z.object({
	regions: z._default(z.optional(z.boolean()), false),
	output: z._default(z.optional(z.string()), "bundled.yaml"),
	basePath: z._default(z.optional(z.string()), "."),
	requiredVersion: z.string({ error: "Field is required" }).check(z.regex(/^\d+\.\d+\.\d+$/)),
});
const bundlesValidator = z.record(
	z.string(),
	z
		.array(
			z.object({
				file: z.string(),
				weight: z._default(z.optional(z.int()), 1).check(z.minimum(0, "weight must be at least 0")),
			})
		)
		.check(z.minLength(1, "At least one file is required per bundle"))
);
const presetsValidator = z.record(
	z.string(),
	z
		.array(z.string().check(z.regex(/^(bundle|file):(.+)$/)))
		.check(z.minLength(1, "At least one input file or bundle is required per preset"))
);

const configValidator = z.object({
	options: optionsValidator,
	bundles: bundlesValidator,
	presets: presetsValidator,
});

async function checkFile(filePath: string, error: ReturnType<typeof getLabeledErrorFunction>): Promise<boolean> {
	const file = Bun.file(path.resolve(filePath));
	if (!(await file.exists())) {
		error(`File ${path.basename(filePath)} does not exist`);
		return false;
	}
	const stat = await file.stat();
	if (!stat.isFile()) {
		error(`Input is not a file: ${path.basename(filePath)}`);
		return false;
	}
	return true;
}

interface NameTrigger {
	option_name: "game";
	option_result: string;
	options: { "": { name: string } };
}

type Bundles = z.infer<typeof bundlesValidator>;
type Bundle = Bundles[keyof Bundles];

type Version = `${number}.${number}.${number}`;

interface GamesConfig extends Record<string, unknown> {
	name: string;
	game: Record<string, number>;
	description: string;
	requires: {
		version: Version;
	};
	triggers?: Array<Record<string, unknown>>;
}

async function makeBundle(name: string, bundle: Bundle, version: Version, baseDir: string): Promise<GamesConfig> {
	const config: GamesConfig = {
		name,
		game: {},
		description: "Generated via bundler by niyrme (github: niyrme/archipelago-configs)",
		requires: { version },
		triggers: [],
	};

	type ParsedGameConfig = {
		game: string;
		name: string;
		triggers: Array<Record<string, unknown>>;
	} & { [k: string]: Record<string, unknown> };

	for (const { file: fileName, weight } of bundle) {
		const file = Bun.file(path.resolve(baseDir, fileName));
		const {
			game: parsedGame,
			name: parsedName,
			triggers = [],
			...parsed
		}: ParsedGameConfig = yaml.parse(await file.text());
		config.game[parsedGame] = weight;
		config.triggers!.push(
			{
				option_name: "game",
				option_result: parsedGame,
				options: { "": { name: parsedName } },
			} satisfies NameTrigger,
			...triggers
		);
		const keys = Object.keys(parsed);
		assert(keys.length === 1, `Expected exactly one game, found ${keys.length}`);
		config[parsedGame] = parsed[keys[0]!]!;
	}

	if (!config.triggers!.length) {
		delete config.triggers;
	}
	return config;
}

async function main(): Promise<number> {
	const configFile = Bun.file("config.json");

	if (!(await configFile.exists())) {
		throw new Error("config file not found");
	}

	const config = await configFile.json();

	const result = configValidator.safeParse(config);

	if (!result.success) {
		prettyZodError(result.error);
		return 1;
	}

	const [, , arg] = process.argv;

	const { presets, bundles, options } = result.data;

	switch (arg) {
		case "-l":
		case "--list":
			console.log(
				`Available presets:\n${Object.keys(presets)
					.map((name) => `\t${name}`)
					.join("\n")}\n`
			);
			return 0;
	}

	const presetName = arg ?? "default";

	const presetOptions = presets[presetName];

	if (!presetOptions) {
		console.error(`Preset "${presetName}" does not exist`);
		return 1;
	}

	const baseDir = path.resolve(options.basePath);

	const errorCtx = getTaggedLabeledErrorFunctionContext();

	errorCtx.getLabeledErrorFunction;

	const wg = new WaitGroup(16);

	for (const option of presetOptions) {
		await wg.add();
		const errorFn = errorCtx.getLabeledErrorFunction(`"${option}"`);
		if (option.startsWith("bundle:")) {
			const bundleName = option.slice("bundle:".length);
			const bundle = bundles[bundleName];
			if (bundle) {
				for (const { file: fileName } of bundle!) {
					const file = Bun.file(path.resolve(baseDir, fileName));
					if (!(await file.exists())) {
						errorFn(`File ${path.basename(fileName)} does not exist`);
					} else {
						const stat = await file.stat();
						if (!stat.isFile()) {
							errorFn(`Input must be a file: ${path.basename(fileName)}`);
						}
					}
				}
			} else {
				errorFn("Bundle not found");
			}
			wg.done();
		} else if (option.startsWith("file:")) {
			checkFile(path.resolve(baseDir, option.slice("file:".length)), errorFn).then(() => void wg.done());
		} else {
			throw new Error(`[UNREACHABLE] Invalid preset option ${option}`);
		}
	}

	await wg.waitAll();

	if (errorCtx.didError) {
		return 1;
	}

	const outputFile = Bun.file(options.output ?? "bundled.yaml");
	if (await outputFile.exists()) {
		await outputFile.delete();
	}

	const outputSink = outputFile.writer();

	for (const [idx, option] of presetOptions.entries()) {
		if (idx) outputSink.write("\n\n---\n\n");
		if (options.regions) outputSink.write("#region\n");

		if (option.startsWith("bundle:")) {
			const bundleName = option.slice("bundle:".length);
			const bundle = await makeBundle(bundleName, bundles[bundleName]!, options.requiredVersion as Version, baseDir);
			outputSink.write(yaml.stringify(bundle, { indent: 2, indentSeq: true, sortMapEntries: false }).trim());
		} else if (option.startsWith("file:")) {
			const file = Bun.file(path.resolve(baseDir, option.slice("file:".length)));
			outputFile.write(await file.text().then((text) => text.trim()));
		} else {
			throw new Error("unreachable");
		}

		if (options.regions) outputSink.write("\n#endregion");
	}

	outputSink.write("\n");
	await outputSink.flush();

	return 0;
}

process.exit(await main());
