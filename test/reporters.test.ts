import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { reportGithub } from '../src/reporters/github.js';
import { reportJson } from '../src/reporters/json.js';
import { reportMarkdown } from '../src/reporters/markdown.js';
import { reportPretty } from '../src/reporters/pretty.js';
import { reportSarif } from '../src/reporters/sarif.js';
import { RULES } from '../src/rules/index.js';
import { scanText } from '../src/scanner.js';
import type { ScanResult } from '../src/types.js';

function result(locale: 'pt-BR' | 'en' = 'pt-BR'): ScanResult {
  const findings = [
    ...scanText('valor = int(cnpj)\nif not cnpj.isdigit(): pass', 'api/emp resa.py'),
    ...scanText('const m = "99.999.999/9999-99, 100%";', 'web/a.ts'),
  ];
  return {
    findings,
    errors: [],
    filesScanned: 2,
    suppressedByBaseline: 1,
    durationMs: 1234,
    rules: RULES,
    locale,
  };
}

describe('relatórios', () => {
  it('pretty resume em português e em inglês', () => {
    const pt = reportPretty(result(), { color: false, verbose: true });
    assert.match(pt, /api\/emp resa\.py/);
    assert.match(pt, /3 problemas \(2 erros, 1 aviso, 0 informativos\)/);
    assert.match(pt, /2 arquivos analisados em 1,23s/);
    assert.match(pt, /↳ /);
    assert.match(pt, /baseline/);
    const en = reportPretty(result('en'), { color: false, verbose: false });
    assert.match(en, /3 problems \(2 errors, 1 warning, 0 infos\)/);
    const colored = reportPretty(result(), { color: true, verbose: false });
    assert.ok(colored.includes('\u001b[31m'));
    const empty = reportPretty(
      { ...result(), findings: [], suppressedByBaseline: 0 },
      { color: false, verbose: false },
    );
    assert.match(empty, /Nenhum problema/);
  });

  it('json tem resumo e ocorrências', () => {
    const data = JSON.parse(reportJson(result())) as {
      summary: { errors: number; warnings: number; total: number };
      findings: unknown[];
    };
    assert.deepEqual([data.summary.errors, data.summary.warnings, data.summary.total], [2, 1, 3]);
    assert.equal(data.findings.length, 3);
  });

  it('sarif segue a estrutura 2.1.0', () => {
    const sarif = JSON.parse(reportSarif(result())) as {
      version: string;
      runs: Array<{
        tool: { driver: { name: string; rules: Array<{ id: string; helpUri: string }> } };
        results: Array<{
          ruleId: string;
          ruleIndex: number;
          level: string;
          locations: Array<{
            physicalLocation: { artifactLocation: { uri: string }; region: { startLine: number } };
          }>;
          partialFingerprints: Record<string, string>;
        }>;
      }>;
    };
    assert.equal(sarif.version, '2.1.0');
    const run = sarif.runs[0];
    assert.ok(run);
    assert.equal(run.tool.driver.name, 'cnpj-lint');
    assert.equal(run.tool.driver.rules.length, RULES.length);
    const first = run.results[0];
    assert.ok(first);
    assert.equal(run.tool.driver.rules[first.ruleIndex]?.id, first.ruleId);
    assert.equal(first.level, 'error');
    assert.equal(first.locations[0]?.physicalLocation.artifactLocation.uri, 'api/emp%20resa.py');
    assert.equal(first.locations[0]?.physicalLocation.region.startLine, 1);
    assert.ok(first.partialFingerprints['cnpjLint/v1']);
    assert.equal(run.results[2]?.level, 'warning');
  });

  it('markdown gera tabela com links quando há contexto do GitHub', () => {
    const markdown = reportMarkdown(result(), {
      env: { GITHUB_SERVER_URL: 'https://github.com', GITHUB_REPOSITORY: 'o/r', GITHUB_SHA: 'abc' },
    });
    assert.match(markdown, /\| Regra \| Ocorrências \|/);
    assert.match(markdown, /https:\/\/github\.com\/o\/r\/blob\/abc\/api\/emp%20resa\.py#L1/);
    assert.match(markdown, /numeric-conversion/);
    const plain = reportMarkdown(result(), { env: {} });
    assert.doesNotMatch(plain, /blob\/abc/);
  });

  it('github escapa propriedades e mensagens', () => {
    const output = reportGithub(result());
    const lines = output.trim().split('\n');
    assert.equal(lines.length, 3);
    assert.match(
      lines[0] ?? '',
      /^::error file=api\/emp resa\.py,line=1,col=\d+,endColumn=\d+,title=cnpj-lint \(numeric-conversion\)::/,
    );
    assert.match(lines[2] ?? '', /^::warning /);
    const [first] = result().findings;
    assert.ok(first);
    const tricky = reportGithub({
      ...result(),
      findings: [{ ...first, file: 'a,b:c.ts', message: '50%\nnova linha' }],
    });
    assert.match(tricky, /file=a%2Cb%3Ac\.ts/);
    assert.match(tricky, /::50%25%0Anova linha/);
  });
});
