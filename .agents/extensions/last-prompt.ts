/**
 * Last prompt: 2-line preview above the editor.
 * Idle / finished: stats (`time | $cost | Nt | +a -b | Nf | Nc`) then 2 prompt lines.
 * Stats are the delta of the last agent run in this session.
 * Prompt lines always start with dim `❯`.
 * alt+u jumps to the message in tmux copy-mode.
 * Tern native surface: a card (fill, so it does not float over the transcript) holding the stats
 * and the prompt clamped to 2 lines by Tern itself (it wraps the dock at its own width, so
 * pre-split rows would wrap again), plus a trailing spacer since Tern paints the composer's
 * context chip over the row above the editor.
 */
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { theme } from "@oh-my-pi/pi-coding-agent";
import { Container, Key, Spacer } from "@oh-my-pi/pi-tui";
import { card, text } from "@oh-my-pi/pi-tui/native/describe";
import type { NativeNode } from "@oh-my-pi/pi-tui/native/node";
import { execFile } from "node:child_process";

const WIDGET_KEY = "last-prompt";
const NEEDLE_LEN = 24;
const SEP = " | ";
const GIT_COMMIT = /(?:^|[\n;&]|&&|\|\|)\s*git\s+commit\b/;

type Totals = { cost: number; turns: number; added: number; removed: number; files: number; commits: number };

type RunState = {
	idle: boolean;
	lastPrompt?: string;
	startedAt?: number;
	durationMs?: number;
	turns: number;
	costUsd?: number;
	added: number;
	removed: number;
	files: number;
	commits: number;
	baseline?: Totals;
	widgetOn: boolean;
};

const bySession = new Map<string, RunState>();

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

