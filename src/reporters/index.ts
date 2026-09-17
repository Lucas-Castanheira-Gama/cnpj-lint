import type { ScanResult } from '../types.js';
import { reportGithub } from './github.js';
import { reportJson } from './json.js';
import { reportMarkdown } from './markdown.js';
import { reportPretty } from './pretty.js';
import { reportSarif } from './sarif.js';

export const FORMATS = ['pretty', 'json', 'sarif', 'markdown', 'github'] as const;
export type Format = (typeof FORMATS)[number];

export interface ReportOptions {
  color?: boolean;
  verbose?: boolean;
}

export function report(result: ScanResult, format: Format, options: ReportOptions = {}): string {
  switch (format) {
    case 'json':
      return reportJson(result);
    case 'sarif':
      return reportSarif(result);
    case 'markdown':
      return reportMarkdown(result);
    case 'github':
      return reportGithub(result);
    default:
      return reportPretty(result, {
        color: options.color ?? false,
        verbose: options.verbose ?? false,
      });
  }
}

export { countFindings } from './summary.js';
export { reportGithub, reportJson, reportMarkdown, reportPretty, reportSarif };
