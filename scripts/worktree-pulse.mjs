#!/usr/bin/env node
// scripts/worktree-pulse.mjs — Presença de harnesses por worktree para o board local.
//
// Regras (coordenador H02, 2026-09-20, após dois ajustes pedidos por Diogo):
// 1. "Agente ativo" no card = processo de harness com cwd dentro de um worktree deste repositório
//    E sinal de trabalho no intervalo: CPU acima do piso OU processo-filho novo (ferramenta disparada).
//    Sem sinal, nenhum pulso: o board expira o agente sozinho (90 s). Não existe "idle" no card.
// 2. Harness aberto sem trabalhar continua visível em outra faixa do board ("Harnesses abertos"),
//    via POST /api/presence, com worktree e branch. Cumpre "qualquer harness rodando aparece"
//    sem poluir "Agentes ativos".
// 3. Processo sumiu (harness fechou ou saiu do worktree) = pulso `done` imediato no card.
// O ticket (card) é inferido da branch do worktree. Arquivo tocado recentemente NÃO é presença.
//
// Uso: node scripts/worktree-pulse.mjs [--once] [--interval 30] [--repo <path>] [--verbose]
// Env:  BOARD_PORT (padrão 3000), BOARD_AUTOSTART=0 para não subir o board.

import { execFileSync, spawn } from "node:child_process";
import { readdirSync, readFileSync, readlinkSync } from "node:fs";
import os from "node:os";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inferCard, loadBoardConfig } from "./board-config.mjs";

const args = process.argv.slice(2);
const arg = (f, d = null) => { const i = args.indexOf(f); return i !== -1 && i + 1 < args.length ? args[i + 1] : d; };
const ONCE = args.includes("--once");
const VERBOSE = args.includes("--verbose");
const INTERVAL_S = Number(arg("--interval", 30));
const REPO = path.resolve(arg("--repo", path.join(path.dirname(fileURLToPath(import.meta.url)), "..")));
const PORT = Number(process.env.BOARD_PORT || 3000);
const AUTOSTART = process.env.BOARD_AUTOSTART !== "0";
const BOARD_CONFIG = loadBoardConfig(REPO);
const CPU_WORKING_JIFFIES = 100; // ~1 s de CPU no intervalo (3 % de um core em 30 s); abaixo disso é harness parado

const git = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

