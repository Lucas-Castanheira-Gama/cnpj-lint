import { closeSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { applyBaseline, assignFingerprints, readBaseline } from './baseline.js';
import { type ResolvedConfig, resolveConfig } from './config.js';
import { discoverFiles, toPosix } from './files.js';
import { detectLanguages } from './languages.js';
import { RULES } from './rules/index.js';
import { buildIdentifierSource, createRuleContext, createSourceFile } from './source.js';
import { parseSuppressions } from './suppressions.js';
import {
  type Finding,
  type Language,
  localize,
  type Rule,
  type ScanError,
  type ScanResult,
  type Severity,
  type SourceFile,
} from './types.js';

export interface ScanOptions {
  /** Diretório base para caminhos relativos e busca de configuração. Padrão: process.cwd(). */
  cwd?: string;
  /** Arquivos ou diretórios a analisar. Padrão: ["."]. */
  paths?: readonly string[];
  config?: ResolvedConfig;
}

export interface ActiveRule {
  rule: Rule;
  /** Severidade forçada pela configuração. */
  override?: Severity;
}

export function activeRules(config: Pick<ResolvedConfig, 'rules'>): ActiveRule[] {
  return RULES.flatMap((rule) => {
    const setting = config.rules[rule.id];
    if (setting === 'off') return [];
    return [setting ? { rule, override: setting } : { rule }];
  });
}

function isBinary(path: string): boolean {
  const buffer = Buffer.alloc(4096);
  const descriptor = openSync(path, 'r');
  try {
    const bytes = readSync(descriptor, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytes).includes(0);
  } finally {
    closeSync(descriptor);
  }
}

/** Analisa um arquivo já carregado. */
export function scanSource(
  file: SourceFile,
  config: Pick<ResolvedConfig, 'rules' | 'identifiers' | 'locale'>,
): Finding[] {
  const context = createRuleContext(file, buildIdentifierSource(config.identifiers));
  const rules = activeRules(config);
  const suppressed = parseSuppressions(file.lines, new Set(RULES.map((rule) => rule.id)));
  const findings: Finding[] = [];
  for (const { rule, override } of rules) {
    let matches: ReturnType<Rule['check']>;
    try {
      matches = rule.check(file, context);
    } catch (error) {
      throw new Error(`regra ${rule.id} falhou em ${file.path}: ${(error as Error).message}`);
    }
    for (const match of matches) {
      if (suppressed(rule.id, match.line)) continue;
      const text = file.lines[match.line] ?? '';
      findings.push({
        ruleId: rule.id,
        severity: override ?? match.severity ?? rule.severity,
        file: file.path,
        line: match.line + 1,
        column: match.column + 1,
        endColumn: match.column + match.length + 1,
        message: localize(match.message ?? rule.docs.title, config.locale),
        snippet: text.trim().slice(0, 300),
        fingerprint: '',
      });
    }
  }
  return findings.sort(
    (a, b) => a.line - b.line || a.column - b.column || a.ruleId.localeCompare(b.ruleId),
  );
}

/**
 * Analisa um trecho de código em memória, útil em testes e integrações.
 * O nome do arquivo define a linguagem (ex.: "empresa.ts").
 */
export function scanText(
  text: string,
  fileName: string,
  options: { config?: Partial<ResolvedConfig>; languages?: Language[] } = {},
): Finding[] {
  const config = { ...resolveConfig({}), ...options.config };
  const path = toPosix(fileName);
  const languages =
    options.languages ?? detectLanguages(path.split('/').pop() ?? path, config.extensions);
  const file = createSourceFile(path, resolve(fileName), text, languages);
  const findings = scanSource(file, config);
  assignFingerprints(findings);
  return findings;
}

/** Descobre os arquivos, aplica as regras, as supressões e o baseline. */
export function scan(options: ScanOptions = {}): ScanResult {
  const started = performance.now();
  const cwd = resolve(options.cwd ?? process.cwd());
  const config = options.config ?? resolveConfig({});
  const files = discoverFiles(options.paths ?? ['.'], {
    cwd,
    include: config.include,
    exclude: config.exclude,
    gitignore: config.gitignore,
    noDefaultExcludes: !config.defaultExcludes,
  });

  const findings: Finding[] = [];
  const errors: ScanError[] = [];
  let filesScanned = 0;
  for (const absolutePath of files) {
    const fromCwd = relative(cwd, absolutePath);
    const path = toPosix(fromCwd.startsWith('..') || isAbsolute(fromCwd) ? absolutePath : fromCwd);
    const languages = detectLanguages(path.split('/').pop() ?? path, config.extensions);
    if (languages.length === 0 || (languages.length === 1 && languages[0] === 'lockfile')) continue;
    try {
      const size = statSync(absolutePath).size;
      if (size > config.maxFileSize || isBinary(absolutePath)) continue;
      const text = readFileSync(absolutePath, 'utf8');
      const file = createSourceFile(path, absolutePath, text, languages);
      findings.push(...scanSource(file, config));
      filesScanned++;
    } catch (error) {
      errors.push({ file: path, message: (error as Error).message });
    }
  }

  assignFingerprints(findings);
  let result = findings;
  let suppressedByBaseline = 0;
  if (config.baseline) {
    const applied = applyBaseline(findings, readBaseline(resolve(cwd, config.baseline)));
    result = applied.findings;
    suppressedByBaseline = applied.suppressed;
  }

  return {
    findings: result,
    errors,
    filesScanned,
    suppressedByBaseline,
    durationMs: Math.round(performance.now() - started),
    rules: activeRules(config).map((item) => item.rule),
    locale: config.locale,
  };
}
