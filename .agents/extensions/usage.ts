import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { Text } from "@oh-my-pi/pi-tui";

const SCRIPT = `${process.env.HOME}/.agents/scripts/usage.js`;

export default function usage(pi: ExtensionAPI): void {
	pi.setLabel("Usage");
	let shown = false;

	pi.registerCommand("u", {
		description: "Usage per model: /u [weeks|YYYY-MM-DD] [models…]",
		handler: async (rawArgs, ctx) => {
			const args = rawArgs.trim().split(/[\s,]+/).filter(Boolean);
			const r = await pi.exec("bun", [SCRIPT, ...args], { timeout: 30_000 });
			const out = (r.stdout || r.stderr || "usage failed").trim();
			if (!ctx.hasUI) return;
			ctx.ui.setWidget("usage", () => new Text(out, 1, 0), { placement: "aboveEditor" });
			shown = true;
		},
	});

	pi.on("input", async (event, ctx) => {
		if (!shown || /^\/u(\s|$)/.test(event.text.trim())) return;
		if (ctx.hasUI) ctx.ui.setWidget("usage", undefined);
		shown = false;
	});
}
