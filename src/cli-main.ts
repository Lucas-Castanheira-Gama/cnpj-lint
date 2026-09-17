import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { assignFingerprints, writeBaseline } from './baseline.js';
import {
  formatCnpj,
  generateCnpj,
  isAlphanumericCnpj,
  isValidCnpj,
  normalizeCnpj,
} from './cnpj.js';
import {
  CONFIG_FILES,
  ConfigError,
  type FailOn,
  loadConfig,
  resolveConfig,
  type UserConfig,
} from './config.js';
import { FORMATS, type Format, report } from './reporters/index.js';
import { countFindings } from './reporters/summary.js';
import { RULES } from './rules/index.js';
import { scan } from './scanner.js';
import { type Locale, localize, type RuleSetting, SEVERITY_ORDER } from './types.js';
import { REPOSITORY_URL, VERSION } from './version.js';

export interface CliIO {
  stdout(text: string): void;
  stderr(text: string): void;
  cwd: string;
  env: NodeJS.ProcessEnv;
  isTTY: boolean;
}

export const EXIT_OK = 0;
export const EXIT_FINDINGS = 1;
export const EXIT_USAGE = 2;

class UsageError extends Error {}

const HELP_PT = `cnpj-lint ${VERSION}
Encontra os pontos do código que quebram com o CNPJ alfanumérico.

Uso:
  cnpj-lint [scan] [caminhos...] [opções]   analisa arquivos e diretórios (padrão: .)
  cnpj-lint validate <cnpj...>              valida CNPJs (use --file para ler de um arquivo)
  cnpj-lint generate [--count N]            gera CNPJs válidos para testes
  cnpj-lint rules                           lista as regras
  cnpj-lint init                            cria ${CONFIG_FILES[0]}

Opções de scan:
  -f, --format <formato>      pretty (padrão), json, sarif, markdown, github
  -o, --output <arquivo>      grava o relatório em arquivo
      --fail-on <nível>       error (padrão), warning, info ou none
  -c, --config <arquivo>      arquivo de configuração JSON
      --rule <id=nível>       ajusta uma regra: off, info, warning, error (repetível)
      --identifier <nome>     nome extra de campo de CNPJ, ex.: nr_insc (repetível)
      --include <glob>        analisa apenas caminhos que casam (repetível)
      --exclude <glob>        ignora caminhos (repetível)
      --no-gitignore          não usa git ls-files / .gitignore
      --no-default-excludes   não ignora node_modules, dist, build, vendor...
      --baseline <arquivo>    oculta ocorrências já registradas
      --update-baseline       grava o baseline com as ocorrências atuais
      --max-file-size <bytes> ignora arquivos maiores (padrão: 2 MiB)
  -q, --quiet                 mostra apenas erros
  -v, --verbose               mostra trecho e correção sugerida
      --locale <pt-BR|en>     idioma das mensagens
      --no-color              desativa cores

Opções de validate/generate:
      --file <arquivo>        um CNPJ por linha (validate)
      --strict                exige formato canônico (validate)
  -n, --count <n>             quantidade (generate, padrão 1)
      --numeric               gera apenas dígitos (generate)
      --formatted             aplica a máscara (generate)
      --root <8 caracteres>   raiz fixa (generate)

Documentação: ${REPOSITORY_URL}
`;

const HELP_EN = `cnpj-lint ${VERSION}
Finds the code that breaks with Brazil's alphanumeric CNPJ.

Usage:
  cnpj-lint [scan] [paths...] [options]   scan files and directories (default: .)
  cnpj-lint validate <cnpj...>            validate CNPJs (use --file to read from a file)
  cnpj-lint generate [--count N]          generate valid CNPJs for tests
  cnpj-lint rules                         list rules
  cnpj-lint init                          create ${CONFIG_FILES[0]}

Run with --locale pt-BR for the complete option list in Portuguese; options are the same.
Documentation: ${REPOSITORY_URL}
`;

