import type { Language, RuleContext, SourceFile } from './types.js';
export declare const DEFAULT_IDENTIFIERS: readonly ['cnpj', 'cgc'];
/** Monta a alternância de identificadores (sem grupos de captura) para uso nas regras. */
export declare function buildIdentifierSource(extra?: readonly string[]): string;
export declare function splitLines(text: string): string[];
export declare function createSourceFile(path: string, absolutePath: string, text: string, languages: Iterable<Language>): SourceFile;
/** Heurística de linha que contém apenas comentário, por família de linguagem. */
export declare function isCommentLine(line: string, languages: ReadonlySet<Language>): boolean;
export declare function createRuleContext(file: SourceFile, identifierSource: string): RuleContext;
