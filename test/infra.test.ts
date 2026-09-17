import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { applyBaseline, assignFingerprints } from '../src/baseline.js';
import { isValidCnpj } from '../src/cnpj.js';
import { ConfigError, loadConfig, resolveConfig, validateConfig } from '../src/config.js';
import { discoverFiles } from '../src/files.js';
import { compileGlob, compileGlobs } from '../src/glob.js';
import { detectLanguages } from '../src/languages.js';
import { RULES } from '../src/rules/index.js';
import { scanText } from '../src/scanner.js';
import { isCommentLine } from '../src/source.js';
import { parseSuppressions } from '../src/suppressions.js';
import { VERSION } from '../src/version.js';
import { ROOT } from './helpers.js';

const temp = mkdtempSync(join(tmpdir(), 'cnpj-lint-infra-'));
after(() => rmSync(temp, { recursive: true, force: true }));

function write(base: string, files: Record<string, string>): string {
  for (const [file, content] of Object.entries(files)) {
    const path = join(base, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return base;
}

describe('glob', () => {
  it('segue a semântica do .gitignore', () => {
    assert.equal(compileGlob('*.min.js')('src/app.min.js'), true);
    assert.equal(compileGlob('legacy')('src/legacy/a.ts'), true);
    assert.equal(compileGlob('legacy')('src/legacyx/a.ts'), false);
    assert.equal(compileGlob('node_modules/')('a/node_modules/b.js'), true);
    assert.equal(compileGlob('src/**/*.test.ts')('src/a/b.test.ts'), true);
    assert.equal(compileGlob('src/**/*.test.ts')('src/b.test.ts'), true);
    assert.equal(compileGlob('src/**/*.test.ts')('lib/b.test.ts'), false);
    assert.equal(compileGlob('test/fixtures')('test/fixtures/x/y.js'), true);
    assert.equal(compileGlob('**/fixtures/**')('a/fixtures/b.js'), true);
    assert.equal(compileGlob('*.{js,ts}')('a/b.ts'), true);
    assert.equal(compileGlob('file?.[ch]')('src/file1.c'), true);
    assert.equal(compileGlob('./docs/')('docs/a.md'), true);
    assert.equal(compileGlobs([])('x'), false);
  });
});

describe('linguagens e comentários', () => {
  it('detecta linguagens por nome e extensão', () => {
    assert.deepEqual(detectLanguages('Empresa.java'), ['java']);
    assert.deepEqual(detectLanguages('package.json'), ['json', 'manifest']);
    assert.deepEqual(detectLanguages('package-lock.json'), ['lockfile']);
    assert.deepEqual(detectLanguages('requirements-dev.txt'), ['manifest']);
    assert.deepEqual(detectLanguages('Api.csproj'), ['xml', 'manifest']);
    assert.deepEqual(detectLanguages('app.min.js'), []);
    assert.deepEqual(detectLanguages('notas.md'), []);
    assert.deepEqual(detectLanguages('rotina.abc', { '.abc': 'xbase' }), ['xbase']);
    assert.deepEqual(detectLanguages('MATA010.PRW'), ['xbase']);
  });

  it('reconhece linhas de comentário por linguagem', () => {
    assert.equal(isCommentLine('  // x', new Set(['typescript'])), true);
    assert.equal(isCommentLine('  # x', new Set(['python'])), true);
    assert.equal(isCommentLine('  # x', new Set(['php'])), false);
    assert.equal(isCommentLine('-- x', new Set(['sql'])), true);
    assert.equal(isCommentLine("' x", new Set(['vb'])), true);
    assert.equal(isCommentLine('      * comentario', new Set(['cobol'])), true);
    assert.equal(isCommentLine('       05 WS-CNPJ PIC X(14).', new Set(['cobol'])), false);
    assert.equal(isCommentLine('{ comentário }', new Set(['delphi'])), true);
  });
});

describe('supressões', () => {
  const known = new Set(RULES.map((rule) => rule.id));
  it('entende todas as diretivas', () => {
    const check = parseSuppressions(
      [
        '// cnpj-lint-disable-next-line numeric-type -- motivo',
        'a',
        'b // cnpj-lint-disable-line',
        '/* cnpj-lint-disable numeric-conversion, strip-non-digits */',
        'c',
        '/* cnpj-lint-enable */',
        'd',
      ],
      known,
    );
    assert.equal(check('numeric-type', 1), true);
    assert.equal(check('numeric-regex', 1), false);
    assert.equal(check('numeric-regex', 2), true);
    assert.equal(check('numeric-conversion', 4), true);
    assert.equal(check('strip-non-digits', 4), true);
    assert.equal(check('numeric-type', 4), false);
    assert.equal(check('numeric-conversion', 6), false);
  });

  it('suporta desativar o arquivo inteiro', () => {
    const code = '# cnpj-lint-disable-file\nvalor = int(cnpj)';
    assert.deepEqual(scanText(code, 'a.py'), []);
    const partial = '# cnpj-lint-disable-file numeric-type\nvalor = int(cnpj)';
    assert.equal(scanText(partial, 'a.py').length, 1);
  });

  it('não trata a diretiva como menção a CNPJ', () => {
    const code =
      "// cnpj-lint-disable-next-line numeric-type\nconst tel = telefone.replace(/\\D/g, '');";
    assert.deepEqual(scanText(code, 'a.ts'), []);
  });
});

describe('configuração', () => {
  it('valida opções e avisa sobre desconhecidas', () => {
    const { config, warnings } = validateConfig(
      {
        $schema: 'x',
        rules: { 'numeric-type': 'off', 'nao-existe': 'error' },
        identifiers: ['nr_insc'],
        extensions: { prw: 'xbase' },
        failOn: 'warning',
        foo: 1,
      },
      'teste',
    );
    assert.deepEqual(config.rules, { 'numeric-type': 'off' });
    assert.deepEqual(config.extensions, { '.prw': 'xbase' });
    assert.equal(warnings.length, 2);
    assert.throws(() => validateConfig({ rules: { 'numeric-type': 'fatal' } }, 't'), ConfigError);
    assert.throws(() => validateConfig({ include: 'src' }, 't'), ConfigError);
    assert.throws(() => validateConfig({ extensions: { '.x': 'cobolx' } }, 't'), ConfigError);
    assert.throws(() => validateConfig([], 't'), ConfigError);
  });

  it('carrega arquivo, package.json e aplica prioridade da linha de comando', () => {
    const withFile = write(join(temp, 'cfg-file'), {
      '.cnpjlintrc.json': JSON.stringify({ exclude: ['legacy'], failOn: 'warning' }),
    });
    const loaded = loadConfig(withFile);
    assert.deepEqual(loaded.config.exclude, ['legacy']);
    const resolved = resolveConfig(loaded.config, { failOn: 'none', exclude: ['tmp'] });
    assert.equal(resolved.failOn, 'none');
    assert.deepEqual(resolved.exclude, ['legacy', 'tmp']);

    const withPackage = write(join(temp, 'cfg-package'), {
      'package.json': JSON.stringify({ name: 'x', cnpjLint: { identifiers: ['doc'] } }),
    });
    assert.deepEqual(loadConfig(withPackage).config.identifiers, ['doc']);
    assert.deepEqual(loadConfig(join(temp)).config, {});
    assert.throws(() => loadConfig(withFile, 'nao-existe.json'), ConfigError);
  });

  it('desliga e rebaixa regras', () => {
    const code = 'valor = int(cnpj)';
    assert.equal(
      scanText(code, 'a.py', { config: resolveConfig({ rules: { 'numeric-conversion': 'off' } }) })
        .length,
      0,
    );
    const [finding] = scanText(code, 'a.py', {
      config: resolveConfig({ rules: { 'numeric-conversion': 'warning' } }),
    });
    assert.equal(finding?.severity, 'warning');
  });
});

describe('baseline', () => {
  it('gera impressões digitais estáveis e suprime ocorrências conhecidas', () => {
    const before = scanText('x = 1\nvalor = int(cnpj)\nvalor = int(cnpj)', 'a.py');
    const after = scanText(
      '# nova linha\nx = 1\nvalor = int(cnpj)\nvalor = int(cnpj)\ny = int(cnpj_novo)',
      'a.py',
    );
    assert.notEqual(before[0]?.fingerprint, before[1]?.fingerprint);
    assert.equal(before[0]?.fingerprint, after[0]?.fingerprint);
    const baseline = {
      version: 1 as const,
      tool: 'cnpj-lint' as const,
      generatedAt: '',
      findings: before.map(({ ruleId, file, fingerprint }) => ({ ruleId, file, fingerprint })),
    };
    const applied = applyBaseline(after, baseline);
    assert.equal(applied.suppressed, 2);
    assert.deepEqual(
      applied.findings.map((finding) => finding.line),
      [5],
    );
    assignFingerprints(applied.findings);
    assert.match(applied.findings[0]?.fingerprint ?? '', /^[0-9a-f]{20}:1$/);
  });
});

describe('descoberta de arquivos', () => {
  it('ignora diretórios gerados e respeita include/exclude', () => {
    const base = write(join(temp, 'walk'), {
      'src/a.ts': 'x',
      'src/legacy/b.ts': 'x',
      'node_modules/lib/index.js': 'x',
      'dist/out.js': 'x',
      'docs/readme.md': 'x',
    });
    const relative = (files: string[]) =>
      files.map((file) => file.slice(base.length + 1).replace(/\\/g, '/'));
    const options = { cwd: base, include: [], exclude: [], gitignore: false };
    assert.deepEqual(relative(discoverFiles(['.'], options)), [
      'docs/readme.md',
      'src/a.ts',
      'src/legacy/b.ts',
    ]);
    assert.deepEqual(relative(discoverFiles(['.'], { ...options, exclude: ['legacy'] })), [
      'docs/readme.md',
      'src/a.ts',
    ]);
    assert.deepEqual(relative(discoverFiles(['.'], { ...options, include: ['src/**'] })), [
      'src/a.ts',
      'src/legacy/b.ts',
    ]);
    assert.equal(discoverFiles(['.'], { ...options, noDefaultExcludes: true }).length, 5);
    assert.throws(() => discoverFiles(['nao-existe'], options), /não encontrado/);
  });

  it('usa o git para respeitar o .gitignore', (context) => {
    const base = write(join(temp, 'git'), {
      '.gitignore': 'gerado/\n',
      'src/a.ts': 'x',
      'gerado/b.ts': 'x',
    });
    try {
      execFileSync('git', ['init', '-q'], { cwd: base, stdio: 'ignore' });
    } catch {
      context.skip('git indisponível');
      return;
    }
    const files = discoverFiles(['.'], {
      cwd: base,
      include: [],
      exclude: [],
      gitignore: true,
    }).map((file) => file.slice(base.length + 1).replace(/\\/g, '/'));
    assert.deepEqual(files, ['.gitignore', 'src/a.ts']);
  });
});

describe('consistência do repositório', () => {
  it('os vetores de examples/ concordam com a implementação TypeScript', () => {
    const lines = readFileSync(join(ROOT, 'examples', 'test-vectors.txt'), 'utf8').split(/\r?\n/);
    let total = 0;
    for (const line of lines) {
      if (line.trim() === '' || line.startsWith('#')) continue;
      const separator = line.lastIndexOf(';');
      total++;
      assert.equal(
        isValidCnpj(line.slice(0, separator)),
        line.slice(separator + 1) === 'true',
        line,
      );
    }
    assert.ok(total >= 50, `apenas ${total} vetores`);
  });

  it('schema.json descreve todas as regras', () => {
    const schema = JSON.parse(readFileSync(join(ROOT, 'schema.json'), 'utf8')) as {
      properties: { rules: { properties: Record<string, unknown> } };
    };
    assert.deepEqual(
      Object.keys(schema.properties.rules.properties).sort(),
      RULES.map((rule) => rule.id).sort(),
    );
  });

  it('docs/regras.md documenta todas as regras', () => {
    const docs = readFileSync(join(ROOT, 'docs', 'regras.md'), 'utf8');
    for (const rule of RULES) {
      assert.match(docs, new RegExp(`^## \`${rule.id}\``, 'm'), rule.id);
    }
  });
});

describe('versão', () => {
  it('coincide com o package.json', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string };
    assert.equal(VERSION, pkg.version);
  });
});
