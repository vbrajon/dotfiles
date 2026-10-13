/**
 * Complexity router: classifies the first prompt of a session and switches
 * the session model before the turn starts.
 *
 * Only sessions still on @default are routed: a manually picked model (-m,
 * /model) wins and the router stays out of the way for the whole session.
 *
 * Tiers -> roles: trivial=@smol, normal=@task, hard=@default. Roles track
 * their head of line (see fresh.ts), so resolving them is enough.
 * The thinking level is left untouched so the built-in `auto` classifier keeps
 * picking the per-turn effort, clamped to whatever the routed model exposes.
 * Normal and hard routes also enable the configured advisor for this session.
 *
 * The classifier is Kev (Jev-compatible local decision model, MLX): one
 * `choice` question read as probabilities, ~50 ms. Fallback: gemma4 through
 * ollama, reading first-token logprobs, ~400 ms. Both servers are spawned on
 * session start when down.
 *
 * Re-arm or toggle with /router. Disable at launch with PI_ROUTER=0.
 */
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { spawn } from "node:child_process";

type Tier = "trivial" | "normal" | "hard";

const TIER_ROLES: Record<Tier, string> = {
	trivial: "@smol",
	normal: "@task",
	hard: "@default",
};

const TIERS: Record<Tier, string> = {
	trivial: "greetings, single fact lookups, renames, typo fixes, what does X do, one-line edits, running a command",
	normal: "implement or fix something in a few known files, write a test, explain a module, review a diff",
	hard: "architecture or design decisions, debugging with unknown root cause, cross-cutting refactors, performance or security analysis, anything needing a plan",
};

const SYSTEM_PROMPT = `You route coding-agent prompts to a model tier. Answer with exactly one word: trivial, normal, or hard.

${Object.entries(TIERS).map(([tier, text]) => `${tier}: ${text}.`).join("\n")}

When unsure between two tiers, pick the higher one. Output the single word only.`;

const KEV = "http://127.0.0.1:8009";
const KEV_DIR = `${process.env.HOME}/.local/share/kev`;
const KEV_MODEL = "jaredpalmer/kev-0.8b";
const KEV_TIMEOUT_MS = 4_000;
const OLLAMA = "http://127.0.0.1:11434";
const GEMMA_MODEL = "gemma4";
const GEMMA_TIMEOUT_MS = 12_000;
/** Kev under this probability bumps to the higher of its top-two tiers: on 50 real sessions, hard→trivial errors 6→2. */
const BUMP_BELOW = 0.5;
const TIER_RANK: Record<Tier, number> = { trivial: 0, normal: 1, hard: 2 };
/** Prompts shorter than this skip the classifier and route to the trivial tier. */
const SHORT_PROMPT_CHARS = 24;
/** Only the prompt head matters for tiering; pasted logs must not blow up the call. */
const PROMPT_HEAD_CHARS = 2_000;

function parseTier(answer: string): Tier | null {
	const text = answer.toLowerCase();
	if (text.includes("hard")) return "hard";
	if (text.includes("trivial")) return "trivial";
	if (text.includes("normal")) return "normal";
	return null;
}

/** Picks the most likely tier; a low-confidence answer is bumped to the higher of its top two. */
function pickTier(probs: Record<Tier, number>): { tier: Tier; p: number } {
	const ranked = (Object.keys(probs) as Tier[]).sort((a, b) => probs[b] - probs[a]);
	const tier = probs[ranked[0]] < BUMP_BELOW && TIER_RANK[ranked[1]] > TIER_RANK[ranked[0]] ? ranked[1] : ranked[0];
	return { tier, p: probs[ranked[0]] };
}

/** Spawns whichever local classifier server is down and preloads gemma (cold load ~20 s, longer than the fallback timeout). */
async function warmLocal(): Promise<void> {
	const up = (url: string) => fetch(url, { signal: AbortSignal.timeout(2_000) }).then(() => true, () => false);
	if (!(await up(`${KEV}/v1/models`))) {
		spawn(`${KEV_DIR}/.venv/bin/python`, ["-m", "kev.serve", "--run", KEV_MODEL, "--port", "8009"], {
			cwd: KEV_DIR,
			detached: true,
			stdio: "ignore",
		}).on("error", () => {}).unref();
	}
	if (!(await up(`${OLLAMA}/api/tags`))) {
		spawn("ollama", ["serve"], { detached: true, stdio: "ignore" }).on("error", () => {}).unref();
		await Bun.sleep(1_500);
	}
	await fetch(`${OLLAMA}/api/generate`, {
		method: "POST",
		body: JSON.stringify({ model: GEMMA_MODEL, keep_alive: "30m" }),
		signal: AbortSignal.timeout(60_000),
	});
}

/** One System One `choice` question to Kev; null when the server is up but refuses. */
async function classifyKev(text: string): Promise<{ tier: Tier; p: number } | null> {
	const response = await fetch(`${KEV}/v1/systemone`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			state: text,
			model: "kev-latest",
			questions: {
				tier: {
					type: "choice",
					instructions: "Which model tier should handle this coding-agent prompt? When unsure between two tiers, pick the higher one.",
					criteria: TIERS,
				},
			},
		}),
		signal: AbortSignal.timeout(KEV_TIMEOUT_MS),
	});
	if (!response.ok) return null;
	const { answers } = (await response.json()) as { answers: { tier: { probabilities: Record<Tier, number> } } };
	return pickTier(answers.tier.probabilities);
}