function fmtDuration(ms: number): string {
	const s = ms / 1000;
	if (s < 10) return `${s.toFixed(1)}s`;
	if (s < 60) return `${Math.round(s)}s`;
	const m = Math.floor(s / 60);
	const rem = Math.round(s % 60);
	if (m < 60) return `${m}m${String(rem).padStart(2, "0")}s`;
	return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}m`;
}

function fmtCost(n: number): string {
	if (n >= 0.01) return n.toFixed(2);
	if (n >= 0.001) return n.toFixed(3);
	return n.toFixed(4);
}

function countDiff(diff: string): { added: number; removed: number } {
	let a = 0;
	let r = 0;
	for (const line of diff.split("\n")) {
		if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) continue;
		if (line.startsWith("+")) a += 1;
		else if (line.startsWith("-")) r += 1;
	}
	return { added: a, removed: r };
}

function addDetailsDiff(details: unknown, into: Totals): void {
	if (!details || typeof details !== "object") return;
	if ("perFileResults" in details && Array.isArray(details.perFileResults)) {
		for (const entry of details.perFileResults) {
			if (!entry || typeof entry !== "object" || !("diff" in entry)) continue;
			if (typeof entry.diff !== "string" || !entry.diff) continue;
			const n = countDiff(entry.diff);
			into.added += n.added;
			into.removed += n.removed;
		}
		return;
	}
	if (!("diff" in details) || typeof details.diff !== "string" || !details.diff) return;
	const n = countDiff(details.diff);
	into.added += n.added;
	into.removed += n.removed;
}

function addPath(files: Set<string>, value: unknown): void {
	if (typeof value === "string" && value.length > 0) files.add(value);
}

function collectFilePaths(details: unknown, args: unknown, files: Set<string>): void {
	if (args && typeof args === "object") {
		if ("path" in args) addPath(files, args.path);
		if ("file_path" in args) addPath(files, args.file_path);
	}
	if (!details || typeof details !== "object") return;
	if ("path" in details) addPath(files, details.path);
	if ("resolvedPath" in details) addPath(files, details.resolvedPath);
	if ("sourcePath" in details) addPath(files, details.sourcePath);
	if ("move" in details) addPath(files, details.move);
	if ("perFileResults" in details && Array.isArray(details.perFileResults)) {
		for (const entry of details.perFileResults) {
			if (entry && typeof entry === "object" && "path" in entry) addPath(files, entry.path);
		}
	}
}

function statsText(s: RunState): string {
	return [
		fmtDuration(s.durationMs ?? 0),
		`$${fmtCost(s.costUsd ?? 0)}`,
		`${s.turns}t`,
		`+${s.added} -${s.removed}`,
		`${s.files}f`,
		`${s.commits}c`,
	].join(SEP);
}

function buildLines(s: RunState, width: number): string[] {
	if (!s.lastPrompt) return [];
	const body = s.lastPrompt.replace(/\s+/g, " ").trim();
	const prefix = "❯ ";
	const promptWidth = Math.max(1, width - prefix.length);
	const first = body.slice(0, promptWidth);
	const rest = body.slice(promptWidth);
	const second = rest.length > promptWidth ? `${rest.slice(0, promptWidth - 1)}…` : rest;
	const promptLines = [theme.fg("dim", `${prefix}${first}`)];
	if (second) promptLines.push(theme.fg("dim", second));
	if (!s.idle || s.durationMs == null) return promptLines;
	return [theme.fg("accent", statsText(s)), ...promptLines];
}

/** Stats then the prompt, as Tern lays them out: no rows, so the ANSI path never sees it. */
function describeCard(s: RunState): NativeNode {
	const body = s.lastPrompt!.replace(/\s+/g, " ").trim();
	const children = [text([{ t: `❯ ${body}`, s: "dim" }], { wrap: "word", lines: 2, truncate: "end" })];
	if (s.idle && s.durationMs != null) children.unshift(text(statsText(s), { wrap: "none", truncate: "end" }));
	return card({ role: "omp.hook.last-prompt", tone: "neutral", inset: true }, children);
}

function sessionState(ctx: ExtensionContext): RunState {
	const id = ctx.sessionManager.getSessionId();
	const existing = bySession.get(id);
	if (existing) return existing;
	const created: RunState = {
		idle: true,
		turns: 0,
		added: 0,
		removed: 0,
		files: 0,
		commits: 0,
		widgetOn: false,
	};
	bySession.set(id, created);
	return created;
}

function showWidget(ctx: ExtensionContext): void {
	if (!ctx.hasUI) return;
	const s = sessionState(ctx);
	if (!s.lastPrompt) {
		if (s.widgetOn) {
			ctx.ui.setWidget(WIDGET_KEY, undefined);
			s.widgetOn = false;
		}
		return;
	}
	ctx.ui.setWidget(
		WIDGET_KEY,
		tui => {
			if (!tui.nativeRendering) return { render: (width: number) => buildLines(s, width) };
			const col = new Container();
			col.addChild({ render: () => [], describe: () => describeCard(s) });
			col.addChild(new Spacer(2));
			return col;
		},
		{ placement: "aboveEditor" },
	);
	s.widgetOn = true;
}

function totalsFromEntries(
	entries: Iterable<{ type?: string; timestamp?: string; message?: unknown }>,
	afterUserOnly: boolean,
): Totals & { prompt?: string; userAt?: number; lastAsstAt?: number } {
	const out: Totals = { cost: 0, turns: 0, added: 0, removed: 0, files: 0, commits: 0 };
	const files = new Set<string>();
	const pending = new Map<string, unknown>();
	let prompt: string | undefined;
	let userAt: number | undefined;
	let lastAsstAt: number | undefined;
	let counting = !afterUserOnly;
	for (const entry of entries) {
		if (entry.type !== "message") continue;
		const msg = entry.message;
		if (!msg || typeof msg !== "object" || !("role" in msg)) continue;
		if (msg.role === "user") {
			if ("synthetic" in msg && msg.synthetic === true) continue;
			const text = extractText("content" in msg ? msg.content : undefined).trim();
			if (!text) continue;
			if (afterUserOnly) {
				prompt = text;
				userAt = entry.timestamp ? new Date(entry.timestamp).getTime() : undefined;
				out.cost = 0;
				out.turns = 0;
				out.added = 0;
				out.removed = 0;
				out.commits = 0;
				files.clear();
				pending.clear();
				lastAsstAt = undefined;
				counting = true;
			}
			continue;
		}
		if (!counting) continue;
		if (msg.role === "assistant") {
			out.turns += 1;
			out.cost +=
				"usage" in msg &&
				typeof msg.usage === "object" &&
				msg.usage &&
				"cost" in msg.usage &&
				typeof msg.usage.cost === "object" &&
				msg.usage.cost &&
				"total" in msg.usage.cost &&
				typeof msg.usage.cost.total === "number"
					? msg.usage.cost.total
					: 0;
			lastAsstAt =
				"completedAt" in msg && typeof msg.completedAt === "number"
					? msg.completedAt
					: entry.timestamp
						? new Date(entry.timestamp).getTime()
						: lastAsstAt;
			if ("content" in msg && Array.isArray(msg.content)) {
				for (const block of msg.content) {
					if (!block || typeof block !== "object") continue;
					if (!("type" in block) || block.type !== "toolCall") continue;
					if (!("id" in block) || typeof block.id !== "string") continue;
					pending.set(block.id, "arguments" in block ? block.arguments : undefined);
				}
			}
		} else if (msg.role === "toolResult") {
			if ("details" in msg) addDetailsDiff(msg.details, out);
			if ("isError" in msg && msg.isError === true) continue;
			const id = "toolCallId" in msg && typeof msg.toolCallId === "string" ? msg.toolCallId : undefined;
			const args = id ? pending.get(id) : undefined;
			const toolName = "toolName" in msg && typeof msg.toolName === "string" ? msg.toolName : undefined;
			if (toolName === "edit" || toolName === "write" || toolName === "ast_edit") {
				collectFilePaths("details" in msg ? msg.details : undefined, args, files);
			}
			const command =
				args && typeof args === "object" && "command" in args && typeof args.command === "string"
					? args.command
					: undefined;
			if (command && GIT_COMMIT.test(command)) out.commits += 1;
		}
	}
	out.files = files.size;
	return { ...out, prompt, userAt, lastAsstAt };
}

function applyWindow(s: RunState, t: Totals & { prompt?: string }): void {
	if (t.prompt !== undefined) s.lastPrompt = t.prompt;
	s.turns = t.turns;
	s.costUsd = t.cost;
	s.added = t.added;
	s.removed = t.removed;
	s.files = t.files;
	s.commits = t.commits;
}

export default function lastPromptExtension(pi: ExtensionAPI) {
	function rebuildFromSession(ctx: ExtensionContext) {
		const s = sessionState(ctx);
		s.durationMs = undefined;
		s.startedAt = undefined;
		s.baseline = undefined;
		const t = totalsFromEntries(ctx.sessionManager.getBranch(), true);
		applyWindow(s, t);
		if (t.userAt != null && t.lastAsstAt != null) s.durationMs = Math.max(0, t.lastAsstAt - t.userAt);
		s.idle = true;
		s.widgetOn = false;
		showWidget(ctx);
	}

	pi.on("session_start", (_e, ctx) => rebuildFromSession(ctx));
	pi.on("session_switch", (_e, ctx) => rebuildFromSession(ctx));
	pi.on("session_branch", (_e, ctx) => rebuildFromSession(ctx));
	pi.on("session_tree", (_e, ctx) => rebuildFromSession(ctx));

	pi.on("input", (event, ctx) => {
		const text = event.text.trim();
		if (!text || text.startsWith("/")) return;
		const s = sessionState(ctx);
		s.lastPrompt = text;
		if (s.idle) {
			s.durationMs = undefined;
			s.turns = 0;
			s.costUsd = undefined;
			s.added = 0;
			s.removed = 0;
			s.files = 0;
			s.commits = 0;
			s.startedAt = undefined;
			s.baseline = undefined;
		}
		showWidget(ctx);
	});

	pi.on("agent_start", (_event, ctx) => {
		const s = sessionState(ctx);
		s.idle = false;
		if (s.startedAt == null) {
			s.startedAt = Date.now();
			const t = totalsFromEntries(ctx.sessionManager.getBranch(), false);
			s.baseline = {
				cost: t.cost,
				turns: t.turns,
				added: t.added,
				removed: t.removed,
				files: t.files,
				commits: t.commits,
			};
			s.turns = 0;
			s.costUsd = undefined;
			s.added = 0;
			s.removed = 0;
			s.files = 0;
			s.commits = 0;
		}
		s.durationMs = undefined;
		showWidget(ctx);
	});

	pi.on("agent_end", (event, ctx) => {
		if (event.willContinue) return;
		const s = sessionState(ctx);
		s.idle = true;
		if (s.startedAt != null) s.durationMs = Date.now() - s.startedAt;
		s.startedAt = undefined;
		const last = totalsFromEntries(ctx.sessionManager.getBranch(), true);
		if (s.baseline) {
			const now = totalsFromEntries(ctx.sessionManager.getBranch(), false);
			s.turns = Math.max(0, now.turns - s.baseline.turns);
			s.costUsd = Math.max(0, now.cost - s.baseline.cost);
			s.added = Math.max(0, now.added - s.baseline.added);
			s.removed = Math.max(0, now.removed - s.baseline.removed);
			s.files = last.files;
			s.commits = last.commits;
		} else {
			applyWindow(s, last);
		}
		s.baseline = undefined;
		showWidget(ctx);
	});

	pi.on("session_shutdown", (_event, ctx) => {
		bySession.delete(ctx.sessionManager.getSessionId());
	});

	pi.registerShortcut(Key.alt("u"), {
		description: "Jump to your last message (tmux copy-mode search)",
		handler: ctx => {
			const prompt = sessionState(ctx).lastPrompt;
			if (!prompt) return;
			const pane = process.env.TMUX_PANE;
			if (!process.env.TMUX || !pane) {
				ctx.ui.notify("Jump needs tmux (terminal scrollback is not scriptable here)", "warning");
				return;
			}
			const firstLine = prompt.split("\n").find(l => l.trim())?.trim() ?? "";
			const needle = firstLine.slice(0, NEEDLE_LEN);
			if (!needle) return;
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
