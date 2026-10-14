#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function parseYaml(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, key, raw] = match;
    let val = raw.trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      try { val = JSON.parse(val); }
      catch { val = val.slice(1, -1).split(",").map(s => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean); }
    } else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (/^\d+$/.test(val)) val = Number(val);
    result[key] = val;
  }
  return result;
}

export function slugifyStatus(s) {
  const norm = String(s ?? "").toLowerCase().trim();
  if (norm === "to do" || norm === "todo" || norm === "a fazer") return "todo";
  if (norm === "in progress" || norm === "in-progress" || norm === "em andamento") return "in-progress";
  if (norm === "review" || norm === "revisão" || norm === "revisao") return "review";
  if (norm === "done" || norm === "fechado") return "done";
  if (norm === "backlog") return "backlog";
  return norm.replace(/[\s_]+/g, "-");
}

export function loadBoardConfig(root = process.cwd()) {
  const yamlFile = resolve(root, "backlog/config.yml");
  const jsonFile = resolve(root, "backlog/config.json");
  const legacyFile = resolve(root, ".devtool/board.json");

  let rawConfig = {};
  if (existsSync(yamlFile)) {
    try { rawConfig = parseYaml(readFileSync(yamlFile, "utf8")); }
    catch (error) { throw new Error(`Configuração do backlog inválida em ${yamlFile}: ${error.message}`); }
  } else if (existsSync(jsonFile)) {
    try { rawConfig = JSON.parse(readFileSync(jsonFile, "utf8")); }
    catch (error) { throw new Error(`Configuração do backlog inválida em ${jsonFile}: ${error.message}`); }
  } else if (existsSync(legacyFile)) {
    try { return JSON.parse(readFileSync(legacyFile, "utf8")); }
    catch (error) { throw new Error(`Configuração do board legada inválida em ${legacyFile}: ${error.message}`); }
  } else {
    // Defaults canônicos caso nenhum arquivo exista ainda
    rawConfig = {
      project_name: "multi-harness",
      statuses: ["Backlog", "To Do", "In Progress", "Review", "Done"],
      port: 3100,
      bind: "0.0.0.0",
      default_port: 6420,
    };
  }

  const statuses = Array.isArray(rawConfig.statuses) && rawConfig.statuses.length
    ? rawConfig.statuses
    : ["Backlog", "To Do", "In Progress", "Review", "Done"];

  const columns = statuses.map(s => ({ id: slugifyStatus(s), name: s }));

  return {
    cardPrefix: (rawConfig.task_prefix || "task").toUpperCase() + "-",
    cardIdPattern: "((?:task|tk)-[0-9]+[a-z]?)",
    cardIdFormat: "lower($1)",
    mainBranchCard: null,
    specialCases: [],
    columns,
    port: Number(rawConfig.port || 3100),
    bind: rawConfig.bind || "0.0.0.0",
    backlogPort: Number(rawConfig.default_port || 6420),
    refreshIntervalSeconds: Number(rawConfig.refresh_interval_seconds || 10),
    agentTimeoutSeconds: Number(rawConfig.agent_timeout_seconds || 90),
    pulseTtlSeconds: { min: 10, max: 900 },
    presence: {
      enabled: rawConfig.presence_enabled !== false,
      label: rawConfig.presence_label || "Harnesses abertos",
      intervalSeconds: Number(rawConfig.presence_interval_seconds || 30),
      staleAfterIntervals: 3,
      defaultOpen: false,
    },
  };
}

export function inferCard(branch, config = loadBoardConfig()) {
  if (!branch) return null;
  if (branch === "main") return config.mainBranchCard;
  for (const item of config.specialCases ?? []) {
    if (new RegExp(item.pattern, "i").test(branch)) return item.card;
  }
  const match = new RegExp(config.cardIdPattern, "i").exec(branch);
  if (!match) return null;
  if (config.cardIdFormat === "lower($1)") return (match[1] ?? "").toLowerCase();
  return config.cardIdFormat.replace(/\$(\d+)/g, (_, index) => (match[Number(index)] ?? "").toLowerCase());
}

const command = process.argv[2];
if (command === "infer-card") process.stdout.write(`${inferCard(process.argv[3]) ?? ""}\n`);
if (command === "get") {
  const path = String(process.argv[3] ?? "").split(".").filter(Boolean);
  let value = loadBoardConfig();
  for (const key of path) value = value?.[key];
  if (value === undefined) process.exitCode = 1;
  else process.stdout.write(`${typeof value === "object" ? JSON.stringify(value) : value}\n`);
}
