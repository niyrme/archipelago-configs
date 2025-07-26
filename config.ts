import { buildConfig } from "./src/lib/config";

export default buildConfig({
	options: {
		basePath: "configs",
		output: ".ignore/Niyrme.yaml",
		requiredVersion: "0.6.2",
	},
	bundles: {
		"NiyrmeMain{NUMBER}": [{ file: "AHatInTime.yaml" }, { file: "HollowKnight.yaml" }],
		"NiyrmeSide{number}": [{ file: "Yacht.yaml" }, { file: "STPPuzzleCollection.yaml", weight: 3 }],
	},
	presets: {
		default: ["bundle:NiyrmeMain{NUMBER}", "bundle:NiyrmeSide{number}", "bundle:NiyrmeSide{number}"],
		short: ["bundle:NiyrmeMain{NUMBER}", "bundle:NiyrmeSide{number}"],
	},
});
