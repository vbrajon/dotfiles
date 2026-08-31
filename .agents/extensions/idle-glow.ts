/**
 * idle-glow — paint the prompt chrome (π logo, gutter, `>` chevrons, `───`
 * rules) with the "ultrathink" rainbow gradient whenever the agent is idle and
 * waiting for input. The gradient shimmers like the magic keyword (same 14-stop
 * HSL sweep, 70 ms frame / 1800 ms period); while the agent is streaming the
 * chrome falls back to its normal (grey) border color.
 *
 * Works by registering "glow" clones of the built-in composer shapes
 * (band / claude / pi / rule). Select one under
 * Settings → Appearance → Composer Shape, or set `composer.shape: glow-band`.
 * The idle repaint tick rides `ctx.ui.setStatus(key, undefined)`: deleting a
 * never-set hook status is visually a no-op but still requests a render.
 */
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { theme } from "@oh-my-pi/pi-coding-agent";

type StyleFn = (s: string) => string;

interface ShapeCtx {
	width: number;
	paddingX: number;
	borderColor: StyleFn;
	accentColor: StyleFn;
	surfaceColor: StyleFn;
	box: { horizontal: string; [k: string]: string };
	topBorder?: { content: string; width: number };
}

interface RowCtx extends ShapeCtx {
	gutter: string;
	text: string;
	pad: string;
	isLastRow: boolean;
	cursorOverflow: number;
	imeSafeCursorTail: boolean;
	scrollbarThumb: boolean;
}

/** True whenever the agent loop is not running (prompt is waiting for input). */
let idle = true;

// ---------------------------------------------------------------------------
// Ultrathink rainbow gradient (mirror of createGradientHighlighter's palette:
// 14 stops, hue 0→330, saturation 90, lightness 62)
// ---------------------------------------------------------------------------

const STOPS = 14;
const FG_RESET = "\x1b[39m";
/** Same cadence as the editor's magic-keyword shimmer. */
const FRAME_MS = 70;
const PERIOD_MS = 1800;

let cachedMode: string | undefined;
let cachedPalette: readonly string[] | undefined;

/** Gradient foreground escapes for the active color mode, compiled once per mode. */
function palette(): readonly string[] {
	let mode = "truecolor";
	try {
		mode = theme.getColorMode();
	} catch {
		// theme not initialized yet — truecolor palette is a safe default
	}
	if (cachedPalette && cachedMode === mode) return cachedPalette;
	const format = mode === "truecolor" ? "ansi-16m" : "ansi-256";
	const next: string[] = [];
	for (let i = 0; i < STOPS; i++) {
		next.push(Bun.color(`hsl(${Math.round((i / STOPS) * 330)}, 90%, 62%)`, format) ?? "");
	}
	cachedMode = mode;
	cachedPalette = next;
	return next;
}

/** Current shimmer phase ∈ [0, 1); frozen at 0 when animation is off. */
function phase(): number {
	return (Date.now() % PERIOD_MS) / PERIOD_MS;
}

/** Paint each character of `run` with the next gradient stop (ultrathink's
 *  per-char sweep), restoring `resetTo` after. Zero-width SGR only. */
function paintRun(run: string, resetTo: string = FG_RESET): string {
	const stops = palette();
	const chars = Array.from(run);
	const p = phase();
	let out = "";
	let prev = "";
	for (let i = 0; i < chars.length; i++) {
		const t = (i / chars.length + p) % 1;
		const color = stops[Math.floor(t * STOPS) % STOPS] ?? stops[0] ?? "";
		// Coalesce consecutive characters that resolve to the same stop.
		if (color !== prev) {
			out += color;
			prev = color;
		}
		out += chars[i];
	}
	return `${out}${resetTo}`;
}

/** When idle, rainbow the grey chrome inside the pre-styled status band/chip:
 *  the π brand glyph and every statusLineSep-colored run (the `>` chevrons and
 *  `───` filler). ANSI swaps are width-neutral, so the reported width stays valid. */
