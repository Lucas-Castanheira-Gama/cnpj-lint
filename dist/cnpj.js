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
export const CNPJ_LENGTH = 14;
/** CNPJ sem máscara: 12 caracteres [0-9A-Z] seguidos de 2 dígitos. */
export const CNPJ_PATTERN = /^[0-9A-Z]{12}[0-9]{2}$/;
/** CNPJ com máscara canônica: XX.XXX.XXX/XXXX-DV. */
export const CNPJ_FORMATTED_PATTERN = /^[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-[0-9]{2}$/;
const BASE_PATTERN = /^[0-9A-Z]{12}$/;
const ANY_14_PATTERN = /^[0-9A-Z]{14}$/;
const REPEATED_PATTERN = /^(.)\1*$/;
const MASK_CHARACTERS = /[./\-\s]/g;
const WEIGHTS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const WEIGHTS_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const DIGITS = '0123456789';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHANUMERIC = DIGITS + LETTERS;
const ASCII_ZERO = 48;
/**
 * Remove a máscara (".", "/", "-" e espaços) e converte letras ASCII para maiúsculas.
 * Outros caracteres são preservados (inclusive "ı" e "ſ", que toUpperCase() transformaria
 * em "I" e "S"), para que entradas inválidas continuem inválidas.
 */
export function normalizeCnpj(value) {
    return value.replace(MASK_CHARACTERS, '').replace(/[a-z]/g, (char) => char.toUpperCase());
}
function checkDigit(chars, weights) {
    let sum = 0;
    weights.forEach((weight, index) => {
        sum += (chars.charCodeAt(index) - ASCII_ZERO) * weight;
    });
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
}
/**
 * Calcula os dois dígitos verificadores de uma base com 12 caracteres (com ou sem máscara).
 *
 * @example calculateCnpjCheckDigits('12.ABC.345/01DE') // '35'
 * @throws {TypeError} se a base não tiver exatamente 12 caracteres [0-9A-Z].
 */
export function calculateCnpjCheckDigits(base) {
    const normalized = normalizeCnpj(base);
    if (!BASE_PATTERN.test(normalized)) {
        throw new TypeError(`Base de CNPJ inválida: esperados 12 caracteres [0-9A-Z], recebido "${base}".`);
    }
    const dv1 = checkDigit(normalized, WEIGHTS_DV1);
    const dv2 = checkDigit(`${normalized}${dv1}`, WEIGHTS_DV2);
    return `${dv1}${dv2}`;
}
/**
 * Valida um CNPJ numérico ou alfanumérico.
 * Valores que não são `string` retornam `false`: CNPJ não deve ser tratado como número.
 *
 * @example isValidCnpj('12.ABC.345/01DE-35') // true
 */
export function isValidCnpj(value, options = {}) {
    if (typeof value !== 'string')
        return false;
    if (options.strict && !CNPJ_PATTERN.test(value) && !CNPJ_FORMATTED_PATTERN.test(value)) {
        return false;
    }
    const cnpj = normalizeCnpj(value);
    if (!CNPJ_PATTERN.test(cnpj) || REPEATED_PATTERN.test(cnpj))
        return false;
    return calculateCnpjCheckDigits(cnpj.slice(0, 12)) === cnpj.slice(12);
}
/** Indica se o CNPJ (com ou sem máscara) contém letras. Não valida os dígitos verificadores. */
export function isAlphanumericCnpj(value) {
    return /[A-Z]/.test(normalizeCnpj(value));
}
/**
 * Aplica a máscara `XX.XXX.XXX/XXXX-DV`. Não valida os dígitos verificadores.
 *
 * @throws {TypeError} se o valor, sem máscara, não tiver 14 caracteres [0-9A-Z].
 */
export function formatCnpj(value) {
    const cnpj = normalizeCnpj(value);
    if (!ANY_14_PATTERN.test(cnpj)) {
        throw new TypeError(`CNPJ inválido para formatação: "${value}".`);
    }
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}
function fixedPart(value, length, name) {
    if (value === undefined)
        return undefined;
    const normalized = normalizeCnpj(value);
    if (normalized.length !== length || !/^[0-9A-Z]+$/.test(normalized)) {
        throw new TypeError(`${name} deve ter ${length} caracteres [0-9A-Z], recebido "${value}".`);
    }
    return normalized;
}
/**
 * Gera um CNPJ válido para testes. Nunca use CNPJs gerados como se fossem reais.
 *
 * @example generateCnpj() // ex.: 'K3P0Z81Q7B2A86'
 * @example generateCnpj({ alphanumeric: false, formatted: true }) // ex.: '48.203.117/0001-07'
 */
export function generateCnpj(options = {}) {
    const { alphanumeric = true, formatted = false, random = Math.random } = options;
    const root = fixedPart(options.root, 8, 'root');
    const order = fixedPart(options.order, 4, 'order');
    const alphabet = alphanumeric ? ALPHANUMERIC : DIGITS;
    const pick = (chars) => chars.charAt(Math.min(chars.length - 1, Math.floor(random() * chars.length)));
    const randomPart = (length) => Array.from({ length }, () => pick(alphabet)).join('');
    for (let attempt = 0; attempt < 100; attempt++) {
        const chars = [...(root ?? randomPart(8)), ...(order ?? randomPart(4))];
        const free = chars.map((_, index) => index).filter((index) => (index < 8 ? !root : !order));
        if (alphanumeric && free.length > 0 && !chars.some((char) => LETTERS.includes(char))) {
            const position = free[Math.min(free.length - 1, Math.floor(random() * free.length))];
            if (position !== undefined)
                chars[position] = pick(LETTERS);
        }
        const base = chars.join('');
        if (REPEATED_PATTERN.test(base)) {
            if (free.length === 0)
                break;
            continue;
        }
        const cnpj = `${base}${calculateCnpjCheckDigits(base)}`;
        return formatted ? formatCnpj(cnpj) : cnpj;
    }
    throw new Error('Não foi possível gerar um CNPJ com as opções informadas.');
}
