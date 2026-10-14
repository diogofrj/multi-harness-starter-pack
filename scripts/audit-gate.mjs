#!/usr/bin/env node
// scripts/audit-gate.mjs — roda o SafeCode Guardian e sai com 1 se alguma Red Flag estiver aberta.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const GUARDIAN = process.env.SAFECODE_GUARDIAN || '/home/ubuntu/projetos/00-Guidelines/monitor/guardian.py';
const target = path.resolve(process.argv[2] || process.cwd());

if (!fs.existsSync(GUARDIAN)) {
  console.error(`SafeCode Guardian não encontrado em ${GUARDIAN} (defina SAFECODE_GUARDIAN).`);
  process.exit(2);
}

let result;
try {
  const output = execFileSync('python3', [GUARDIAN, '--path', target, '--no-build'], { encoding: 'utf8' });
  result = JSON.parse(output.trim().split('\n').pop());
} catch (err) {
  console.error(`Falha ao rodar ou ler o SafeCode Guardian em ${target}: ${err.message}`);
  process.exit(2);
}

const open = Object.entries(result.red_flags || {}).filter(([, status]) => status !== 'passed').map(([rf]) => rf);
console.log(`SafeCode Guardian: ${result.global_score}/100, grau ${result.grade}, ${result.findings} achados`);
if (open.length > 0) {
  console.error(`Red Flags abertas: ${open.join(', ')}. Detalhes: make audit-report`);
  process.exit(1);
}
console.log('Red Flags: todas fechadas');