function glowTopBorder(tb: ShapeCtx["topBorder"]): ShapeCtx["topBorder"] {
	if (!tb?.content) return tb;
	try {
		let content = tb.content;
		// Brand glyph per active symbol preset: `icon.omp` on omp 18.x, `icon.pi` on 17.x.
		const icons: Record<string, string | undefined> = theme.icon;
		const glyph = icons.omp ?? icons.pi ?? "π";
		const i = content.indexOf(glyph);
		if (i !== -1) {
			const stops = palette();
			const brand = stops[Math.floor(phase() * STOPS) % STOPS] ?? "";
			content = content.slice(0, i) + brand + glyph + content.slice(i + glyph.length);
		}
		// Separator chevrons and filler dashes are painted with statusLineSep. Each
		// sep-colored run extends from its escape to the next escape in the stream.
		const sepAnsi = theme.getFgAnsi("statusLineSep");
		if (sepAnsi) {
			const pieces = content.split(sepAnsi);
			if (pieces.length > 1) {
				content = pieces[0] ?? "";
				for (let k = 1; k < pieces.length; k++) {
					const piece = pieces[k] ?? "";
					const runEnd = piece.indexOf("\x1b");
					const run = runEnd === -1 ? piece : piece.slice(0, runEnd);
					const rest = runEnd === -1 ? "" : piece.slice(runEnd);
					// No resetTo: the original stream re-asserts its own color next escape.
					content += run.length > 0 ? paintRun(run, "") + rest : sepAnsi + rest;
				}
			}
		}
		if (content === tb.content) return tb;
		return { ...tb, content };
	} catch {
		return tb;
	}
}

/** Swap the chrome color for the rainbow while idle; passthrough while streaming. */
function g<T extends ShapeCtx>(ctx: T): T {
	if (!idle) return ctx;
	return { ...ctx, borderColor: (s: string) => paintRun(s), topBorder: glowTopBorder(ctx.topBorder) };
}

/** Standalone top rule with an optional right-docked status chip
 *  (mirror of the built-in rule/claude renderTop). */
function renderTopRule(e: ShapeCtx): string {
	const { box, width, borderColor, topBorder } = e;
	if (topBorder && topBorder.width > 0 && width > 2 && topBorder.width <= width - 2) {
		const left = Math.max(0, width - topBorder.width - 1);
		return borderColor(box.horizontal.repeat(left)) + topBorder.content + borderColor(box.horizontal);
	}
	return borderColor(box.horizontal.repeat(width));
}

// ---------------------------------------------------------------------------
// Glow clones of the built-in composer shapes
// ---------------------------------------------------------------------------

const glowBand = {
	id: "glow-band",
	sideBorders: false,
	verticalChrome: 1,
	statusAttachment: "top-band",
	bottomBar: "none",
	bottomBarGap: false,
	defaultPromptGutter: "\u2570\u2500 ",
	defaultPaddingX: () => 0,
	sideChromeWidth: () => 0,
	renderTop(e: ShapeCtx): string | undefined {
		const c = g(e);
		if (!c.topBorder?.content) return undefined;
		return c.topBorder.content;
	},
	renderRow(e: RowCtx): string[] {
		const c = g(e);
		return [(c.gutter ? c.borderColor(c.gutter) : "") + c.text + c.pad];
	},
	renderBottom(): string | undefined {
		return undefined;
	},
};

const glowClaude = {
	id: "glow-claude",
	sideBorders: false,
	verticalChrome: 2,
	statusAttachment: "top-rule-chip",
	bottomBar: "left",
	bottomBarGap: false,
	defaultPromptGutter: "\u276F ",
	defaultPaddingX: () => 0,
	sideChromeWidth: (paddingX: number) => paddingX,
	renderTop: (e: ShapeCtx) => renderTopRule(g(e)),
	renderRow(e: RowCtx): string[] {
		const c = g(e);
		const gutter = idle && c.gutter.trim().length > 0 ? paintRun(c.gutter) : c.gutter;
		return [gutter + c.text + c.pad];
	},
	renderBottom(e: ShapeCtx): string {
		const c = g(e);
		return c.borderColor(c.box.horizontal.repeat(c.width));
	},
};

