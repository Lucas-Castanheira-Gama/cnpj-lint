import { COUNTER_LIKE, DV_ACCESS, patternRule } from './engine.js';

const SKIP = new RegExp(`${COUNTER_LIKE.source}|${DV_ACCESS.source}`, 'i');

const SQL_NUMERIC_TYPES =
  'BIGINT|INT|INTEGER|INT2|INT4|INT8|SMALLINT|NUMERIC|DECIMAL|DEC|NUMBER|FLOAT|DOUBLE|REAL|SIGNED|UNSIGNED|MONEY|INT64|FLOAT64';

const HINT = {
  pt: 'Formatação numérica indica que o CNPJ é tratado como número',
  en: 'Numeric formatting suggests the CNPJ is handled as a number',
};

export const numericConversion = patternRule(
  {
    id: 'numeric-conversion',
    severity: 'error',
    tags: ['conversion', 'data-loss'],
    docs: {
      title: {
        pt: 'CNPJ convertido para número',
        en: 'CNPJ converted to a number',
      },
      description: {
        pt: 'parseInt, int(), Long.parseLong, CAST AS BIGINT e afins falham (NaN, exceção) ou corrompem o valor quando o CNPJ tem letras. Também perdem zeros à esquerda.',
        en: 'parseInt, int(), Long.parseLong, CAST AS BIGINT and friends fail (NaN, exceptions) or corrupt the value when the CNPJ has letters. They also drop leading zeros.',
      },
      fix: {
        pt: 'Trate o CNPJ sempre como texto de 14 caracteres. Para ordenar ou comparar, use a string normalizada (maiúsculas, sem máscara).',
        en: 'Always handle the CNPJ as a 14-character string. To sort or compare, use the normalized string (upper case, no mask).',
      },
    },
  },
  [
    {
      source: String.raw`\b(?:parseInt|parseFloat|Number|BigInt|Math\.(?:floor|round|trunc|abs))\b{{ARGS_ID}}`,
      languages: ['javascript', 'typescript', 'markup'],
      skipIf: SKIP,
    },
    {
      // Coerção com + unário: const n = +cnpj
      source: String.raw`(?:[=(,:?]|\breturn)\s*\+\s*[\w.$[\]'"]*?{{ID}}\w*\b(?!\s*[+(])`,
      flags: 'i',
      languages: ['javascript', 'typescript'],
      skipIf: SKIP,
    },
    {
      source: String.raw`\b(?:int|float|Decimal|long|np\.int64|numpy\.int64)\b{{ARGS_ID}}`,
      flags: 'i',
      languages: ['python'],
      skipIf: SKIP,
    },
    {
      source: String.raw`\b(?:(?:Integer|Long|Short|Double|Float|BigInteger|BigDecimal)\.(?:parseInt|parseLong|parseShort|parseDouble|parseFloat|valueOf)|new\s+(?:BigInteger|BigDecimal|Long|Integer|Double))\b{{ARGS_ID}}`,
      flags: 'i',
      languages: ['java', 'kotlin', 'scala', 'groovy', 'markup'],
      skipIf: SKIP,
    },
    {
      source: String.raw`{{ID}}\w*(?:\(\))?[?!]*\.(?:toLong|toInt|toBigInteger|toBigDecimal|toDouble|toLongOrNull|toIntOrNull|toULong)\b`,
      flags: 'i',
      languages: ['kotlin', 'scala', 'groovy'],
      skipIf: SKIP,
    },
    {
      source: String.raw`\b(?:Convert\.To(?:Int64|Int32|UInt64|Decimal|Double|Int16)|(?:long|ulong|int|uint|decimal|double|Int64|UInt64|Int32|Decimal|Double|BigInteger)\.(?:Try)?Parse)\b{{ARGS_ID}}`,
      languages: ['csharp', 'markup'],
      skipIf: SKIP,
    },
    {
      source: String.raw`\bstrconv\.(?:Atoi|ParseInt|ParseUint|ParseFloat)\b{{ARGS_ID}}|\.SetString\(\s*\w*{{ID}}`,
      flags: 'i',
      languages: ['go'],
      skipIf: SKIP,
    },
    {
      source: String.raw`\b(?:intval|floatval|doubleval)\b{{ARGS_ID}}|\(\s*(?:int|integer|float|double)\s*\)\s*\$[\w>-]*?{{ID}}`,
      flags: 'i',
      languages: ['php'],
      skipIf: SKIP,
    },
    {
      source: String.raw`{{ID}}\w*[)\]]?\.(?:to_i|to_f|to_d|to_r)\b|\b(?:Integer|Float|BigDecimal)\b{{ARGS_ID}}`,
      flags: 'i',
      languages: ['ruby'],
      skipIf: SKIP,
    },
    {
      source: String.raw`\b(?:int|double|num|BigInt)\.(?:parse|tryParse)\b{{ARGS_ID}}`,
      flags: 'i',
      languages: ['dart'],
      skipIf: SKIP,
    },
    {
      source: String.raw`\b(?:Int|Int64|UInt64|Double|Decimal|NSNumber)\b{{ARGS_ID}}`,
      languages: ['swift'],
      skipIf: SKIP,
    },
    {
      source: String.raw`{{ID}}\w*\s*(?:\.\s*trim\(\)\s*)?\.\s*parse::<\s*(?:u|i)(?:32|64|128)\s*>`,
      flags: 'i',
      languages: ['rust'],
      skipIf: SKIP,
    },
    {
      source: String.raw`\b(?:StrToInt64|StrToInt|StrToFloat|StrToCurr|StrToInt64Def|StrToIntDef|StrToFloatDef|TryStrToInt64|TryStrToInt|TryStrToFloat|StrToUInt64)\b{{ARGS_ID}}|{{ID}}\w*['"]?\s*\)?\s*\.\s*(?:AsLargeInt|AsInteger|AsFloat|AsCurrency|AsBCD|AsExtended|AsLongWord|AsSingle)\b`,
      flags: 'i',
      languages: ['delphi', 'delphi-form'],
      skipIf: SKIP,
    },
    {
      source: String.raw`\b(?:CLng|CLngLng|CDbl|CDec|CInt|CCur|CSng|Val)\b{{ARGS_ID}}`,
      flags: 'i',
      languages: ['vb', 'xbase'],
      skipIf: SKIP,
    },
    {
      // Harbour/ADVPL: StrZero(nCnpj, 14), Str(nCnpj, 14)
      source: String.raw`\b(?:StrZero|Str)\s*\(\s*\w*{{ID}}\w*\s*,\s*1[24]\b`,
      flags: 'i',
      languages: ['xbase'],
      message: HINT,
    },
    {
      source: String.raw`\b(?:CAST|TRY_CAST|SAFE_CAST)\s*\((?:[^()]|\([^()]*\)){0,120}?{{ID}}(?:[^()]|\([^()]*\)){0,60}?\bAS\s+(?:${SQL_NUMERIC_TYPES})\b`,
      flags: 'i',
      skipIf: SKIP,
    },
    {
      source: String.raw`\b(?:CONVERT|TRY_CONVERT)\s*\(\s*(?:${SQL_NUMERIC_TYPES})\b(?:[^()]|\([^()]*\)){0,120}?{{ID}}|\bTO_NUMBER{{ARGS_ID}}|{{ID}}\w*["\]]?\s*::\s*(?:bigint|int8|int4|int|integer|numeric|decimal|float8|money)\b`,
      flags: 'i',
      skipIf: SKIP,
    },
    {
      source: String.raw`\bTO_CHAR\s*\((?:[^()]|\([^()]*\)){0,120}?{{ID}}(?:[^()]|\([^()]*\)){0,60}?'0{8,}`,
      flags: 'i',
      message: HINT,
    },
    {
      // printf/format com %014d, f"{cnpj:014d}", "{0:00000000000000}", ToString("00000000000000")
      source: String.raw`%0?\.?14(?:ll|l|I64)?[du]\b|:0?14d\}|\{0:0{14}\}|ToString\(\s*@?"(?:0{14}|00\\{0,2}\.000\\{0,2}\.000\\{0,2}/0000\\{0,2}-00)"|FormatFloat\(\s*'(?:0{14}|00"?\.)|DecimalFormat\(\s*"0{14}"`,
      scope: { before: 1, after: 1 },
      quick: ['14', '0000'],
      message: HINT,
    },
    {
      source: String.raw`{{ID}}\w*\s*\.\s*toString\(\s*\)\s*\.\s*padStart\(\s*14|String\(\s*[\w.$[\]'"]*{{ID}}\w*\s*\)\s*\.\s*padStart\(\s*14|\bstr\(\s*[\w.[\]'"]*{{ID}}\w*\s*\)\s*\.\s*zfill\(\s*14`,
      flags: 'i',
      severity: 'warning',
      message: HINT,
    },
  ],
);
