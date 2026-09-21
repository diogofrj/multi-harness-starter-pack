#!/usr/bin/env node
import { createRequire } from "node:module";
import { execFileSync, spawn } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch {
  const candidates = [resolve(dirname(process.execPath), "../lib/node_modules/playwright")];
  for (const root of (process.env.NODE_PATH || "").split(delimiter).filter(Boolean)) candidates.push(join(root, "playwright"));
  try { candidates.push(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "playwright")); } catch {}
  try {
    for (const version of readdirSync(join(homedir(), ".nvm", "versions", "node"))) candidates.push(join(homedir(), ".nvm", "versions", "node", version, "lib", "node_modules", "playwright"));
  } catch {}
  let lastError;
  for (const candidate of candidates) {
    try { ({ chromium } = require(candidate)); break; }
    catch (error) { lastError = error; }
  }
  if (!chromium) {
    console.error(`not_run: Playwright global indisponível (${lastError?.message || "não encontrado"})`);
    process.exit(2);
  }
}

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = mkdtempSync(join(tmpdir(), "fm013-board-smoke-"));
const features = join(root, ".devtool", "features");
mkdirSync(join(root, "scripts"), { recursive: true });
mkdirSync(features, { recursive: true });
for (const file of ["server.mjs", "scripts/build-board.mjs", "scripts/board-cards.mjs", "scripts/board-config.mjs"]) cpSync(join(sourceRoot, file), join(root, file));
writeFileSync(join(root, ".devtool", "board.json"), JSON.stringify({ port: 3103, cardIdPattern: "FM-([0-9]{3}[a-z]?)", cardIdFormat: "fm-$1", mainBranchCard: "fm-001", specialCases: [] }));

const fixture = (id, title, status, owner, extraLabel = null) => `---\nid: ${id}\nstatus: ${status}\npriority: high\nassignee: ${owner}\nlabels: ${JSON.stringify(["wave-2b", "board", ...(extraLabel ? [extraLabel] : [])])}\norder: a${id}\n---\n# ${title}\n\nDescrição segura de ${title}.\n\n## Verify\n- [x] primeiro\n- [ ] segundo\n`;
const paths = [join(features, "fm-101.md"), join(features, "fm-102.md"), join(features, "fm-103.md")];
writeFileSync(paths[0], fixture("fm-101", "Card Alfa", "todo", "Codex"));
writeFileSync(paths[1], fixture("fm-102", "Card Beta", "backlog", "Sonnet"));
writeFileSync(paths[2], fixture("fm-103", "Card Gama", "done", "Codex"));

const child = spawn(process.execPath, [join(root, "server.mjs")], { cwd: root, env: { ...process.env, BOARD_PORT: "3103", PORT: "3103" }, stdio: ["ignore", "pipe", "pipe"] });
let serverLog = "";
child.stdout.on("data", chunk => { serverLog += chunk; });
child.stderr.on("data", chunk => { serverLog += chunk; });
let browser;
const results = [];

async function test(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`ok - ${name}`); }
  catch (error) { results.push({ name, ok: false, error }); console.error(`not ok - ${name}: ${error.message}`); }
}

