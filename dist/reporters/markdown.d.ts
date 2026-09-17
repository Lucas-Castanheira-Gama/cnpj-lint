import { type ScanResult } from '../types.js';
export interface MarkdownOptions {
    /** Máximo de ocorrências listadas individualmente. */
    limit?: number;
    env?: NodeJS.ProcessEnv;
}
/** Relatório em Markdown para resumos de job e comentários de PR. */
export declare function reportMarkdown(result: ScanResult, options?: MarkdownOptions): string;
