// Casos do hook block-secrets: bloqueia arquivo de segredo, não trecho de código como process.env.X.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.claude', 'hooks', 'block-secrets.sh');
const BLOCK = 2;
const ALLOW = 0;

function run(toolInput) {
  return spawnSync('bash', [HOOK], { input: JSON.stringify({ tool_input: toolInput }) }).status;
}

const cases = [
  [BLOCK, { command: 'cat .env' }],
  [BLOCK, { command: 'cat apps/.env.local' }],
  [BLOCK, { command: 'cp .env.example .env' }],
  [BLOCK, { file_path: '/repo/.env' }],
  [BLOCK, { file_path: '/repo/.env.production' }],
  [BLOCK, { command: 'rm -rf /' }],
  [ALLOW, { command: 'node -e "console.log(process.env.HOME)"' }],
  [ALLOW, { command: 'cp .env.example out.txt' }],
  [ALLOW, { file_path: '/repo/.env.example' }],
  [ALLOW, { command: 'ls src' }],
];

for (const [expected, input] of cases) {
  test(`${expected === BLOCK ? 'bloqueia' : 'libera'} ${JSON.stringify(input)}`, () => {
    assert.equal(run(input), expected);
  });
}
