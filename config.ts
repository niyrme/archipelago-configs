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
		"niyrme-AHiT": [{ file: "AHatInTime.yaml" }],
		"niyrme-HK": [{ file: "HollowKnight.yaml" }],
		"niyrme-STPPC": [{ file: "STPPuzzleCollection.yaml" }],
		"niyrme-yacht": [{ file: "YachtDice.yaml" }],
	},
	presets: {
		default: ["bundle:niyrme-main{NUMBER}", "bundle:niyrme-side{number}", "bundle:niyrme-side{number}"],
		short: ["bundle:niyrme-main{NUMBER}", "bundle:niyrme-side{number}"],
		"only:main": ["bundle:niyrme-main{NUMBER}"],
		"only:side": ["bundle:niyrme-side{number}"],
		"only:AHiT": ["bundle:niyrme-AHiT"],
		"only:HK": ["bundle:niyrme-HK"],
		"only:STPPC": ["bundle:niyrme-STPPC"],
		"only:yacht": ["bundle:niyrme-yacht"],
	},
});
