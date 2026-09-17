import type { Language, Rule, RuleContext, RuleMatch, Severity, SourceFile, Text } from '../types.js';
/** Token de dígito como aparece no código-fonte de uma regex: \d, \\d, [0-9], [\d]. */
export declare const DIGIT: string;
/** Classe "não dígito": \D, \\D, [^0-9], [^\d], [^[:digit:]]. */
export declare const NON_DIGIT: string;
export interface PatternSpec {
    /**
     * Fonte da regex. Placeholders: `{{ID}}` (identificadores de CNPJ), `{{DIGIT}}`,
     * `{{NON_DIGIT}}` e `{{ARGS_ID}}` (parênteses de chamada cujos argumentos citam um identificador).
     */
    source: string;
    /** Flags da regex (sem `g`). */
    flags?: string;
    languages?: readonly Language[];
    /**
     * Onde o identificador precisa aparecer: `line` (na linha, padrão), `none` (em lugar nenhum)
     * ou uma janela de linhas antes/depois.
     */
    scope?: 'line' | 'none' | {
        before: number;
        after: number;
    };
    /** A próxima declaração (após decoradores e linhas vazias) precisa citar o identificador. */
    nextDeclaration?: boolean;
    /** Descarta a linha quando esta regex casa. */
    skipIf?: RegExp;
    /** Pré-filtro barato: a linha precisa conter ao menos uma destas substrings. */
    quick?: readonly string[];
    /** Permite casar em linhas que são só comentário (ex.: JSDoc). */
    inComments?: boolean;
    fileFilter?: (file: SourceFile) => boolean;
    lineFilter?: (file: SourceFile, context: RuleContext, line: number) => boolean;
    message?: Text;
    severity?: Severity;
}
/** Linhas que falam de quantidade/identificador numérico de CNPJs, e não do CNPJ em si. */
export declare const COUNTER_LIKE: RegExp;
/**
 * Acesso às posições de dígitos verificadores (sempre numéricos): cnpj[12], cnpj.charAt(13),
 * chave[43], valor[-1]... Converter esses caracteres para número é seguro.
 */
export declare const DV_ACCESS: RegExp;
/** Palavras dos identificadores da linha, separando camelCase e snake_case. */
export declare function identifierWords(text: string): string[];
/**
 * Para regras com janela de contexto: descarta a linha quando ela fala de outro campo
 * (ex.: `telefone.replace(/\D/g, '')` logo abaixo da limpeza do CNPJ).
 */
export declare function notAboutOtherField(file: SourceFile, context: RuleContext, line: number): boolean;
/** Torna letras ASCII insensíveis a maiúsculas sem usar a flag `i` (preserva escapes). */
export declare function caseInsensitiveSource(source: string): string;
export declare function runPatterns(file: SourceFile, context: RuleContext, specs: readonly PatternSpec[]): RuleMatch[];
export type RuleMeta = Omit<Rule, 'check'>;
export declare function patternRule(meta: RuleMeta, specs: readonly PatternSpec[]): Rule;
/** Linguagens em que regex e strings aparecem de forma parecida. */
export declare const CODE_LANGUAGES: readonly Language[];
