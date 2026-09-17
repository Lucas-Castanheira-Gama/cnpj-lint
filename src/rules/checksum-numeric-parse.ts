import { createRuleContext } from '../source.js';
import type { Rule, RuleContext, RuleMatch, SourceFile, Text } from '../types.js';
import { COUNTER_LIKE, DV_ACCESS } from './engine.js';
import { ACCESS_KEY_IDENTIFIERS } from './nfe-access-key.js';

/** Pesos do DV do CNPJ (módulo 11), em lista ou string. */
const WEIGHTS = String.raw`(?:5\s*,\s*4\s*,\s*3\s*,\s*2\s*,\s*9\s*,\s*8\s*,\s*7\s*,\s*6\s*,\s*5\s*,\s*4\s*,\s*3\s*,\s*2|['"]6?543298765432['"])`;
const CNPJ_WEIGHTS = new RegExp(WEIGHTS);
const ASSIGNMENT = /(?<![=!<>:])(?::=|=)(?![=>])/;
/** Palavras que aparecem antes do nome em declarações e não são o nome da variável. */
const DECLARATION_WORDS = new Set(
  'const let var val final static private public protected internal readonly constant int long integer number short byte array of list tuple uint int32 int64 dim as new string'.split(
    ' ',
  ),
);

/**
 * Nome da variável que recebe os pesos (`const PESOS = [5, 4, ...]`, `int[] pesos = {...}`,
 * `pesos_dv1 CONSTANT int[] := ARRAY[...]`): último identificador antes da atribuição que não
 * seja palavra de declaração.
 */
function weightsVariable(text: string): string | undefined {
  const assignment = ASSIGNMENT.exec(text);
  if (!assignment || !CNPJ_WEIGHTS.test(text.slice(assignment.index))) return undefined;
  const names = (text.slice(0, assignment.index).match(/[A-Za-z_$][\w$]*/g) ?? []).filter(
    (name) => !DECLARATION_WORDS.has(name.toLowerCase()),
  );
  return names.at(-1);
}
/** Idioma clássico: `if (pos < 2) pos = 9;` */
const RESET_TO_NINE = /(?:<|<=)\s*2\b/;
const ASSIGN_NINE = /(?::=|=)\s*9\b/;
/** Pesos crescentes de 2 a 9 (chave de acesso e variações): `if (peso > 9) peso = 2;` */
const RESET_TO_TWO = /(?:>|>=)\s*9\b|={2,3}\s*10\b/;
const ASSIGN_TWO = /(?::=|=)\s*2\b/;

