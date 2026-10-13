/**
 * slow-advisor — force the advisor ON the first time a prompt is sent while the
 * session is on the `slow` role (Ctrl+P cycle, `/model @slow`, `--model slow`).
 *
 * The extension API has no advisor handle, so the submitted prompt is rewritten
 * to `/advisor on` (builtin slash dispatch runs synchronously right after this
 * handler) and the original prompt is re-sent on the next tick.
 *
 * Advisor state is tracked by watching `/advisor` commands; the session is
 * assumed to start with the advisor off (`advisor.enabled` unset).
 */
import type { ExtensionAPI, ModelChangeEntry } from "@oh-my-pi/pi-coding-agent";

export default function slowAdvisor(pi: ExtensionAPI): void {
	pi.setLabel("Slow advisor");
	let advisorOn: boolean | undefined = false;

	pi.on("input", async (event, ctx) => {
		const text = event.text.trim();

		const cmd = text.match(/^\/advisor(?:\s+(\S+))?\s*$/);
		if (cmd) {
			const arg = cmd[1];
			if (arg === "on") advisorOn = true;
			else if (arg === "off") advisorOn = false;
			else if (!arg || arg === "toggle") advisorOn = advisorOn === undefined ? undefined : !advisorOn;
			return;
		}

		if (advisorOn || !text || /^[\/!$#]/.test(text)) return;
		const last = ctx.sessionManager
			.getBranch()
			.findLast((e): e is ModelChangeEntry => e.type === "model_change");
		if (last?.role !== "slow") return;

		advisorOn = true;
		const images = event.images;
		ctx.setTimeout(() => {
			pi.sendUserMessage(images?.length ? [{ type: "text", text }, ...images] : text);
		}, 0);
		if (ctx.hasUI) ctx.ui.notify("Slow role: advisor on", "info");
		return { text: "/advisor on" };
	});
}
