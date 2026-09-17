import type { SourceFile } from '../types.js';
import { CODE_LANGUAGES, patternRule } from './engine.js';

const importsBrasilFields = (file: SourceFile): boolean => file.text.includes('brasil_fields');

export const digitOnlyCheck = patternRule(
  {
    id: 'digit-only-check',
    severity: 'error',
    tags: ['validation'],
    docs: {
      title: {
        pt: 'Validação de CNPJ aceita apenas dígitos',
        en: 'CNPJ validation only accepts digits',
      },
      description: {
        pt: 'Checagens como isdigit(), is_numeric(), ISNUMERIC(), StringUtils.isNumeric(), isNaN(), ^\\d+$ ou a regra "numeric|digits:14" do Laravel recusam CNPJs alfanuméricos válidos.',
        en: 'Checks such as isdigit(), is_numeric(), ISNUMERIC(), StringUtils.isNumeric(), isNaN(), ^\\d+$ or Laravel\'s "numeric|digits:14" reject valid alphanumeric CNPJs.',
      },
      fix: {
        pt: 'Valide com a regra alfanumérica (12 posições [0-9A-Z] + 2 dígitos) e o DV por ASCII − 48. Bibliotecas: veja docs/bibliotecas.md.',
        en: 'Validate with the alphanumeric rule (12 [0-9A-Z] positions + 2 digits) and the ASCII − 48 check digits. Libraries: see docs/bibliotecas.md.',
      },
    },
  },
  [
    {
      source: String.raw`\b(?:is_numeric|ctype_digit)\s*\(\s*\$[\w>-]*?{{ID}}`,
      flags: 'i',
      languages: ['php'],
    },
    {
      source: String.raw`{{ID}}\w*(?:\(\))?\s*\.\s*(?:isdigit|isnumeric|isdecimal)\s*\(`,
      flags: 'i',
      languages: ['python'],
    },
    {
      source: String.raw`\b(?:StringUtils|NumberUtils)\s*\.\s*(?:isNumeric|isDigits|isParsable|isCreatable|isNumericSpace)\b{{ARGS_ID}}`,
      flags: 'i',
      languages: ['java', 'kotlin', 'scala', 'groovy', 'markup'],
    },
    {
      source: String.raw`\b(?:isNaN|Number\.isInteger|Number\.isSafeInteger|Number\.isFinite|isFinite|isNumeric|isInt|isNumber|isDecimal)\b{{ARGS_ID}}`,
      languages: ['javascript', 'typescript', 'markup'],
    },
    {
      source: String.raw`{{ID}}\w*\s*\.\s*All\(\s*(?:char|Char)\.IsDigit|{{ID}}\w*\s*\.\s*All\(\s*\w+\s*=>\s*(?:char|Char)\.IsDigit`,
      flags: 'i',
      languages: ['csharp', 'markup'],
    },
    {
      source: String.raw`\bunicode\.IsDigit\b`,
      languages: ['go'],
      scope: { before: 3, after: 3 },
    },
    {
      source: String.raw`CharInSet\(\s*\w+(?:\[\w+\])?\s*,\s*\[\s*'0'\s*\.\.\s*'9'\s*\]|\bin\s*\[\s*'0'\s*\.\.\s*'9'\s*\]`,
      flags: 'i',
      languages: ['delphi'],
      scope: { before: 3, after: 3 },
    },
    {
      source: String.raw`\bIsDigit\s*\(`,
      flags: 'i',
      languages: ['xbase', 'vb'],
      scope: { before: 2, after: 2 },
    },
    {
      source: String.raw`\bISNUMERIC\b{{ARGS_ID}}|{{ID}}\w*["\]]?\s+NOT\s+LIKE\s+'%\[\^0-9\]%'|REGEXP_LIKE\s*\(\s*[\w."]*{{ID}}\w*"?\s*,\s*'\^?\[(?:0-9|\[:digit:\])\]|{{ID}}\w*["\]]?\s+(?:NOT\s+)?(?:RLIKE|REGEXP|~|SIMILAR\s+TO)\s+'\^?(?:\[0-9\]|\\d|\[\[:digit:\]\])|\bTRANSLATE\s*\(\s*[\w."]*{{ID}}\w*"?\s*,\s*'0123456789'`,
      flags: 'i',
    },
    {
      // Laravel: 'cnpj' => 'required|numeric|digits:14'
      source: String.raw`['"]\w*{{ID}}\w*['"]\s*=>\s*(?:\[|['"]).*\b(?:numeric|integer|digits:\s*1[24]|digits_between)\b`,
      flags: 'i',
      languages: ['php'],
    },
    {
      // Rails: validates :cnpj, numericality: true
      source: String.raw`\bvalidates?\b.*:\w*{{ID}}\w*.*\bnumericality\b`,
      flags: 'i',
      languages: ['ruby'],
    },
    {
      // Regex ancorada só de dígitos perto do identificador: /^\d+$/, "^[0-9]*$"
      source: String.raw`\^{{DIGIT}}[+*]\$`,
      languages: CODE_LANGUAGES,
      scope: { before: 1, after: 1 },
      quick: ['^'],
    },
    {
      // Flutter brasil_fields: CNPJValidator é somente numérico
      source: String.raw`\bCNPJValidator\s*\.\s*(?:isValid|strip|format|generate)\b`,
      languages: ['dart'],
      scope: 'none',
      fileFilter: importsBrasilFields,
      message: {
        pt: 'CNPJValidator (brasil_fields) é só numérico; use CnpjAlfanumericoValidator (brasil_fields >= 1.18.0)',
        en: 'CNPJValidator (brasil_fields) is numeric-only; use CnpjAlfanumericoValidator (brasil_fields >= 1.18.0)',
      },
    },
  ],
);
