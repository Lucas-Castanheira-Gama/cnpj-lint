import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { type CliIO, EXIT_FINDINGS, EXIT_OK, EXIT_USAGE, run } from '../src/cli-main.js';
import { ROOT } from './helpers.js';

const temp = mkdtempSync(join(tmpdir(), 'cnpj-lint-cli-'));
after(() => rmSync(temp, { recursive: true, force: true }));

function sandbox(name: string, files: Record<string, string>): string {
  const directory = join(temp, name);
  mkdirSync(directory, { recursive: true });
  for (const [file, content] of Object.entries(files))
    writeFileSync(join(directory, file), content);
  return directory;
}

function exec(args: string[], cwd: string, env: NodeJS.ProcessEnv = {}) {
  let stdout = '';
  let stderr = '';
  const io: CliIO = {
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
    cwd,
    env,
    isTTY: false,
  };
  const code = run(args, io);
  return { code, stdout, stderr };
}

describe('cli', () => {
  const project = sandbox('scan', {
    'a.py': 'valor = int(cnpj)\n',
    'b.ts': "const m = '99.999.999/9999-99'; // cnpj\n",
  });

  it('mostra ajuda e versão', () => {
    assert.match(exec(['--help'], project).stdout, /Uso:/);
    assert.match(exec(['--help', '--locale', 'en'], project).stdout, /Usage:/);
    assert.match(exec(['--version'], project).stdout, /^\d+\.\d+\.\d+\n$/);
  });

  it('retorna 1 quando há erros e respeita --fail-on', () => {
    const scan = exec(['--no-gitignore'], project);
    assert.equal(scan.code, EXIT_FINDINGS);
    assert.match(scan.stdout, /2 problemas/);
    assert.equal(exec(['--no-gitignore', '--fail-on', 'none'], project).code, EXIT_OK);
    assert.equal(
      exec(['--no-gitignore', '--rule', 'numeric-conversion=off'], project).code,
      EXIT_OK,
    );
    assert.equal(
      exec(['--no-gitignore', '--rule', 'numeric-conversion=off', '--fail-on', 'warning'], project)
        .code,
      EXIT_FINDINGS,
    );
    assert.match(exec(['--no-gitignore', '--quiet'], project).stdout, /1 problema /);
  });

  it('gera JSON, SARIF e arquivo de saída', () => {
    const json = JSON.parse(
      exec(['scan', '.', '--no-gitignore', '-f', 'json'], project).stdout,
    ) as {
      summary: { total: number };
    };
    assert.equal(json.summary.total, 2);
    const output = exec(['--no-gitignore', '-f', 'sarif', '-o', 'out.sarif'], project);
    assert.match(output.stderr, /out\.sarif/);
    assert.equal(JSON.parse(readFileSync(join(project, 'out.sarif'), 'utf8')).version, '2.1.0');
    rmSync(join(project, 'out.sarif'));
  });

  it('grava e aplica baseline', () => {
    const directory = sandbox('baseline', { 'a.py': 'valor = int(cnpj)\n' });
    const created = exec(
      ['--no-gitignore', '--update-baseline', '--baseline', 'base.json'],
      directory,
    );
    assert.equal(created.code, EXIT_OK);
    assert.ok(existsSync(join(directory, 'base.json')));
    const applied = exec(['--no-gitignore', '--baseline', 'base.json'], directory);
    assert.equal(applied.code, EXIT_OK);
    assert.match(applied.stdout, /baseline/);
    writeFileSync(join(directory, 'a.py'), 'valor = int(cnpj)\noutro = int(cnpj_matriz)\n');
    assert.equal(
      exec(['--no-gitignore', '--baseline', 'base.json'], directory).code,
      EXIT_FINDINGS,
    );
  });

  it('valida e gera CNPJs', () => {
    const valid = exec(['validate', '12.ABC.345/01DE-35', '11222333000181'], project);
    assert.equal(valid.code, EXIT_OK);
    assert.match(valid.stdout, /12\.ABC\.345\/01DE-35 \(alfanumérico\)/);
    const invalid = exec(['validate', '12ABC34501DE34', '-f', 'json'], project);
    assert.equal(invalid.code, EXIT_FINDINGS);
    assert.equal((JSON.parse(invalid.stdout) as Array<{ valid: boolean }>)[0]?.valid, false);
    const list = sandbox('lista', { 'cnpjs.txt': '# lista\n12ABC34501DE35\n\nAA345678000A29\n' });
    assert.equal(exec(['validate', '--file', 'cnpjs.txt'], list).code, EXIT_OK);
    const generated = exec(['generate', '-n', '5', '--formatted'], project)
      .stdout.trim()
      .split('\n');
    assert.equal(generated.length, 5);
    for (const cnpj of generated) {
      assert.match(cnpj, /^[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-\d{2}$/);
    }
    const numeric = exec(['generate', '--numeric'], project).stdout.trim();
    assert.match(numeric, /^\d{14}$/);
  });

  it('lista regras e cria configuração', () => {
    assert.match(exec(['rules'], project).stdout, /numeric-regex/);
    const rules = JSON.parse(
      exec(['rules', '-f', 'json', '--locale', 'en'], project).stdout,
    ) as Array<{ title: string }>;
    assert.ok(rules.length > 10);
    const directory = sandbox('init', {});
    assert.equal(exec(['init'], directory).code, EXIT_OK);
    assert.ok(existsSync(join(directory, '.cnpjlintrc.json')));
    assert.equal(exec(['init'], directory).code, EXIT_USAGE);
  });

  it('reporta erros de uso com código 2', () => {
    assert.equal(exec(['--format', 'xml'], project).code, EXIT_USAGE);
    assert.equal(exec(['--rule', 'x=error'], project).code, EXIT_USAGE);
    assert.equal(exec(['--opcao-inexistente'], project).code, EXIT_USAGE);
    assert.equal(exec(['caminho-inexistente'], project).code, EXIT_USAGE);
    assert.equal(exec(['validate'], project).code, EXIT_USAGE);
    assert.equal(exec(['generate', '-n', '0'], project).code, EXIT_USAGE);
    const broken = sandbox('broken', { '.cnpjlintrc.json': '{ nope' });
    const result = exec([], broken);
    assert.equal(result.code, EXIT_USAGE);
    assert.match(result.stderr, /Não foi possível ler/);
  });

  it('funciona como executável', () => {
    const cli = join(ROOT, '.test-build', 'src', 'cli.js');
    const child = spawnSync(process.execPath, [cli, 'validate', '12ABC34501DE35'], {
      encoding: 'utf8',
    });
    assert.equal(child.status, 0);
    assert.match(child.stdout, /alfanumérico/);
  });
});
