import { fileURLToPath } from 'node:url';
import { resolveConfig } from '../src/config.js';
import { scanText } from '../src/scanner.js';
import type { Finding } from '../src/types.js';

/** Raiz do repositório (os testes compilados ficam em .test-build/test). */
export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const FIXTURES = fileURLToPath(new URL('../../test/fixtures/', import.meta.url));

/** Analisa um trecho e devolve "linha:regra" para cada ocorrência. */
export function lint(code: string, fileName: string, identifiers: string[] = []): string[] {
  return findings(code, fileName, identifiers).map(
    (finding) => `${finding.line}:${finding.ruleId}`,
  );
}

export function findings(code: string, fileName: string, identifiers: string[] = []): Finding[] {
  return scanText(code, fileName, { config: resolveConfig({ identifiers }) });
}

/** Ocorrências de uma regra específica, apenas com o número da linha. */
export function linesOf(code: string, fileName: string, ruleId: string): number[] {
  return findings(code, fileName)
    .filter((finding) => finding.ruleId === ruleId)
    .map((finding) => finding.line);
}