/** Conversões que falham ou erram com letras (sensível a maiúsculas). */
const NUMERIC_PARSE =
  /\bparseInt\s*\(|\bparseFloat\s*\(|\bNumber\s*\(|\.map\(\s*(?:Number|parseInt|int)\s*\)|\bmap\(\s*int\b|\bint\s*\(|Integer\.(?:parseInt|valueOf)\s*\(|Long\.parseLong\s*\(|Character\.(?:getNumericValue|digit)\s*\(|\.digitToInt\s*\(|(?:char|Char)\.GetNumericValue\s*\(|\b(?:int|Int32|long|Int64)\.(?:Try)?Parse\s*\(|Convert\.ToInt(?:16|32|64)\s*\(|strconv\.(?:Atoi|ParseInt)\s*\(|\bintval\s*\(|\(int\)\s*\$|\.to_i\b|\bInteger\s*\(|\bint\.(?:parse|tryParse)\s*\(|\.wholeNumberValue\b|\.to_digit\s*\(|::int\b/;

/** Conversões em linguagens que não diferenciam maiúsculas (Delphi, VB, xBase, COBOL, SQL). */
const NUMERIC_PARSE_INSENSITIVE =
  /(?<![.$\w])(?:StrToInt(?:64)?(?:Def)?|Val|CInt|CLng)\s*\(|FUNCTION\s+NUMVAL|CAST\s*\(\s*SUBSTR(?:ING)?\b[^)]*\)\s*AS\s+(?:INT|INTEGER|NUMERIC|SMALLINT|NUMBER)\b|TO_NUMBER\s*\(\s*SUBSTR/i;

/** Multiplicação implícita de caractere (JS, PHP, Python, Ruby): numeros.charAt(i) * pos */
const IMPLICIT_MULTIPLY =
  /charAt\([^)]*\)\s*\*|(?:cnpj|cgc|numeros?|digitos?|base|raiz|chave)\w*\s*\[\s*\$?\w+(?:\s*[-+]\s*\w+)?\s*\]\s*\*\s*\$?\w/i;
const IMPLICIT_LANGUAGES = ['javascript', 'typescript', 'php', 'python', 'ruby'] as const;

/** Sinais de que a rotina já usa a conversão ASCII − 48. */
const ASCII_AWARE =
  /charCodeAt|codePointAt|\bord\s*\(|\bOrd\s*\(|\bASCII\s*\(|\bAscW?\s*\(|-\s*48\b|-\s*'0'|-\s*b'0'|\.code\s*-|\bToAscii|Encoding\.ASCII|UNICODE\s*\(|FUNCTION\s+ORD\b/i;

interface Region {
  start: number;
  end: number;
  accessKey: boolean;
  /** Variável dos pesos, para não confundir `int(PESOS[i])` com parse do CNPJ. */
  weights?: string;
}

const CNPJ_MESSAGE: Text = {
  pt: 'Rotina de DV do CNPJ converte caracteres com parse numérico; letras viram NaN, 0 ou exceção',
  en: 'CNPJ check-digit routine parses characters as numbers; letters become NaN, 0 or an exception',
};

const ACCESS_KEY_MESSAGE: Text = {
  pt: 'Rotina de DV da chave de acesso converte caracteres com parse numérico; a chave passa a ter letras do CNPJ',
  en: 'Access-key check-digit routine parses characters as numbers; keys now carry CNPJ letters',
};

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function findRegions(
  file: SourceFile,
  context: RuleContext,
  accessKeyContext: RuleContext,
): Region[] {
  const regions: Region[] = [];
  const last = file.lines.length - 1;
  const add = (start: number, end: number, accessKey: boolean, weights?: string) =>
    regions.push({
      start: Math.max(0, start),
      end: Math.min(last, end),
      accessKey,
      ...(weights ? { weights } : {}),
    });
  const near = (index: number, pattern: RegExp): boolean => {
    for (let offset = -3; offset <= 3; offset++) {
      if (pattern.test(file.lines[index + offset] ?? '')) return true;
    }
    return false;
  };

  file.lines.forEach((text, index) => {
    if (context.isComment(index)) return;
    if (CNPJ_WEIGHTS.test(text)) {
      const name = weightsVariable(text);
      if (!name) {
        add(index - 2, index + 12, false);
        return;
      }
      // Pesos usados na própria linha (ex.: soma = sum(int(c) * p for ... in zip(cnpj, (5, 4, ...))))
      add(index - 2, index + 2, false, name);
      const usage = new RegExp(`(?<![\\w$])${escapeRegex(name)}(?![\\w$])`);
      let used = false;
      file.lines.forEach((other, otherIndex) => {
        if (otherIndex !== index && usage.test(other)) {
          used = true;
          add(otherIndex - 3, otherIndex + 3, false, name);
        }
      });
      if (!used) add(index - 2, index + 12, false, name);
    } else if (
      RESET_TO_NINE.test(text) &&
      near(index, ASSIGN_NINE) &&
      context.hasIdentifier(index, 25, 25)
    ) {
      add(index - 6, index + 6, false);
    } else if (RESET_TO_TWO.test(text) && near(index, ASSIGN_TWO)) {
      if (accessKeyContext.hasIdentifier(index, 25, 25)) add(index - 6, index + 6, true);
      else if (context.hasIdentifier(index, 10, 10)) add(index - 6, index + 6, false);
    }
  });

  // Junta regiões sobrepostas.
  regions.sort((a, b) => a.start - b.start);
  const merged: Region[] = [];
  for (const region of regions) {
    const previous = merged.at(-1);
    if (previous && region.start <= previous.end) {
      previous.end = Math.max(previous.end, region.end);
      previous.accessKey = previous.accessKey && region.accessKey;
      if (!previous.weights && region.weights) previous.weights = region.weights;
    } else {
      merged.push({ ...region });
    }
  }
  return merged;
}

export const checksumNumericParse: Rule = {
  id: 'checksum-numeric-parse',
  severity: 'error',
  tags: ['checksum', 'validation'],
  docs: {
    title: {
      pt: 'Cálculo do DV converte caracteres com parse numérico',
      en: 'Check-digit routine parses characters as numbers',
    },
    description: {
      pt: 'O DV do CNPJ alfanumérico (e da chave de acesso de DF-e) usa o valor ASCII − 48 de cada caractere ("A" = 17). parseInt/int()/Character.getNumericValue/char.GetNumericValue/intval/.to_i retornam NaN, erro ou valores diferentes para letras.',
      en: 'The alphanumeric CNPJ check digits (and the DF-e access key) use each character\'s ASCII code − 48 ("A" = 17). parseInt/int()/Character.getNumericValue/char.GetNumericValue/intval/.to_i return NaN, errors or different values for letters.',
    },
    fix: {
      pt: "Converta com o código ASCII: JS c.charCodeAt(0) - 48; Python ord(c) - 48; Java/C# c - '0'; Go int(r - '0'); PHP ord($c) - 48; Delphi Ord(c) - 48; SQL ASCII(c) - 48. Veja examples/.",
      en: "Convert using the ASCII code: JS c.charCodeAt(0) - 48; Python ord(c) - 48; Java/C# c - '0'; Go int(r - '0'); PHP ord($c) - 48; Delphi Ord(c) - 48; SQL ASCII(c) - 48. See examples/.",
    },
  },
  check(file, context) {
    if (file.languages.has('json') || file.languages.has('yaml') || file.languages.has('xml')) {
      return [];
    }
    const accessKeyContext = createRuleContext(file, ACCESS_KEY_IDENTIFIERS);
    const implicit = IMPLICIT_LANGUAGES.some((language) => file.languages.has(language));
    const matches: RuleMatch[] = [];
    for (const region of findRegions(file, context, accessKeyContext)) {
      const lines = file.lines.slice(region.start, region.end + 1);
      if (lines.some((line) => ASCII_AWARE.test(line))) continue;
      const weightsArgument = region.weights
        ? new RegExp(`^\\s*\\(?\\s*${escapeRegex(region.weights)}(?![\\w$])`)
        : undefined;
      lines.forEach((text, offset) => {
        const line = region.start + offset;
        if (context.isComment(line) || DV_ACCESS.test(text) || COUNTER_LIKE.test(text)) return;
        const match =
          NUMERIC_PARSE.exec(text) ??
          NUMERIC_PARSE_INSENSITIVE.exec(text) ??
          (implicit ? IMPLICIT_MULTIPLY.exec(text) : null);
        if (!match) return;
        const after = text.slice(match.index + match[0].length);
        if (weightsArgument?.test(after)) return;
        matches.push({
          line,
          column: match.index,
          length: match[0].length,
          message: region.accessKey ? ACCESS_KEY_MESSAGE : CNPJ_MESSAGE,
        });
      });
    }
    return matches;
  },
};