function useColor(io: CliIO, flags: { color?: boolean; 'no-color'?: boolean }): boolean {
  if (flags['no-color'] || io.env.NO_COLOR !== undefined) return false;
  if (flags.color || (io.env.FORCE_COLOR !== undefined && io.env.FORCE_COLOR !== '0')) return true;
  return io.isTTY && io.env.TERM !== 'dumb';
}

function parseRuleOptions(values: readonly string[]): Record<string, RuleSetting> {
  const rules: Record<string, RuleSetting> = {};
  const known = new Set(RULES.map((rule) => rule.id));
  for (const value of values) {
    const [id, setting] = value.split('=');
    if (!id || !known.has(id)) throw new UsageError(`Regra desconhecida em --rule: ${value}`);
    if (!['off', 'info', 'warning', 'error'].includes(setting ?? '')) {
      throw new UsageError(`Nível inválido em --rule ${value}; use off, info, warning ou error.`);
    }
    rules[id] = setting as RuleSetting;
  }
  return rules;
}

function choice<T extends string>(
  value: string | undefined,
  options: readonly T[],
  flag: string,
): T | undefined {
  if (value === undefined) return undefined;
  if (!options.includes(value as T)) {
    throw new UsageError(`Valor inválido para ${flag}: ${value}. Opções: ${options.join(', ')}.`);
  }
  return value as T;
}

