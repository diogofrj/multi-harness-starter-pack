#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredFields = [
  "cardPrefix", "cardIdPattern", "cardIdFormat", "mainBranchCard", "specialCases",
  "columns", "port", "bind", "refreshIntervalSeconds", "agentTimeoutSeconds",
  "pulseTtlSeconds", "presence",
];

export function loadBoardConfig(root = process.cwd()) {
  const file = resolve(root, ".devtool/board.json");
  let config;
  try { config = JSON.parse(readFileSync(file, "utf8")); }
  catch (error) { throw new Error(`Configuração do board inválida em ${file}: ${error.message}`); }
  const missing = requiredFields.filter(field => !(field in config));
  if (missing.length) throw new Error(`Configuração do board incompleta: ${missing.join(", ")}`);
  if (!Array.isArray(config.columns) || !config.columns.length) throw new Error("board.json.columns deve conter ao menos uma coluna");
  if (!config.columns.every(column => typeof column.id === "string" && typeof column.name === "string")) throw new Error("board.json.columns exige id e name em cada coluna");
  return config;
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
