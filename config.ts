import { buildConfig } from "./src/lib/config";

export default buildConfig({
	options: {
		basePath: "configs",
		output: ".ignore/Niyrme.yaml",
		requiredVersion: "0.6.2",
	},
	bundles: {
		"NiyrmeMain{NUMBER}": [
			{
				file: "AHatInTime.yaml",
				weight: 99,
			},
			{
				file: "HollowKnight.yaml",
				weight: 100,
			},
		],
		"NiyrmeSide{number}": [
			{
				file: "STPPuzzleCollection.yaml",
				weight: 199,
			},
			{
				file: "Yacht.yaml",
				weight: 100,
			},
		],
	},
	presets: {
		default: ["bundle:NiyrmeMain{NUMBER}", "bundle:NiyrmeSide{number}", "bundle:NiyrmeSide{number}"],
		short: ["bundle:NiyrmeMain{NUMBER}", "bundle:NiyrmeSide{number}"],
	},
});