const OPTIONS = {
  format: { type: 'string', short: 'f' },
  output: { type: 'string', short: 'o' },
  'fail-on': { type: 'string' },
  config: { type: 'string', short: 'c' },
  rule: { type: 'string', multiple: true },
  identifier: { type: 'string', multiple: true },
  include: { type: 'string', multiple: true },
  exclude: { type: 'string', multiple: true },
  'no-gitignore': { type: 'boolean' },
  'no-default-excludes': { type: 'boolean' },
  baseline: { type: 'string' },
  'update-baseline': { type: 'boolean' },
  'max-file-size': { type: 'string' },
  quiet: { type: 'boolean', short: 'q' },
  verbose: { type: 'boolean', short: 'v' },
  locale: { type: 'string' },
  color: { type: 'boolean' },
  'no-color': { type: 'boolean' },
  file: { type: 'string' },
  strict: { type: 'boolean' },
  count: { type: 'string', short: 'n' },
  numeric: { type: 'boolean' },
  formatted: { type: 'boolean' },
  root: { type: 'string' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean' },
} as const;

type Flags = ReturnType<
  typeof parseArgs<{ options: typeof OPTIONS; allowPositionals: true }>
>['values'];

function runScan(paths: string[], flags: Flags, io: CliIO): number {
  const loaded = loadConfig(io.cwd, flags.config);
  const maxFileSize =
    flags['max-file-size'] === undefined ? undefined : Number(flags['max-file-size']);
  if (maxFileSize !== undefined && (!Number.isFinite(maxFileSize) || maxFileSize <= 0)) {
    throw new UsageError('--max-file-size deve ser um número positivo de bytes.');
  }
  const locale = choice<Locale>(flags.locale, ['pt-BR', 'en'], '--locale');
  const failOn = choice<FailOn>(
    flags['fail-on'],
    ['error', 'warning', 'info', 'none'],
    '--fail-on',
  );
  const overrides: UserConfig = {
    ...(flags.include ? { include: flags.include } : {}),
    ...(flags.exclude ? { exclude: flags.exclude } : {}),
    ...(flags.identifier ? { identifiers: flags.identifier } : {}),
    ...(flags.rule ? { rules: parseRuleOptions(flags.rule) } : {}),
    ...(flags['no-gitignore'] ? { gitignore: false } : {}),
    ...(flags['no-default-excludes'] ? { defaultExcludes: false } : {}),
    ...(flags.baseline && !flags['update-baseline'] ? { baseline: flags.baseline } : {}),
    ...(maxFileSize ? { maxFileSize } : {}),
    ...(locale ? { locale } : {}),
    ...(failOn ? { failOn } : {}),
  };
  const config = resolveConfig(loaded.config, overrides, {
    ...(loaded.path ? { path: loaded.path } : {}),
    warnings: loaded.warnings,
  });
  if (flags['update-baseline']) delete config.baseline;
  for (const warning of config.warnings) io.stderr(`cnpj-lint: ${warning}\n`);

  const format = choice<Format>(flags.format, FORMATS, '--format') ?? 'pretty';
  const result = scan({ cwd: io.cwd, paths, config });
  if (flags.quiet) {
    result.findings = result.findings.filter((finding) => finding.severity === 'error');
  }

  if (flags['update-baseline']) {
    const target = resolve(
      io.cwd,
      flags.baseline ?? loaded.config.baseline ?? 'cnpj-lint-baseline.json',
    );
    assignFingerprints(result.findings);
    writeBaseline(target, result.findings);
    io.stdout(
      config.locale === 'en'
        ? `Baseline written with ${result.findings.length} finding(s): ${target}\n`
        : `Baseline gravado com ${result.findings.length} ocorrência(s): ${target}\n`,
    );
    return EXIT_OK;
  }

  const output = report(result, format, {
    color: !flags.output && useColor(io, flags),
    verbose: flags.verbose ?? false,
  });
  if (flags.output) {
    writeFileSync(resolve(io.cwd, flags.output), output);
    const counts = countFindings(result.findings);
    io.stderr(
      config.locale === 'en'
        ? `cnpj-lint: ${counts.total} finding(s) written to ${flags.output}\n`
        : `cnpj-lint: ${counts.total} ocorrência(s) gravada(s) em ${flags.output}\n`,
    );
  } else {
    io.stdout(output);
  }

  if (config.failOn === 'none') return EXIT_OK;
  const threshold = SEVERITY_ORDER[config.failOn];
  return result.findings.some((finding) => SEVERITY_ORDER[finding.severity] >= threshold)
    ? EXIT_FINDINGS
    : EXIT_OK;
}

function runValidate(values: string[], flags: Flags, io: CliIO): number {
  const inputs = [...values];
  if (flags.file) {
    const path = resolve(io.cwd, flags.file);
    if (!existsSync(path)) throw new UsageError(`Arquivo não encontrado: ${flags.file}`);
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const value = line.trim();
      if (value && !value.startsWith('#')) inputs.push(value);
    }
  }
  if (inputs.length === 0) throw new UsageError('Informe ao menos um CNPJ ou --file.');
  const strict = flags.strict ?? false;
  const results = inputs.map((input) => {
    const valid = isValidCnpj(input, { strict });
    return {
      input,
      valid,
      normalized: normalizeCnpj(input),
      ...(valid ? { formatted: formatCnpj(input), alphanumeric: isAlphanumericCnpj(input) } : {}),
    };
  });
  if (flags.format === 'json') {
    io.stdout(`${JSON.stringify(results, null, 2)}\n`);
  } else {
    const en = flags.locale === 'en';
    for (const item of results) {
      if (item.valid) {
        const kind = item.alphanumeric
          ? en
            ? 'alphanumeric'
            : 'alfanumérico'
          : en
            ? 'numeric'
            : 'numérico';
        io.stdout(`✔ ${item.input}  →  ${item.formatted} (${kind})\n`);
      } else {
        io.stdout(`✖ ${item.input}  ${en ? 'invalid' : 'inválido'}\n`);
      }
    }
    const invalid = results.filter((item) => !item.valid).length;
    io.stdout(
      en
        ? `\n${results.length - invalid} valid, ${invalid} invalid\n`
        : `\n${results.length - invalid} válido(s), ${invalid} inválido(s)\n`,
    );
  }
  return results.every((item) => item.valid) ? EXIT_OK : EXIT_FINDINGS;
}

