import { buildConfig } from "./src/lib/config";

export default buildConfig({
	options: {
		basePath: "configs",
		output: ".ignore/Niyrme.yaml",
		requiredVersion: "0.6.2",
	},
	bundles: {
		"niyrme-main{NUMBER}": [
			{
				file: "AHatInTime.yaml",
				weight: 99,
			},
			{
				file: "HollowKnight.yaml",
				weight: 100,
			},
		],
		"niyrme-side{number}": [
			{
				file: "STPPuzzleCollection.yaml",
				weight: 199,
			},
			{
				file: "YachtDice.yaml",
				weight: 100,
			},
		],
	},
	presets: {
		default: ["bundle:niyrme-main{NUMBER}", "bundle:niyrme-side{number}", "bundle:niyrme-side{number}"],
		short: ["bundle:niyrme-main{NUMBER}", "bundle:niyrme-side{number}"],
	},
});
