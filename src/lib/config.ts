import * as z from "zod/v4-mini";
import type { Version } from "./bundle";

const versionRegex = /^\d+\.\d+\.\d+$/;

export const optionsValidator = z.object({
	regions: z._default(z.optional(z.boolean()), false),
	output: z._default(z.optional(z.string()), "bundled.yaml"),
	basePath: z._default(z.optional(z.string()), "."),
	requiredVersion: z.custom<Version>((v) => typeof v === "string" && versionRegex.test(v)),
});

export const bundlesValidator = z.record(
	z.string(),
	z
		.array(
			z.object({
				file: z.string(),
				weight: z._default(z.optional(z.int()), 1).check(z.minimum(1, "weight must be at least 1")),
			})
		)
		.check(z.minLength(1, "At least one file is required per bundle"))
);

const presetRegex = /^(bundle|file):(.+)$/;

export const presetsValidator = z.record(
	z.string(),
	z
		.array(z.custom<`bundle:${string}` | `file:${string}`>((v) => typeof v === "string" && presetRegex.test(v)))
		.check(z.minLength(1, "At least one input file or bundle is required per preset"))
);

export const configValidator = z.object({
	options: optionsValidator,
	bundles: bundlesValidator,
	presets: presetsValidator,
});

type YamlExtension = "yml" | "yaml";

type _Bundles = Record<
	string,
	Array<{
		/** Path of file added to bundle. Name must end with `.yml`/`.yaml` */
		file: `${string}.${YamlExtension}`;
		/**
		 * The weight of this file being selected by the generator.
		 * @default 1
		 */
		weight?: number;
	}>
>;

export interface Config<Bundles extends _Bundles = _Bundles> {
	/** global options */
	options: {
		/**
		 * Add `#region` and `#endregion` for folding for supported editors.
		 * @default false
		 */
		regions?: boolean;
		/**
		 * Output file name. Directory structure must exist before running, as it is not created on demand.
		 * @default "bundled.yaml"
		 */
		output?: `${string}.${YamlExtension}`;
		/** Base path used to resolve files. Defaults to current directory. */
		basePath?: string;
		/** Minimum required archipelago version */
		requiredVersion: Version;
	};
	/** individual bundles */
	bundles: Bundles;
	/** presets */
	presets: Record<string, Array<`bundle:${Extract<keyof Bundles, string>}` | `file:${string}.${YamlExtension}`>>;
}

export const buildConfig = <B extends _Bundles>(config: Config<B>): Config<B> => config;
