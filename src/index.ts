import * as yaml from "@eemeli/yaml";
import WaitGroup from "@niyrme/wait-group";
import path from "node:path";
import { makeBundle } from "./lib/bundle";
import { configValidator } from "./lib/config";
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
			const bundle = await makeBundle(bundleName, bundles[bundleName]!, options.requiredVersion, baseDir);
			outputSink.write(yaml.stringify(bundle, { indent: 2, indentSeq: true, sortMapEntries: false }).trim());
		} else if (option.startsWith("file:")) {
			const file = Bun.file(path.resolve(baseDir, option.slice("file:".length)));
			outputSink.write(await file.text().then((text) => text.trim()));
		}

		if (options.regions) outputSink.write("\n#endregion");
	}

	outputSink.write("\n");
	await outputSink.end();

	return 0;
}

process.exit(await main());
