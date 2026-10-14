#!/usr/bin/env node
/**
 * scripts/retrofit-project.mjs
 *
 * Motor de Retrofit e Adequação do Multi-Harness Enterprise Starter Pack.
 * Adequa um repositório existente sem destruir o que é dele:
 *   - arquivo que já existe nunca é sobrescrito (só com --force);
 *   - contratos existentes recebem um bloco gerenciado entre marcadores, idempotente;
 *   - .claude/settings.json é mesclado (hooks por união), não substituído;
 *   - Makefile recebe só os alvos e variáveis que faltam;
 *   - tarefas do Backlog.md são criadas pelo CLI `backlog`, nunca escritas à mão.
 *
 * Uso:
 *   node scripts/retrofit-project.mjs --target /caminho/do/projeto [--dry-run] [--skip-audit]
 *                                     [--force] [--emit-starter-copies]
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const STARTER_ROOT = path.resolve(path.dirname(__filename), '..');
const GUARDIAN_SCRIPT = process.env.SAFECODE_GUARDIAN || '/home/ubuntu/projetos/00-Guidelines/monitor/guardian.py';
const MARKER_START = '<!-- fulltech-governance:start -->';
const MARKER_END = '<!-- fulltech-governance:end -->';
const CUSTOMIZE = '[CUSTOMIZE]';

const CONTRACTS = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'RUNBOOK.md'];
const SCRIPTS_TO_COPY = [
  'board-config.mjs',
  'board-cards.mjs',
  'build-board.mjs',
  'worktree-pulse.mjs',
  'worktree-pulse-daemon.sh',
  'agent-pulse.mjs',
  'agent-pulse-hook.sh',
  'audit-report.mjs',
  'audit-gate.mjs',
];
const GOVERNANCE_TARGETS = [
  'audit', 'audit-report', 'audit-gate', 'verify',
  'board', 'backlog-browser', 'board-all', 'board-status', 'board-stop',
];
const GOVERNANCE_VARS = ['BOARD_DEFAULT_PORT', 'BOARD_PORT_VALUE', 'BACKLOG_PORT', 'TARGET'];

let report;

function parseArgs(argv) {
  const options = { target: '', dryRun: false, skipAudit: false, force: false, emitStarterCopies: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--target' && argv[i + 1]) options.target = argv[++i];
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--skip-audit') options.skipAudit = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--emit-starter-copies') options.emitStarterCopies = true;
    else if (!options.target && !arg.startsWith('--')) options.target = arg;
  }
  return options;
}

function rel(targetDir, file) {
  return path.relative(targetDir, file) || file;
}

function hasBin(name) {
  return spawnSync(name, ['--version'], { stdio: 'ignore' }).status === 0;
}

// ---------------------------------------------------------------------------
// Metadados do projeto
// ---------------------------------------------------------------------------

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function collectNodeDeps(targetDir) {
  const manifests = [path.join(targetDir, 'package.json')];
  for (const group of ['apps', 'packages']) {
    const dir = path.join(targetDir, group);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) manifests.push(path.join(dir, entry.name, 'package.json'));
    }
  }
  const deps = new Set();
  for (const manifest of manifests) {
    const pkg = readJson(manifest);
    if (!pkg) continue;
    for (const key of ['dependencies', 'devDependencies']) {
      for (const dep of Object.keys(pkg[key] || {})) deps.add(dep);
    }
  }
  return deps;
}

function pickLabels(deps, table) {
  return table.filter(([dep]) => deps.has(dep)).map(([, label]) => label);
}

function describeNodeStack(deps) {
  const frontend = pickLabels(deps, [['next', 'Next.js'], ['react', 'React'], ['vue', 'Vue'], ['svelte', 'Svelte'], ['@angular/core', 'Angular']]);
  const server = pickLabels(deps, [['@nestjs/core', 'NestJS'], ['fastify', 'Fastify'], ['express', 'Express'], ['hono', 'Hono']]);
  const data = pickLabels(deps, [['pg', 'PostgreSQL'], ['postgres', 'PostgreSQL'], ['mysql2', 'MySQL'], ['mongodb', 'MongoDB'], ['mongoose', 'MongoDB'], ['drizzle-orm', 'Drizzle'], ['@prisma/client', 'Prisma']]);
  const runtime = deps.has('typescript') ? 'Node.js + TypeScript' : 'Node.js';
  return {
    backend: [runtime, ...server].join(' + '),
    frontend: frontend.length ? [...new Set(frontend)].join(' + ') : CUSTOMIZE,
    data: data.length ? [...new Set(data)].join(' + ') : CUSTOMIZE,
  };
}

function describePythonStack(targetDir) {
  const text = ['pyproject.toml', 'requirements.txt']
    .map((f) => path.join(targetDir, f))
    .filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, 'utf8').toLowerCase())
    .join('\n');
  const has = (word) => text.includes(word);
  const server = [['fastapi', 'FastAPI'], ['django', 'Django'], ['flask', 'Flask']].filter(([w]) => has(w)).map(([, l]) => l);
  const data = [['psycopg', 'PostgreSQL'], ['sqlalchemy', 'SQLAlchemy'], ['pymongo', 'MongoDB']].filter(([w]) => has(w)).map(([, l]) => l);
  return {
    backend: ['Python', ...server].join(' + '),
    frontend: CUSTOMIZE,
    data: data.length ? data.join(' + ') : CUSTOMIZE,
  };
}

function detectProjectMetadata(targetDir) {
  const meta = {
    name: path.basename(targetDir),
    stack: CUSTOMIZE,
    desc: CUSTOMIZE,
    owner: CUSTOMIZE,
    backend: CUSTOMIZE,
    frontend: CUSTOMIZE,
    data: CUSTOMIZE,
  };

  const pkg = readJson(path.join(targetDir, 'package.json'));
  if (pkg) {
    if (pkg.name) meta.name = pkg.name;
    if (pkg.description) meta.desc = pkg.description;
    meta.stack = 'node';
    Object.assign(meta, describeNodeStack(collectNodeDeps(targetDir)));
  } else if (fs.existsSync(path.join(targetDir, 'pyproject.toml')) || fs.existsSync(path.join(targetDir, 'requirements.txt'))) {
    meta.stack = 'python';
    Object.assign(meta, describePythonStack(targetDir));
  } else if (fs.existsSync(path.join(targetDir, 'go.mod'))) {
    Object.assign(meta, { stack: 'go', backend: 'Go' });
  } else if (fs.existsSync(path.join(targetDir, 'Cargo.toml'))) {
    Object.assign(meta, { stack: 'rust', backend: 'Rust' });
  }

  try {
    const remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
      cwd: targetDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const match = remote.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (match) meta.owner = match[1];
  } catch {
    // sem remote: owner fica [CUSTOMIZE]
  }
  return meta;
}

function renderTemplate(content, meta) {
  return content
    .replace(/^(- \*\*Backend:\*\*) <stack>$/m, `$1 ${meta.backend}`)
    .replace(/^(- \*\*Frontend:\*\*) <stack>$/m, `$1 ${meta.frontend}`)
    .replace(/^(- \*\*Banco \/ Infra:\*\*) <stack>$/m, `$1 ${meta.data}`)
    .replaceAll('multi-harness-starter-pack', meta.name)
    .replaceAll('<nome>', meta.name)
    .replaceAll('<project-name>', meta.name)
    .replaceAll('<owner/repo>', meta.owner)
    .replaceAll('<stack>', meta.stack)
    .replaceAll('<resultado esperado>', meta.desc);
}

// ---------------------------------------------------------------------------
// Escrita não destrutiva
// ---------------------------------------------------------------------------

/** Grava `content` em `dest` sem nunca sobrescrever conteúdo diferente, salvo --force. */
function writeNoClobber(content, dest, opts, mode) {
  const label = rel(opts.targetDir, dest);
  if (fs.existsSync(dest)) {
    const current = fs.readFileSync(dest);
    if (Buffer.compare(current, Buffer.from(content)) === 0) return 'identical';
    if (!opts.force) {
      report.preserved.push(label);
      if (opts.emitStarterCopies && !opts.dryRun) fs.writeFileSync(`${dest}.starter`, content);
      return 'preserved';
    }
    report.updated.push(`${label} (--force)`);
  } else {
    report.created.push(label);
  }
  if (!opts.dryRun) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
    if (mode !== undefined) fs.chmodSync(dest, mode);
  }
  return 'written';
}