async function waitForServer() {
  const until = Date.now() + 10_000;
  while (Date.now() < until) {
    try { const response = await fetch("http://127.0.0.1:3103/api/cards"); if (response.ok) return; } catch {}
    await new Promise(resolvePromise => setTimeout(resolvePromise, 100));
  }
  throw new Error(`servidor não iniciou: ${serverLog}`);
}

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });

  await test("carrega sem erro e API devolve 3 cards", async () => {
    await page.goto("http://127.0.0.1:3103", { waitUntil: "networkidle" });
    const payload = await page.evaluate(() => fetch("/api/cards").then(response => response.json()));
    if (payload.cards.length !== 3) throw new Error(`esperava 3, recebeu ${payload.cards.length}`);
    if (consoleErrors.length) throw new Error(consoleErrors.join(" | "));
  });

  await test("refresh por SSE move card e marca .moved", async () => {
    await page.getByText("Live Telemetry", { exact: true }).waitFor({ timeout: 2_000 });
    writeFileSync(paths[0], fixture("fm-101", "Card Alfa", "review", "Codex", "novo-tipo"));
    await page.locator('[data-col="review"] .card[data-id="fm-101"].moved').waitFor({ timeout: 3_000 });
    await page.locator('[data-filter-group="o"] .chip[data-v="novo-tipo"]').waitFor({ timeout: 1_000 });
  });

  await test("refresh por polling funciona sem EventSource", async () => {
    const pollingContext = await browser.newContext();
    await pollingContext.addInitScript(() => { Object.defineProperty(window, "EventSource", { value: undefined }); });
    const pollingPage = await pollingContext.newPage();
    await pollingPage.goto("http://127.0.0.1:3103/?refresh=2", { waitUntil: "networkidle" });
    writeFileSync(paths[1], fixture("fm-102", "Card Beta", "in-progress", "Sonnet"));
    await pollingPage.locator('[data-col="in-progress"] .card[data-id="fm-102"].moved').waitFor({ timeout: 5_000 });
    await pollingContext.close();
  });

  await test("dock alterna e persiste", async () => {
    const dock = page.locator("#presence-dock");
    if (await dock.evaluate(element => element.classList.contains("open"))) throw new Error("dock deveria nascer fechado");
    await page.click("#presence-toggle");
    await page.reload({ waitUntil: "networkidle" });
    if (!await dock.evaluate(element => element.classList.contains("open"))) throw new Error("dock aberto não persistiu");
    await page.click("#presence-toggle");
  });

  await test("grupo CICLO recolhe com contagem ativa", async () => {
    const group = page.locator('[data-filter-group="s"]');
    await group.locator(".chip").first().click();
    await group.locator(".group-toggle").click();
    if (!await group.evaluate(element => element.classList.contains("collapsed"))) throw new Error("grupo não recolheu");
    if (!/1/.test(await group.locator(".group-toggle").innerText())) throw new Error("contagem ativa ausente");
    await page.click("#clear");
    if (/1/.test(await group.locator(".group-toggle").innerText())) throw new Error("contagem não zerou após limpar");
  });

  await test("fullscreen usa fallback .focus sem API", async () => {
    await page.evaluate(() => { Object.defineProperty(document.querySelector("main"), "requestFullscreen", { value: undefined }); });
    await page.click("#btn-fullscreen");
    if (!await page.locator("body").evaluate(element => element.classList.contains("focus"))) throw new Error("fallback focus não ativou");
    await page.keyboard.press("Escape");
  });

  await test("hover abre peek com título", async () => {
    await page.locator('.card[data-id="fm-101"] .ctitle').hover();
    await page.locator("#peek:not([hidden])").waitFor({ timeout: 1_500 });
    if (!/Card Alfa/.test(await page.locator("#peek").innerText())) throw new Error("título ausente no peek");
  });

  await test("Enter abre painel", async () => {
    await page.locator('.card[data-id="fm-101"]').focus();
    await page.keyboard.press("Enter");
    if (!await page.locator("#panel").evaluate(element => element.classList.contains("open"))) throw new Error("painel não abriu");
    await page.keyboard.press("Escape");
  });

  await test("busca filtra cards", async () => {
    await page.fill("#q", "gama");
    if (await page.locator('.card[data-id="fm-101"]').isVisible()) throw new Error("card fora da busca continuou visível");
    if (!await page.locator('.card[data-id="fm-103"]').isVisible()) throw new Error("card buscado ficou oculto");
    await page.fill("#q", "");
  });

  await test("agent_upsert renderiza agente na coluna", async () => {
    const response = await page.evaluate(() => fetch("/api/agents/pulse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ harness: "codex", agent: "Smoke", cardId: "fm-101", action: "testando", status: "working" }) }).then(item => item.json()));
    if (!response.ok) throw new Error("pulso recusado");
    await page.locator("#live-agents-container .agent-card").waitFor({ timeout: 2_000 });
  });
} catch (error) {
  results.push({ name: "setup", ok: false, error });
  console.error(`not ok - setup: ${error.message}`);
} finally {
  await browser?.close().catch(() => {});
  child.kill("SIGTERM");
  await new Promise(resolvePromise => { child.once("exit", resolvePromise); setTimeout(resolvePromise, 1_000); });
  if (root.startsWith(join(tmpdir(), "fm013-board-smoke-"))) rmSync(root, { recursive: true, force: true });
}

const failed = results.filter(result => !result.ok);
console.log(`${results.length - failed.length}/${results.length} casos passaram`);
if (failed.length) process.exit(1);
