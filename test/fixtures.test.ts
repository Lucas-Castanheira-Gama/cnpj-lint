import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { resolveConfig } from '../src/config.js';
import { scan } from '../src/scanner.js';
import { FIXTURES } from './helpers.js';

const PROJECT = join(FIXTURES, 'project');
const EXPECTED = join(FIXTURES, 'expected.txt');

/**
 * Projeto de exemplo com código legado em várias linguagens.
 * Cada linha do snapshot foi revisada manualmente; para atualizar após mudar regras,
 * rode `UPDATE_FIXTURES=1 npm test` e revise o diff com cuidado.
 */
describe('projeto de fixtures', () => {
  const result = scan({
    cwd: PROJECT,
    config: resolveConfig({ gitignore: false }),
  });
  const actual = result.findings
    .map(
      (finding) =>
        `${finding.file}:${finding.line}:${finding.column} ${finding.severity} ${finding.ruleId}`,
    )
    .join('\n');

  it('corresponde ao snapshot revisado', () => {
    if (process.env.UPDATE_FIXTURES === '1') writeFileSync(EXPECTED, `${actual}\n`);
    assert.equal(actual, readFileSync(EXPECTED, 'utf8').replace(/\r\n/g, '\n').trimEnd());
  });

  it('não aponta nada nos arquivos já corrigidos', () => {
    assert.deepEqual(
      result.findings.filter((finding) => finding.file.startsWith('good/')),
      [],
    );
  });

  it('cobre todas as regras', () => {
    const covered = new Set(result.findings.map((finding) => finding.ruleId));
    for (const rule of result.rules) {
      assert.ok(covered.has(rule.id), `sem exemplo: ${rule.id}`);
    }
  });

  it('respeita as diretivas de supressão', () => {
    const suppressed = result.findings.filter((finding) => finding.file === 'suppressed.ts');
    assert.deepEqual(
      suppressed.map((finding) => `${finding.line}:${finding.ruleId}`),
      ['7:numeric-conversion'],
    );
  });

  it('analisa todos os arquivos sem erros', () => {
    assert.deepEqual(result.errors, []);
    assert.ok(result.filesScanned >= 28, `analisou ${result.filesScanned}`);
  });
});