/**
 * Fallback: one forward pass of gemma4 through ollama, reading the first-token
 * logprobs over the three tier words (no generation). Slower than Kev
 * (~400 ms warm, ~8 s cold) but never sends a hard prompt to the trivial tier.
 */
async function classifyGemma(text: string): Promise<{ tier: Tier; p: number }> {
	const response = await fetch(`${OLLAMA}/v1/chat/completions`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			model: GEMMA_MODEL,
			max_tokens: 1,
			temperature: 0,
			logprobs: true,
			top_logprobs: 8,
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				/** Fenced so the prompted classifier tiers the prompt instead of obeying it. */
				{ role: "user", content: `Prompt:\n<<<\n${text}\n>>>` },
			],
		}),
		signal: AbortSignal.timeout(GEMMA_TIMEOUT_MS),
	});
	if (!response.ok) throw new Error(`ollama ${response.status}`);
	const { choices } = (await response.json()) as {
		choices: { logprobs: { content: { top_logprobs: { token: string; logprob: number }[] }[] } }[];
	};
	const probs: Record<Tier, number> = { trivial: 0, normal: 0, hard: 0 };
	for (const { token, logprob } of choices[0].logprobs.content[0].top_logprobs) {
		const tier = parseTier(token);
		if (tier) probs[tier] += Math.exp(logprob);
	}
	if (probs.trivial + probs.normal + probs.hard === 0) throw new Error("gemma: no tier word in top logprobs");
	return pickTier(probs);
}

export default function (pi: ExtensionAPI): void {
	let enabled = Bun.env.PI_ROUTER !== "0";
	/** One classification attempt per new session; /router explicitly re-arms it. */
	let armed = true;
	let lastDecision = "none";

	const restoreSession = (_event: unknown, ctx: ExtensionContext): void => {
		armed = !ctx.sessionManager.getBranch().some(entry =>
			entry.type === "message" && entry.message.role === "user",
		);
		lastDecision = "none";
		ctx.ui.setStatus("router", undefined);
		if (enabled && armed) {
			void warmLocal().catch(err => pi.logger.warn("model-router: local warm-up failed", { error: String(err) }));
		}
	};
	pi.on("session_start", restoreSession);
	pi.on("session_switch", restoreSession);
	pi.on("session_branch", restoreSession);

	async function classify(prompt: string): Promise<{ tier: Tier; by: string }> {
		if (prompt.length < SHORT_PROMPT_CHARS) return { tier: "trivial", by: "length" };
		const head = prompt.slice(0, PROMPT_HEAD_CHARS);
		try {
			const kev = await classifyKev(head);
			if (kev) return { tier: kev.tier, by: `kev p=${kev.p.toFixed(2)}` };
		} catch (err) {
			pi.logger.warn("model-router: kev failed", { error: String(err) });
		}
		const gemma = await classifyGemma(head);
		return { tier: gemma.tier, by: `gemma p=${gemma.p.toFixed(2)}` };
	}

	pi.on("before_agent_start", async (event, ctx) => {
		if (!enabled || !armed || event.prompt.startsWith("/") || event.prompt.startsWith("!")) return;
		armed = false;

		/** A hand-picked model wins: only sessions still on @default get routed. */
		const current = ctx.models.current();
		const defaultModel = ctx.models.resolve("@default");
		if (!current || !defaultModel) return;
		if (current.id !== defaultModel.id || current.provider !== defaultModel.provider) return;

		let tier: Tier | null = null;
		let by = "none";
		try {
			({ tier, by } = await classify(event.prompt));
		} catch (err) {
			pi.logger.warn("model-router: classification failed", { error: String(err) });
		}
		if (!tier) return;

		const role = TIER_ROLES[tier];
		const target = ctx.models.resolve(role);
		if (!target) {
			pi.logger.warn("model-router: unresolved role", { role, tier });
			return;
		}

		if (target.id !== current.id || target.provider !== current.provider) {
			if (!(await pi.setModel(target))) {
				pi.logger.warn("model-router: setModel refused", { model: `${target.provider}/${target.id}` });
				return;
			}
		}
		if (tier !== "trivial") {
			const session = pi.pi.AgentRegistry.global()
				.list()
				.find(ref => ref.session?.sessionManager === ctx.sessionManager)?.session;
			if (!session) {
				throw new Error("model-router: current session is not registered; advisor was not enabled");
			}
			if (!session.setAdvisorEnabled(true)) {
				ctx.ui.notify("Router: advisor requested, but no advisor is running. Check /advisor status.", "warning");
			}
		}

		lastDecision = `${tier} (${by}) -> ${target.provider}/${target.id}`;
		pi.logger.info("model-router: routed", { tier, by, target: `${target.provider}/${target.id}` });
	});

	pi.registerCommand("router", {
		description: "Re-arm the complexity model router (on|off)",
		handler: async (args, ctx) => {
			const arg = args.trim();
			if (arg === "off") enabled = false;
			else if (arg === "on" || arg === "") {
				enabled = true;
				armed = true;
			} else {
				ctx.ui.notify("usage: /router [on|off]", "warning");
				return;
			}
			if (!enabled) ctx.ui.setStatus("router", undefined);
			ctx.ui.notify(
				`router ${enabled ? (armed ? "armed" : "on") : "off"} · last: ${lastDecision}`,
				"info",
			);
		},
	});
}
