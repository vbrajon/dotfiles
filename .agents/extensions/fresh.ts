/**
 * Fresh: keeps the toolchain and the model roles current.
 *
 * On every fresh session (no user message yet) the roles are synced from the
 * cached catalogue at once, then in the background: bun, omp, claude, codex,
 * ollama and kev update, the catalogue is refreshed online, and the roles are
 * synced again. The widget only lists what actually changed, as soon as it is
 * known; an omp update is announced before it installs.
 *
 * Each role points at the head of its line (highest identity.revision); the
 * remaining lines become its concrete `retry.fallbackChains` entry. Chains
 * must be `provider/id` selectors: `@role` aliases are rejected there.
 *
 * /update runs the same pipeline on demand.
 */
import type { Model } from "@oh-my-pi/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { Text } from "@oh-my-pi/pi-tui";

const CONFIG = `${process.env.HOME}/.omp/agent/config.yml`;
const KEV_DIR = `${process.env.HOME}/.local/share/kev`;
const WIDGET = "fresh";

type Step = { name: string; update: [string, string[]]; version: [string, string[]]; after?: [string, string[]]; cwd?: string };

/** `version` is probed before and after `update`; only a changed probe is reported, then `after` runs. */
const STEPS: Step[] = [
	{ name: "bun", update: ["bun", ["upgrade"]], version: ["bun", ["--version"]] },
	{ name: "omp", update: ["omp", ["update"]], version: ["omp", ["--version"]] },
	{ name: "claude", update: ["claude", ["update"]], version: ["claude", ["--version"]] },
	{ name: "codex", update: ["codex", ["update"]], version: ["codex", ["--version"]] },
	{ name: "ollama", update: ["brew", ["upgrade", "ollama"]], version: ["brew", ["list", "--versions", "ollama"]] },
	{
		name: "kev",
		update: ["git", ["pull", "--ff-only"]],
		version: ["git", ["rev-parse", "--short", "HEAD"]],
		after: ["uv", ["sync", "--extra", "serve"]],
		cwd: KEV_DIR,
	},
];

const LINES: Record<string, (model: Model) => boolean> = {
	fable: model => model.provider === "anthropic" && model.identity?.family === "fable",
	opus: model => model.provider === "anthropic" && model.identity?.family === "opus",
	grok: model => model.provider === "xai-oauth" && /^grok-\d+\.\d+$/.test(model.id),
	astra: model => model.provider === "openai-codex" && /^gpt-[\d.]+-astra$/.test(model.id),
};

/** Role -> ordered lines: first present line is the role, the rest its fallback chain. */
const ROLE_LINES: Record<string, string[]> = {
	default: ["fable", "astra", "opus", "grok"],
	advisor: ["astra", "opus", "grok"],
	slow: ["astra", "opus", "grok"],
	task: ["opus", "grok"],
	smol: ["grok"],
};

function newer(a: Model, b: Model): boolean {
	const left = (a.identity?.revision ?? "0").split(".").map(Number);
	const right = (b.identity?.revision ?? "0").split(".").map(Number);
	for (let i = 0; i < Math.max(left.length, right.length); i++) {
		const delta = (left[i] ?? 0) - (right[i] ?? 0);
		if (delta !== 0) return delta > 0;
	}
	return false;
}

function heads(models: Model[], lines: string[]): Model[] {
	const out: Model[] = [];
	for (const line of lines) {
		let best: Model | undefined;
		for (const model of models) {
			if (LINES[line](model) && (!best || newer(model, best))) best = model;
		}
		if (best) out.push(best);
	}
	return out;
}

