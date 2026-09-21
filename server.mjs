#!/usr/bin/env node
// server.mjs — Servidor local leve de telemetria em tempo real e visualização do board.
// Zero dependências externas (apenas Node.js nativo).
//
// Uso: node server.mjs
// Porta: BOARD_PORT, PORT ou o valor definido em .devtool/board.json.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadCards } from "./scripts/board-cards.mjs";
import { loadBoardConfig } from "./scripts/board-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const boardConfig = loadBoardConfig(__dirname);
const PORT = Number(process.env.BOARD_PORT || process.env.PORT || boardConfig.port);
const FEATURES_DIR = path.join(__dirname, ".devtool", "features");
const BUILD_SCRIPT = path.join(__dirname, "scripts", "build-board.mjs");
const DIST_INDEX = process.env.BOARD_DIST ? path.resolve(process.env.BOARD_DIST) : path.join(__dirname, "dist", "index.html");
const TELEMETRY_SOURCE = process.env.BOARD_TELEMETRY_SOURCE || null;

// Mapa de agentes ativos: Map<id, AgentActivity>
// id = `${harness}:${cardId}`
const activeAgents = new Map();
const sseClients = new Set();
// Harnesses abertos por worktree (faixa "Harnesses abertos"); alimentado por scripts/worktree-pulse.mjs
let presence = { updatedAt: 0, interval: 30, items: [] };

function applyMirroredEvent(event, data) {
  if (event === "init_agents" && Array.isArray(data)) {
    activeAgents.clear();
    for (const agent of data) if (agent?.id) activeAgents.set(agent.id, agent);
    broadcastSSE("init_agents", data);
  } else if (event === "agent_upsert" && data?.id) {
    activeAgents.set(data.id, data);
    broadcastSSE("agent_upsert", data);
  } else if (event === "agent_removed" && data?.id) {
    activeAgents.delete(data.id);
    broadcastSSE("agent_removed", data);
  } else if (event === "presence" && data && Array.isArray(data.items)) {
    presence = data;
    broadcastSSE("presence", data);
  }
}

function connectTelemetryMirror() {
  if (!TELEMETRY_SOURCE) return;
  let retryTimer = null;
  const reconnect = () => {
    if (retryTimer) return;
    retryTimer = setTimeout(() => { retryTimer = null; connectTelemetryMirror(); }, 2_000);
  };
  const request = http.get(TELEMETRY_SOURCE, response => {
    if (response.statusCode !== 200) { response.resume(); reconnect(); return; }
    response.setEncoding("utf8");
    let buffer = "";
    response.on("data", chunk => {
      buffer += chunk;
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = /^event:\s*(.+)$/m.exec(block)?.[1];
        const raw = [...block.matchAll(/^data:\s*(.*)$/gm)].map(match => match[1]).join("\n");
        if (!event || !raw) continue;
        try { applyMirroredEvent(event, JSON.parse(raw)); } catch {}
      }
    });
    response.on("end", reconnect);
  });
  request.on("error", reconnect);
  console.log(`[mirror] Telemetria espelhada de ${TELEMETRY_SOURCE}`);
}

const AGENT_TIMEOUT_MS = 90_000; // 90 segundos sem heartbeat = expira

// Limpeza automática de agentes inativos
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [key, agent] of activeAgents.entries()) {
    if (now > (agent.expiresAt || agent.lastHeartbeat + AGENT_TIMEOUT_MS)) {
      activeAgents.delete(key);
      broadcastSSE("agent_removed", { id: key, reason: "timeout" });
      changed = true;
    }
  }
  // Watcher parado: a faixa de harnesses abertos não pode mostrar dado velho
  if (presence.items.length && now - presence.updatedAt > 3 * (presence.interval || 30) * 1000) {
    presence = { updatedAt: presence.updatedAt, interval: presence.interval, items: [], stale: true };
    broadcastSSE("presence", presence);
  }
}, 5_000);

// Broadcast para todos os clientes conectados via SSE
function broadcastSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Regenera o board estático
function triggerBuild(callback) {
  execFile("node", [BUILD_SCRIPT, FEATURES_DIR, DIST_INDEX], { cwd: __dirname }, (err) => {
    if (err) console.error("Erro ao rebuildar board:", err.message);
    else {
      broadcastSSE("board_updated", { timestamp: Date.now() });
      if (callback) callback();
    }
  });
}

