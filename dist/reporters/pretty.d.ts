import { type ScanResult } from '../types.js';
export interface PrettyOptions {
    color: boolean;
    verbose: boolean;
}
export declare function reportPretty(result: ScanResult, options: PrettyOptions): string;