export default function fresh(pi: ExtensionAPI): void {
	pi.setLabel("Fresh");
	let shown = false;

	/** Points every role at its head of line and rewrites the fallback chains. Returns the changes. */
	async function syncRoles(ctx: ExtensionContext): Promise<string[]> {
		const settings = pi.pi.settings;
		const models = ctx.models.list();
		const chains: Record<string, string[]> = {};
		const changes: string[] = [];
		for (const [role, lines] of Object.entries(ROLE_LINES)) {
			const [primary, ...rest] = heads(models, lines);
			if (!primary) continue;
			const selector = `${primary.provider}/${primary.id}:auto`;
			if (settings.getModelRole(role) !== selector) {
				settings.setModelRole(role, selector);
				changes.push(`${role} → ${selector}`);
			}
			chains[role] = rest.map(model => `${model.provider}/${model.id}`);
		}
		await settings.flush();

		const file = Bun.file(CONFIG);
		const doc = Bun.YAML.parse(await file.text()) as { retry?: { fallbackChains?: unknown } };
		doc.retry ??= {};
		if (JSON.stringify(doc.retry.fallbackChains) !== JSON.stringify(chains)) {
			doc.retry.fallbackChains = chains;
			await Bun.write(file, Bun.YAML.stringify(doc, null, 2).replace(/: $/gm, ":"));
			changes.push("fallbackChains rewritten");
		}
		return changes;
	}

	function show(ctx: ExtensionContext, lines: string[]): void {
		if (!ctx.hasUI || lines.length === 0) return;
		ctx.ui.setWidget(WIDGET, () => new Text(lines.join("\n"), 1, 0), { placement: "aboveEditor" });
		shown = true;
	}

	/** Runs every step; a step is reported only when its version probe changed. Lines land as soon as they are known. */
	async function updateAll(ctx: ExtensionContext, lines: string[]): Promise<void> {
		const version = async (step: Step) =>
			(await pi.exec(step.version[0], step.version[1], { cwd: step.cwd, timeout: 20_000 })).stdout.trim();
		/** omp exposes a sub-second check, so its notice can precede the slow install. */
		const check = await pi.exec("omp", ["update", "--check"], { timeout: 30_000 });
		const pending = /New version available: (\S+)/.exec(check.stdout)?.[1];
		if (pending) {
			lines.push(`omp → ${pending}…`);
			show(ctx, lines);
		}
		for (const step of STEPS) {
			let line: string | undefined;
			try {
				const before = await version(step);
				await pi.exec(step.update[0], step.update[1], { cwd: step.cwd, timeout: 300_000 });
				const after = await version(step);
				if (before !== after) {
					if (step.after) await pi.exec(step.after[0], step.after[1], { cwd: step.cwd, timeout: 300_000 });
					line = `${step.name}: ${before} → ${after}`;
				}
			} catch (error) {
				line = `${step.name}: ${String(error)}`;
			}
			/** An announced update that did not land must not stay displayed as in progress. */
			const announced = lines.findIndex(l => l.startsWith(`${step.name} →`));
			if (announced >= 0) lines[announced] = line ?? `${step.name}: update not installed`;
			else if (line) lines.push(line);
			show(ctx, lines);
		}
	}

	async function run(ctx: ExtensionContext): Promise<void> {
		const lines: string[] = [];
		await updateAll(ctx, lines);
		await ctx.modelRegistry.refresh("online");
		const changes = await syncRoles(ctx);
		if (changes.length) lines.push(`roles: ${changes.join(", ")}`);
		pi.logger.info("fresh: pipeline done", { lines });
		show(ctx, lines);
	}

	pi.on("session_start", async (_event, ctx) => {
		const fresh = !ctx.sessionManager
			.getBranch()
			.some(entry => entry.type === "message" && entry.message.role === "user");
		if (!fresh) return;

		const current = ctx.models.current();
		const before = ctx.models.resolve("@default");
		const changes = await syncRoles(ctx);
		const after = ctx.models.resolve("@default");
		if (changes.length) pi.logger.info("fresh: roles synced from cache", { changes });
		if (current && before && after && current.id === before.id && after.id !== before.id) {
			await pi.setModel(after);
		}
		void run(ctx).catch(error => pi.logger.warn("fresh: pipeline failed", { error: String(error) }));
	});

	pi.registerCommand("update", {
		description: "Update bun, omp, claude, codex, ollama, kev, then resync model roles",
		handler: async (_args, ctx) => run(ctx),
	});

	pi.on("input", async (event, ctx) => {
		if (!shown || /^\/update(?:\s|$)/.test(event.text.trim())) return;
		if (ctx.hasUI) ctx.ui.setWidget(WIDGET, undefined);
		shown = false;
	});
}
