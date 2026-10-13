/**
 * /u: usage-per-model table above the editor until the next prompt.
 * Tern native surface: a card (fill) holding the table unwrapped, plus a trailing spacer since
 * Tern paints the composer's context chip over the row above the editor.
 */
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { Container, Spacer, Text } from "@oh-my-pi/pi-tui";
import { card, text } from "@oh-my-pi/pi-tui/native/describe";

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
			ctx.ui.setWidget(
				"usage",
				tui => {
					if (!tui.nativeRendering) return new Text(out, 1, 0);
					// The table keeps its columns; the trailing legend is prose and may wrap.
					const lines = out.split("\n");
					const legend = lines.length > 1 ? lines.pop()! : undefined;
					const body = [text(lines.join("\n"), { wrap: "none" })];
					if (legend) body.push(text([{ t: legend, s: "muted" }], { wrap: "word" }));
					const col = new Container();
					col.addChild({
						render: () => [],
						describe: () => card({ role: "omp.hook.usage", tone: "neutral", inset: true }, body),
					});
					col.addChild(new Spacer(2));
					return col;
				},
				{ placement: "aboveEditor" },
			);
			shown = true;
		},
	});

	pi.on("input", async (event, ctx) => {
		if (!shown || /^\/u(\s|$)/.test(event.text.trim())) return;
		if (ctx.hasUI) ctx.ui.setWidget("usage", undefined);
		shown = false;
	});
}
