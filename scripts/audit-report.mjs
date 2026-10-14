#!/usr/bin/env node
// scripts/audit-report.mjs — Relatório executivo e diagnóstico do SafeCode Guardian
import fs from "node:fs";
import path from "node:path";

const target = process.argv[2] || process.cwd();
const resolvedTarget = path.resolve(target);
const slug = path.basename(resolvedTarget);
const scorecardsDir = "/home/ubuntu/projetos/00-Guidelines/monitor/output/scorecards";
const file = path.join(scorecardsDir, `${slug}.json`);

if (!fs.existsSync(file)) {
  console.error(`\n❌ Scorecard não encontrado para o projeto "${slug}".`);
  console.error(`   Arquivo esperado: ${file}`);
  console.error(`   Execute primeiro a auditoria: make audit TARGET="${resolvedTarget}"\n`);
  process.exit(1);
}

try {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  
  console.log("\n========================================================");
  console.log(`🛡️   RELATÓRIO SAFECODE GUARDIAN: ${data.project}`);
  console.log(`📁  Repositório: ${data.path}`);
  console.log(`📊  Score Global: ${data.global_score}/100  |  Grau: ${data.grade}  |  Achados: ${data.findings_count}`);
  console.log("========================================================\n");

  console.log("🚩 AVALIAÇÃO DAS 4 RED FLAGS (Critérios de Bloqueio):");
  for (const [k, v] of Object.entries(data.red_flags || {})) {
    const passed = v.status === "passed";
    const icon = passed ? "✅" : "❌";
    const statusText = passed ? "PASSOU (OK)" : "FALHOU (BLOQUEANTE)";
    console.log(`  ${icon} [${k}] ${v.name}: ${statusText}`);
  }

  console.log("\n📦 SCORES POR FRAMEWORK:");
  for (const [fw, s] of Object.entries(data.framework_scores || {})) {
    console.log(`  • ${fw.toUpperCase().padEnd(16)}: ${s.score}% (${s.passed}/${s.total} regras cumpridas - ${s.failed_count} violações)`);
  }

  const findings = data.findings || [];
  if (findings.length > 0) {
    console.log(`\n🔍 TOP ACHADOS PRIORITÁRIOS (Exibindo até 10 de ${findings.length}):`);
    
    // Prioriza critical e high
    const sorted = [...findings].sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    }).slice(0, 10);

    sorted.forEach((f, i) => {
      const badge = f.severity ? `[${f.severity.toUpperCase()}]` : "";
      console.log(`\n--------------------------------------------------------`);
      console.log(`  ${i + 1}. ${badge} ${f.rule_id}: ${f.title}`);
      console.log(`     📍 Onde: ${f.file}:${f.line}`);
      if (f.sample) {
        console.log(`     ⚠️  Trecho: "${f.sample.trim()}"`);
      }
      if (f.remediation?.explanation) {
        console.log(`     💡 Como corrigir: ${f.remediation.explanation}`);
      }
      if (f.remediation?.links && f.remediation.links.length > 0) {
        console.log(`     🔗 Referência: ${f.remediation.links[0].url}`);
      }
    });
    console.log(`--------------------------------------------------------`);
  } else {
    console.log("\n✨ Nenhum achado ou vulnerabilidade encontrada! Projeto em conformidade.");
  }

  console.log(`\n🌐 Portal Interativo e Remediação Visual com Snippets:`);
  console.log(`   http://localhost:8765/#safecode\n`);

} catch (err) {
  console.error("❌ Erro ao processar o relatório de auditoria:", err.message);
  process.exit(1);
}
