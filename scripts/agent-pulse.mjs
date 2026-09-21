#!/usr/bin/env node
// scripts/agent-pulse.mjs — Envia telemetria de atividade de um agente para o board local.
// Uso:
//   node scripts/agent-pulse.mjs --harness agy --card fm-000 --action "Refatorando CSS"
//   node scripts/agent-pulse.mjs --harness claude --card fm-000 --status done
//   node scripts/agent-pulse.mjs --harness claude --card fm-003 --action "executando: vitest" --ttl 600000
//
// Pode ser chamado em hooks do Claude Code, scripts de automação ou antes/depois de tarefas.

import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
function getArg(flag, fallback = null) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return fallback;
}

const harness = getArg("--harness", process.env.HARNESS || "agy");
const agent = getArg("--agent", process.env.AGENT_NAME || (
  harness === "agy" ? "Antigravity" :
  harness === "claude" ? "Claude Code" :
  harness === "codex" ? "Codex" :
  harness === "odin" ? "Odin" : "Agente"
));
const cardId = getArg("--card", getArg("--cardId", null));
const action = getArg("--action", "Executando tarefa...");
const status = getArg("--status", "working");
const ttlMs = Number(getArg("--ttl", 0)) || undefined;
const model = getArg("--model", process.env.AGENT_MODEL || "") || undefined; // ex.: claude-sonnet-5, gpt-5.6-terra // validade do pulso em ms (comando longo: até 15 min)
const port = Number(process.env.BOARD_PORT || process.env.PORT || 3000);
const autostart = process.env.BOARD_AUTOSTART !== "0";
const boardUrl = `http://localhost:${port}`;
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverPath = join(repoRoot, "server.mjs");

if (!cardId) {
  console.error("❌ Uso incorreto: --card <id-do-card> é obrigatório.");
  console.error('Exemplo: node scripts/agent-pulse.mjs --harness agy --card fm-000 --action "Ajustando UI"');
  process.exit(1);
}

const payload = JSON.stringify({ harness, agent, cardId, action, status, ttlMs, model });

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "localhost",
      port,
      path,
      method,
      headers: body ? {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      } : {},
      timeout: 3000,
    }, (res) => {
      let responseBody = "";
      res.on("data", chunk => { responseBody += chunk; });
      res.on("end", () => resolve({ statusCode: res.statusCode, body: responseBody }));
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("tempo limite excedido")));
    if (body) req.write(body);
    req.end();
  });
}

function startBoard() {
  const child = spawn(process.execPath, [serverPath], {
    cwd: repoRoot,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, BOARD_PORT: String(port), PORT: String(port) },
  });
  child.unref();
  console.log(`🪐 [pulse] Board iniciado: ${boardUrl}`);
}

async function waitForBoard() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const response = await request("GET", "/api/agents");
      if (response.statusCode === 200) return;
    } catch (err) {
      if (err.code !== "ECONNREFUSED") throw err;
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error("o board não ficou disponível em 5 segundos");
}

async function sendPulse(retryAfterStart = true) {
  try {
    const response = await request("POST", "/api/agents/pulse", payload);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log(`✅ [pulse] [${harness}] ${agent} -> ${cardId} (${status}) registrado com sucesso.`);
      console.log(`🪐 Board: ${boardUrl}`);
    } else {
      console.warn(`⚠️ [pulse] ${boardUrl} respondeu status ${response.statusCode}: ${response.body}`);
    }
  } catch (err) {
    if (retryAfterStart && autostart && err.code === "ECONNREFUSED") {
      startBoard();
      try {
        await waitForBoard();
        await sendPulse(false);
      } catch (startErr) {
        console.warn(`⚠️ [pulse] Não foi possível iniciar o board em ${boardUrl}: ${startErr.message}`);
      }
    } else {
      console.warn(`⚠️ [pulse] Não foi possível enviar telemetria: ${err.message}`);
    }
  }
}

await sendPulse();
