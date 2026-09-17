/**
 * cnpj-lint: encontre os pontos do seu código que quebram com o CNPJ alfanumérico.
 *
 * @example
 * import { scan, reportPretty, isValidCnpj } from 'cnpj-lint';
 * const result = scan({ paths: ['src'] });
 * console.log(reportPretty(result, { color: false, verbose: true }));
 */
export { applyBaseline, readBaseline, writeBaseline } from './baseline.js';
export { CNPJ_FORMATTED_PATTERN, CNPJ_LENGTH, CNPJ_PATTERN, type CnpjValidationOptions, calculateCnpjCheckDigits, formatCnpj, type GenerateCnpjOptions, generateCnpj, isAlphanumericCnpj, isValidCnpj, normalizeCnpj, } from './cnpj.js';
export { ConfigError, type FailOn, loadConfig, type ResolvedConfig, resolveConfig, type UserConfig, validateConfig, } from './config.js';
export { reportGithub } from './reporters/github.js';
export { FORMATS, type Format, report } from './reporters/index.js';
export { reportJson } from './reporters/json.js';
export { reportMarkdown } from './reporters/markdown.js';
export { reportPretty } from './reporters/pretty.js';
export { reportSarif } from './reporters/sarif.js';
export { countFindings } from './reporters/summary.js';
export { KNOWN_PACKAGES, type KnownPackage } from './rules/dependencies.js';
export { findRule, RULES } from './rules/index.js';
export { type ScanOptions, scan, scanText } from './scanner.js';
export type { Finding, Language, Locale, Rule, RuleSetting, ScanError, ScanResult, Severity, Text, } from './types.js';
export { VERSION } from './version.js';