function runGenerate(flags: Flags, io: CliIO): number {
  const count = flags.count === undefined ? 1 : Number(flags.count);
  if (!Number.isInteger(count) || count < 1 || count > 100_000) {
    throw new UsageError('--count deve ser um inteiro entre 1 e 100000.');
  }
  const values: string[] = [];
  for (let index = 0; index < count; index++) {
    values.push(
      generateCnpj({
        alphanumeric: !flags.numeric,
        formatted: flags.formatted ?? false,
        ...(flags.root ? { root: flags.root } : {}),
      }),
    );
  }
  io.stdout(
    flags.format === 'json' ? `${JSON.stringify(values, null, 2)}\n` : `${values.join('\n')}\n`,
  );
  return EXIT_OK;
}

function runRules(flags: Flags, io: CliIO): number {
  const locale: Locale = flags.locale === 'en' ? 'en' : 'pt-BR';
  if (flags.format === 'json') {
    io.stdout(
      `${JSON.stringify(
        RULES.map((rule) => ({
          id: rule.id,
          severity: rule.severity,
          tags: rule.tags,
          title: localize(rule.docs.title, locale),
          description: localize(rule.docs.description, locale),
          fix: localize(rule.docs.fix, locale),
        })),
        null,
        2,
      )}\n`,
    );
    return EXIT_OK;
  }
  const width = Math.max(...RULES.map((rule) => rule.id.length));
  for (const rule of RULES) {
    io.stdout(
      `${rule.id.padEnd(width)}  ${rule.severity.padEnd(7)}  ${localize(rule.docs.title, locale)}\n`,
    );
  }
  return EXIT_OK;
}

function runInit(io: CliIO): number {
  const target = resolve(io.cwd, CONFIG_FILES[0]);
  if (existsSync(target)) throw new UsageError(`${CONFIG_FILES[0]} já existe.`);
  const config = {
    $schema: 'https://raw.githubusercontent.com/Lucas-Castanheira-Gama/cnpj-lint/main/schema.json',
    exclude: ['**/test/fixtures/**'],
    identifiers: [],
    rules: Object.fromEntries(RULES.map((rule) => [rule.id, rule.severity])),
    failOn: 'error',
  };
  writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`);
  io.stdout(`Criado ${CONFIG_FILES[0]}\n`);
  return EXIT_OK;
}

export function run(argv: readonly string[], io: CliIO): number {
  try {
    const { values: flags, positionals } = parseArgs({
      args: [...argv],
      options: OPTIONS,
      allowPositionals: true,
      strict: true,
    });
    if (flags.version) {
      io.stdout(`${VERSION}\n`);
      return EXIT_OK;
    }
    const english =
      flags.locale === 'en' || (flags.locale === undefined && io.env.CNPJ_LINT_LOCALE === 'en');
    if (flags.help) {
      io.stdout(english ? HELP_EN : HELP_PT);
      return EXIT_OK;
    }
    const [command, ...rest] = positionals;
    switch (command) {
      case 'validate':
        return runValidate(rest, flags, io);
      case 'generate':
        return runGenerate(flags, io);
      case 'rules':
        return runRules(flags, io);
      case 'init':
        return runInit(io);
      case 'help':
        io.stdout(english ? HELP_EN : HELP_PT);
        return EXIT_OK;
      case 'scan':
        return runScan(rest, flags, io);
      default:
        return runScan(positionals, flags, io);
    }
  } catch (error) {
    const message = (error as Error).message;
    if (
      error instanceof UsageError ||
      error instanceof ConfigError ||
      (error as { code?: string }).code?.startsWith('ERR_PARSE_ARGS')
    ) {
      io.stderr(`cnpj-lint: ${message}\nUse --help para ver as opções.\n`);
      return EXIT_USAGE;
    }
    io.stderr(`cnpj-lint: ${message}\n`);
    return EXIT_USAGE;
  }
}
