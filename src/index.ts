import * as yaml from "@eemeli/yaml";
import WaitGroup from "@niyrme/wait-group";
import path from "node:path";
import { Bundle } from "./lib/Bundle";
import { configValidator, type Config } from "./lib/config";
import logger from "./lib/logging";
import { prettyZodError } from "./lib/zod";
import type { SyncState } from "./types";

async function checkFile(filePath: string): Promise<boolean> {
	const file = Bun.file(path.resolve(filePath));
	if (!(await file.exists())) {
		logger.error(`File ${filePath} does not exist`);
		return false;
	}
	const stat = await file.stat();
	if (!stat.isFile()) {
		logger.error(`Input is not a file: ${filePath}`);
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
				throw new Error("config file not found");
			}

			return configFile.json();
		},
	);

	const result = configValidator.safeParse(config);

	if (!result.success) {
		prettyZodError(result.error);
		return 1;
	}

	const [, , argPreset, argSyncState] = process.argv;

	const { presets, bundles, options } = result.data;

	switch (argPreset) {
		case "-l":
		case "--list":
			Bun.stdout.write(
				`Available presets:\n${Object.keys(presets)
					.map((name) => `\t${name}`)
					.join("\n")}\n`,
			);
			return 0;
	}

	let syncState: SyncState;
	switch (argSyncState) {
		case "--async":
			syncState = "async";
			break;
		case undefined:
		case "--sync":
			syncState = "sync";
			break;
		default:
			logger.error(`Invalid sync state option ${argSyncState}`);
			return 1;
	}

	const presetName = argPreset ?? "default";

	const presetOptions = presets[presetName];

	if (!presetOptions) {
		logger.error(`Preset "${presetName}" does not exist`);
		return 1;
	}

	const baseDir = path.resolve(options.basePath);

	const wg = new WaitGroup(16);

	let didError = false;

	for (const option of presetOptions) {
		await wg.add();
		if (option.startsWith("bundle:")) {
			const bundleName = option.slice("bundle:".length);
			const bundle = bundles[bundleName];
			if (bundle) {
				for (const { file: fileName } of bundle) {
					checkFile(path.resolve(baseDir, fileName)).then((success) => {
						didError ||= !success;
						wg.done();
					});
				}
			} else {
				logger.error(`[${option}] Bundle not found`);
				wg.done();
			}
		} else if (option.startsWith("file:")) {
			checkFile(path.resolve(baseDir, option.slice("file:".length))).then((success) => {
				didError ||= !success;
				wg.done();
			});
		}
	}

	await wg.waitAll();

	if (didError) {
		return 1;
	}

	logger.info(`Using preset: "${presetName}"`);
	logger.info(`Using sync state: "${syncState}"`);

	const outputFile = Bun.file(options.output ?? "bundled.yaml");
	if (await outputFile.exists()) {
		await outputFile.delete();
	}

	const outputSink = outputFile.writer();

	let didSinkError = false;

	for (const [index, option] of presetOptions.entries()) {
		if (index) outputSink.write("\n\n---\n\n");
		if (options.regions) outputSink.write("#region\n");

		if (option.startsWith(OptionPrefix.Bundle)) {
			const bundleName = option.slice(OptionPrefix.Bundle.length);
			logger.info(`Adding bundle: "${bundleName}"`);

			const bundle = new Bundle(bundleName, options.requiredVersion, syncState, { "preset-name": presetName });

			try {
				for (const { file, weight } of bundles[bundleName]!) {
					const parsed = await Bun.file(path.resolve(baseDir, file))
						.text()
						.then((text) => yaml.parse(text));
					bundle.addGame(parsed.game, weight, parsed);
				}
				outputSink.write(yaml.stringify(bundle, { indent: 2, indentSeq: true, sortMapEntries: false }).trim());
			} catch (error) {
				if (typeof error === "string") {
					logger.error(error);
					didSinkError = true;
				} else {
					throw error;
				}
			}
		} else if (option.startsWith(OptionPrefix.File)) {
			const fileName = option.slice(OptionPrefix.File.length);
			logger.info(`Adding file: "${fileName}"`);
			outputSink.write(
				await Bun.file(path.resolve(baseDir, fileName))
					.text()
					.then((text) => text.trim()),
			);
		}

		if (options.regions) outputSink.write("\n#endregion");
	}

	outputSink.write("\n");
	await outputSink.end();

	if (didSinkError) {
		await outputFile.delete();
		return 1;
	} else {
		logger.info("Done!");
		return 0;
	}
}

const enum OptionPrefix {
	Bundle = "bundle:",
	File = "file:",
}

process.exit(await main());
