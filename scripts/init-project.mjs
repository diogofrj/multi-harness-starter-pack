#!/usr/bin/env node
/**
 * scripts/init-project.mjs
 *
 * Scaffolding engine para o Multi-Harness Enterprise Starter Pack.
 * Cria um novo projeto limpo, customiza os arquivos canônicos, inicializa git
 * e valida a conformidade inicial com o SafeCode Guardian.
 *
 * Uso interativo:
 *   node scripts/init-project.mjs
 *
 * Uso com flags (não interativo):
 *   node scripts/init-project.mjs --name meu-app --stack node --dest ../meu-app --desc "Descrição do app" --non-interactive
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STARTER_ROOT = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    name: '',
    stack: 'node',
    dest: '',
    desc: 'Novo serviço Fulltech',
    owner: '',
    nonInteractive: false,
    skipAudit: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--name' && args[i + 1]) options.name = args[++i];
    else if (arg === '--stack' && args[i + 1]) options.stack = args[++i];
    else if (arg === '--dest' && args[i + 1]) options.dest = args[++i];
    else if (arg === '--desc' && args[i + 1]) options.desc = args[++i];
    else if (arg === '--owner' && args[i + 1]) options.owner = args[++i];
    else if (arg === '--non-interactive') options.nonInteractive = true;
    else if (arg === '--skip-audit') options.skipAudit = true;
  }
  return options;
}

async function prompt(question, defaultValue = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const display = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
  return new Promise((resolve) => {
    rl.question(display, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

const IGNORE_PATTERNS = [
  /^\.git(\/|$)/,
  /^node_modules(\/|$)/,
  /^backlog\/tasks\/.+/,
  /^\.devtool(\/|$)/,
  /^\.claude\/\.cc-writes/,
  /^\.claude\/agent-memory/,
  /\.log$/,
  /^\.DS_Store/,
  /^package-lock\.json$/,
  /^pnpm-lock\.yaml$/,
];

function shouldIgnore(relPath) {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(relPath));
}

function copyRecursive(srcDir, destDir, currentRel = '') {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const relPath = currentRel ? `${currentRel}/${entry.name}` : entry.name;
    const destPath = path.join(destDir, relPath);

    if (shouldIgnore(relPath)) {
      continue;
    }

    if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(srcPath);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.symlinkSync(target, destPath);
    } else if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destDir, relPath);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [search, replace] of replacements) {
    content = content.replaceAll(search, replace);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

async function main() {
  const options = parseArgs();

  console.log('🚀 Fulltech Multi-Harness Enterprise Project Initializer');
  console.log('========================================================\n');

  if (!options.nonInteractive) {
    options.name = await prompt('Nome do projeto (ex: faturamento-api)', options.name || 'meu-projeto');
    options.stack = await prompt('Stack principal (node, python, go, rust)', options.stack || 'node');
    options.desc = await prompt('Descrição resumida', options.desc || 'Serviço corporativo');
    options.owner = await prompt('Owner/Repo (ex: fulltech/faturamento-api)', options.owner || `fulltech/${options.name}`);
    const defaultDest = path.resolve(STARTER_ROOT, '..', options.name);
    options.dest = await prompt('Caminho de destino', options.dest || defaultDest);
  }

  if (!options.name) {
    console.error('❌ Erro: Nome do projeto é obrigatório.');
    process.exit(1);
  }

  const destPath = path.resolve(options.dest || path.resolve(STARTER_ROOT, '..', options.name));
  const ownerRepo = options.owner || `fulltech/${options.name}`;

  console.log(`\n📁 Destino: ${destPath}`);
  console.log(`📦 Projeto: ${options.name} (${options.stack})`);
  console.log(`🏢 Repositório: ${ownerRepo}\n`);

  if (fs.existsSync(destPath)) {
    const existing = fs.readdirSync(destPath);
    if (existing.length > 0) {
      console.error(`❌ Erro: O diretório de destino "${destPath}" já existe e não está vazio.`);
      process.exit(1);
    }
  } else {
    fs.mkdirSync(destPath, { recursive: true });
  }

  console.log('⚙️  Copiando estrutura limpa do starter pack...');
  copyRecursive(STARTER_ROOT, destPath);

  console.log('📝 Customizando entrypoints e metadados...');
  const textReplacements = [
    ['multi-harness-starter-pack', options.name],
    ['<nome>', options.name],
    ['<project-name>', options.name],
    ['<owner/repo>', ownerRepo],
    ['<resultado esperado>', options.desc],
    ['<stack>', options.stack],
  ];

  const targetFiles = [
    path.join(destPath, 'AGENTS.md'),
    path.join(destPath, 'CLAUDE.md'),
    path.join(destPath, 'GEMINI.md'),
    path.join(destPath, '.github/copilot-instructions.md'),
    path.join(destPath, 'package.json'),
    path.join(destPath, 'README.md'),
    path.join(destPath, 'NOTES.md'),
  ];

  for (const file of targetFiles) {
    replaceInFile(file, textReplacements);
  }

  // Configura NOTES.md com Wave 0 inicial
  const notesPath = path.join(destPath, 'NOTES.md');
  const initialNotes = `# NOTES.md — ${options.name} (living document)

Todos os harnesses devem ler este arquivo no início de cada sessão e atualizá-lo ao concluir tarefas e waves.

## Projeto

- **Repositório:** ${ownerRepo}
- **Objetivo:** ${options.desc}
- **Stack:** ${options.stack}
- **Status:** Wave 0 — Especificação e fundação
- **Última Atualização:** ${new Date().toISOString().split('T')[0]}

## Decisões Ativas

- [x] AGENTS.md adotado como contrato canônico multi-harness.
- [x] Arquitetura em Vertical Slices + DDD definida para a stack ${options.stack}.
- [x] Spec-Driven Development obrigatório via /spec antes de implementar.
- [x] Isolamento físico de agentes via Git Worktrees (make worktree-new).
- [x] SafeCode Guardian integrado no pipeline de verificação (make audit).

## Roadmap de Ondas

| Wave | Entregável | Depende de | Status |
|------|------------|------------|--------|
| 0 | Especificação (SPEC.md), contratos OpenAPI, scaffold e CI | — | ⬜ next |
| 1 | Primeira fatia vertical (Core Domain) | 0 | ⬜ |

### Wave 0 — Especificação e arquitetura
- **Objetivo:** Escrever a especificação em \`SPEC.md\` (via \`/spec\`), definir contratos em \`docs/api/openapi.yaml\` e preparar a esteira de validação.
- **Responsável:** Coordenador
- **DoD:**
  - [ ] \`SPEC.md\` aprovado com requisitos e regras de negócio.
  - [ ] Contrato de API documentado.
  - [ ] Gates locais (\`make test\`, \`make lint\`, \`make audit\`) configurados.
`;
  // Cria a tarefa inicial no Backlog.md
  const tasksDir = path.join(destPath, 'backlog', 'tasks');
  fs.mkdirSync(tasksDir, { recursive: true });
  const task1Path = path.join(tasksDir, 'task-1 - initial-spec-and-scaffold.md');
  const initialTask = `---
id: task-1
title: Especificação e fundação inicial
status: To Do
priority: high
assignee:
  - Coordenador
labels:
  - wave-0
  - sdd
  - foundation
order: a1
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Configurar contratos base, documentar \`SPEC.md\` via Spec-Driven Development, criar contratos OpenAPI em \`docs/api/openapi.yaml\` e assegurar conformidade SafeCode Guardian Grau A.
<!-- SECTION:DESCRIPTION:END -->

## Verify
<!-- SECTION:VERIFY:BEGIN -->
- [ ] \`SPEC.md\` aprovado com regras de negócio e limites arquiteturais
- [ ] Contratos de API em \`docs/api/\` validados
- [ ] \`make audit\` executando com score >= 90 (Grau A)
<!-- SECTION:VERIFY:END -->
`;
  fs.writeFileSync(task1Path, initialTask, 'utf8');

  // Inicializa repositório Git limpo
  console.log('🌿 Inicializando repositório Git...');
  try {
    execSync('git init -b main', { cwd: destPath, stdio: 'ignore' });
    execSync('git add .', { cwd: destPath, stdio: 'ignore' });
    execSync('git commit -m "chore: initial project scaffold from multi-harness-starter-pack"', {
      cwd: destPath,
      stdio: 'ignore',
    });
    console.log('✅ Repositório Git inicializado com sucesso.');
  } catch (err) {
    console.warn('⚠️  Aviso: Não foi possível executar o commit inicial do Git:', err.message);
  }

  // Executa auditoria do SafeCode Guardian no projeto novo
  const guardianScript = '/home/ubuntu/projetos/00-Guidelines/monitor/guardian.py';
  if (!options.skipAudit && fs.existsSync(guardianScript)) {
    console.log('\n🛡️  Executando auditoria inicial do SafeCode Guardian...');
    try {
      const auditOutput = execSync(`python3 ${guardianScript} --path "${destPath}"`, {
        encoding: 'utf8',
      });
      const parsed = JSON.parse(auditOutput.trim());
      console.log(`🎯 Scorecard Inicial: ${parsed.global_score}/100 | Grau: ${parsed.grade} | Achados: ${parsed.findings}`);
      if (parsed.grade === 'A') {
        console.log('✨ Projeto 100% compliant com as diretrizes Evertec, OWASP e SDD!');
      }
    } catch (e) {
      console.warn('⚠️  Aviso: Auditoria do SafeCode Guardian não pôde ser completada:', e.message);
    }
  }

  console.log('\n========================================================');
  console.log('🎉 Projeto criado com sucesso em:');
  console.log(`   cd ${destPath}`);
  console.log('\nPróximos passos recomendados:');
  console.log('1. cd ' + destPath);
  console.log('2. make install    # Instalar dependências da stack e CLI backlog');
  console.log('3. make board-all  # Abrir Kanban Fulltech (3100) + Backlog Browser (6420)');
  console.log('4. Rode /spec no Claude Code ou /plan no Antigravity para iniciar a Wave 0!');
  console.log('========================================================\n');
}

main().catch((err) => {
  console.error('❌ Erro fatal durante a inicialização:', err);
  process.exit(1);
});
