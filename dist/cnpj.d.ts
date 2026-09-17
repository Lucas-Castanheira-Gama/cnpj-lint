/**
 * Implementação de referência do CNPJ (numérico e alfanumérico), sem dependências.
 *
 * Regras (IN RFB 2.229/2024 e "Perguntas e Respostas — CNPJ alfanumérico", Receita Federal):
 * - 14 posições: 12 alfanuméricas (0–9 e A–Z maiúsculas) + 2 dígitos verificadores numéricos;
 * - DV por módulo 11, convertendo cada caractere para (código ASCII − 48): '0'→0 … '9'→9, 'A'→17 … 'Z'→42;
 * - todas as 26 letras devem ser aceitas na validação (P&R 45);
 * - a máscara continua XX.XXX.XXX/XXXX-DV (P&R 21).
 */
/** Quantidade de caracteres de um CNPJ sem máscara. */
export declare const CNPJ_LENGTH = 14;
/** CNPJ sem máscara: 12 caracteres [0-9A-Z] seguidos de 2 dígitos. */
export declare const CNPJ_PATTERN: RegExp;
/** CNPJ com máscara canônica: XX.XXX.XXX/XXXX-DV. */
export declare const CNPJ_FORMATTED_PATTERN: RegExp;
/**
 * Remove a máscara (".", "/", "-" e espaços) e converte letras ASCII para maiúsculas.
 * Outros caracteres são preservados (inclusive "ı" e "ſ", que toUpperCase() transformaria
 * em "I" e "S"), para que entradas inválidas continuem inválidas.
 */
export declare function normalizeCnpj(value: string): string;
/**
 * Calcula os dois dígitos verificadores de uma base com 12 caracteres (com ou sem máscara).
 *
 * @example calculateCnpjCheckDigits('12.ABC.345/01DE') // '35'
 * @throws {TypeError} se a base não tiver exatamente 12 caracteres [0-9A-Z].
 */
export declare function calculateCnpjCheckDigits(base: string): string;
export interface CnpjValidationOptions {
    /**
     * Aceita apenas os formatos canônicos: 14 caracteres sem máscara ou `XX.XXX.XXX/XXXX-DV`,
     * com letras maiúsculas. Padrão: `false` (remove máscara/espaços e aceita minúsculas).
     */
    strict?: boolean;
}
/**
 * Valida um CNPJ numérico ou alfanumérico.
 * Valores que não são `string` retornam `false`: CNPJ não deve ser tratado como número.
 *
 * @example isValidCnpj('12.ABC.345/01DE-35') // true
 */
export declare function isValidCnpj(value: unknown, options?: CnpjValidationOptions): boolean;
/** Indica se o CNPJ (com ou sem máscara) contém letras. Não valida os dígitos verificadores. */
export declare function isAlphanumericCnpj(value: string): boolean;
/**
 * Aplica a máscara `XX.XXX.XXX/XXXX-DV`. Não valida os dígitos verificadores.
 *
 * @throws {TypeError} se o valor, sem máscara, não tiver 14 caracteres [0-9A-Z].
 */
export declare function formatCnpj(value: string): string;
export interface GenerateCnpjOptions {
    /** Gera caracteres alfanuméricos e garante ao menos uma letra quando possível. Padrão: `true`. */
    alphanumeric?: boolean;
    /** Retorna com máscara. Padrão: `false`. */
    formatted?: boolean;
    /** Raiz fixa (8 caracteres), útil para gerar filiais da mesma empresa. */
    root?: string;
    /** Número de ordem fixo (4 caracteres). */
    order?: string;
    /** Fonte de aleatoriedade em [0, 1). Padrão: `Math.random`. */
    random?: () => number;
}
/**
 * Gera um CNPJ válido para testes. Nunca use CNPJs gerados como se fossem reais.
 *
 * @example generateCnpj() // ex.: 'K3P0Z81Q7B2A86'
 * @example generateCnpj({ alphanumeric: false, formatted: true }) // ex.: '48.203.117/0001-07'
 */
export declare function generateCnpj(options?: GenerateCnpjOptions): string;
