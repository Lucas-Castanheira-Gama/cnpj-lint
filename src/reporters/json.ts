import type { ScanResult } from '../types.js';
import { VERSION } from '../version.js';
import { countFindings } from './summary.js';

export function reportJson(result: ScanResult): string {
  const counts = countFindings(result.findings);
  return `${JSON.stringify(
    {
      tool: 'cnpj-lint',
      version: VERSION,
      summary: {
        errors: counts.error,
        warnings: counts.warning,
        infos: counts.info,
        total: counts.total,
        filesScanned: result.filesScanned,
        suppressedByBaseline: result.suppressedByBaseline,
        durationMs: result.durationMs,
      },
      findings: result.findings,
      errors: result.errors,
    },
    null,
    2,
  )}\n`;
}
