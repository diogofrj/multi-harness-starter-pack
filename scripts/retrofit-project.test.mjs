// Testes do motor de retrofit: nada do projeto alvo pode ser destruído e rodar duas vezes não muda nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { main, mergeSettings, buildMakefileAddition } from './retrofit-project.mjs';

const ORIGINAL = {
  'package.json': JSON.stringify({
    name: 'fixture-app',
    dependencies: { next: '15.0.0', pg: '8.0.0', 'drizzle-orm': '0.30.0' },
    devDependencies: { typescript: '5.0.0' },
  }),
  'AGENTS.md': '# Fixture agents\n\n- Coordenador: argus\n',
  'CLAUDE.md': '# Fixture claude\n\nRegras próprias do projeto.\n',
  'GEMINI.md': '# Fixture gemini\n',
  'NOTES.md': '# Notes\n\nHistórico que não pode sumir.\n',
  '.claude/settings.json': JSON.stringify({
    permissions: { allow: ['Bash(make ci:*)'], deny: ['Read(**/.env)'] },
    hooks: {
      PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-bash-guard.sh' }] }],
    },
  }, null, 2),
  '.claude/hooks/pre-bash-guard.sh': '#!/usr/bin/env bash\nexit 0\n',
  '.claude/hooks/post-edit-format.sh': '#!/usr/bin/env bash\n# versão do projeto\nexit 0\n',
  '.claude/skills/security-check/SKILL.md': '---\nname: security-check\n---\nversão do projeto\n',
  'Makefile': 'ci: ## gate do projeto\n\t@echo ci\n\naudit: ## auditoria própria\n\t@echo own audit\n',
  'backlog/config.yml': 'project_name: "fixture"\n',
};

function makeFixture(files = ORIGINAL) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retrofit-fixture-'));
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return dir;
}

function snapshot(dir) {
  const out = {};
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = path.relative(dir, full);
      if (entry.isSymbolicLink()) out[rel] = `-> ${fs.readlinkSync(full)}`;
      else if (entry.isDirectory()) walk(full);
      else out[rel] = fs.readFileSync(full, 'utf8');
    }
  };
  walk(dir);
  return out;
}

async function retrofit(dir, ...flags) {
  const log = console.log;
  console.log = () => {};
  try {
    return await main(['--target', dir, '--skip-audit', ...flags]);
  } finally {
    console.log = log;
  }
}

test('preserva contratos, hooks e skills do projeto', async () => {
  const dir = makeFixture();
  assert.equal(await retrofit(dir), 0);
  const read = (rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

  assert.equal(read('CLAUDE.md'), ORIGINAL['CLAUDE.md']);
  assert.equal(read('GEMINI.md'), ORIGINAL['GEMINI.md']);
  assert.equal(read('.claude/hooks/post-edit-format.sh'), ORIGINAL['.claude/hooks/post-edit-format.sh']);
  assert.equal(read('.claude/skills/security-check/SKILL.md'), ORIGINAL['.claude/skills/security-check/SKILL.md']);

  const agents = read('AGENTS.md');
  assert.ok(agents.startsWith(ORIGINAL['AGENTS.md'].trimEnd()));
  assert.equal(agents.split('fulltech-governance:start').length - 1, 1);

  const notes = read('NOTES.md');
  assert.ok(notes.startsWith('<!-- fulltech-governance:start -->'));
  assert.ok(notes.includes(ORIGINAL['NOTES.md']));
});

test('rodar duas vezes não altera nada (idempotente)', async () => {
  const dir = makeFixture();
  await retrofit(dir);
  const first = snapshot(dir);
  await retrofit(dir);
  assert.deepEqual(snapshot(dir), first);
});

test('--dry-run não grava nada', async () => {
  const dir = makeFixture();
  const before = snapshot(dir);
  await retrofit(dir, '--dry-run');
  assert.deepEqual(snapshot(dir), before);
});

test('settings.json: une hooks e mantém permissões do projeto', async () => {
  const dir = makeFixture();
  await retrofit(dir);
  const settings = JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8'));
  const commands = Object.values(settings.hooks).flat().flatMap((e) => e.hooks.map((h) => h.command));

  assert.ok(commands.includes('${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-bash-guard.sh'));
  assert.ok(commands.some((c) => c.endsWith('block-secrets.sh')));
  assert.equal(new Set(commands).size, commands.length, 'hook duplicado');
  assert.deepEqual(settings.permissions.allow, ['Bash(make ci:*)']);
  assert.ok(settings.permissions.deny.includes('Read(**/.env)'));
  assert.ok(settings.permissions.deny.every((rule) => rule.startsWith('Read(')), 'deny de Bash não pode entrar sem revisão');
});

test('mergeSettings não duplica hook já registrado em outro matcher', () => {
  const cmd = '${CLAUDE_PROJECT_DIR}/.claude/hooks/x.sh';
  const project = { hooks: { PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: cmd }] }] } };
  const starter = { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: cmd }] }] } };
  assert.deepEqual(mergeSettings(project, starter).merged.hooks, project.hooks);
});

test('Makefile: injeta só alvos ausentes e verify não é verde falso', async () => {
  const dir = makeFixture();
  await retrofit(dir);
  const makefile = fs.readFileSync(path.join(dir, 'Makefile'), 'utf8');

  assert.ok(makefile.startsWith(ORIGINAL.Makefile));
  assert.equal(makefile.match(/^audit\s*:/gm).length, 1);
  assert.match(makefile, /^audit-gate\s*:/m);
  assert.match(makefile, /^verify\s*:[\s\S]*audit-gate/m);
  assert.doesNotMatch(makefile, /conclu[ií]da com sucesso/);
});

test('buildMakefileAddition não repete variável já definida', () => {
  const starter = 'BACKLOG_PORT ?= 6420\nTARGET ?= $(CURDIR)\n\nboard-all: ## x\n\t@echo all\n';
  const { text } = buildMakefileAddition('TARGET := .\n', starter);
  assert.match(text, /^BACKLOG_PORT \?= 6420$/m);
  assert.doesNotMatch(text, /^TARGET/m);
});

test('hooks instalados têm os scripts de que dependem', async () => {
  const dir = makeFixture();
  await retrofit(dir);
  const hooksDir = path.join(dir, '.claude/hooks');
  for (const hook of fs.readdirSync(hooksDir)) {
    const refs = fs.readFileSync(path.join(hooksDir, hook), 'utf8').match(/scripts\/[\w.-]+\.(?:sh|mjs|js|py)/g) || [];
    for (const ref of refs) assert.ok(fs.existsSync(path.join(dir, ref)), `${hook} depende de ${ref}`);
  }
});

test('CLAUDE.md gerado descreve a stack real, sem repetir o mesmo valor', async () => {
  const { 'CLAUDE.md': _omit, ...files } = ORIGINAL;
  const dir = makeFixture(files);
  await retrofit(dir);
  const claude = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(claude, /^- \*\*Backend:\*\* Node\.js \+ TypeScript$/m);
  assert.match(claude, /^- \*\*Frontend:\*\* Next\.js$/m);
  assert.match(claude, /^- \*\*Banco \/ Infra:\*\* PostgreSQL \+ Drizzle$/m);
});
