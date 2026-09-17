import { CODE_LANGUAGES, patternRule } from './engine.js';
/**
 * Expressões regulares que só aceitam dígitos para CNPJ.
 * O formato 2-3-3-4-2 é específico de CNPJ, por isso dispensa o identificador por perto.
 */
export const numericRegex = patternRule({
    id: 'numeric-regex',
    severity: 'error',
    tags: ['validation', 'regex'],
    docs: {
        title: {
            pt: 'Expressão regular de CNPJ aceita apenas dígitos',
            en: 'CNPJ regular expression only accepts digits',
        },
        description: {
            pt: 'Padrões como \\d{14} ou \\d{2}.\\d{3}.\\d{3}/\\d{4}-\\d{2} rejeitam CNPJs alfanuméricos, cujas 12 primeiras posições podem ter letras.',
            en: 'Patterns such as \\d{14} or \\d{2}.\\d{3}.\\d{3}/\\d{4}-\\d{2} reject alphanumeric CNPJs, whose first 12 positions may contain letters.',
        },
        fix: {
            pt: 'Use [0-9A-Z]{12}[0-9]{2} (sem máscara) ou [0-9A-Z]{2}\\.[0-9A-Z]{3}\\.[0-9A-Z]{3}\\/[0-9A-Z]{4}-[0-9]{2} (com máscara), normalizando a entrada para maiúsculas antes.',
            en: 'Use [0-9A-Z]{12}[0-9]{2} (unmasked) or [0-9A-Z]{2}\\.[0-9A-Z]{3}\\.[0-9A-Z]{3}\\/[0-9A-Z]{4}-[0-9]{2} (masked), upper-casing the input first.',
        },
    },
}, [
    {
        // \d{2}.\d{3}.\d{3}/\d{4}-\d{2} e (\d{2})(\d{3})(\d{3})(\d{4})(\d{2})
        source: String.raw `{{DIGIT}}\{2\}.{0,30}?{{DIGIT}}\{3\}.{0,30}?{{DIGIT}}\{3\}.{0,30}?{{DIGIT}}\{4\}.{0,30}?{{DIGIT}}\{2\}`,
        languages: CODE_LANGUAGES,
        scope: 'none',
        quick: ['{4}'],
        message: {
            pt: 'Regex com formato de CNPJ aceita apenas dígitos e rejeita CNPJs alfanuméricos',
            en: 'CNPJ-shaped regex only accepts digits and rejects alphanumeric CNPJs',
        },
    },
    {
        source: String.raw `{{DIGIT}}\{(?:14|12|11,14|14,14|0,14|1,14|12,14)\}`,
        languages: CODE_LANGUAGES,
        scope: { before: 2, after: 2 },
        quick: ['14}', '12}'],
        message: {
            pt: 'Regex exige só dígitos no CNPJ; as 12 primeiras posições podem ter letras',
            en: 'Regex requires digits only in the CNPJ; the first 12 positions may contain letters',
        },
    },
    {
        // Raiz do CNPJ (8 posições) validada como número, com o identificador na mesma linha
        source: String.raw `{{DIGIT}}\{8\}`,
        languages: CODE_LANGUAGES,
        scope: 'line',
        quick: ['{8}'],
        skipIf: /cep|zip|postal/i,
        message: {
            pt: 'Raiz do CNPJ validada só com dígitos; ela também pode ter letras',
            en: 'CNPJ root validated as digits only; it may contain letters too',
        },
    },
    {
        // T-SQL: LIKE '[0-9][0-9][0-9]...'
        source: String.raw `(?:\[0-9\]){8,}`,
        languages: CODE_LANGUAGES,
        scope: { before: 1, after: 1 },
        quick: ['[0-9][0-9]'],
        message: {
            pt: 'Padrão LIKE aceita apenas dígitos no CNPJ',
            en: 'LIKE pattern only accepts digits in the CNPJ',
        },
    },
]);