// Watcher para recarregar se cards mudarem no disco
try {
  fs.watch(path.join(__dirname, ".devtool"), { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith(".md")) {
      console.log(`[watch] Alteração detectada em ${filename}. Atualizando board...`);
      triggerBuild();
    }
  });
} catch (e) {
  console.warn("[watch] fs.watch não pôde ser iniciado recursivamente:", e.message);
}

// Inicializa com um build inicial
triggerBuild();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS headers para permitir ferramentas locais
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE Stream
  if (url.pathname === "/api/agents/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(":\n\n"); // Ping inicial

    sseClients.add(res);

    // Envia o estado atual dos agentes logo ao conectar
    const currentList = Array.from(activeAgents.values());
    res.write(`event: init_agents\ndata: ${JSON.stringify(currentList)}\n\n`);
    res.write(`event: presence\ndata: ${JSON.stringify(presence)}\n\n`);

    req.on("close", () => {
      sseClients.delete(res);
    });
    return;
  }

  // Obter lista atual de agentes ativos (JSON)
  if (req.method === "GET" && url.pathname === "/api/agents") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(Array.from(activeAgents.values())));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/cards") {
    try {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify(loadCards(FEATURES_DIR)));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ error: "Não foi possível ler os cards", details: error.message }));
    }
    return;
  }

  // Harnesses abertos (presença por processo, sem vínculo com "agente ativo")
  if (req.method === "GET" && url.pathname === "/api/presence") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(presence));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/presence") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        if (!Array.isArray(payload.items)) throw new Error("items deve ser lista");
        presence = { updatedAt: Number(payload.updatedAt) || Date.now(), interval: Number(payload.interval) || 30, items: payload.items.slice(0, 64) };
        broadcastSSE("presence", presence);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, count: presence.items.length }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "JSON inválido", details: err.message }));
      }
    });
    return;
  }

  // Receber pulso de telemetria do agente
  if (req.method === "POST" && url.pathname === "/api/agents/pulse") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const { harness = "agy", agent = "Agente", cardId, action = "Trabalhando", status = "working" } = payload;
        // Pulso pode declarar validade própria (comando longo, ex. vitest): entre 10 s e 15 min
        const ttlMs = Math.min(Math.max(Number(payload.ttlMs) || AGENT_TIMEOUT_MS, 10_000), 15 * 60_000);

        if (!cardId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "cardId é obrigatório" }));
          return;
        }

        const id = `${harness}:${cardId}`;

        if (status === "done") {
          activeAgents.delete(id);
          broadcastSSE("agent_removed", { id, harness, cardId, status: "done" });
          console.log(`[agent] Concluído: [${harness}] ${agent} no card ${cardId}`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, status: "removed" }));
          return;
        }

        const agentRecord = {
          id,
          harness,
          agent,
          cardId,
          action,
          status,
          startedAt: activeAgents.get(id)?.startedAt || Date.now(),
          lastHeartbeat: Date.now(),
          expiresAt: Date.now() + ttlMs,
          // modelo vem do hook (transcript) ou do watcher (config do harness); pulso sem modelo não apaga o anterior
          model: (typeof payload.model === "string" && payload.model.trim()) || activeAgents.get(id)?.model || null,
        };

        activeAgents.set(id, agentRecord);
        broadcastSSE("agent_upsert", agentRecord);
        console.log(`[agent] Pulso: [${harness}] ${agent} -> ${cardId} (${action})`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, agent: agentRecord }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "JSON inválido", details: err.message }));
      }
    });
    return;
  }

  // Servir assets estáticos ou o index
  if (req.method === "GET") {
    if (fs.existsSync(DIST_INDEX)) {
      const html = fs.readFileSync(DIST_INDEX, "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(html);
    } else {
      triggerBuild(() => {
        if (fs.existsSync(DIST_INDEX)) {
          const html = fs.readFileSync(DIST_INDEX, "utf8");
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
          res.end(html);
        } else {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Erro ao compilar o board.");
        }
      });
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Não encontrado");
});

connectTelemetryMirror();

server.listen(PORT, () => {
  console.log(`\n🪐 [board] Servidor local futurista rodando em: http://localhost:${PORT}`);
  console.log(`📡 SSE Stream: http://localhost:${PORT}/api/agents/stream`);
  console.log(`⚡ Endpoint de Pulso: POST http://localhost:${PORT}/api/agents/pulse\n`);
});
