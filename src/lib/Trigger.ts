type TriggerOptions = Record<string, unknown>;

export class Trigger {
	constructor(
		public readonly option_name: string,
		public readonly option_result: string,
		public readonly options: TriggerOptions,
		public readonly option_category?: string,
	) {}

	toJSON() {
		return {
			option_category: this.option_category,
			option_name: this.option_name,
			option_result: this.option_result,
			options: this.options,
		};
	}

	static Name(game: string, slotName: string): Trigger {
		return new Trigger("game", game, { "": { name: slotName } });
	}

	static SyncAsync(syncState: "sync" | "async", options: TriggerOptions): Trigger {
		return new Trigger("sync-state", syncState, options, "x-options");
	}

	static Sync(options: TriggerOptions): Trigger {
		return Trigger.SyncAsync("sync", options);
	}

	static Async(options: TriggerOptions): Trigger {
		return Trigger.SyncAsync("async", options);
	}
}
