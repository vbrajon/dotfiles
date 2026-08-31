#!/usr/bin/env bun
const HOME = process.env.HOME
const args = process.argv.slice(2).flatMap((a) => a.split(",")).map((s) => s.trim()).filter(Boolean)
const historyWeeks = /^[1-9]\d*$/.test(args[0] ?? "") ? Number(args.shift()) : 0
const want = args
const r = (n, k) => Math.round(n / k) * k
const short = (id) => id.split("/").pop()
  .replace(/^gpt-([\d.]+)-sol$/, (_, version) => `sol${version.replaceAll(".", "")}`)
  .replace(/^claude-/, "")
  .replace(/^gpt-[\d.]+-/, "")
  .replace(/[-.]/g, "")

const usage = JSON.parse(await Bun.$`omp usage --json`.text())
const limCache = new Map()
function limitsFor(id) {
  const lid = id.includes("fable") ? "anthropic:7d:fable"
    : id.startsWith("anthropic/") ? "anthropic:7d"
    : id.startsWith("xai-oauth/") ? "xai-oauth:credits:1w"
    : id.startsWith("openai-codex/") ? "openai-codex:secondary"
    : null
  if (!lid) return []
  if (limCache.has(lid)) return limCache.get(lid)
  const byAcct = new Map()
  for (const p of usage.reports) {
    for (const l of p.limits) {
      if (l.id !== lid || !l.window?.resetsAt) continue
      const k = p.metadata?.accountId ?? p.provider
      const prev = byAcct.get(k)
      if (!prev || p.fetchedAt > prev.at) byAcct.set(k, { l, at: p.fetchedAt, email: p.metadata?.email ?? "" })
    }
  }
  const perso = (x) => (x.email.endsWith("@gmail.com") ? 0 : 1)
  const lims = [...byAcct.values()].sort((a, b) => perso(a) - perso(b) || a.l.window.resetsAt - b.l.window.resetsAt).map((x) => x.l)
  limCache.set(lid, lims)
  return lims
}
const fmtDate = (date) => date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" })
const monday = new Date()
monday.setHours(0, 0, 0, 0)
monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
const periods = historyWeeks
  ? Array.from({ length: historyWeeks + 1 }, (_, i) => {
      const start = new Date(monday)
      start.setDate(start.getDate() - i * 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      return {
        start: start.getTime(),
        end: end.getTime(),
        label: `${fmtDate(start)}–${fmtDate(new Date(end.getTime() - 1))}`,
      }
    })
  : [{ start: null, end: null, label: fmtDate(new Date()) }]

const glob = new Bun.Glob("**/*.jsonl")
const statsByPeriod = periods.map(() => new Map())
const bump = (stats, id) => stats.get(id) || stats.set(id, { p: 0, t: 0, tok: 0, out: 0, nc: 0, $: 0, runt: [], run$: [] }).get(id)
const maxDur = Math.max(7 * 864e5, ...usage.reports.flatMap((p) => p.limits.map((l) => l.window?.durationMs || 0)))
const cutoff = historyWeeks ? periods.at(-1).start : Date.now() - maxDur

for await (const file of glob.scan({ cwd: `${HOME}/.omp/agent/sessions`, absolute: true })) {
  const f = Bun.file(file)
  if (f.lastModified < cutoff) continue
  let model = "unknown"
  const openByPeriod = periods.map(() => new Map())
  const flush = () => {
    for (const [i, open] of openByPeriod.entries()) {
      for (const [rid, x] of open) {
        const s = bump(statsByPeriod[i], rid)
        s.runt.push(x.t)
        s.run$.push(x.$)
      }
      open.clear()
    }
  }
  for (const line of (await f.text()).split("\n")) {
    if (!line) continue
    let o
    try { o = JSON.parse(line) } catch { continue }
    if (o.type === "model_change" && o.model) model = o.model
    if (o.type !== "message" || !o.message) continue
    const msg = o.message
    const id = msg.role === "assistant" && msg.model ? `${msg.provider}/${msg.model}` : model
    const t = Date.parse(o.timestamp) || msg.timestamp
    let periodIndex
    if (historyWeeks) {
      periodIndex = periods.findIndex((period) => t >= period.start && t < period.end)
    } else {
      const lims = limitsFor(id)
      if (!lims.length) continue
      const start = Math.min(...lims.map((l) => l.window.resetsAt - (l.window.durationMs ?? 7 * 864e5)))
      const end = Math.max(...lims.map((l) => l.window.resetsAt))
      periodIndex = t >= start && t < end ? 0 : -1
    }
    if (periodIndex === -1) continue
    const stats = statsByPeriod[periodIndex]
    const s = bump(stats, id)
    if (msg.role === "user" && msg.attribution === "user") { s.p++; flush() }
    if (msg.role === "assistant") {
      s.t++
      const open = openByPeriod[periodIndex]
      const x = open.get(id) || open.set(id, { t: 0, $: 0 }).get(id)
      x.t++
      const u = msg.usage
      if (u) {
        s.tok += u.totalTokens || (u.input || 0) + (u.output || 0) + (u.cacheRead || 0) + (u.cacheWrite || 0)
        s.out += u.output || 0
        s.nc += (u.input || 0) + (u.cacheWrite || 0)
        s.$ += u.cost?.total || 0
        x.$ += u.cost?.total || 0
      }
    }
  }
  flush()
}

const seenIds = new Set(statsByPeriod.flatMap((stats) => [...stats.keys()]))
const requestedIds = want.map((w) =>
  [...seenIds].find((id) => short(id) === w || id === w || id.endsWith("/" + w)) || w)

const fm = (v, k, suf) => { const n = r(v, k); return n ? `${n}${suf}` : "-" }
const dist = (arr) => {
  if (!arr.length) return "-"
  const a = [...arr].sort((x, y) => x - y)
  const q = (f) => Math.round(a[Math.min(a.length - 1, Math.floor(a.length * f))])
  const m = q(0.5), p = q(0.95)
  return m || p ? `${m}~${p}` : "-"
}
const tables = periods.map((period, i) => {
  const stats = statsByPeriod[i]
  const ids = want.length
    ? requestedIds
    : [...stats.keys()].filter((id) => id !== "unknown").sort((a, b) => short(a).localeCompare(short(b)))
  const rows = ids.map((id) => {
    const s = stats.get(id) || { p: 0, t: 0, tok: 0, out: 0, nc: 0, $: 0, runt: [], run$: [] }
    const lims = !historyWeeks || i === 0 ? limitsFor(id) : []
    const quota = lims.length
      ? `${Math.round(lims.reduce((a, l) => a + (l.amount?.usedFraction ?? 0), 0) * 100)}%/${Math.round((Math.min(...lims.map((l) => l.window.resetsAt)) - Date.now()) / 864e5)}d`
      : "-"
    return { id, s, quota }
  })
  const hdr = [`─ ${period.label}`, "p", "tok", "$", "Σ%/rst", "t/p", "$/p", "miss", "o/t"]
  const cells = rows.map(({ id, s, quota }) => [
    short(id), fm(s.p, 50, "p"), fm(s.tok / 1e6, 50, "M"), fm(s.$, 50, "$"), quota,
    s.p ? dist(s.runt) : "-", s.p ? dist(s.run$) : "-",
    s.tok ? `${Math.round((s.nc / s.tok) * 100)}%` : "-",
    s.t ? fm(s.out / s.t, 50, "") : "-",
  ]).filter((values) => values.slice(1, 4).some((value) => value !== "-"))
  return [hdr, ...cells]
})
const widths = tables[0][0].map((_, i) => Math.max(...tables.flatMap((table) => table.map((cells) => cells[i].length))))
const lines = tables.flatMap((table, i) => [
  ...(i ? [""] : []),
  ...table.map((cells) =>
    `${cells[0].padEnd(widths[0])}  ${cells.slice(1, 5).map((x, j) => x.padStart(widths[j + 1])).join("  ")}    │    ${cells.slice(5).map((x, j) => x.padStart(widths[j + 5])).join("  ")}`),
])
lines.push("─ p prompts · t turns · tok tokens · Σ% sum quota · rst reset · ~ med~p95 · o output tokens")
console.log(lines.join("\n"))
