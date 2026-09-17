export type Severity = 'error' | 'warning' | 'info';
export type RuleSetting = Severity | 'off';
export type Locale = 'pt-BR' | 'en';
/** Texto nas duas línguas suportadas. */
export interface Text {
    pt: string;
    en: string;
}
export declare function localize(text: Text, locale: Locale): string;
export declare const SEVERITY_ORDER: Record<Severity, number>;
export type Language = 'javascript' | 'typescript' | 'markup' | 'python' | 'java' | 'kotlin' | 'scala' | 'groovy' | 'csharp' | 'vb' | 'c' | 'go' | 'php' | 'ruby' | 'rust' | 'dart' | 'swift' | 'elixir' | 'sql' | 'cobol' | 'delphi' | 'delphi-form' | 'xbase' | 'xml' | 'xsd' | 'json' | 'yaml' | 'toml' | 'graphql' | 'protobuf' | 'prisma' | 'shell' | 'manifest' | 'lockfile';
export interface SourceFile {
    /** Caminho relativo ao diretório de trabalho, com barras "/". */
    path: string;
    absolutePath: string;
    /** Nome do arquivo em minúsculas. */
    basename: string;
    languages: ReadonlySet<Language>;
    text: string;
    lines: readonly string[];
}
export interface RuleDocs {
    title: Text;
    description: Text;
    fix: Text;
}
export interface RuleMatch {
    /** Índice da linha (base 0). */
    line: number;
    /** Coluna (base 0). */
    column: number;
    length: number;
    message?: Text;
    severity?: Severity;
}
export interface RuleContext {
    /** Identificadores que indicam CNPJ (ex.: cnpj, cgc), como alternância de regex sem grupos. */
    identifierSource: string;
    /** Verdadeiro se alguma linha na janela [line - before, line + after] menciona um identificador. */
    hasIdentifier(line: number, before: number, after: number): boolean;
    /** Verdadeiro se a linha é apenas comentário. */
    isComment(line: number): boolean;
}
export interface Rule {
    id: string;
    severity: Severity;
    docs: RuleDocs;
    tags: readonly string[];
    check(file: SourceFile, context: RuleContext): RuleMatch[];
}
export interface Finding {
    ruleId: string;
    severity: Severity;
    /** Caminho relativo com barras "/". */
    file: string;
    /** Linha (base 1). */
    line: number;
    /** Coluna (base 1). */
    column: number;
    endColumn: number;
    message: string;
    snippet: string;
    fingerprint: string;
}
export interface ScanError {
    file: string;
    message: string;
}
export interface ScanResult {
    findings: Finding[];
    errors: ScanError[];
    filesScanned: number;
    suppressedByBaseline: number;
    durationMs: number;
    rules: readonly Rule[];
    locale: Locale;
}
