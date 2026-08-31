/**
 * Last Prompt Extension
 *
 * Shows the first lines of your last submitted message in a widget above the
 * editor, so you can re-situate yourself while reading a long response.
 *
 * - Widget updates on every submitted message (steering included) and is
 *   rebuilt from session history on start/switch/branch/tree.
 * - alt+u jumps the terminal to that message: inside tmux it enters copy-mode
 *   and searches backward for the message's first characters (press `n` for
 *   further matches).
 */
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { Key } from "@oh-my-pi/pi-tui";
import { execFile } from "node:child_process";

const WIDGET_KEY = "last-prompt";
const MAX_LINE = 110;
const NEEDLE_LEN = 24;

function extractText(content: unknown): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.filter((c): c is { type: "text"; text: string } => c?.type === "text" && typeof c.text === "string")
			.map(c => c.text)
			.join("\n");
	}
	return "";
}

export default function lastPromptExtension(pi: ExtensionAPI) {
	let lastPrompt: string | undefined;

	function render(ctx: ExtensionContext) {
		if (!ctx.hasUI) return;
		if (!lastPrompt) {
			ctx.ui.setWidget(WIDGET_KEY, undefined);
			return;
		}
		const lines = lastPrompt
			.split("\n")
			.map(l => l.trim())
			.filter(Boolean);
		const shown = lines.slice(0, 2).map((line, i) => {
			const clipped = line.length > MAX_LINE ? `${line.slice(0, MAX_LINE - 1)}…` : line;
			const suffix = i === 1 && lines.length > 2 ? " …" : "";
			return ctx.ui.theme.fg("dim", (i === 0 ? "❯ " : "  ") + clipped + suffix);
		});
		ctx.ui.setWidget(WIDGET_KEY, shown, { placement: "aboveEditor" });
	}

	function rebuildFromSession(ctx: ExtensionContext) {
		lastPrompt = undefined;
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "message" || entry.message?.role !== "user") continue;
			const text = extractText(entry.message.content).trim();
			if (text) lastPrompt = text;
		}
		render(ctx);
	}

	pi.on("session_start", (_e, ctx) => rebuildFromSession(ctx));
	pi.on("session_switch", (_e, ctx) => rebuildFromSession(ctx));
	pi.on("session_branch", (_e, ctx) => rebuildFromSession(ctx));
	pi.on("session_tree", (_e, ctx) => rebuildFromSession(ctx));

	pi.on("input", (event, ctx) => {
		const text = event.text.trim();
		if (!text || text.startsWith("/")) return;
		lastPrompt = text;
		render(ctx);
	});

	pi.registerShortcut(Key.alt("u"), {
		description: "Jump to your last message (tmux copy-mode search)",
		handler: ctx => {
			if (!lastPrompt) return;
			const pane = process.env.TMUX_PANE;
			if (!process.env.TMUX || !pane) {
				ctx.ui.notify("Jump needs tmux (terminal scrollback is not scriptable here)", "warning");
				return;
			}
			const firstLine = lastPrompt.split("\n").find(l => l.trim())?.trim() ?? "";
			const needle = firstLine.slice(0, NEEDLE_LEN);
			if (!needle) return;
			// First backward match is this widget's own copy of the text on
			// screen; search-again lands on the real message above it.
			execFile(
				"tmux",
				[
					"copy-mode", "-t", pane, ";",
					"send-keys", "-t", pane, "-X", "search-backward-text", needle, ";",
					"send-keys", "-t", pane, "-X", "search-again",
				],
				err => {
					if (err) ctx.ui.notify("tmux jump failed", "error");
				},
			);
		},
	});
}
