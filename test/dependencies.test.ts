import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { resolveConfig } from '../src/config.js';
import {
  compareVersions,
  evaluateDependency,
  KNOWN_PACKAGES,
  parseRange,
  parseVersion,
} from '../src/rules/dependencies.js';
import { scan } from '../src/scanner.js';

const temp = mkdtempSync(join(tmpdir(), 'cnpj-lint-deps-'));
after(() => rmSync(temp, { recursive: true, force: true }));

function project(name: string, files: Record<string, string>): string {
  const directory = join(temp, name);
  for (const [file, content] of Object.entries(files)) {
    const path = join(directory, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return directory;
}

function lintProject(directory: string): string[] {
  return scan({ cwd: directory, config: resolveConfig({ gitignore: false }) }).findings.map(
    (finding) => `${finding.file}:${finding.line} ${finding.severity} ${finding.message}`,
  );
}

describe('versões', () => {
  it('interpreta versões', () => {
    assert.deepEqual(parseVersion('v3.0.1'), [3, 0, 1]);
    assert.deepEqual(parseVersion('9.0.1.Final'), [9, 0, 1]);
    assert.deepEqual(parseVersion('==1.10.0'), [1, 10, 0]);
    assert.equal(parseVersion('latest'), undefined);
    assert.equal(compareVersions([1, 2], [1, 2, 0]), 0);
    assert.equal(compareVersions([13, 15, 35], [13, 15, 4]), 1);
  });

  it('interpreta faixas de vários ecossistemas', () => {
    assert.deepEqual(parseRange('^1.0.3'), {
      min: [1, 0, 3],
      maxExclusive: [2, 0, 0],
      exact: false,
    });
    assert.deepEqual(parseRange('^0.13.1'), {
      min: [0, 13, 1],
      maxExclusive: [0, 14, 0],
      exact: false,
    });
    assert.deepEqual(parseRange('~1.2.3'), {
      min: [1, 2, 3],
      maxExclusive: [1, 3, 0],
      exact: false,
    });
    assert.deepEqual(parseRange('1.2.3'), { min: [1, 2, 3], exact: true });
    assert.deepEqual(parseRange('>=2.4'), { min: [2, 4], exact: false });
    assert.deepEqual(parseRange('>=18,<30'), { min: [18], maxExclusive: [30], exact: false });
    assert.deepEqual(parseRange('~> 0.5'), { min: [0, 5], maxExclusive: [1], exact: false });
    assert.deepEqual(parseRange('~=2.2'), { min: [2, 2], maxExclusive: [3], exact: false });
    assert.deepEqual(parseRange('1.x'), { min: [1], maxExclusive: [2], exact: false });
    assert.deepEqual(parseRange('^1.0 || ^2.0'), {
      min: [1, 0],
      maxExclusive: [3, 0, 0],
      exact: false,
    });
    assert.deepEqual(parseRange('1.0.0 - 2.0.0'), {
      min: [1, 0, 0],
      maxExclusive: [2, 0, 1],
      exact: false,
    });
    assert.deepEqual(parseRange('[8.0,9.0)'), { min: [8, 0], maxExclusive: [9, 0], exact: false });
    assert.deepEqual(parseRange('*'), { exact: false });
    assert.deepEqual(parseRange(''), { exact: false });
    assert.deepEqual(parseRange('git+https://github.com/x/y'), { exact: false });
  });
});

describe('avaliação de dependências', () => {
  const find = (name: string) => {
    const item = KNOWN_PACKAGES.find((candidate) => candidate.name === name);
    assert.ok(item, name);
    return item;
  };

  it('classifica versões exatas, faixas e desconhecidas', () => {
    const validator = find('validator');
    assert.equal(
      evaluateDependency(validator, { name: 'validator', spec: '^13.12.0', locked: '13.12.0' })
        ?.severity,
      'error',
    );
    assert.equal(
      evaluateDependency(validator, { name: 'validator', spec: '^13.12.0', locked: '13.15.35' }),
      undefined,
    );
    assert.equal(
      evaluateDependency(validator, { name: 'validator', spec: '^13.12.0' })?.severity,
      'warning',
    );
    assert.equal(evaluateDependency(validator, { name: 'validator', spec: '13.15.40' }), undefined);
    assert.equal(evaluateDependency(validator, { name: 'validator', spec: '*' })?.severity, 'info');

    const cpfCnpj = find('cpf-cnpj-validator');
    const capped = evaluateDependency(cpfCnpj, { name: 'cpf-cnpj-validator', spec: '^1.0.3' });
    assert.equal(capped?.severity, 'error');
    assert.match(capped?.message.pt ?? '', /nunca instala/);
  });

  it('mostra orientações de uso mesmo em versões novas', () => {
    const hibernate = find('org.hibernate.validator:hibernate-validator');
    const verdict = evaluateDependency(hibernate, {
      name: 'org.hibernate.validator:hibernate-validator',
      spec: '9.0.1.Final',
    });
    assert.equal(verdict?.severity, 'info');
    assert.match(verdict?.message.pt ?? '', /ALPHANUMERIC/);
  });

  it('recomenda versões com correções', () => {
    const verdict = evaluateDependency(find('validation-br'), {
      name: 'validation-br',
      spec: '1.5.2',
    });
    assert.equal(verdict?.severity, 'info');
    assert.match(verdict?.message.pt ?? '', /1\.6\.4/);
  });

  it('trata bibliotecas sem suporte e módulos Go antigos', () => {
    assert.equal(
      evaluateDependency(find('Bogus'), { name: 'Bogus', spec: '35.6.1' })?.severity,
      'info',
    );
    const brdoc = find('github.com/paemuri/brdoc/v3');
    assert.equal(
      evaluateDependency(brdoc, {
        name: 'github.com/paemuri/brdoc',
        spec: 'v1.1.2',
        locked: 'v1.1.2',
      })?.severity,
      'error',
    );
    assert.equal(
      evaluateDependency(brdoc, {
        name: 'github.com/Nhanderu/brdoc/v2',
        spec: 'v2.3.3',
        locked: 'v2.3.3',
      })?.severity,
      'error',
    );
    assert.equal(
      evaluateDependency(brdoc, {
        name: 'github.com/paemuri/brdoc/v3',
        spec: 'v3.0.1',
        locked: 'v3.0.1',
      }),
      undefined,
    );
  });
});

describe('manifestos', () => {
  it('lê package.json com e sem lockfile', () => {
    const withLock = project('npm-lock', {
      'package.json': JSON.stringify({ dependencies: { validator: '^13.0.0' } }, null, 2),
      'package-lock.json': JSON.stringify({
        packages: { 'node_modules/validator': { version: '13.15.35' } },
      }),
    });
    assert.deepEqual(lintProject(withLock), []);
    const withoutLock = project('npm', {
      'package.json': JSON.stringify(
        { devDependencies: { 'cpf-cnpj-validator': '1.0.3' } },
        null,
        2,
      ),
    });
    assert.deepEqual(lintProject(withoutLock), [
      'package.json:3 error cpf-cnpj-validator 1.0.3 não suporta CNPJ alfanumérico; atualize para >= 2.0.0',
    ]);
  });

  it('lê pyproject.toml com poetry.lock', () => {
    const directory = project('poetry', {
      'pyproject.toml':
        '[tool.poetry.dependencies]\npython = "^3.12"\nbrutils = "^2.0"\nFaker = { version = "*", optional = true }\n',
      'poetry.lock':
        '[[package]]\nname = "brutils"\nversion = "2.4.0"\n\n[[package]]\nname = "faker"\nversion = "40.39.0"\n',
    });
    const result = lintProject(directory);
    assert.equal(result.length, 2);
    assert.match(result[0] ?? '', /^pyproject\.toml:3 error brutils 2\.4\.0/);
    assert.match(result[1] ?? '', /^pyproject\.toml:4 info Faker 40\.39\.0 suporta/);
  });

  it('lê PEP 621, Gradle, Composer, Gemfile, go.mod, csproj e pubspec', () => {
    const directory = project('multi', {
      'pyproject.toml':
        '[project]\ndependencies = ["validate-docbr>=1.11", "python-stdnum==2.1"]\n',
      'build.gradle.kts':
        'dependencies {\n  implementation("br.com.caelum.stella:caelum-stella-core:2.2.2")\n  implementation("org.hibernate.validator:hibernate-validator:8.0.2.Final")\n}\n',
      'composer.json': JSON.stringify({ require: { 'respect/validation': '^2.4' } }, null, 2),
      'composer.lock': JSON.stringify({
        packages: [{ name: 'respect/validation', version: '2.4.12' }],
      }),
      Gemfile: "source 'https://rubygems.org'\ngem 'cpf_cnpj', '~> 0.5'\n",
      'go.mod':
        'module x\n\nrequire (\n\tgithub.com/paemuri/brdoc/v3 v3.0.1\n\tgithub.com/Nhanderu/brdoc v1.1.2\n)\n',
      'App.csproj':
        '<Project>\n  <ItemGroup>\n    <PackageReference Include="Bogus" Version="35.6.1" />\n  </ItemGroup>\n</Project>\n',
      'pubspec.yaml': 'name: app\ndependencies:\n  brasil_fields: ^1.17.0\n',
    });
    const result = lintProject(directory);
    const summary = result.map((line) => line.split(' ').slice(0, 2).join(' '));
    assert.deepEqual(summary, [
      'App.csproj:3 info',
      'Gemfile:2 error',
      'build.gradle.kts:3 error',
      'composer.json:3 error',
      'go.mod:5 error',
      'pubspec.yaml:3 warning',
      'pyproject.toml:2 error',
    ]);
    assert.ok(result.some((line) => /python-stdnum 2\.1 não suporta/.test(line)));
  });

  it('resolve propriedades do Maven', () => {
    const directory = project('maven', {
      'pom.xml': [
        '<project>',
        '  <properties><hv.version>9.0.1.Final</hv.version></properties>',
        '  <dependencies>',
        '    <dependency>',
        '      <groupId>org.hibernate.validator</groupId>',
        '      <artifactId>hibernate-validator</artifactId>',
        `      <version>${'$'}{hv.version}</version>`,
        '    </dependency>',
        '  </dependencies>',
        '</project>',
      ].join('\n'),
    });
    const result = lintProject(directory);
    assert.equal(result.length, 1);
    assert.match(result[0] ?? '', /^pom\.xml:6 info .*ALPHANUMERIC/);
  });
});
