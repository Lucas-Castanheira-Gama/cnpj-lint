import type { ScanResult } from '../types.js';
import { reportGithub } from './github.js';
import { reportJson } from './json.js';
import { reportMarkdown } from './markdown.js';
import { reportPretty } from './pretty.js';
import { reportSarif } from './sarif.js';
export declare const FORMATS: readonly ['pretty', 'json', 'sarif', 'markdown', 'github'];
export type Format = (typeof FORMATS)[number];
export interface ReportOptions {
    color?: boolean;
    verbose?: boolean;
}
export declare function report(result: ScanResult, format: Format, options?: ReportOptions): string;
export { countFindings } from './summary.js';
export { reportGithub, reportJson, reportMarkdown, reportPretty, reportSarif };
