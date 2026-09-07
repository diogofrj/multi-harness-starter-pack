#!/usr/bin/env node
// scripts/build-board.mjs — Compilador do board futurista e limpo.
// Lê .devtool/features/**.md e gera dist/index.html (somente leitura, zero dependências).
// Suporta tanto deploy estático na Vercel quanto telemetria em tempo real via SSE (server.mjs).
//
// uso: node scripts/build-board.mjs [featuresDir] [outFile]
//      BOARD_TITLE="fulltech" node scripts/build-board.mjs

import { readdirSync, readFileSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const FEATURES = process.argv[2] ?? ".devtool/features";
const OUT = process.argv[3] ?? "dist/index.html";
const TITLE = process.env.BOARD_TITLE ?? "multi-harness";

const COLUMNS = [
  { id: "backlog", name: "Backlog" },
  { id: "todo", name: "A fazer" },
  { id: "in-progress", name: "Em andamento" },
  { id: "review", name: "Revisão" },
  { id: "done", name: "Fechado" },
];

// ---------- leitura ----------
function listMd(dir) {
  const out = [];
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) out.push(...listMd(p));
      else if (name.endsWith(".md")) out.push(p);
    }
  } catch {}
  return out;
}

function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, k, raw] = kv;
    let v = raw.trim();
    if (v === "null" || v === "") v = null;
    else if (v.startsWith("[")) {
      try { v = JSON.parse(v); } catch { v = v.slice(1, -1).split(",").map(s => s.trim().replace(/^"|"$/g, "")).filter(Boolean); }
    } else if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    meta[k] = v;
  }
  return { meta, body: m[2] };
}

function loadCards() {
  return listMd(FEATURES).map(file => {
    const { meta, body } = parseFrontmatter(readFileSync(file, "utf8"));
    const titleMatch = /^#\s+(.+)$/m.exec(body);
    const title = titleMatch ? titleMatch[1].trim() : basename(file, ".md");
    const rest = titleMatch ? body.replace(titleMatch[0], "").trim() : body.trim();
    const id = meta.id ?? basename(file, ".md");
    return {
      id,
      shortId: /^([a-z]+-\d+)-/.exec(id)?.[1] ?? id.replace(/-\d{4}-\d{2}-\d{2}$/, ""),
      title,
      status: meta.status ?? "backlog",
      priority: meta.priority ?? "medium",
      assignee: meta.assignee ?? null,
      dueDate: meta.dueDate ?? null,
      completedAt: meta.completedAt ?? null,
      modified: meta.modified ?? null,
      labels: Array.isArray(meta.labels) ? meta.labels : [],
      order: meta.order ?? "a0",
      file: file.replace(/\\/g, "/"),
      html: md(rest),
    };
  });
}

// ---------- markdown mínimo ----------
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function md(src) {
  const lines = src.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/);
  const out = [];
  let para = [];
  const stack = [];
  const flushP = () => { if (para.length) { const kv = para.every(l => /^[^:]{1,40}:\s/.test(l)); out.push(`<p>${para.map(inline).join(kv ? "<br>" : " ")}</p>`); para = []; } };
  const closeTo = (indent) => { while (stack.length && stack[stack.length - 1].indent >= indent) out.push(`</li></${stack.pop().tag}>`); };
  const closeAll = () => closeTo(-1);
  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{2,6})\s+(.+)$/.exec(line);
    const li = /^(\s*)(?:([-*])|(\d+\.))\s+(.*)$/.exec(line);
    if (h) { flushP(); closeAll(); const lvl = Math.min(h[1].length + 1, 6); out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); }
    else if (/^\s*---+\s*$/.test(line)) { flushP(); closeAll(); out.push("<hr>"); }
    else if (li) {
      flushP();
      const indent = li[1].replace(/\t/g, "  ").length;
      const tag = li[3] ? "ol" : "ul";
      const top = stack[stack.length - 1];
      if (top && indent > top.indent) { stack.push({ tag, indent }); out.push(`<${tag}>`); }
      else { closeTo(indent + 1); if (stack.length && stack[stack.length - 1].indent === indent) out.push("</li>"); else { stack.push({ tag, indent }); out.push(`<${tag}>`); } }
      const chk = /^\[( |x|X)\]\s+(.*)$/.exec(li[4]);
      out.push(chk ? `<li class="chk ${chk[1] === " " ? "" : "on"}">${inline(chk[2])}` : `<li>${inline(li[4])}`);
    }
    else if (line.trim() === "") { flushP(); }
    else if (stack.length && /^\s+/.test(line)) { out.push(" " + inline(line.trim())); }
    else { closeAll(); para.push(line); }
  }
  flushP(); closeAll();
  return out.join("\n");
}

