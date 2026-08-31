import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const SOUND = "/System/Library/Sounds/Tink.aiff";

export default function ding(pi: ExtensionAPI): void {
	pi.setLabel("Ding");
	let enabled = true;

	pi.registerCommand("ding", {
		description: "Toggle turn-complete sound",
		handler: async (_args, ctx) => {
			enabled = !enabled;
			if (ctx.hasUI) ctx.ui.notify(`Ding ${enabled ? "on" : "off"}`, "info");
		},
	});

	pi.on("agent_end", async (event, ctx) => {
		if (!enabled || !ctx.hasUI || event.willContinue) return;
		const last = event.messages.findLast((m) => m.role === "assistant");
		if (!last || last.stopReason === "aborted" || last.stopReason === "error") return;
		void pi.exec("afplay", [SOUND], { timeout: 4000 }).catch(() => {});
	});
}
