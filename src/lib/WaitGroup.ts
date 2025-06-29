import assert from "assert/strict";

type Task = {
	promise: Promise<void>;
	resolve(): void;
};

export default class WaitGroup {
	protected readonly tasks: Array<Task> = [];

	constructor(public readonly limit: number) {
		assert(limit > 0, "limit must be a positive integer");
	}

	get size() {
		return this.tasks.length;
	}

	async add(): Promise<void> {
		if (this.tasks.length >= this.limit) {
			await this.tasks[0]!.promise;
			return this.add();
		}

		let resolve: Task["resolve"] = () => {};
		// biome-ignore lint/suspicious/noAssignInExpressions:
		const promise = new Promise<void>((r) => void (resolve = r));
		this.tasks.push({ resolve, promise });
	}

	done() {
		this.tasks.shift()?.resolve();
	}

	/** wait for all remaining promises to finish */
	async waitAll(): Promise<void> {
		if (this.tasks.length === 0) {
			return;
		}

		await Promise.all(this.tasks.map((task) => task.promise));
		return this.waitAll();
	}
}