// Harness reconhecido pela linha de comando. Ordem importa: o mais específico primeiro.
const HARNESSES = [
  { id: "antigravity-ide", agent: "Antigravity IDE", test: c => /\.antigravity-ide-server\//.test(c) },
  { id: "agy", agent: "Antigravity CLI", test: c => /antigravity-cli\/|(^|\/)(agy|antigravity)(\s|$)/.test(c) },
  { id: "claude-remote", agent: "Claude Code (remoto)", test: c => /\/ccd-cli\//.test(c) },
  { id: "claude", agent: "Claude Code", test: c => /(^|\/)claude(\s|$)/.test(c) && !/claude-mem|claude-usage/.test(c) },
  { id: "codex", agent: "Codex", test: c => /(^|\/)codex(\s|$)/.test(c) },
  { id: "gemini", agent: "Gemini CLI", test: c => /(^|\/)gemini(\s|$)/.test(c) },
  { id: "opencode", agent: "OpenCode", test: c => /(^|\/)opencode(\s|$)/.test(c) },
  { id: "cursor", agent: "Cursor", test: c => /\.cursor-server\//.test(c) },
];

// Modelo por harness: Codex lê ~/.codex/config.toml; os demais vêm de .devtool/harness-models.json (fallback estático).
// Claude Code não precisa: o hook manda o modelo lido do transcript e o servidor conserva.
function staticModels() {
  try { return JSON.parse(readFileSync(path.join(REPO, ".devtool", "harness-models.json"), "utf8")); } catch { return {}; }
}
function codexModel() {
  try { const m = /^\s*model\s*=\s*"([^"]+)"/m.exec(readFileSync(path.join(os.homedir(), ".codex", "config.toml"), "utf8")); return m ? m[1] : null; } catch { return null; }
}
function modelFor(harnessId) {
  const st = staticModels();
  if (harnessId === "codex") return codexModel() || st.codex || null;
  return st[harnessId] || null;
}

function listWorktrees() {
  const out = git(REPO, "worktree", "list", "--porcelain");
  const items = [];
  let cur = null;
  for (const line of out.split("\n")) {
    if (line.startsWith("worktree ")) { cur = { path: line.slice(9), branch: null }; items.push(cur); }
    else if (line.startsWith("branch ") && cur) cur.branch = line.slice(7).replace(/^refs\/heads\//, "");
  }
  return items;
}

// Foto de /proc: pid -> { ppid, cwd, cmd, cpu }
function snapshotProcs() {
  const procs = new Map();
  let names;
  try { names = readdirSync("/proc"); }
  catch { return procs; }
  for (const name of names) {
    if (!/^\d+$/.test(name)) continue;
    const pid = Number(name);
    let stat, cmd, cwd;
    try { stat = readFileSync(`/proc/${pid}/stat`, "utf8"); } catch { continue; }
    try { cmd = readFileSync(`/proc/${pid}/cmdline`).toString("utf8").replace(/\0/g, " ").trim(); } catch { cmd = ""; }
    try { cwd = readlinkSync(`/proc/${pid}/cwd`); } catch { cwd = null; } // processo de outro usuário: sem cwd, sem presença
    const rp = stat.lastIndexOf(")");
    const f = stat.slice(rp + 2).split(" ");
    const ppid = Number(f[1]);
    const cpu = Number(f[11]) + Number(f[12]); // utime + stime em jiffies
    procs.set(pid, { pid, ppid, cwd, cmd, cpu });
  }
  return procs;
}

function classify(cmd) {
  for (const h of HARNESSES) if (h.test(cmd)) return h;
  return null;
}

// Sobe a cadeia de ppid até achar um harness (subagente do Claude: bash/node com cwd no worktree, pai é o claude).
function harnessAncestor(procs, p) {
  let cur = p;
  for (let i = 0; i < 12 && cur; i++) {
    const h = classify(cur.cmd);
    if (h) return { h, root: cur };
    cur = procs.get(cur.ppid);
  }
  return null;
}

// chave harness:worktree -> { harness, agent, card, branch, path, pids: Map<pid, cpu> }
function detectPresence(procs, worktrees) {
  const wts = worktrees.map(w => ({ ...w, card: inferCard(w.branch, BOARD_CONFIG) })).filter(w => w.card);
  wts.sort((a, b) => b.path.length - a.path.length); // worktree mais específico primeiro
  const found = new Map();
  for (const p of procs.values()) {
    if (!p.cwd || p.pid === process.pid) continue;
    const wt = wts.find(w => p.cwd === w.path || p.cwd.startsWith(w.path + "/"));
    if (!wt) continue;
    const anc = harnessAncestor(procs, p);
    if (!anc) continue;
    const key = `${anc.h.id}:${wt.path}`;
    const e = found.get(key) || { harness: anc.h.id, agent: anc.h.agent, card: wt.card, branch: wt.branch, path: wt.path, pids: new Map() };
    e.pids.set(p.pid, p.cpu);
    found.set(key, e);
  }
  return found;
}

function dirtyCount(wt) {
  try {
    const st = git(wt, "--no-optional-locks", "-c", "core.fileMode=false", "status", "--porcelain", "-z", "--untracked-files=normal");
    return st.split("\0").filter(Boolean).length;
  } catch { return 0; }
}

function post(route, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request({ hostname: "localhost", port: PORT, path: route, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }, timeout: 3000 },
      (res) => { res.resume(); res.on("end", () => resolve({ ok: res.statusCode < 300, code: res.statusCode })); });
    req.on("error", (e) => resolve({ ok: false, err: e.code || e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, err: "timeout" }); });
    req.write(data); req.end();
  });
}

