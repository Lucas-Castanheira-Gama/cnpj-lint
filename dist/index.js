/**
 * cnpj-lint: encontre os pontos do seu código que quebram com o CNPJ alfanumérico.
 *
 * @example
 * import { scan, reportPretty, isValidCnpj } from 'cnpj-lint';
 * const result = scan({ paths: ['src'] });
 * console.log(reportPretty(result, { color: false, verbose: true }));
 */
export { applyBaseline, readBaseline, writeBaseline } from './baseline.js';
export { CNPJ_FORMATTED_PATTERN, CNPJ_LENGTH, CNPJ_PATTERN, calculateCnpjCheckDigits, formatCnpj, generateCnpj, isAlphanumericCnpj, isValidCnpj, normalizeCnpj, } from './cnpj.js';
export { ConfigError, loadConfig, resolveConfig, validateConfig, } from './config.js';
export { reportGithub } from './reporters/github.js';
export { FORMATS, report } from './reporters/index.js';
export { reportJson } from './reporters/json.js';
export { reportMarkdown } from './reporters/markdown.js';
export { reportPretty } from './reporters/pretty.js';
export { reportSarif } from './reporters/sarif.js';
export { countFindings } from './reporters/summary.js';
export { KNOWN_PACKAGES } from './rules/dependencies.js';
export { findRule, RULES } from './rules/index.js';
export { scan, scanText } from './scanner.js';
export { VERSION } from './version.js';
