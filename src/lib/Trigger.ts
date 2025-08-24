type TriggerOptions = Record<string, unknown>;

export class Trigger {
	constructor(
		public readonly option_name: string,
		public readonly option_result: unknown,
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
}
