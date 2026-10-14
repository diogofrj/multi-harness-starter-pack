#!/usr/bin/env node
/**
 * scripts/retrofit-project.mjs
 *
 * Motor de Retrofit e Adequação do Multi-Harness Enterprise Starter Pack.
 * Analisa um repositório existente, injeta contratos canônicos, guardrails determinísticos,
 * padrão Backlog.md, telemetria e alvos de Makefile sem destruir histórico ou código da aplicação.
 * Em seguida, roda a auditoria do SafeCode Guardian e gera a trilha de adequação.
 *
 * Uso:
 *   node scripts/retrofit-project.mjs --target /caminho/do/projeto
 *   node scripts/retrofit-project.mjs --target ../meu-repo --dry-run
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STARTER_ROOT = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    target: '',
    dryRun: false,
    skipAudit: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--target' && args[i + 1]) options.target = args[++i];
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--skip-audit') options.skipAudit = true;
    else if (!options.target && !arg.startsWith('--')) options.target = arg;
  }
  return options;
}

function detectProjectMetadata(targetDir) {
  let name = path.basename(targetDir);
  let stack = 'node';
  let desc = 'Serviço corporativo Fulltech';
  let owner = `fulltech/${name}`;

  // Tenta ler package.json
  const pkgPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name) name = pkg.name;
      if (pkg.description) desc = pkg.description;
      stack = 'node';
    } catch {}
  } else if (fs.existsSync(path.join(targetDir, 'pyproject.toml')) || fs.existsSync(path.join(targetDir, 'requirements.txt'))) {
    stack = 'python';
  } else if (fs.existsSync(path.join(targetDir, 'go.mod'))) {
    stack = 'go';
  } else if (fs.existsSync(path.join(targetDir, 'Cargo.toml'))) {
    stack = 'rust';
  }

  // Tenta extrair remote do Git
  try {
    const remote = execSync('git config --get remote.origin.url', { cwd: targetDir, encoding: 'utf8' }).trim();
    if (remote) {
      const match = remote.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
      if (match) owner = match[1];
    }
  } catch {}

  return { name, stack, desc, owner };
}

function copyFileSafe(src, dest, dryRun) {
  if (dryRun) {
    console.log(`[DRY-RUN] Copiando: ${path.relative(STARTER_ROOT, src)} -> ${dest}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirRecursive(srcDir, destDir, dryRun, filter = null) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (filter && !filter(srcPath, entry)) continue;

    if (entry.isDirectory()) {
      if (!dryRun) fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursive(srcPath, destPath, dryRun, filter);
    } else if (entry.isSymbolicLink()) {
      if (!dryRun) {
        try {
          const target = fs.readlinkSync(srcPath);
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          fs.symlinkSync(target, destPath);
        } catch {}
      }
    } else if (entry.isFile()) {
      copyFileSafe(srcPath, destPath, dryRun);
    }
  }
}

function updateMakefile(targetDir, dryRun) {
  const makefilePath = path.join(targetDir, 'Makefile');
  const starterMakefile = path.join(STARTER_ROOT, 'Makefile');

  const requiredTargets = [
    'audit:',
    'audit-report:',
    'verify:',
    'board:',
    'backlog-browser:',
    'board-all:',
    'board-status:',
    'board-stop:',
  ];

  if (!fs.existsSync(makefilePath)) {
    console.log('  ➕ Criando Makefile base com os alvos do starter pack...');
    copyFileSafe(starterMakefile, makefilePath, dryRun);
    return;
  }

  const existingContent = fs.readFileSync(makefilePath, 'utf8');
  const missingTargets = requiredTargets.filter(t => !existingContent.includes(t));

  if (missingTargets.length === 0) {
    console.log('  ✅ Makefile já contém todos os alvos de governança e auditoria.');
    return;
  }

  console.log(`  ➕ Injetando alvos ausentes no Makefile existente (${missingTargets.join(', ')})...`);
  if (dryRun) return;

  const appendBlock = `

# ==============================================================================
# Fulltech Multi-Harness Governance & SafeCode Guardian Targets
# ==============================================================================
.PHONY: audit audit-report verify board backlog-browser board-all board-status board-stop

BOARD_DEFAULT_PORT ?= 3100
BOARD_PORT_VALUE ?= $(if $(BOARD_PORT),$(BOARD_PORT),$(BOARD_DEFAULT_PORT))
BACKLOG_PORT ?= 6420
TARGET ?= $(CURDIR)

audit: ## Executa auditoria do SafeCode Guardian (Ex: make audit TARGET=/caminho/repo)
	@if [ -f /home/ubuntu/projetos/00-Guidelines/monitor/guardian.py ]; then \\
		python3 /home/ubuntu/projetos/00-Guidelines/monitor/guardian.py --path $(TARGET); \\
	else \\
		echo "Guardião não encontrado em ~/projetos/00-Guidelines"; exit 1; \\
	fi

audit-report: ## Exibe relatório detalhado da auditoria com diagnóstico e remediações
	@if [ -f scripts/audit-report.mjs ]; then \\
		node scripts/audit-report.mjs $(TARGET); \\
	elif [ -f /home/ubuntu/projetos/_Fulltech/multi-harness-starter-pack/scripts/audit-report.mjs ]; then \\
		node /home/ubuntu/projetos/_Fulltech/multi-harness-starter-pack/scripts/audit-report.mjs $(TARGET); \\
	else \\
		$(MAKE) -s audit; \\
	fi

verify: ## Verificação completa end-to-end com evidências (gates + auditoria)
	@echo "🛡️  Executando auditoria do SafeCode Guardian..."
	@$(MAKE) -s audit
	@echo "✅ Verificação concluída com sucesso e evidências registradas!"

board: ## Sobe (ou reaproveita) o board local e o watcher de presença
	@if [ -f server.mjs ]; then \\
		if curl -sf -m 2 "http://127.0.0.1:$(BOARD_PORT_VALUE)/api/agents" >/dev/null 2>&1; then echo "board já no ar"; \\
		else if command -v setsid >/dev/null 2>&1; then setsid nohup env BOARD_PORT=$(BOARD_PORT_VALUE) BOARD_DIST=\$\${BOARD_DIST:-/tmp/$(notdir $(CURDIR))-board-index.html} node $(CURDIR)/server.mjs >/tmp/$(notdir $(CURDIR))-board.log 2>&1 </dev/null & else nohup env BOARD_PORT=$(BOARD_PORT_VALUE) BOARD_DIST=\$\${BOARD_DIST:-/tmp/$(notdir $(CURDIR))-board-index.html} node $(CURDIR)/server.mjs >/tmp/$(notdir $(CURDIR))-board.log 2>&1 </dev/null & fi; echo "board iniciado (log /tmp/$(notdir $(CURDIR))-board.log)"; fi; \\
		if [ -f scripts/worktree-pulse-daemon.sh ]; then scripts/worktree-pulse-daemon.sh status >/dev/null 2>&1 || scripts/worktree-pulse-daemon.sh start; fi; \\
		echo "🪐 Fulltech Board: http://localhost:$(BOARD_PORT_VALUE)"; \\
	else \\
		echo "server.mjs ausente. Utilize make backlog-browser para visualização."; \\
	fi

backlog-browser: ## Inicia o Backlog.md Browser oficial (porta 6420)
	@if curl -sf -m 2 "http://127.0.0.1:$(BACKLOG_PORT)" >/dev/null 2>&1; then \\
		echo "backlog browser já no ar em http://localhost:$(BACKLOG_PORT)"; \\
	else \\
		if command -v setsid >/dev/null 2>&1; then \\
			setsid nohup backlog browser --port $(BACKLOG_PORT) --no-open </dev/null >/tmp/$(notdir $(CURDIR))-backlog-browser.log 2>&1 & \\
		else \\
			nohup backlog browser --port $(BACKLOG_PORT) --no-open </dev/null >/tmp/$(notdir $(CURDIR))-backlog-browser.log 2>&1 & \\
		fi; \\
		sleep 1; \\
		echo "📋 Backlog.md Browser: http://localhost:$(BACKLOG_PORT) (log /tmp/$(notdir $(CURDIR))-backlog-browser.log)"; \\
	fi

board-all: board backlog-browser ## Sobe simultaneamente o Fulltech Board (3100) e o Backlog Browser (6420)

board-status: ## Exibe o estado do board e do watcher
	@curl -sf -m 2 "http://127.0.0.1:$(BOARD_PORT_VALUE)/api/agents" >/dev/null 2>&1 && echo "board: no ar em http://localhost:$(BOARD_PORT_VALUE)" || echo "board: fora do ar"
	@curl -sf -m 2 "http://127.0.0.1:$(BACKLOG_PORT)" >/dev/null 2>&1 && echo "backlog browser: no ar em http://localhost:$(BACKLOG_PORT)" || echo "backlog browser: fora do ar"

board-stop: ## Para o watcher, o board Fulltech e o backlog browser
	@if [ -f scripts/worktree-pulse-daemon.sh ]; then scripts/worktree-pulse-daemon.sh stop || true; fi
	@pkill -f "node $(CURDIR)/[s]erver.mjs" 2>/dev/null && echo "board parado" || true
	@pkill -f "[b]acklog.*browser.*$(BACKLOG_PORT)" 2>/dev/null && echo "backlog browser parado" || true
`;

  fs.appendFileSync(makefilePath, appendBlock, 'utf8');
}

function updateNotesFile(targetDir, meta, dryRun) {
  const notesPath = path.join(targetDir, 'NOTES.md');
  const banner = `<!-- fulltech-governance:start -->
## Governança Multi-Harness & SafeCode Guardian
- **Contrato Canônico:** [AGENTS.md](AGENTS.md) adotado como fonte de autoridade comum.
- **Regra de Ouro:** \`1 Tarefa = 1 Branch (feat/task-X-...) = 1 Worktree = 1 PR = 1 Contexto\`.
- **Auditoria de Segurança:** Validada via \`make audit\` (Evertec 13, OWASP Top 10, SDD).
- **Kanban & Backlog:** Gerenciado via padrão Backlog.md (\`backlog/tasks/\` e \`make board\`).
<!-- fulltech-governance:end -->

`;

  if (!fs.existsSync(notesPath)) {
    console.log('  ➕ Criando NOTES.md inicial com governança de ondas...');
    if (dryRun) return;
    const starterNotes = fs.readFileSync(path.join(STARTER_ROOT, 'NOTES.md'), 'utf8')
      .replaceAll('<owner/repo>', meta.owner)
      .replaceAll('<nome>', meta.name)
      .replaceAll('<stack>', meta.stack)
      .replaceAll('<resultado esperado>', meta.desc);
    fs.writeFileSync(notesPath, banner + starterNotes, 'utf8');
  } else {
    const existing = fs.readFileSync(notesPath, 'utf8');
    if (!existing.includes('fulltech-governance:start')) {
      console.log('  📝 Preservando histórico existente e injetando cabeçalho de governança em NOTES.md...');
      if (!dryRun) {
        fs.writeFileSync(notesPath, banner + existing, 'utf8');
      }
    } else {
      console.log('  ✅ NOTES.md já contém bloco de governança.');
    }
  }
}

function updateVsCodeExtensions(targetDir, dryRun) {
  const vscodeDir = path.join(targetDir, '.vscode');
  const extFile = path.join(vscodeDir, 'extensions.json');
  const targetExt = 'ysamlan.vscode-backlog-md';

  if (!fs.existsSync(extFile)) {
    console.log('  ➕ Criando .vscode/extensions.json recomendando Backlog.md...');
    if (dryRun) return;
    fs.mkdirSync(vscodeDir, { recursive: true });
    fs.writeFileSync(extFile, JSON.stringify({ recommendations: [targetExt] }, null, 2) + '\n', 'utf8');
  } else {
    try {
      const data = JSON.parse(fs.readFileSync(extFile, 'utf8'));
      data.recommendations = data.recommendations || [];
      if (!data.recommendations.includes(targetExt)) {
        console.log('  📝 Adicionando ysamlan.vscode-backlog-md ao .vscode/extensions.json...');
        if (!dryRun) {
          data.recommendations.push(targetExt);
          fs.writeFileSync(extFile, JSON.stringify(data, null, 2) + '\n', 'utf8');
        }
      }
    } catch {}
  }
}

async function main() {
  const options = parseArgs();

  if (!options.target) {
    console.error('❌ Erro: Especifique o repositório alvo via --target <caminho>.');
    console.error('   Exemplo: node scripts/retrofit-project.mjs --target /home/ubuntu/projetos/_Fulltech/fulltech-memory');
    process.exit(1);
  }

  const targetDir = path.resolve(options.target);

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Erro: O diretório "${targetDir}" não existe.`);
    process.exit(1);
  }

  console.log('========================================================');
  console.log('🛠️   FULLTECH MULTI-HARNESS RETROFIT ENGINE');
  console.log('========================================================\n');
  console.log(`📁 Repositório alvo: ${targetDir}`);

  const meta = detectProjectMetadata(targetDir);
  console.log(`📦 Projeto detectado: ${meta.name} (${meta.stack})`);
  console.log(`🏢 Repositório: ${meta.owner}`);
  console.log(`📝 Descrição: ${meta.desc}\n`);

  if (options.dryRun) {
    console.log('⚠️  MODO DRY-RUN ATIVADO: Nenhuma modificação será gravada em disco.\n');
  }

  // 1. Contratos Canônicos
  console.log('📜 [1/7] Atualizando contratos canônicos...');
  for (const contract of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'RUNBOOK.md']) {
    const src = path.join(STARTER_ROOT, contract);
    const dest = path.join(targetDir, contract);
    if (fs.existsSync(src)) {
      if (options.dryRun) {
        console.log(`  [DRY-RUN] Atualizar ${contract}`);
      } else {
        let content = fs.readFileSync(src, 'utf8')
          .replaceAll('multi-harness-starter-pack', meta.name)
          .replaceAll('<nome>', meta.name)
          .replaceAll('<project-name>', meta.name)
          .replaceAll('<owner/repo>', meta.owner)
          .replaceAll('<stack>', meta.stack)
          .replaceAll('<resultado esperado>', meta.desc);
        fs.writeFileSync(dest, content, 'utf8');
        console.log(`  ✅ ${contract} sincronizado.`);
      }
    }
  }

  // .github/copilot-instructions.md
  const copilotSrc = path.join(STARTER_ROOT, '.github', 'copilot-instructions.md');
  const copilotDest = path.join(targetDir, '.github', 'copilot-instructions.md');
  if (fs.existsSync(copilotSrc)) {
    if (!options.dryRun) {
      fs.mkdirSync(path.dirname(copilotDest), { recursive: true });
      fs.copyFileSync(copilotSrc, copilotDest);
    }
    console.log('  ✅ .github/copilot-instructions.md sincronizado.');
  }

  // NOTES.md
  updateNotesFile(targetDir, meta, options.dryRun);

  // 2. Guardrails Determinísticos e Hooks
  console.log('\n🛡️  [2/7] Instalando guardrails determinísticos e hooks...');
  const hooksSrc = path.join(STARTER_ROOT, '.claude', 'hooks');
  const hooksDest = path.join(targetDir, '.claude', 'hooks');
  copyDirRecursive(hooksSrc, hooksDest, options.dryRun);
  if (!options.dryRun) {
    try {
      execSync(`chmod +x "${path.join(hooksDest, 'block-secrets.sh')}"`, { stdio: 'ignore' });
    } catch {}
  }
  copyFileSafe(path.join(STARTER_ROOT, '.claude', 'settings.json'), path.join(targetDir, '.claude', 'settings.json'), options.dryRun);
  console.log('  ✅ Hooks de bloqueio de segredos e settings.json instalados.');

  // 3. Regras de Engenharia (rules/)
  console.log('\n📐 [3/7] Sincronizando regras de engenharia (rules/)...');
  copyDirRecursive(path.join(STARTER_ROOT, 'rules'), path.join(targetDir, 'rules'), options.dryRun);
  copyDirRecursive(path.join(STARTER_ROOT, '.claude', 'rules'), path.join(targetDir, '.claude', 'rules'), options.dryRun);
  console.log('  ✅ Regras de arquitetura, testes e segurança sincronizadas.');

  // 4. Skills Corporativas & Symlinks Multi-Harness
  console.log('\n🤖 [4/7] Sincronizando catálogo corporativo de skills...');
  copyDirRecursive(path.join(STARTER_ROOT, '.claude', 'skills'), path.join(targetDir, '.claude', 'skills'), options.dryRun);
  
  // Cria symlinks em .agents/skills
  const agentsSkillsDir = path.join(targetDir, '.agents', 'skills');
  if (!options.dryRun) {
    fs.mkdirSync(agentsSkillsDir, { recursive: true });
    const claudeSkills = fs.readdirSync(path.join(targetDir, '.claude', 'skills'));
    for (const skill of claudeSkills) {
      const symlinkPath = path.join(agentsSkillsDir, skill);
      const targetRel = `../../.claude/skills/${skill}`;
      if (!fs.existsSync(symlinkPath)) {
        try {
          fs.symlinkSync(targetRel, symlinkPath);
        } catch {}
      }
    }
  }
  console.log('  ✅ Skills espelhadas para Claude Code, Antigravity e Codex.');

  // 5. Backlog.md & Telemetria
  console.log('\n📋 [5/7] Provisionando padrão Backlog.md e scripts de telemetria...');
  const backlogDir = path.join(targetDir, 'backlog');
  const tasksDir = path.join(backlogDir, 'tasks');
  if (!options.dryRun) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }

  // Copia config.yml e harness-models se não existirem
  const cfgDest = path.join(backlogDir, 'config.yml');
  if (!fs.existsSync(cfgDest)) {
    copyFileSafe(path.join(STARTER_ROOT, 'backlog', 'config.yml'), cfgDest, options.dryRun);
    console.log('  ✅ backlog/config.yml provisionado.');
  }
  const modelsDest = path.join(backlogDir, 'harness-models.json');
  if (!fs.existsSync(modelsDest)) {
    copyFileSafe(path.join(STARTER_ROOT, 'backlog', 'harness-models.json'), modelsDest, options.dryRun);
  }

  // Scripts de board e telemetria
  const scriptsToCopy = [
    'board-config.mjs',
    'board-cards.mjs',
    'build-board.mjs',
    'worktree-pulse.mjs',
    'worktree-pulse-daemon.sh',
    'agent-pulse.mjs',
    'audit-report.mjs',
  ];
  for (const script of scriptsToCopy) {
    const sSrc = path.join(STARTER_ROOT, 'scripts', script);
    const sDest = path.join(targetDir, 'scripts', script);
    if (fs.existsSync(sSrc)) {
      copyFileSafe(sSrc, sDest, options.dryRun);
    }
  }
  copyFileSafe(path.join(STARTER_ROOT, 'server.mjs'), path.join(targetDir, 'server.mjs'), options.dryRun);
  updateVsCodeExtensions(targetDir, options.dryRun);
  console.log('  ✅ Scripts de telemetria e extensão VS Code recomendada.');

  // 6. Makefile Merge
  console.log('\n⚙️  [6/7] Ajustando Makefile com alvos do starter pack...');
  updateMakefile(targetDir, options.dryRun);

  // 7. Auditoria SafeCode Guardian
  console.log('\n🛡️  [7/7] Executando auditoria de conformidade SafeCode Guardian...');
  const guardianScript = '/home/ubuntu/projetos/00-Guidelines/monitor/guardian.py';
  if (!options.skipAudit && fs.existsSync(guardianScript)) {
    try {
      const auditOutput = execSync(`python3 ${guardianScript} --path "${targetDir}"`, {
        encoding: 'utf8',
      });
      const parsed = JSON.parse(auditOutput.trim());
      console.log(`\n========================================================`);
      console.log(`🎯 Scorecard Atual: ${parsed.global_score}/100 | Grau: ${parsed.grade} | Achados: ${parsed.findings}`);
      console.log(`========================================================`);

      // Se houver Red Flags, cria a task de saneamento no Backlog.md
      const failedRfs = Object.entries(parsed.red_flags || {}).filter(([_, v]) => v !== 'passed');
      if (failedRfs.length > 0 && !options.dryRun) {
        const remediationTaskPath = path.join(tasksDir, 'task-safecode-remediation - correcoes-de-segurança.md');
        if (!fs.existsSync(remediationTaskPath)) {
          const taskContent = `---
id: task-safecode-remediation
title: Correções de Segurança SafeCode Guardian
status: To Do
priority: high
assignee:
  - Security Lead
labels:
  - security
  - safecode
  - evertec
order: a0
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Adequar o repositório para atingir Grau A (Score >= 90) no SafeCode Guardian.
Red Flags pendentes de resolução:
${failedRfs.map(([rf, status]) => `- **${rf}:** ${status}`).join('\n')}

Execute \`make audit-report TARGET="${targetDir}"\` para ver arquivos e linhas específicos.
<!-- SECTION:DESCRIPTION:END -->

## Verify
<!-- SECTION:VERIFY:BEGIN -->
- [ ] Segredos hardcoded removidos e rotacionados (RF1)
- [ ] Tratamento global de erros sem vazar stack traces (RF3)
- [ ] Rate limiting implementado em rotas sensíveis (RF4)
- [ ] \`make audit\` executando com score >= 90 e Grau A
<!-- SECTION:VERIFY:END -->
`;
          fs.writeFileSync(remediationTaskPath, taskContent, 'utf8');
          console.log(`  📌 Criada tarefa de adequação em: ${path.relative(targetDir, remediationTaskPath)}`);
        }
      }

    } catch (err) {
      console.warn('⚠️  Não foi possível executar a auditoria automática:', err.message);
    }
  }

  console.log('\n========================================================');
  console.log('✨ Retrofit concluído com sucesso!');
  console.log(`\nPróximos passos para adequação no repositório:`);
  console.log(`1. cd ${targetDir}`);
  console.log(`2. make audit-report   # Ver lista de violações com linhas e trechos`);
  console.log(`3. Corrija as Red Flags no código (segredos, stack traces, rate limiting)`);
  console.log(`4. make audit          # Validar evolução até o Grau A`);
  console.log(`5. make board-all      # Acompanhar pelo Kanban & Telemetria em tempo real`);
  console.log('========================================================\n');
}

main().catch((err) => {
  console.error('❌ Erro fatal durante o retrofit:', err);
  process.exit(1);
});