function copyNoClobber(src, dest, opts) {
  return writeNoClobber(fs.readFileSync(src), dest, opts, fs.statSync(src).mode & 0o777);
}

function copyDirNoClobber(srcDir, destDir, opts) {
  if (!fs.existsSync(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirNoClobber(srcPath, destPath, opts);
    } else if (entry.isSymbolicLink()) {
      if (fs.existsSync(destPath) || isSymlink(destPath)) {
        report.preserved.push(rel(opts.targetDir, destPath));
        continue;
      }
      report.created.push(rel(opts.targetDir, destPath));
      if (!opts.dryRun) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.symlinkSync(fs.readlinkSync(srcPath), destPath);
      }
    } else if (entry.isFile()) {
      copyNoClobber(srcPath, destPath, opts);
    }
  }
}

function isSymlink(file) {
  try {
    return fs.lstatSync(file).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Insere ou atualiza o bloco gerenciado entre marcadores; o resto do arquivo fica intacto. */
function upsertManagedBlock(file, body, position, opts) {
  const block = `${MARKER_START}\n${body.trim()}\n${MARKER_END}`;
  const existing = fs.readFileSync(file, 'utf8');
  const start = existing.indexOf(MARKER_START);
  const end = existing.indexOf(MARKER_END);
  let next;
  if (start !== -1 && end > start) {
    next = existing.slice(0, start) + block + existing.slice(end + MARKER_END.length);
  } else if (position === 'top') {
    next = `${block}\n\n${existing}`;
  } else {
    next = `${existing.replace(/\s*$/, '')}\n\n${block}\n`;
  }
  if (next === existing) return;
  report.updated.push(`${rel(opts.targetDir, file)} (bloco gerenciado)`);
  if (!opts.dryRun) fs.writeFileSync(file, next, 'utf8');
}

// ---------------------------------------------------------------------------
// Contratos e NOTES.md
// ---------------------------------------------------------------------------

const AGENTS_BLOCK = `
## Governança Fulltech (starter pack)
- Skills do starter pack em \`.claude/skills/\`, espelhadas em \`.agents/skills/\` para os outros harnesses.
- Segurança: \`make audit\` e \`make audit-report\` (SafeCode Guardian); \`make audit-gate\` falha com Red Flag aberta.
- \`make verify\` roda o gate do projeto (\`ci\` se existir, senão \`test\`) e o \`audit-gate\`. Verde só com os dois executados.
- Falso positivo do scanner: \`safecode-ignore <REGRA>: <motivo>\` na linha, ou \`safecode-ignore-file <REGRA>: <motivo>\` no topo do arquivo. Nunca reescrever código só para calar o scanner.
- Backlog.md sempre pelo CLI \`backlog\`; board em \`make board\` e \`make backlog-browser\`.
`;

const NOTES_BLOCK = `
## Governança Multi-Harness & SafeCode Guardian
- **Contrato Canônico:** [AGENTS.md](AGENTS.md) adotado como fonte de autoridade comum.
- **Regra de Ouro:** \`1 Tarefa = 1 Branch (feat/task-X-...) = 1 Worktree = 1 PR = 1 Contexto\`.
- **Auditoria de Segurança:** \`make audit\` (Evertec 13, OWASP Top 10, SDD); \`make verify\` = gate do projeto + Red Flags.
- **Kanban & Backlog:** Backlog.md via CLI \`backlog\` (\`make board\`, \`make backlog-browser\`).
`;

function syncContracts(meta, opts) {
  for (const contract of CONTRACTS) {
    const src = path.join(STARTER_ROOT, contract);
    const dest = path.join(opts.targetDir, contract);
    if (!fs.existsSync(src)) continue;
    if (!fs.existsSync(dest)) {
      writeNoClobber(renderTemplate(fs.readFileSync(src, 'utf8'), meta), dest, opts);
    } else if (contract === 'AGENTS.md') {
      upsertManagedBlock(dest, AGENTS_BLOCK, 'bottom', opts);
    } else {
      report.preserved.push(contract);
    }
  }

  const notes = path.join(opts.targetDir, 'NOTES.md');
  if (fs.existsSync(notes)) {
    upsertManagedBlock(notes, NOTES_BLOCK, 'top', opts);
  } else {
    const starterNotes = renderTemplate(fs.readFileSync(path.join(STARTER_ROOT, 'NOTES.md'), 'utf8'), meta);
    writeNoClobber(`${MARKER_START}\n${NOTES_BLOCK.trim()}\n${MARKER_END}\n\n${starterNotes}`, notes, opts);
  }

  copyNoClobber(
    path.join(STARTER_ROOT, '.github', 'copilot-instructions.md'),
    path.join(opts.targetDir, '.github', 'copilot-instructions.md'),
    opts,
  );
}

// ---------------------------------------------------------------------------
// .claude/settings.json: merge, nunca cópia
// ---------------------------------------------------------------------------

function hookCommands(settings, event) {
  const commands = new Set();
  for (const [name, entries] of Object.entries(settings.hooks || {})) {
    if (event && name !== event) continue;
    for (const entry of entries) for (const hook of entry.hooks || []) commands.add(hook.command);
  }
  return commands;
}

/** Une hooks do starter aos do projeto (dedupe por comando dentro de cada evento) e acrescenta só os deny de leitura de segredo. */
export function mergeSettings(project, starter) {
  const merged = structuredClone(project);
  const suggestions = [];

  merged.hooks = merged.hooks || {};
  for (const [event, entries] of Object.entries(starter.hooks || {})) {
    const known = hookCommands(project, event);
    merged.hooks[event] = merged.hooks[event] || [];
    for (const entry of entries) {
      const missing = (entry.hooks || []).filter((hook) => !known.has(hook.command));
      if (missing.length === 0) continue;
      const sameMatcher = merged.hooks[event].find((e) => (e.matcher ?? null) === (entry.matcher ?? null));
      if (sameMatcher) sameMatcher.hooks = [...(sameMatcher.hooks || []), ...missing];
      else merged.hooks[event].push({ ...entry, hooks: missing });
      for (const hook of missing) known.add(hook.command);
    }
    if (merged.hooks[event].length === 0) delete merged.hooks[event];
  }

  const starterDeny = starter.permissions?.deny || [];
  const projectDeny = new Set(project.permissions?.deny || []);
  const readDeny = starterDeny.filter((rule) => rule.startsWith('Read(') && !projectDeny.has(rule));
  if (readDeny.length) {
    merged.permissions = merged.permissions || {};
    merged.permissions.deny = [...(merged.permissions.deny || []), ...readDeny];
  }

  for (const kind of ['allow', 'ask', 'deny']) {
    const current = new Set(project.permissions?.[kind] || []);
    for (const rule of starter.permissions?.[kind] || []) {
      if (!current.has(rule) && !(kind === 'deny' && rule.startsWith('Read('))) suggestions.push(`permissions.${kind}: ${rule}`);
    }
  }
  for (const key of Object.keys(starter)) {
    if (key === '$schema' && !(key in merged)) merged[key] = starter[key];
    else if (!['hooks', 'permissions', '$schema'].includes(key) && JSON.stringify(project[key]) !== JSON.stringify(starter[key])) {
      suggestions.push(`${key} (valor do starter difere do projeto)`);
    }
  }
  return { merged, suggestions };
}

function syncSettings(opts) {
  const src = path.join(STARTER_ROOT, '.claude', 'settings.json');
  const dest = path.join(opts.targetDir, '.claude', 'settings.json');
  if (!fs.existsSync(dest)) {
    copyNoClobber(src, dest, opts);
    return;
  }
  const project = readJson(dest);
  if (!project) {
    report.warnings.push('.claude/settings.json existente não é JSON válido; preservado sem merge.');
    report.preserved.push('.claude/settings.json');
    return;
  }
  const { merged, suggestions } = mergeSettings(project, readJson(src));
  const next = `${JSON.stringify(merged, null, 2)}\n`;
  if (next !== `${JSON.stringify(project, null, 2)}\n`) {
    report.updated.push('.claude/settings.json (merge de hooks e deny de leitura)');
    if (!opts.dryRun) fs.writeFileSync(dest, next, 'utf8');
  }
  if (suggestions.length) {
    report.warnings.push(`settings.json: ${suggestions.length} item(ns) do starter não aplicados (revise à mão):\n      - ${suggestions.join('\n      - ')}`);
  }
}

/** Todo hook registrado precisa existir, e todo scripts/<x> que um hook chama também. */
function checkHookDependencies(opts) {
  const settings = readJson(path.join(opts.targetDir, '.claude', 'settings.json'));
  if (!settings) return;
  for (const command of hookCommands(settings)) {
    const file = command.replace(/^node\s+/, '').split(/\s+/)[0].replace('${CLAUDE_PROJECT_DIR}', opts.targetDir);
    if (!file.startsWith(opts.targetDir)) continue;
    if (!fs.existsSync(file)) {
      report.warnings.push(`hook registrado sem arquivo: ${rel(opts.targetDir, file)}`);
      continue;
    }
    const refs = fs.readFileSync(file, 'utf8').match(/scripts\/[\w.-]+\.(?:sh|mjs|js|py)/g) || [];
    for (const ref of new Set(refs)) {
      if (!fs.existsSync(path.join(opts.targetDir, ref))) {
        report.warnings.push(`${rel(opts.targetDir, file)} chama ${ref}, ausente no projeto`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Makefile: só o que falta
// ---------------------------------------------------------------------------

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasMakeTarget(content, target) {
  return new RegExp(`^${escapeRegExp(target)}\\s*:(?!=)`, 'm').test(content);
}

function hasMakeVar(content, name) {
  return new RegExp(`^${name}\\s*[:?+]?=`, 'm').test(content);
}

function extractMakeTarget(makefile, target) {
  const lines = makefile.split('\n');
  const start = lines.findIndex((line) => new RegExp(`^${escapeRegExp(target)}\\s*:(?!=)`).test(line));
  if (start === -1) return null;
  const block = [];
  for (let i = start; i < lines.length && lines[i].trim() !== ''; i++) block.push(lines[i]);
  return block.join('\n');
}

function extractMakeVar(makefile, name) {
  const line = makefile.split('\n').find((l) => new RegExp(`^${name}\\s*[:?]?=`).test(l));
  return line ? line.replace(/\s*[:?]?=\s*/, ' ?= ') : null;
}

export function buildMakefileAddition(existing, starterMakefile) {
  const targets = GOVERNANCE_TARGETS.filter((t) => !hasMakeTarget(existing, t));
  if (targets.length === 0) return { targets, text: '' };
  const vars = GOVERNANCE_VARS.filter((v) => !hasMakeVar(existing, v))
    .map((v) => extractMakeVar(starterMakefile, v))
    .filter(Boolean);
  const blocks = targets.map((t) => extractMakeTarget(starterMakefile, t)).filter(Boolean);
  const text = [
    '',
    '# ==============================================================================',
    '# Fulltech Multi-Harness Governance & SafeCode Guardian Targets',
    '# ==============================================================================',
    `.PHONY: ${targets.join(' ')}`,
    '',
    ...(vars.length ? [...vars, ''] : []),
    blocks.join('\n\n'),
    '',
  ].join('\n');
  return { targets, text };
}

function syncMakefile(opts) {
  const makefilePath = path.join(opts.targetDir, 'Makefile');
  const starterMakefilePath = path.join(STARTER_ROOT, 'Makefile');
  if (!fs.existsSync(makefilePath)) {
    copyNoClobber(starterMakefilePath, makefilePath, opts);
    return;
  }
  const existing = fs.readFileSync(makefilePath, 'utf8');
  const { targets, text } = buildMakefileAddition(existing, fs.readFileSync(starterMakefilePath, 'utf8'));
  if (targets.length === 0) return;
  report.updated.push(`Makefile (+ ${targets.join(', ')})`);
  if (!opts.dryRun) fs.appendFileSync(makefilePath, `\n${text}`, 'utf8');
}

// ---------------------------------------------------------------------------
// Skills, scripts, backlog
// ---------------------------------------------------------------------------

function syncSkills(opts) {
  copyDirNoClobber(path.join(STARTER_ROOT, '.claude', 'skills'), path.join(opts.targetDir, '.claude', 'skills'), opts);
  const skillsDir = path.join(opts.targetDir, '.claude', 'skills');
  if (opts.dryRun || !fs.existsSync(skillsDir)) return;
  const agentsSkillsDir = path.join(opts.targetDir, '.agents', 'skills');
  fs.mkdirSync(agentsSkillsDir, { recursive: true });
  for (const skill of fs.readdirSync(skillsDir)) {
    const link = path.join(agentsSkillsDir, skill);
    if (fs.existsSync(link) || isSymlink(link)) continue;
    fs.symlinkSync(`../../.claude/skills/${skill}`, link);
    report.created.push(rel(opts.targetDir, link));
  }
}

function syncBacklog(meta, opts) {
  const backlogDir = path.join(opts.targetDir, 'backlog');
  if (!fs.existsSync(path.join(backlogDir, 'config.yml'))) {
    if (hasBin('backlog')) {
      report.created.push('backlog/ (backlog init)');
      if (!opts.dryRun) {
        execFileSync('backlog', ['init', meta.name, '--defaults', '--integration-mode', 'cli', '--agent-instructions', 'none'], {
          cwd: opts.targetDir, stdio: 'ignore',
        });
      }
    } else {
      report.warnings.push('CLI `backlog` ausente: rode `backlog init <nome> --defaults --integration-mode cli --agent-instructions none` no projeto.');
    }
  }
  copyNoClobber(path.join(STARTER_ROOT, 'backlog', 'harness-models.json'), path.join(backlogDir, 'harness-models.json'), opts);
}

function syncScripts(opts) {
  for (const script of SCRIPTS_TO_COPY) {
    const src = path.join(STARTER_ROOT, 'scripts', script);
    if (fs.existsSync(src)) copyNoClobber(src, path.join(opts.targetDir, 'scripts', script), opts);
  }
  copyNoClobber(path.join(STARTER_ROOT, 'server.mjs'), path.join(opts.targetDir, 'server.mjs'), opts);
}

function syncVsCodeExtensions(opts) {
  const extFile = path.join(opts.targetDir, '.vscode', 'extensions.json');
  const targetExt = 'ysamlan.vscode-backlog-md';
  if (!fs.existsSync(extFile)) {
    writeNoClobber(`${JSON.stringify({ recommendations: [targetExt] }, null, 2)}\n`, extFile, opts);
    return;
  }
  const data = readJson(extFile);
  if (!data) {
    report.warnings.push('.vscode/extensions.json não é JSON válido; preservado.');
    return;
  }
  data.recommendations = data.recommendations || [];
  if (data.recommendations.includes(targetExt)) return;
  data.recommendations.push(targetExt);
  report.updated.push('.vscode/extensions.json');
  if (!opts.dryRun) fs.writeFileSync(extFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

// ---------------------------------------------------------------------------
// Auditoria e tarefa de remediação
// ---------------------------------------------------------------------------

function runAudit(opts) {
  if (!fs.existsSync(GUARDIAN_SCRIPT)) {
    report.warnings.push(`SafeCode Guardian não encontrado em ${GUARDIAN_SCRIPT}; auditoria pulada.`);
    return null;
  }
  try {
    const output = execFileSync('python3', [GUARDIAN_SCRIPT, '--path', opts.targetDir], { encoding: 'utf8' });
    return JSON.parse(output.trim().split('\n').pop());
  } catch (err) {
    report.warnings.push(`Auditoria automática falhou: ${err.message}`);
    return null;
  }
}

function remediationTaskExists(targetDir) {
  const tasksDir = path.join(targetDir, 'backlog', 'tasks');
  if (!fs.existsSync(tasksDir)) return false;
  return fs.readdirSync(tasksDir).some((file) => file.endsWith('.md')
    && /^title:.*SafeCode Guardian/m.test(fs.readFileSync(path.join(tasksDir, file), 'utf8')));
}

function createRemediationTask(audit, opts) {
  const failed = Object.entries(audit.red_flags || {}).filter(([, status]) => status !== 'passed').map(([rf]) => rf);
  if (failed.length === 0 || opts.dryRun) return;
  if (remediationTaskExists(opts.targetDir)) {
    console.log('  ✅ Tarefa de remediação do SafeCode Guardian já existe no backlog.');
    return;
  }
  const title = 'Remediar Red Flags do SafeCode Guardian';
  const args = [
    'task', 'create', title,
    '-d', `Red Flags abertas: ${failed.join(', ')}. Detalhes em make audit-report. Falso positivo leva safecode-ignore com motivo, não reescrita de código.`,
    '-l', 'security,safecode', '--priority', 'high', '--plain',
    ...failed.flatMap((rf) => ['--ac', `${rf} fechada no make audit-gate`]),
  ];
  if (!hasBin('backlog') || !fs.existsSync(path.join(opts.targetDir, 'backlog', 'config.yml'))) {
    report.warnings.push(`Crie a tarefa de remediação com: backlog ${args.map((a) => JSON.stringify(a)).join(' ')}`);
    return;
  }
  execFileSync('backlog', args, { cwd: opts.targetDir, stdio: 'ignore' });
  report.created.push(`backlog: tarefa "${title}"`);
}

// ---------------------------------------------------------------------------

function printReport() {
  const section = (icon, title, items) => {
    if (!items.length) return;
    console.log(`\n${icon} ${title} (${items.length}):`);
    for (const item of items) console.log(`   - ${item}`);
  };
  section('➕', 'Criados', report.created);
  section('📝', 'Atualizados', report.updated);
  section('⏭️ ', 'Preservados (já existiam; use --emit-starter-copies para comparar)', report.preserved);
  section('⚠️ ', 'Atenção', report.warnings);
}

export async function main(argv = process.argv.slice(2)) {
  report = { created: [], preserved: [], updated: [], warnings: [] };
  const options = parseArgs(argv);
  if (!options.target) {
    console.error('❌ Especifique o repositório alvo: node scripts/retrofit-project.mjs --target <caminho>');
    return 1;
  }
  const targetDir = path.resolve(options.target);
  if (!fs.existsSync(targetDir)) {
    console.error(`❌ O diretório "${targetDir}" não existe.`);
    return 1;
  }
  if (targetDir === STARTER_ROOT) {
    console.error('❌ O alvo é o próprio starter pack.');
    return 1;
  }
  const opts = { ...options, targetDir };
  const meta = detectProjectMetadata(targetDir);

  console.log('🛠️  FULLTECH MULTI-HARNESS RETROFIT ENGINE');
  console.log(`📁 ${targetDir}  📦 ${meta.name} (${meta.stack})`);
  if (opts.dryRun) console.log('⚠️  DRY-RUN: nada será gravado.');
  if (opts.force) console.log('⚠️  --force: arquivos existentes diferentes serão sobrescritos.');

  syncContracts(meta, opts);
  copyDirNoClobber(path.join(STARTER_ROOT, '.claude', 'hooks'), path.join(targetDir, '.claude', 'hooks'), opts);
  syncSettings(opts);
  copyDirNoClobber(path.join(STARTER_ROOT, 'rules'), path.join(targetDir, 'rules'), opts);
  copyDirNoClobber(path.join(STARTER_ROOT, '.claude', 'rules'), path.join(targetDir, '.claude', 'rules'), opts);
  syncSkills(opts);
  syncBacklog(meta, opts);
  syncScripts(opts);
  syncVsCodeExtensions(opts);
  syncMakefile(opts);
  if (!opts.dryRun) checkHookDependencies(opts);

  if (!opts.skipAudit) {
    const audit = runAudit(opts);
    if (audit) {
      console.log(`\n🎯 SafeCode Guardian: ${audit.global_score}/100, grau ${audit.grade}, ${audit.findings} achados`);
      createRemediationTask(audit, opts);
    }
  }

  printReport();
  console.log('\nPróximos passos: git diff no alvo, make audit-report, make verify.');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().then((code) => process.exit(code), (err) => {
    console.error('❌ Erro fatal durante o retrofit:', err);
    process.exit(1);
  });
}
