import * as yaml from "@eemeli/yaml";
import WaitGroup from "@niyrme/wait-group";
import path from "node:path";
import { makeBundle } from "./lib/bundle";
import { configValidator, type Config } from "./lib/config";
import { getTaggedLabeledErrorFunctionContext, type getLabeledErrorFunction } from "./lib/labeled-error-function";
import { prettyZodError } from "./lib/zod";

async function checkFile(filePath: string, error: ReturnType<typeof getLabeledErrorFunction>): Promise<boolean> {
	const file = Bun.file(path.resolve(filePath));
	if (!(await file.exists())) {
		error(`File ${filePath} does not exist`);
		return false;
	}
	const stat = await file.stat();
	if (!stat.isFile()) {
		error(`Input is not a file: ${filePath}`);
		return false;
	}
	return true;
}

async function main(): Promise<number> {
	const config = await import("../config").then<Config, Config>(
		(cfg) => cfg.default,
		async () => {
			const configFile = Bun.file("config.json");

			if (!(await configFile.exists())) {
				throw new Error("config file not found\n");
			}

			return configFile.json();
		}
	);

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
			Bun.stdout.write(
				`Available presets:\n${Object.keys(presets)
					.map((name) => `\t${name}`)
					.join("\n")}\n`
			);
			return 0;
	}

	const presetName = arg ?? "default";

	const presetOptions = presets[presetName];

	if (!presetOptions) {
		Bun.stderr.write(`Preset "${presetName}" does not exist\n`);
		return 1;
	}

	const baseDir = path.resolve(options.basePath);

	const errorCtx = getTaggedLabeledErrorFunctionContext();

	const wg = new WaitGroup(16);

	for (const option of presetOptions) {
		await wg.add();
		const errorFn = errorCtx.getLabeledErrorFunction(`"${option}"`);
		if (option.startsWith("bundle:")) {
			const bundleName = option.slice("bundle:".length);
			const bundle = bundles[bundleName];
			if (bundle) {
				for (const { file: fileName } of bundle!) {
					checkFile(path.resolve(baseDir, fileName), errorFn).then(() => void wg.done());
				}
			} else {
				errorFn("Bundle not found");
				wg.done();
			}
		} else if (option.startsWith("file:")) {
			checkFile(path.resolve(baseDir, option.slice("file:".length)), errorFn).then(() => void wg.done());
		}
	}

	await wg.waitAll();

	if (errorCtx.didError) {
		return 1;
	}

	Bun.stdout.write(`Using preset: "${presetName}"\n`);

	const outputFile = Bun.file(options.output ?? "bundled.yaml");
	if (await outputFile.exists()) {
		await outputFile.delete();
	}

	const outputSink = outputFile.writer();

	for (const [index, option] of presetOptions.entries()) {
		if (index) outputSink.write("\n\n---\n\n");
		if (options.regions) outputSink.write("#region\n");

		if (option.startsWith(OptionPrefix.Bundle)) {
			const bundleName = option.slice(OptionPrefix.Bundle.length);
			Bun.stdout.write(`\tAdding bundle: "${bundleName}"\n`);
			const bundle = await makeBundle(bundleName, bundles[bundleName]!, options.requiredVersion, baseDir, {
				"preset-name": presetName,
			});
			outputSink.write(yaml.stringify(bundle, { indent: 2, indentSeq: true, sortMapEntries: false }).trim());
		} else if (option.startsWith(OptionPrefix.File)) {
			const fileName = option.slice(OptionPrefix.File.length);
			Bun.stdout.write(`\tAdding file: "${fileName}"\n`);
			const file = Bun.file(path.resolve(baseDir, fileName));
			outputSink.write(await file.text().then((text) => text.trim()));
		}

		if (options.regions) outputSink.write("\n#endregion");
	}

	outputSink.write("\n");
	await outputSink.end();

	Bun.stdout.write("Done!\n");

	return 0;
}

const enum OptionPrefix {
	Bundle = "bundle:",
	File = "file:",
}

process.exit(await main());
