#!/usr/bin/env node
// scripts/agent-pulse.mjs — Envia telemetria de atividade de um agente para o board local.
// Uso:
//   node scripts/agent-pulse.mjs --harness agy --card ft-01 --action "Refatorando CSS"
//   node scripts/agent-pulse.mjs --harness claude --card ft-01 --status done
//
// Pode ser chamado em hooks do Claude Code, scripts de automação ou antes/depois de tarefas.

import http from "node:http";

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
const port = process.env.PORT || 3000;

if (!cardId) {
  console.error("❌ Uso incorreto: --card <id-do-card> é obrigatório.");
  console.error('Exemplo: node scripts/agent-pulse.mjs --harness agy --card ft-01 --action "Ajustando UI"');
  process.exit(1);
}

const payload = JSON.stringify({ harness, agent, cardId, action, status });

const req = http.request({
  hostname: "localhost",
  port,
  path: "/api/agents/pulse",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  },
  timeout: 3000,
}, (res) => {
  let body = "";
  res.on("data", c => { body += c; });
  res.on("end", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`✅ [pulse] [${harness}] ${agent} -> ${cardId} (${status}) registrado com sucesso.`);
    } else {
      console.warn(`⚠️ [pulse] Servidor respondeu status ${res.statusCode}: ${body}`);
    }
  });
});

req.on("error", (err) => {
  // Se o servidor local não estiver rodando, falha silenciosa para não travar o harness
  if (err.code === "ECONNREFUSED") {
    console.log(`ℹ️ [pulse] Board local não está rodando na porta ${port}. Pulso ignorado.`);
  } else {
    console.warn(`⚠️ [pulse] Não foi possível enviar telemetria: ${err.message}`);
  }
});

req.write(payload);
req.end();
