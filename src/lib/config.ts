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
				weight: z._default(z.optional(z.int()), 1).check(z.minimum(0, "weight must be at least 0")),
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

type _Bundles = Record<string, Array<{ file: `${string}.${YamlExtension}`; weight?: number }>>;

export interface Config<Bundles extends _Bundles = _Bundles> {
	options: {
		regions?: boolean;
		output: `${string}.${YamlExtension}`;
		basePath?: string;
		requiredVersion: Version;
	};
	bundles: Bundles;
	presets: Record<string, Array<`bundle:${Extract<keyof Bundles, string>}` | `file:${string}.${YamlExtension}`>>;
}

export const buildConfig = <B extends _Bundles>(config: Config<B>): Config<B> => config;