let starting = false;
function startBoard() {
  if (!AUTOSTART || starting) return;
  starting = true;
  const child = spawn(process.execPath, [path.join(REPO, "server.mjs")], { cwd: REPO, detached: true, stdio: "ignore", env: { ...process.env, BOARD_PORT: String(PORT), PORT: String(PORT) } });
  child.unref();
  console.log(`[pulse] board iniciado em http://localhost:${PORT}`);
  setTimeout(() => { starting = false; }, 15_000); // se morrer de novo, religa de novo
}

const prev = new Map();      // key -> Map<pid, cpu> do ciclo anterior
const announced = new Map(); // key -> { card, harness, agent } pulsado como working (para mandar done ao sumir)
let seeded = false;          // primeiro ciclo só calibra; não pulsa

// CPU gasta no intervalo: pids que continuam (delta) + pids novos (tudo o que já gastaram)
function activity(e, before) {
  let cpu = 0, fresh = 0;
  for (const [pid, now] of e.pids) {
    if (before && before.has(pid)) cpu += Math.max(0, now - before.get(pid));
    else { fresh++; cpu += now; }
  }
  return { cpu, fresh };
}

async function cycle() {
  const procs = snapshotProcs();
  const present = detectPresence(procs, listWorktrees());
  const items = [];
  let pulses = 0, dones = 0, refused = false;

  for (const [key, e] of present) {
    const before = prev.get(key);
    const { cpu, fresh } = activity(e, before);
    prev.set(key, new Map(e.pids));
    const working = seeded && (cpu >= CPU_WORKING_JIFFIES || fresh > 0);
    const dirty = dirtyCount(e.path);
    const model = modelFor(e.harness);
    items.push({ harness: e.harness, agent: e.agent, model, card: e.card, branch: e.branch, path: e.path, pids: e.pids.size, working, dirty });
    if (VERBOSE) console.log(`  ${e.harness} -> ${e.card} ${working ? "ATIVO" : "parado"} cpu=${cpu} novos=${fresh} pids=${e.pids.size}`);
    if (!working) continue;
    const action = `${e.agent} em ${e.branch} · ${e.pids.size} processo(s)` + (fresh ? ` · ${fresh} novo(s)` : "") + (dirty ? ` · ${dirty} arquivo(s) alterado(s)` : "");
    const r = await post("/api/agents/pulse", { harness: e.harness, agent: e.agent, cardId: e.card, action, status: "working", model: model || undefined });
    if (r.ok) { pulses++; announced.set(key, { card: e.card, harness: e.harness, agent: e.agent }); }
    else if (r.err === "ECONNREFUSED") { refused = true; break; }
  }

  // Sumiu do worktree: done imediato no card
  for (const [key, a] of [...announced]) {
    if (present.has(key)) continue;
    announced.delete(key);
    const r = await post("/api/agents/pulse", { harness: a.harness, agent: a.agent, cardId: a.card, action: "processo encerrado", status: "done" });
    if (r.ok) dones++;
  }
  for (const k of [...prev.keys()]) if (!present.has(k)) prev.delete(k);

  if (!refused) {
    const r = await post("/api/presence", { updatedAt: Date.now(), interval: INTERVAL_S, items });
    if (!r.ok && r.err === "ECONNREFUSED") refused = true;
  }
  if (refused) startBoard();
  seeded = true;
  console.log(`[pulse] ${new Date().toISOString()} abertos=${present.size} ativos=${items.filter(i => i.working).length} pulsos=${pulses} done=${dones}${refused ? " board=OFF" : ""}`);
}

await cycle();
if (ONCE) { await new Promise(r => setTimeout(r, 3000)); await cycle(); }
if (!ONCE) setInterval(() => cycle().catch(e => console.warn("[pulse] erro:", e.message)), INTERVAL_S * 1000);
