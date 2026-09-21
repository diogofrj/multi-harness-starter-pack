import { basename, join } from "node:path";
import { readdirSync, readFileSync, statSync } from "node:fs";

export const columns = [
  { id: "backlog", name: "Backlog" },
  { id: "todo", name: "A fazer" },
  { id: "in-progress", name: "Em andamento" },
  { id: "review", name: "Revisão" },
  { id: "done", name: "Fechado" },
];

export const esc = value => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

export function inline(value) {
  return esc(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

export function markdown(src) {
  const lines = src.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/);
  const out = [];
  let para = [];
  const stack = [];
  const flushP = () => { if (para.length) { const kv = para.every(line => /^[^:]{1,40}:\s/.test(line)); out.push(`<p>${para.map(inline).join(kv ? "<br>" : " ")}</p>`); para = []; } };
  const closeTo = indent => { while (stack.length && stack[stack.length - 1].indent >= indent) out.push(`</li></${stack.pop().tag}>`); };
  const closeAll = () => closeTo(-1);
  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{2,6})\s+(.+)$/.exec(line);
    const item = /^(\s*)(?:([-*])|(\d+\.))\s+(.*)$/.exec(line);
    if (heading) { flushP(); closeAll(); const level = Math.min(heading[1].length + 1, 6); out.push(`<h${level}>${inline(heading[2])}</h${level}>`); }
    else if (/^\s*---+\s*$/.test(line)) { flushP(); closeAll(); out.push("<hr>"); }
    else if (item) {
      flushP();
      const indent = item[1].replace(/\t/g, "  ").length;
      const tag = item[3] ? "ol" : "ul";
      const top = stack[stack.length - 1];
      if (top && indent > top.indent) { stack.push({ tag, indent }); out.push(`<${tag}>`); }
      else { closeTo(indent + 1); if (stack.length && stack[stack.length - 1].indent === indent) out.push("</li>"); else { stack.push({ tag, indent }); out.push(`<${tag}>`); } }
      const check = /^\[( |x|X)\]\s+(.*)$/.exec(item[4]);
      out.push(check ? `<li class="chk ${check[1] === " " ? "" : "on"}">${inline(check[2])}` : `<li>${inline(item[4])}`);
    } else if (line.trim() === "") flushP();
    else if (stack.length && /^\s+/.test(line)) out.push(` ${inline(line.trim())}`);
    else { closeAll(); para.push(line); }
  }
  flushP(); closeAll();
  return out.join("\n");
}

function listMarkdown(dir) {
  const result = [];
  try {
    for (const name of readdirSync(dir)) {
      const file = join(dir, name);
      if (statSync(file).isDirectory()) result.push(...listMarkdown(file));
      else if (name.endsWith(".md")) result.push(file);
    }
  } catch {}
  return result;
}

function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (!pair) continue;
    const [, key, raw] = pair;
    let value = raw.trim();
    if (value === "null" || value === "") value = null;
    else if (value.startsWith("[")) {
      try { value = JSON.parse(value); }
      catch { value = value.slice(1, -1).split(",").map(item => item.trim().replace(/^"|"$/g, "")).filter(Boolean); }
    } else if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    meta[key] = value;
  }
  return { meta, body: match[2] };
}

export function loadCards(dir = ".devtool/features") {
  const cards = listMarkdown(dir).map(file => {
    const { meta, body } = parseFrontmatter(readFileSync(file, "utf8"));
    const titleMatch = /^#\s+(.+)$/m.exec(body);
    const title = titleMatch ? titleMatch[1].trim() : basename(file, ".md");
    const rest = titleMatch ? body.replace(titleMatch[0], "").trim() : body.trim();
    const id = meta.id ?? basename(file, ".md");
    const checks = [...rest.matchAll(/^\s*[-*]\s+\[([ xX])\]\s+/gm)];
    return {
      id,
      shortId: /^([a-z]+-\d+[a-z]?)-/i.exec(id)?.[1] ?? id.replace(/-\d{4}-\d{2}-\d{2}$/, ""),
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
      bodyHtml: markdown(rest),
      summary: rest.replace(/<!--[\s\S]*?-->/g, "").replace(/[#*`_[\]()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 600),
      verify: { total: checks.length, checked: checks.filter(item => item[1].toLowerCase() === "x").length },
    };
  }).sort((a, b) => String(a.order).localeCompare(String(b.order)));
  return { columns, cards };
}
