export function getLabeledErrorFunction(label: string, onError?: (label: string, msg: string) => void) {
	let didWriteLabel = false;
	return function (msg: string) {
		if (!didWriteLabel) {
			Bun.stderr.write(`${label.trimEnd()}\n`);
			didWriteLabel = true;
		}
		Bun.stderr.write(`\t${msg.trimEnd()}\n`);
		onError?.(label, msg);
	};
}

export function getTaggedLabeledErrorFunctionContext() {
	let didError = false;

	return {
		getLabeledErrorFunction(label: string, onError?: (label: string, msg: string) => void) {
			return getLabeledErrorFunction(label, (...args) => void ((didError = true), onError?.(...args)));
		},
		get didError() {
			return didError;
		},
	};
}
