export function getLabeledErrorFunction(
	label: string,
	onError?: (label: string, msg: string) => void,
	sink: NodeJS.WriteStream = process.stderr
) {
	let didWriteLabel = false;
	return function (msg: string) {
		if (!didWriteLabel) {
			sink.write(`${label.trimEnd()}\n`);
			didWriteLabel = true;
		}
		sink.write(`\t${msg.trimEnd()}\n`);
		onError?.(label, msg);
	};
}

export function getTaggedLabeledErrorFunctionContext(sink?: NodeJS.WriteStream) {
	let didError = false;

	return {
		getLabeledErrorFunction(label: string, onError?: (label: string, msg: string) => void) {
			return getLabeledErrorFunction(label, (...args) => void ((didError = true), onError?.(...args)), sink);
		},
		get didError() {
			return didError;
		},
	};
}
