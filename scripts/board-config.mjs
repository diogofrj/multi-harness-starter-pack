#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const defaults = {
  port: 3000,
  cardIdPattern: "([A-Za-z]+-[0-9]+[a-z]?)",
  cardIdFormat: "lower($1)",
  mainBranchCard: null,
  specialCases: [],
};

export function loadBoardConfig(root = process.cwd()) {
  try { return { ...defaults, ...JSON.parse(readFileSync(resolve(root, ".devtool/board.json"), "utf8")) }; }
  catch { return defaults; }
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

if (process.argv[2] === "infer-card") process.stdout.write(`${inferCard(process.argv[3]) ?? ""}\n`);
