import { createRuleContext } from '../source.js';
import type { Rule } from '../types.js';
import { CODE_LANGUAGES, type PatternSpec, runPatterns } from './engine.js';

/** Identificadores de chave de acesso de DF-e (NF-e, NFC-e, CT-e, MDF-e, BP-e). */
export const ACCESS_KEY_IDENTIFIERS = [
  'ch_?(?:nfe|nfce|cte|mdfe|bpe|dfe)',
  'chave_?(?:de_?)?acesso',
  'chave_?(?:da_?)?(?:nfe|nf|nfce|cte|mdfe|dfe|nota)',
  'chavenf\\w*',
  'access_?key',
  'nfe_?(?:key|chave)',
  'cte_?chave',
  'chave44',
].join('|');

const SPECS: readonly PatternSpec[] = [
  {
    source: String.raw`{{DIGIT}}\{(?:44|43)\}`,
    languages: CODE_LANGUAGES,
    scope: { before: 2, after: 2 },
    quick: ['44}', '43}'],
  },
  {
    source: String.raw`(?:^|[\s,(.])["'\x60[]?\w*(?:{{ID}})\w*["'\x60\]]?\s+(?:NUMERIC|DECIMAL|NUMBER|DEC)\s*\(\s*4[34]\b`,
    flags: 'i',
    message: {
      pt: 'Chave de acesso armazenada como número; ela passa a conter letras',
      en: 'Access key stored as a number; it now contains letters',
    },
  },
  {
    // Conversão da chave inteira (caractere a caractere é assunto de checksum-numeric-parse)
    source: String.raw`\b(?:BigInt|BigInteger|parseInt|Number|int|Decimal|new\s+BigInteger|new\s+BigDecimal|Long\.parseLong)\b{{ARGS_ID}}\w*\s*[),]`,
    message: {
      pt: 'Chave de acesso convertida para número; ela passa a conter letras',
      en: 'Access key converted to a number; it now contains letters',
    },
  },
  {
    source: String.raw`[\w$]*(?:{{ID}})[\w$]*\??\s*:\s*(?:number|bigint)\b|\b(?:BigInteger|BigDecimal|decimal|Decimal)\s+\w*(?:{{ID}})`,
    flags: 'i',
    languages: ['typescript', 'java', 'csharp', 'kotlin'],
    message: {
      pt: 'Chave de acesso tipada como número; ela passa a conter letras',
      en: 'Access key typed as a number; it now contains letters',
    },
  },
  {
    // Máscara de exibição 9999 9999 ... (11 grupos de 4)
    source: '(?:[09#]{4}[ .-]){10}[09#]{4}',
    languages: CODE_LANGUAGES,
    scope: 'none',
    quick: ['9999 9999', '0000 0000', '#### ####'],
    severity: 'warning',
    message: {
      pt: 'Máscara da chave de acesso aceita apenas dígitos',
      en: 'Access key mask only accepts digits',
    },
  },
];

export const nfeAccessKey: Rule = {
  id: 'nfe-access-key',
  severity: 'error',
  tags: ['nfe', 'dfe', 'fiscal'],
  docs: {
    title: {
      pt: 'Chave de acesso de DF-e tratada como só dígitos',
      en: 'DF-e access key treated as digits only',
    },
    description: {
      pt: 'A chave de acesso (44 posições) da NF-e, NFC-e, CT-e e MDF-e inclui o CNPJ do emitente nas posições 7 a 20. Com o CNPJ alfanumérico (NT 2025.001), a chave passa a ter letras e o DV dela também usa ASCII − 48.',
      en: 'The 44-position access key of NF-e, NFC-e, CT-e and MDF-e embeds the issuer CNPJ at positions 7–20. With the alphanumeric CNPJ (NT 2025.001) the key may contain letters and its check digit also uses ASCII − 48.',
    },
    fix: {
      pt: 'Aceite letras nas posições do CNPJ (ex.: ^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$), guarde a chave como CHAR(44) e calcule o DV convertendo cada caractere para ASCII − 48.',
      en: 'Accept letters at the CNPJ positions (e.g. ^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$), store the key as CHAR(44) and compute the check digit converting each character to ASCII − 48.',
    },
  },
  check(file) {
    return runPatterns(file, createRuleContext(file, ACCESS_KEY_IDENTIFIERS), SPECS);
  },
};
