import type { Finding, Locale, Severity } from '../types.js';
export interface Counts {
    error: number;
    warning: number;
    info: number;
    total: number;
}
export declare function countFindings(findings: readonly Finding[]): Counts;
export declare function severityLabel(severity: Severity, locale: Locale, count?: number): string;
export declare function formatCount(count: number, severity: Severity, locale: Locale): string;
export declare function groupByFile(findings: readonly Finding[]): Map<string, Finding[]>;