// ---------- render ----------
const cards = loadCards().sort((a, b) => a.order < b.order ? -1 : a.order > b.order ? 1 : 0);
const byCol = Object.fromEntries(COLUMNS.map(c => [c.id, cards.filter(k => k.status === c.id)]));
const labelSet = [...new Set(cards.flatMap(c => c.labels))].sort();
const universes = labelSet.filter(l => l.startsWith("universe:")).map(l => l.slice(9));
const sprints = labelSet.filter(l => /^(sprint|wave)-/.test(l));
const others = labelSet.filter(l => !l.startsWith("universe:") && !/^(sprint|wave)-/.test(l));
const people = [...new Set(cards.map(c => c.assignee).filter(Boolean))].sort();
const builtAt = new Date().toISOString();

// Leitura de sprint.md
let sprintHtml = "";
try {
  const sp = readFileSync(join(FEATURES, "..", "sprint.md"), "utf8");
  const blocks = [...sp.matchAll(/^## (Sprint\s+\d+)\s*[—-]\s*"?([^"\n]+?)"?\s*$/gm)];
  const last = blocks[blocks.length - 1];
  let strip = "";
  if (last) {
    const seg = sp.slice(last.index, sp.indexOf("\n## ", last.index + 3) > 0 ? sp.indexOf("\n## ", last.index + 3) : undefined);
    const g = re => re.exec(seg)?.[1]?.trim() ?? "";
    const ini = g(/In[ií]cio:\s*(\d{4}-\d{2}-\d{2})/), fim = g(/Fim previsto:\s*(\d{4}-\d{2}-\d{2})/);
    const comp = g(/^Compromisso:\s*(.+)$/m), status = g(/^Status:\s*(\S+)/m);
    strip = `<div class="strip" data-ini="${esc(ini)}" data-fim="${esc(fim)}">
  <span class="sname"><span class="badge-dot"></span>${esc(last[1])}</span>
  <span class="sgoal">${inline(last[2])}</span>
  <span class="sdates">${ini ? `${ini} → ${fim || "?"}` : ""}<b class="sday"></b></span>
  ${comp ? `<span class="scomp">${inline(comp)}</span>` : ""}
  ${status ? `<span class="sstatus ${esc(status)}">${esc(status)}</span>` : ""}
</div>`;
  }
  const t = /^#\s+(.+)$/m.exec(sp);
  sprintHtml = `<section class="sprint">${strip}<details><summary>${t ? inline(t[1]) : "Crônica do sprint"}</summary><div class="body">${md(t ? sp.replace(t[0], "") : sp)}</div></details></section>`;
} catch {}

function cardHtml(c) {
  const data = esc(JSON.stringify({ u: c.labels.filter(l => l.startsWith("universe:")).map(l => l.slice(9)), s: c.labels.filter(l => /^(sprint|wave)-/.test(l)), o: c.labels.filter(l => !l.startsWith("universe:") && !/^(sprint|wave)-/.test(l)), a: c.assignee ?? "" }));
  const text = esc((c.shortId + " " + c.title + " " + c.labels.join(" ") + " " + (c.assignee ?? "")).toLowerCase());
  return `<li class="card p-${c.priority}" data-id="${esc(c.id)}" data-f="${data}" data-text="${text}" tabindex="0">
  <div class="card-head">
    <span class="cid">${esc(c.shortId)}</span>
    <span class="cpriority-pill ${esc(c.priority)}">${esc(c.priority)}</span>
  </div>
  <span class="ctitle">${inline(c.title)}</span>
  <span class="cmeta">${c.labels.map(l => `<i>${esc(l)}</i>`).join("")}${c.assignee ? `<b>${esc(c.assignee)}</b>` : ""}${c.dueDate ? `<time datetime="${esc(c.dueDate)}">${esc(c.dueDate)}</time>` : ""}</span>
</li>`;
}

function detailHtml(c) {
  const facts = [
    ["Coluna", COLUMNS.find(x => x.id === c.status)?.name ?? c.status],
    ["Prioridade", c.priority],
    c.assignee && ["Dono", c.assignee],
    c.dueDate && ["Alvo", c.dueDate],
    c.completedAt && ["Fechado em", c.completedAt.slice(0, 10)],
    c.modified && ["Modificado", c.modified.slice(0, 10)],
    ["Arquivo", `<code>${esc(c.file)}</code>`],
  ].filter(Boolean);
  return `<article class="detail" id="d-${esc(c.id)}" hidden>
  <p class="cid">${esc(c.shortId)}</p>
  <h2>${inline(c.title)}</h2>
  <p class="labels">${c.labels.map(l => `<i>${esc(l)}</i>`).join("")}</p>
  <dl>${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
  <div class="body">${c.html || "<p class=\"empty\">Sem descrição.</p>"}</div>
</article>`;
}

const chip = (group, v, label = v) => `<button class="chip" data-g="${group}" data-v="${esc(v)}" aria-pressed="false">${esc(label)}</button>`;

const html = `<!doctype html>
<html lang="pt-BR" class="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(TITLE)} // board · neural agent swarm</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg: #07090e;
  --bg-dots: rgba(255,255,255,0.03);
  --surface: #0e121a;
  --surface-hover: #141a24;
  --surface-elevated: #171f2c;
  --ink: #e6edf3;
  --ink-bright: #ffffff;
  --muted: #7d8590;
  --rule: rgba(255,255,255,0.08);
  --rule-soft: rgba(255,255,255,0.04);
  --rule-highlight: rgba(0, 229, 255, 0.3);
  
  --accent: #00e5ff;
  --accent-glow: rgba(0, 229, 255, 0.25);
  --accent-ink: #050b10;

  --harness-agy: #00e5ff;
  --harness-claude: #ff8400;
  --harness-codex: #00ff9d;
  --harness-odin: #b026ff;
  
  --p-critical: #ff3366;
  --p-high: #ff9100;
  --p-medium: #79869a;
  --p-low: #444d5c;
  --done: #485466;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{
  background: var(--bg);
  background-image: radial-gradient(var(--bg-dots) 1px, transparent 1px);
  background-size: 24px 24px;
  color: var(--ink);
  font: 14px/1.5 "Inter", system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
code, .cid, .mono{font-family: "IBM Plex Mono", monospace}
a{color:var(--accent); text-decoration: none}
a:hover{text-decoration: underline}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

/* HEADER FUTURISTA & STATUS */
header{
  display: flex;
  flex-wrap: wrap;
  gap: 16px 28px;
  align-items: center;
  padding: 20px 32px 14px;
  border-bottom: 1px solid var(--rule);
  background: rgba(14, 18, 26, 0.7);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 20;
}
.brand{display: flex; align-items: center; gap: 12px;}
.brand-logo{
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--accent), #7928ca);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  box-shadow: 0 0 16px var(--accent-glow);
}
header h1{
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.02em;
  color: var(--ink-bright);
}
header h1 span{color: var(--accent); font-weight: 400}
header .count{
  color: var(--muted);
  font-size: 13px;
  padding: 4px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
}
header .count b{color: var(--ink-bright); font-weight: 600}

.header-right{
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}
.telemetry-badge{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 99px;
  font-family: "IBM Plex Mono", monospace;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.3);
  color: var(--accent);
}
.telemetry-badge.offline{
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--rule);
  color: var(--muted);
}
.pulse-dot{
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
  animation: pulse-glow 2s infinite ease-in-out;
}
.telemetry-badge.offline .pulse-dot{
  background: var(--muted);
  box-shadow: none;
  animation: none;
}
@keyframes pulse-glow{
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.5; }
}

.sim-btn{
  font-size: 12px;
  font-family: "IBM Plex Mono", monospace;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--rule);
  color: var(--ink);
  transition: all .15s ease;
}
.sim-btn:hover{
  background: rgba(0, 229, 255, 0.15);
  border-color: var(--accent);
  color: var(--accent);
}

/* FILTROS E BUSCA */
nav{
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  align-items: center;
  padding: 14px 32px;
  border-bottom: 1px solid var(--rule-soft);
}
nav .g{display: flex; flex-wrap: wrap; gap: 6px; align-items: center}
nav .g span{color: var(--muted); font-size: 12px; font-weight: 500; margin-right: 4px; text-transform: uppercase; letter-spacing: .05em}
.chip{
  padding: 3px 9px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  font-size: 12px;
  background: var(--surface);
  color: var(--muted);
  transition: all .15s ease;
}
.chip:hover{border-color: rgba(255,255,255,0.2); color: var(--ink)}
.chip[aria-pressed="true"]{
  background: rgba(0, 229, 255, 0.12);
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.15);
}
nav input{
  margin-left: auto;
  padding: 6px 12px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 13px;
  min-width: 240px;
  transition: border-color .15s ease;
}
nav input:focus{border-color: var(--accent); outline: none}
nav .clear{color: var(--muted); font-size: 12px; text-decoration: underline}
nav .clear[hidden]{display: none}

/* SPRINT CHRONICLE */
.sprint{
  margin: 12px 32px;
  padding: 10px 16px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}
.strip{display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: baseline; font-size: 13px;}
.strip .sname{font-weight: 600; color: var(--accent); display: flex; align-items: center; gap: 6px;}
.strip .sgoal{font-weight: 500; color: var(--ink-bright);}
.strip .sdates{color: var(--muted); font-family: "IBM Plex Mono", monospace; font-size: 12px;}
.strip .sday{color: var(--ink); margin-left: 6px;}
.strip .scomp{color: var(--muted); font-size: 12px;}
.strip .sstatus{padding: 2px 7px; border-radius: 3px; font-size: 11px; text-transform: uppercase; font-weight: 600; background: rgba(0,255,157,0.1); color: #00ff9d; border: 1px solid rgba(0,255,157,0.3);}
.sprint details summary{cursor: pointer; font-size: 12px; color: var(--muted); margin-top: 6px;}
.sprint .body{margin-top: 10px; font-size: 13px; line-height: 1.6; border-top: 1px solid var(--rule-soft); padding-top: 10px;}

/* GRID DO KANBAN */
main{
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 320px;
  gap: 16px;
  padding: 16px 32px 60px;
  overflow-x: auto;
  align-items: start;
}
section{
  background: rgba(14, 18, 26, 0.4);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 12px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
}
section h2{
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  margin: 0 0 12px;
  padding: 0 4px 8px;
  border-bottom: 1px solid var(--rule);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  color: var(--muted);
}
section h2 small{
  font-family: "IBM Plex Mono", monospace;
  font-weight: 500;
  color: var(--ink);
  font-size: 12px;
  background: rgba(255,255,255,0.06);
  padding: 2px 6px;
  border-radius: 99px;
}
section.in-progress h2{color: var(--accent); border-color: rgba(0,229,255,0.3)}
section.done{opacity: 0.8}
section ul{
  list-style: none;
  margin: 0;
  padding: 0 2px 4px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

/* CARDS DO KANBAN */
.card{
  position: relative;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  cursor: pointer;
  display: grid;
  gap: 6px;
  transition: all .16s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.card:hover{
  background: var(--surface-hover);
  border-color: rgba(255,255,255,0.18);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.25);
}
.card::before{
  content: "";
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--p-medium);
}
.card.p-critical::before{background: var(--p-critical); box-shadow: 0 0 6px var(--p-critical);}
.card.p-high::before{background: var(--p-high); box-shadow: 0 0 6px var(--p-high);}
.card.p-low::before{background: var(--p-low);}
.card[hidden]{display: none}

.card-head{display: flex; justify-content: space-between; align-items: center;}
.card .cid{font-size: 11px; color: var(--muted); font-weight: 500;}
.card .cpriority-pill{font-size: 10px; text-transform: uppercase; font-family: "IBM Plex Mono", monospace; color: var(--muted);}
.card .ctitle{font-weight: 500; font-size: 13.5px; line-height: 1.4; color: var(--ink-bright);}
.card .cmeta{display: flex; flex-wrap: wrap; gap: 4px 6px; font-size: 11px; color: var(--muted); margin-top: 4px;}
.card .cmeta i{font-style: normal; padding: 1px 6px; border: 1px solid var(--rule); border-radius: 3px; background: rgba(255,255,255,0.02);}
.card .cmeta b{font-weight: 600; color: var(--ink);}
.card .cmeta time.over{color: var(--p-critical); font-weight: 600;}
.card .cmeta time.soon{color: var(--accent); font-weight: 600;}

/* COLUNA: AGENTES ATIVOS (LIVE TELEMETRY) */
section.live-agents{
  background: linear-gradient(180deg, rgba(0, 229, 255, 0.05) 0%, rgba(14, 18, 26, 0.6) 100%);
  border: 1px solid rgba(0, 229, 255, 0.25);
  box-shadow: inset 0 0 24px rgba(0, 229, 255, 0.03);
}
section.live-agents h2{
  color: var(--accent);
  border-color: rgba(0, 229, 255, 0.4);
}
.agent-card{
  flex-shrink: 0;
  min-height: 110px;
  background: #0d1520;
  border: 1px solid rgba(0, 229, 255, 0.35);
  border-radius: var(--radius-md);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 18px rgba(0, 229, 255, 0.1);
  animation: agent-appear .28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes agent-appear {
  0% { opacity: 0; transform: translateY(-8px) scale(0.96); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.agent-card.agent-exiting {
  animation: agent-disappear .35s ease forwards;
}
@keyframes agent-disappear {
  0% { opacity: 1; transform: scale(1); max-height: 140px; }
  100% { opacity: 0; transform: scale(0.92) translateY(10px); max-height: 0; margin-bottom: 0; padding: 0 12px; }
}

.agent-card-top{
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.harness-badge{
  font-size: 11px;
  font-family: "IBM Plex Mono", monospace;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.harness-agy{ background: rgba(0, 229, 255, 0.15); color: var(--harness-agy); border: 1px solid var(--harness-agy); }
.harness-claude{ background: rgba(255, 132, 0, 0.15); color: var(--harness-claude); border: 1px solid var(--harness-claude); }
.harness-codex{ background: rgba(0, 255, 157, 0.15); color: var(--harness-codex); border: 1px solid var(--harness-codex); }
.harness-odin{ background: rgba(176, 38, 255, 0.15); color: var(--harness-odin); border: 1px solid var(--harness-odin); }

.agent-done-btn{
  font-size: 10px;
  color: var(--muted);
  border: 1px solid var(--rule);
  padding: 2px 6px;
  border-radius: 3px;
  transition: all .15s ease;
}
.agent-done-btn:hover{ color: #00ff9d; border-color: #00ff9d; background: rgba(0,255,157,0.1); }

.agent-target-card{
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-bright);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.agent-target-card:hover{ color: var(--accent); }

.agent-action{
  font-size: 12px;
  color: var(--ink);
  background: rgba(0,0,0,0.3);
  padding: 6px 8px;
  border-radius: 4px;
  border-left: 2px solid var(--accent);
  display: flex;
  align-items: center;
  gap: 6px;
}
.agent-footer{
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-family: "IBM Plex Mono", monospace;
  color: var(--muted);
}
.agent-timer{ color: var(--accent); font-weight: 500; }

.empty-agents{
  padding: 24px 12px;
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.empty-radar{
  width: 24px;
  height: 24px;
  border: 1px dashed var(--rule);
  border-radius: 50%;
  position: relative;
}

/* PAINEL DE DETALHES */
#panel{
  position: fixed;
  inset: 0 0 0 auto;
  width: min(600px, 100%);
  background: var(--surface-elevated);
  border-left: 1px solid var(--rule);
  box-shadow: -32px 0 64px rgba(0,0,0,0.6);
  transform: translateX(100%);
  transition: transform .22s cubic-bezier(0.16, 1, 0.3, 1);
  overflow-y: auto;
  padding: 32px 36px 56px;
  z-index: 100;
}
#panel.open{transform: none}
#panel .close{
  position: absolute;
  top: 20px;
  right: 22px;
  color: var(--muted);
  font-size: 20px;
  line-height: 1;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.04);
}
#panel .close:hover{ color: var(--ink-bright); background: rgba(255,255,255,0.1); }
.detail .cid{margin: 0; font-size: 13px; color: var(--accent); font-weight: 600;}
.detail h2{font-size: 24px; line-height: 1.25; margin: 6px 0 16px; font-weight: 600; color: var(--ink-bright);}
.detail .labels{display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 20px;}
.detail .labels i{font-style: normal; font-size: 12px; padding: 2px 8px; border: 1px solid var(--rule); border-radius: 3px; background: rgba(255,255,255,0.03);}
.detail dl{
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 20px;
  margin: 0 0 24px;
  padding: 14px 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  font-size: 13px;
}
.detail dt{color: var(--muted);}
.detail dd{margin: 0; color: var(--ink-bright);}
.detail .body{line-height: 1.6;}
.detail .body code{font-size: .92em; padding: 2px 6px; background: rgba(0,0,0,0.3); border: 1px solid var(--rule); border-radius: 3px;}
#scrim{position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px); z-index: 90; display: none;}
#scrim.open{display: block;}

/* SIMULADOR POPUP */
#sim-modal{
  position: fixed;
  top: 70px;
  right: 32px;
  width: 320px;
  background: var(--surface-elevated);
  border: 1px solid var(--accent);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 36px rgba(0,0,0,0.7);
  padding: 18px;
  z-index: 50;
  display: none;
}
#sim-modal.open{ display: block; animation: agent-appear .2s ease; }
#sim-modal h3{ margin: 0 0 12px; font-size: 14px; font-weight: 600; color: var(--accent); }
#sim-modal label{ display: block; font-size: 11px; color: var(--muted); margin-bottom: 4px; text-transform: uppercase; }
#sim-modal select, #sim-modal input{
  width: 100%;
  padding: 6px 10px;
  margin-bottom: 10px;
  background: var(--bg);
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  color: var(--ink);
  font-size: 13px;
}
#sim-modal .sim-actions{ display: flex; gap: 8px; justify-content: flex-end; margin-top: 6px; }
#sim-modal button.primary{ background: var(--accent); color: var(--accent-ink); padding: 5px 12px; border-radius: var(--radius-sm); font-weight: 600; }
#sim-modal button.secondary{ color: var(--muted); padding: 5px 8px; }

@media (max-width: 760px){
  header, nav{padding-left: 16px; padding-right: 16px;}
  .sprint{margin-left: 16px; margin-right: 16px;}
  main{grid-auto-flow: row; grid-auto-columns: auto; padding: 12px 16px 40px;}
  #panel{padding: 24px 20px 40px;}
}
</style>
</head>
<body>

<header>
  <div class="brand">
    <div class="brand-logo">FT</div>
    <h1>${esc(TITLE)} <span>// board</span></h1>
  </div>
  <span class="count"><b>${byCol.todo.length}</b> a fazer · <b>${byCol["in-progress"].length}</b> em andamento · <b>${byCol.backlog.length}</b> backlog</span>
  <div class="header-right">
    <button class="sim-btn" id="btn-open-sim" title="Simular pulso de agente para testes">+ Pulso Agente</button>
    <span class="telemetry-badge offline" id="telemetry-status">
      <span class="pulse-dot"></span>
      <span id="telemetry-text">Conectando...</span>
    </span>
  </div>
</header>

<nav aria-label="Filtros">
  ${universes.length ? `<div class="g"><span>universo</span>${universes.map(u => chip("u", u)).join("")}</div>` : ""}
  ${sprints.length ? `<div class="g"><span>ciclo</span>${sprints.map(s => chip("s", s)).join("")}</div>` : ""}
  ${people.length ? `<div class="g"><span>dono</span>${people.map(p => chip("a", p)).join("")}</div>` : ""}
  ${others.length ? `<div class="g"><span>tipo</span>${others.map(o => chip("o", o)).join("")}</div>` : ""}
  <button class="clear" id="clear" hidden>limpar filtros</button>
  <input id="q" type="search" placeholder="buscar id, título, label..." aria-label="Buscar">
</nav>

${sprintHtml}

<main>
  <!-- Coluna 0: Agentes Ativos em Tempo Real -->
  <section class="live-agents" id="col-live-agents">
    <h2>⚡ Agentes Ativos <small id="active-agent-count">0 online</small></h2>
    <ul id="live-agents-container">
      <li class="empty-agents" id="empty-agents-msg">
        <div class="empty-radar"></div>
        <span>Aguardando telemetria de agentes...</span>
      </li>
    </ul>
  </section>

  <!-- Colunas do Kanban Padrão -->
  ${COLUMNS.map(col => {
    const list = byCol[col.id];
    let items;
    if (col.id === "todo" || col.id === "backlog") {
      const groups = new Map();
      for (const c of list) {
        const g = c.labels.find(l => /^(sprint|wave)-/.test(l)) ?? "sem ciclo";
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(c);
      }
      items = [...groups].map(([g, cs]) => `<li class="sprint-h" data-group="${esc(g)}">${esc(g)}</li>` + cs.map(cardHtml).join("\n")).join("\n");
    } else {
      items = list.map(cardHtml).join("\n");
    }
    return `<section class="${col.id}" data-col="${col.id}">
    <h2>${col.name}<small>${list.length}</small></h2>
    <ul>${items}</ul>
    <p class="empty" hidden>Nada aqui com esse filtro.</p>
  </section>`;
  }).join("\n")}
</main>

<div id="scrim"></div>

<aside id="panel" aria-label="Detalhe do card">
  <button class="close" id="close" aria-label="Fechar">×</button>
  ${cards.map(detailHtml).join("\n")}
</aside>

<!-- Modal de Simulação Rápida -->
<div id="sim-modal">
  <h3>⚡ Simular Atividade de Agente</h3>
  <label>Harness</label>
  <select id="sim-harness">
    <option value="agy">🪐 Antigravity (AGY)</option>
    <option value="claude">🧠 Claude Code</option>
    <option value="codex">⚡ Codex</option>
    <option value="odin">🛡️ Odin</option>
  </select>
  <label>Card</label>
  <select id="sim-card">
    ${cards.slice(0, 15).map(c => `<option value="${esc(c.id)}">${esc(c.shortId)} - ${esc(c.title.slice(0, 28))}</option>`).join("")}
  </select>
  <label>Ação Atual</label>
  <input type="text" id="sim-action" value="Refatorando regras de negócio...">
  <div class="sim-actions">
    <button class="secondary" id="sim-cancel">Cancelar</button>
    <button class="primary" id="sim-send">Emitir Pulso</button>
  </div>
</div>

<script>
(() => {
  // Estado de Filtros
  const state = { u: new Set(), s: new Set(), a: new Set(), o: new Set(), q: "" };
  const cardsEl = [...document.querySelectorAll(".card")];
  const chips = [...document.querySelectorAll(".chip")];
  const clear = document.getElementById("clear");
  const q = document.getElementById("q");

  function applyFilters() {
    const any = state.u.size || state.s.size || state.a.size || state.o.size || state.q;
    clear.hidden = !any;
    for (const el of cardsEl) {
      const f = JSON.parse(el.dataset.f);
      let ok = true;
      if (state.u.size && !f.u.some(x => state.u.has(x))) ok = false;
      if (state.s.size && !f.s.some(x => state.s.has(x))) ok = false;
      if (state.o.size && !f.o.some(x => state.o.has(x))) ok = false;
      if (state.a.size && !state.a.has(f.a)) ok = false;
      if (state.q && !el.dataset.text.includes(state.q)) ok = false;
      el.hidden = !ok;
    }
    for (const sec of document.querySelectorAll("section:not(.live-agents)")) {
      const vis = sec.querySelectorAll(".card:not([hidden])").length;
      const em = sec.querySelector(".empty");
      if (em) {
        em.hidden = vis > 0;
        em.textContent = any ? "Nada aqui com esse filtro." : "Vazio.";
      }
      const sm = sec.querySelector("h2 small");
      if (sm) sm.textContent = any ? vis + " de " + sec.querySelectorAll(".card").length : sec.querySelectorAll(".card").length;
    }
  }

  for (const c of chips) c.addEventListener("click", () => {
    const set = state[c.dataset.g], v = c.dataset.v;
    set.has(v) ? set.delete(v) : set.add(v);
    c.setAttribute("aria-pressed", set.has(v));
    applyFilters();
  });
  q.addEventListener("input", () => { state.q = q.value.trim().toLowerCase(); applyFilters(); });
  clear.addEventListener("click", () => {
    for (const k of ["u", "s", "a", "o"]) state[k].clear();
    state.q = ""; q.value = "";
    chips.forEach(c => c.setAttribute("aria-pressed", "false"));
    applyFilters();
  });

  // Painel de Detalhes
  const panel = document.getElementById("panel"), scrim = document.getElementById("scrim");
  let openId = null;
  function openCard(id, push = true) {
    const d = document.getElementById("d-" + id);
    if (!d) return;
    for (const a of panel.querySelectorAll(".detail")) a.hidden = true;
    d.hidden = false; panel.classList.add("open"); scrim.classList.add("open");
    panel.scrollTop = 0; openId = id;
    if (push) history.replaceState(null, "", "#" + id);
    document.getElementById("close").focus();
  }
  function closeCard() {
    panel.classList.remove("open"); scrim.classList.remove("open");
    openId = null; history.replaceState(null, "", location.pathname);
  }
  for (const el of cardsEl) {
    el.addEventListener("click", () => openCard(el.dataset.id));
  }
  document.getElementById("close").addEventListener("click", closeCard);
  scrim.addEventListener("click", closeCard);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && openId) closeCard(); });
  if (location.hash.length > 1) openCard(decodeURIComponent(location.hash.slice(1)), false);

  // -------------------------------------------------------------
  // TELEMETRIA DE AGENTES ATIVOS EM TEMPO REAL
  // -------------------------------------------------------------
  const liveContainer = document.getElementById("live-agents-container");
  const emptyMsg = document.getElementById("empty-agents-msg");
  const agentCount = document.getElementById("active-agent-count");
  const telemetryBadge = document.getElementById("telemetry-status");
  const telemetryText = document.getElementById("telemetry-text");

  const agentsMap = new Map();

  function getAgentDomId(id) {
    return "ag-" + String(id).replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + "s";
    const m = Math.floor(s / 60);
    return m + "m " + (s % 60) + "s";
  }

  function renderAgents() {
    const list = Array.from(agentsMap.values());
    agentCount.textContent = list.length + " online";

    // Remove qualquer elemento órfão do DOM que não esteja mais em agentsMap
    const validDomIds = new Set(list.map(ag => getAgentDomId(ag.id)));
    for (const cardEl of liveContainer.querySelectorAll(".agent-card")) {
      if (!validDomIds.has(cardEl.id)) {
        cardEl.remove();
      }
    }

    if (list.length === 0) {
      emptyMsg.style.display = "flex";
      return;
    }
    emptyMsg.style.display = "none";

    const now = Date.now();
    for (const ag of list) {
      const domId = getAgentDomId(ag.id);
      let cardEl = document.getElementById(domId);
      const isNew = !cardEl;
      if (isNew) {
        cardEl = document.createElement("li");
        cardEl.className = "agent-card";
        cardEl.id = domId;
        cardEl.dataset.rawId = ag.id;
        liveContainer.appendChild(cardEl);
      }

      const harnessIcon = ag.harness === "agy" ? "🪐" : ag.harness === "claude" ? "🧠" : ag.harness === "codex" ? "⚡" : "🛡️";
      const harnessClass = "harness-" + (ag.harness || "agy");
      const elapsed = formatDuration(now - (ag.startedAt || now));

      cardEl.innerHTML = \`
        <div class="agent-card-top">
          <span class="harness-badge \${harnessClass}">\${harnessIcon} \${ag.agent || ag.harness}</span>
          <button class="agent-done-btn" data-done-id="\${ag.id}" title="Marcar como concluído">concluir ✓</button>
        </div>
        <div class="agent-target-card" data-card-id="\${ag.cardId}">
          <span>🎯 \${ag.cardId}</span>
        </div>
        <div class="agent-action">
          <span>\${ag.action || "Trabalhando no card..."}</span>
        </div>
        <div class="agent-footer">
          <span class="agent-timer mono">há \${elapsed}</span>
          <span class="mono" style="color: #00ff9d">• \${ag.status}</span>
        </div>
      \`;

      cardEl.querySelector(".agent-target-card").addEventListener("click", () => openCard(ag.cardId));
      cardEl.querySelector(".agent-done-btn").addEventListener("click", () => completeAgent(ag));
    }
  }

  function removeAgent(id) {
    agentsMap.delete(id);
    const domId = getAgentDomId(id);
    const el = document.getElementById(domId);
    if (el) {
      el.classList.add("agent-exiting");
      setTimeout(() => {
        el.remove();
        renderAgents();
      }, 300);
    } else {
      renderAgents();
    }
  }

  function completeAgent(ag) {
    fetch("/api/agents/pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ harness: ag.harness, cardId: ag.cardId, status: "done" })
    }).catch(() => {});
    removeAgent(ag.id);
  }

  // Timer local para atualizar segundos na tela
  setInterval(() => {
    if (agentsMap.size > 0) renderAgents();
  }, 1000);

  // Conexão SSE
  function connectSSE() {
    try {
      const evtSource = new EventSource("/api/agents/stream");
      evtSource.onopen = () => {
        telemetryBadge.classList.remove("offline");
        telemetryText.textContent = "Live Telemetry";
      };
      evtSource.addEventListener("init_agents", (e) => {
        const list = JSON.parse(e.data);
        agentsMap.clear();
        for (const item of list) agentsMap.set(item.id, item);
        renderAgents();
      });
      evtSource.addEventListener("agent_upsert", (e) => {
        const item = JSON.parse(e.data);
        agentsMap.set(item.id, item);
        renderAgents();
      });
      evtSource.addEventListener("agent_removed", (e) => {
        const { id } = JSON.parse(e.data);
        removeAgent(id);
      });
      evtSource.addEventListener("board_updated", () => {
        // Recarrega cards suavemente
        console.log("[board] Atualizado pelo servidor.");
      });
      evtSource.onerror = () => {
        telemetryBadge.classList.add("offline");
        telemetryText.textContent = "Standby (Local Off)";
      };
    } catch {
      telemetryBadge.classList.add("offline");
      telemetryText.textContent = "Static Mode";
    }
  }
  connectSSE();

  // -------------------------------------------------------------
  // SIMULADOR DE PULSO (UI HELPER)
  // -------------------------------------------------------------
  const simModal = document.getElementById("sim-modal");
  const btnOpenSim = document.getElementById("btn-open-sim");
  const btnCancelSim = document.getElementById("sim-cancel");
  const btnSendSim = document.getElementById("sim-send");

  btnOpenSim.addEventListener("click", () => simModal.classList.toggle("open"));
  btnCancelSim.addEventListener("click", () => simModal.classList.remove("open"));

  btnSendSim.addEventListener("click", () => {
    const harness = document.getElementById("sim-harness").value;
    const cardId = document.getElementById("sim-card").value;
    const action = document.getElementById("sim-action").value;

    const payload = {
      harness,
      agent: harness === "agy" ? "Antigravity" : harness === "claude" ? "Claude Code" : harness === "codex" ? "Codex" : "Odin",
      cardId,
      action,
      status: "working"
    };

    // Se estiver rodando o server.mjs, posta na API
    fetch("/api/agents/pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(res => {
      simModal.classList.remove("open");
    }).catch(() => {
      // Fallback local se estiver abrindo direto o HTML estático
      const id = harness + ":" + cardId;
      agentsMap.set(id, {
        id, ...payload, startedAt: Date.now(), lastHeartbeat: Date.now()
      });
      renderAgents();
      simModal.classList.remove("open");
    });
  });

  applyFilters();
})();
</script>
</body>
</html>
`;

mkdirSync(OUT.replace(/[^/\\]+$/, "") || ".", { recursive: true });
writeFileSync(OUT, html);
console.log(`board: ${cards.length} cards → ${OUT} (${(html.length / 1024).toFixed(0)} KB)`);
