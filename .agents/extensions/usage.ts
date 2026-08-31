import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const SCRIPT = `${process.env.HOME}/.agents/scripts/usage.js`;
const DEFAULT_MODELS = [
	"anthropic/claude-fable-5-1",
	"openai-codex/gpt-5.6-sol",
	"xai-oauth/grok-4.6",
];

export default function usage(pi: ExtensionAPI): void {
	pi.setLabel("Usage");
	let shown = false;

	pi.on("input", async (event, ctx) => {
		const text = event.text.trim();
		const match = text.match(/^\/usage(?:\s+(.*))?$/);
		if (!match) {
			if (shown && ctx.hasUI) ctx.ui.setWidget("usage", undefined);
			shown = false;
			return;
		}
		const rest = (match[1] ?? "").trim();
		if (rest === "reset" || rest.startsWith("reset ")) return;

		const args = rest.replace(/^show\s*/, "").split(/[\s,]+/).filter(Boolean);
		if (!args.length) args.push(...DEFAULT_MODELS);
		const r = await pi.exec("bun", [SCRIPT, ...args], { timeout: 30_000 });
		const lines = (r.stdout || r.stderr || "usage failed").trim().split("\n");
		if (ctx.hasUI) {
			ctx.ui.setWidget("usage", lines, { placement: "aboveEditor" });
			shown = true;
		}
		return { handled: true };
	});
}
