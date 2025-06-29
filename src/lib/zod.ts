import * as z from "zod/v4-mini";

export function prettyZodError<E extends z.core.$ZodError>(error: E, sink: NodeJS.WriteStream = process.stderr) {
	function printError(err: z.core.$ZodFormattedError<unknown>, depth: number = 1) {
		const indent = "\t".repeat(depth);
		for (const e of err._errors) {
			sink.write(`${indent}${e}\n`);
		}
		for (const key in err) {
			if (key === "_errors") continue;
			sink.write(`${indent}${key}\n`);
			printError(err[key], depth + 1);
		}
	}

	sink.write("Errors:\n");
	printError(z.formatError(error));
}
