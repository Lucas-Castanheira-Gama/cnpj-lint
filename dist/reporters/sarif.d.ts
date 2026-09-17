import { type ScanResult } from '../types.js';
/** SARIF 2.1.0, compatível com o GitHub code scanning. */
export declare function reportSarif(result: ScanResult): string;