const glowRule = {
	id: "glow-rule",
	sideBorders: false,
	verticalChrome: 1,
	statusAttachment: "top-rule-chip",
	bottomBar: "left",
	bottomBarGap: true,
	defaultPromptGutter: "\u276F ",
	defaultPaddingX: () => 0,
	sideChromeWidth: (paddingX: number) => paddingX,
	renderTop: (e: ShapeCtx) => renderTopRule(g(e)),
	renderRow(e: RowCtx): string[] {
		const c = g(e);
		const gutter = idle && c.gutter.trim().length > 0 ? paintRun(c.gutter) : c.gutter;
		return [gutter + c.text + c.pad];
	},
	renderBottom(): string | undefined {
		return undefined;
	},
};

const glowPi = {
	id: "glow-pi",
	sideBorders: false,
	verticalChrome: 2,
	statusAttachment: "none",
	bottomBar: "full",
	bottomBarGap: false,
	defaultPromptGutter: undefined,
	defaultPaddingX: () => 1,
	sideChromeWidth: (paddingX: number) => paddingX,
	renderTop(e: ShapeCtx): string {
		const c = g(e);
		return c.borderColor(c.box.horizontal.repeat(c.width));
	},
	renderRow(e: RowCtx): string[] {
		const c = g(e);
		return [" ".repeat(Math.max(0, c.paddingX)) + c.gutter + c.text + c.pad];
	},
	renderBottom(e: ShapeCtx): string {
		const c = g(e);
		return c.borderColor(c.box.horizontal.repeat(c.width));
	},
};

// ---------------------------------------------------------------------------
// Idle shimmer driver
// ---------------------------------------------------------------------------

export default function idleGlow(pi: ExtensionAPI) {
	let tick: unknown;
	let tickCtx: ExtensionContext | undefined;

	const stopTick = (ctx: ExtensionContext) => {
		if (tick !== undefined) {
			// Local typings (17.x) predate managed timers; the 18.x runtime provides them.
			(ctx.clearTimer as (t: unknown) => void)(tick);
			tick = undefined;
		}
	};

	const syncTick = (ctx: ExtensionContext) => {
		tickCtx = ctx;
		// Animate only in the real interactive TUI: print/headless has no UI, and
		// RPC/ACP bridges (no TTY) must not receive 14fps status events.
		const animatable = idle && ctx.hasUI && process.stdout.isTTY === true;
		if (!animatable) {
			stopTick(ctx);
			return;
		}
		if (tick !== undefined) return;
		tick = (ctx.setInterval as (fn: () => void, ms: number) => unknown)(() => {
			// Deleting a never-set hook status is a no-op visually but requests a
			// render — one shimmer frame for the composer chrome.
			tickCtx?.ui.setStatus("idle-glow-tick", undefined);
		}, FRAME_MS);
	};

	pi.on("session_start", (_event, ctx) => {
		idle = true;
		syncTick(ctx);
	});
	pi.on("agent_start", (_event, ctx) => {
		idle = false;
		syncTick(ctx);
	});
	pi.on("agent_end", (_event, ctx) => {
		idle = true;
		syncTick(ctx);
	});
	pi.on("session_shutdown", (_event, ctx) => {
		stopTick(ctx);
	});

	if (!("registerComposerShape" in pi)) return; // older omp without composer shapes
	// Local typings (17.x) predate registerComposerShape; the 18.x runtime provides it.
	const register = pi.registerComposerShape as (def: unknown) => void;

	register.call(pi, {
		label: "Band (idle glow)",
		description: "Built-in band; chrome shimmers rainbow while waiting for input",
		style: glowBand,
	});
	register.call(pi, {
		label: "Claude (idle glow)",
		description: "Built-in claude rules; \u276F and \u2500\u2500\u2500 shimmer rainbow while idle",
		style: glowClaude,
	});
	register.call(pi, {
		label: "Rule (idle glow)",
		description: "Built-in rule; \u276F and \u2500\u2500\u2500 shimmer rainbow while idle",
		style: glowRule,
	});
	register.call(pi, {
		label: "Pi (idle glow)",
		description: "Built-in pi rules; \u2500\u2500\u2500 shimmer rainbow while idle",
		style: glowPi,
	});
}
