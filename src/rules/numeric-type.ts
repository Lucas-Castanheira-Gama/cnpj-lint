import type { RuleContext, SourceFile } from '../types.js';
import { COUNTER_LIKE, patternRule } from './engine.js';

const count = (text: string, char: string): number => text.split(char).length - 1;

/** JSON: a chave do objeto que contém a linha `"type": "integer"` cita o identificador? */
function jsonParentMentionsIdentifier(
  file: SourceFile,
  context: RuleContext,
  line: number,
): boolean {
  const current = file.lines[line] ?? '';
  const typeIndex = current.search(/"type"\s*:/);
  const before = current.slice(0, typeIndex);
  let depth = count(before, '}') - count(before, '{');
  if (depth < 0) return context.hasIdentifier(line, 0, 0);
  for (let index = line - 1; index >= Math.max(0, line - 8); index--) {
    const text = file.lines[index] ?? '';
    depth += count(text, '}') - count(text, '{');
    if (depth < 0) return new RegExp(context.identifierSource, 'i').test(text.split('{')[0] ?? '');
    if (/"name"\s*:/.test(text) && depth === 0 && context.hasIdentifier(index, 0, 0)) return true;
  }
  return false;
}

const indentation = (text: string): number => /^\s*/.exec(text)?.[0].length ?? 0;

/** YAML: a chave-pai (indentação menor) ou um irmão `name:` (Liquibase) cita o identificador? */
function yamlParentMentionsIdentifier(
  file: SourceFile,
  context: RuleContext,
  line: number,
): boolean {
  const own = indentation(file.lines[line] ?? '');
  for (let index = line - 1; index >= Math.max(0, line - 8); index--) {
    const text = file.lines[index] ?? '';
    if (text.trim() === '' || text.trimStart().startsWith('#')) continue;
    const level = indentation(text.replace(/^(\s*)- /, '$1  '));
    if (level === own && /^\s*-?\s*name\s*:/.test(text)) return context.hasIdentifier(index, 0, 0);
    if (level < own) return context.hasIdentifier(index, 0, 0);
  }
  return false;
}

/** DFM: o `Name = '...'` mais próximo acima do `DataType` precisa citar o identificador. */
function nearestNameMentionsIdentifier(
  file: SourceFile,
  context: RuleContext,
  line: number,
): boolean {
  for (let index = line - 1; index >= Math.max(0, line - 4); index--) {
    if (/^\s*(?:Field)?Name\s*=/i.test(file.lines[index] ?? '')) {
      return context.hasIdentifier(index, 0, 0);
    }
  }
  return false;
}

const NUMERIC_JVM_C_TYPES = [
  'long',
  'Long',
  'int',
  'Integer',
  'short',
  'Short',
  'BigInteger',
  'BigDecimal',
  'double',
  'Double',
  'float',
  'Float',
  'ulong',
  'uint',
  'decimal',
  'Decimal',
  'Int64',
  'UInt64',
  'Int32',
  'UInt32',
  'num',
  'BigInt',
  String.raw`long\s+long`,
  String.raw`unsigned\s+long(?:\s+long)?`,
  'int64_t',
  'uint64_t',
].join('|');

export const numericType = patternRule(
  {
    id: 'numeric-type',
    severity: 'error',
    tags: ['types', 'schema'],
    docs: {
      title: {
        pt: 'CNPJ declarado com tipo numérico',
        en: 'CNPJ declared with a numeric type',
      },
      description: {
        pt: 'Campos, parâmetros, DTOs e contratos (TypeScript, Java, C#, Go, Python, PHP, Delphi, COBOL, Protobuf, GraphQL, OpenAPI...) que tipam o CNPJ como número não comportam letras.',
        en: 'Fields, parameters, DTOs and contracts (TypeScript, Java, C#, Go, Python, PHP, Delphi, COBOL, Protobuf, GraphQL, OpenAPI...) that type the CNPJ as a number cannot hold letters.',
      },
      fix: {
        pt: 'Use string/String/char[14] (COBOL: PIC X(14); Delphi: string/TStringField; Protobuf/GraphQL/OpenAPI: string) e valide o formato com a regra alfanumérica.',
        en: 'Use string/String/char[14] (COBOL: PIC X(14); Delphi: string/TStringField; Protobuf/GraphQL/OpenAPI: string) and validate with the alphanumeric rule.',
      },
    },
  },
  [
    {
      // TypeScript: cnpj: number, cnpj?: bigint
      source: String.raw`[\w$]*{{ID}}[\w$]*\??\s*:\s*(?:number|bigint)\b`,
      flags: 'i',
      languages: ['typescript'],
      skipIf: COUNTER_LIKE,
    },
    {
      // JSDoc: @param {number} cnpj
      source: String.raw`@(?:param|property|prop|arg|argument)\s*\{\s*(?:number|bigint)\s*\}\s*\[?[\w.$]*{{ID}}`,
      flags: 'i',
      languages: ['javascript', 'typescript', 'markup'],
      inComments: true,
    },
    {
      // zod, yup, joi, valibot, typebox, effect, vine
      source: String.raw`{{ID}}\w*['"]?\s*:\s*(?:\w+\.pipe\(\s*)?(?:z|zod|yup|Yup|joi|Joi|v|t|Type|S|Schema|vine)\s*\.\s*(?:coerce\s*\.\s*)?(?:number|bigint|int|integer|Number|BigInt|Integer)\b`,
      flags: 'i',
      languages: ['javascript', 'typescript', 'markup'],
    },
    {
      // class-validator / NestJS: @IsNumber() cnpj
      source: String.raw`@(?:IsNumber|IsInt|IsNumberString|IsPositive|IsDecimal|IsNumeric)\s*\(|@ApiProperty(?:Optional)?\s*\(\s*\{[^}]*(?:type\s*:\s*(?:Number|['"](?:number|integer)['"])|example\s*:\s*\d{10,})`,
      languages: ['javascript', 'typescript'],
      scope: 'none',
      nextDeclaration: true,
    },
    {
      // Java, C#, Dart, C/C++, Groovy: Long cnpj; public long Cnpj { get; set; }
      source: String.raw`\b(?:${NUMERIC_JVM_C_TYPES})\??\s+[\w$]*{{ID}}[\w$]*\s*(?:[;=,)]|\(\s*\)|\{\s*get|$)`,
      flags: 'i',
      languages: ['java', 'csharp', 'dart', 'c', 'groovy', 'markup'],
      skipIf: COUNTER_LIKE,
    },
    {
      // Kotlin, Scala, Swift, Rust: val cnpj: Long
      source: String.raw`[\w$]*{{ID}}[\w$]*\s*:\s*(?:Long|Int|Short|BigInteger|BigDecimal|Double|Float|ULong|UInt|Int64|UInt64|Int32|Decimal|NSNumber|NSDecimalNumber|u64|i64|u128|i128|u32|i32|f64|usize)\b`,
      flags: 'i',
      languages: ['kotlin', 'scala', 'swift', 'rust'],
      skipIf: COUNTER_LIKE,
    },
    {
      // Go: Cnpj int64 (campo de struct, var ou parâmetro)
      source: String.raw`(?:^|[\s(,])(?:var\s+)?\w*{{ID}}\w*\s+\*?(?:u?int(?:8|16|32|64)?|float(?:32|64)|big\.Int)\b`,
      flags: 'i',
      languages: ['go'],
      skipIf: COUNTER_LIKE,
    },
    {
      // Python: cnpj: int, cnpj: Mapped[int], cnpj: Optional[int]
      source: String.raw`\b\w*{{ID}}\w*\s*:\s*(?:(?:Optional|Mapped|Annotated)\[\s*)*(?:int|float|Decimal|PositiveInt|NonNegativeInt|StrictInt|conint|condecimal)\b`,
      flags: 'i',
      languages: ['python'],
      skipIf: COUNTER_LIKE,
    },
    {
      // marshmallow, DRF, Django forms, WTForms
      source: String.raw`\b\w*{{ID}}\w*\s*=\s*(?:fields|serializers|forms|ma\.fields|wtforms)\.(?:Integer|Int|Float|Decimal|Number)(?:Field)?\s*\(`,
      flags: 'i',
      languages: ['python'],
    },
    {
      // PHP: int $cnpj, @var int $cnpj, $casts = ['cnpj' => 'integer']
      source: String.raw`(?:\?|\b)(?:int|float|integer)\s+\$\w*{{ID}}|['"]\w*{{ID}}\w*['"]\s*=>\s*['"](?:int|integer|float|double|real|decimal(?::\d+)?)['"]`,
      flags: 'i',
      languages: ['php'],
      inComments: true,
      skipIf: COUNTER_LIKE,
    },
    {
      source: String.raw`\b\w*{{ID}}\w*\s+As\s+(?:Long|LongLong|Integer|Decimal|Double|Currency|Single|Int64|ULong|UInteger)\b`,
      flags: 'i',
      languages: ['vb'],
      skipIf: COUNTER_LIKE,
    },
    {
      // Delphi: FCnpj: Int64; QryCNPJ: TLargeintField; FieldDefs.Add('CNPJ', ftLargeint)
      source: String.raw`\b\w*{{ID}}\w*\s*:\s*(?:Int64|UInt64|Integer|Cardinal|LongInt|LongWord|Double|Extended|Currency|Real|Comp|NativeInt|LargeInt|T(?:Largeint|Integer|Float|BCD|FMTBCD|Currency|SmallInt|Word|LongWord|Single|Extended|Numeric)Field)\b|Add\(\s*'\w*{{ID}}\w*'\s*,\s*ft(?:Largeint|Integer|Float|BCD|FMTBcd|Currency|SmallInt|Word|LongWord|Extended|Single)\b`,
      flags: 'i',
      languages: ['delphi', 'delphi-form'],
      skipIf: COUNTER_LIKE,
    },
    {
      // DFM: FieldName = 'CNPJ' ... DataType = ftLargeint
      source: String.raw`\bDataType\s*=\s*ft(?:Largeint|Integer|Float|BCD|FMTBcd|Currency|SmallInt|Word|LongWord|Extended|Single)\b`,
      flags: 'i',
      languages: ['delphi-form'],
      scope: { before: 4, after: 0 },
      lineFilter: nearestNameMentionsIdentifier,
    },
    {
      // Delphi: function CarregarCnpj(...): Int64;
      source: String.raw`\bfunction\s+[\w.]*{{ID}}\w*\s*(?:\([^)]*\))?\s*:\s*(?:Int64|UInt64|Integer|Cardinal|LongInt|LongWord|Double|Extended|Currency|Real|Comp|NativeInt|LargeInt)\b`,
      flags: 'i',
      languages: ['delphi'],
      skipIf: COUNTER_LIKE,
    },
    {
      // Harbour/ADVPL: Local nCnpj := 0 (prefixo húngaro "n" = numérico), só na declaração
      source: String.raw`\b(?:[Ll][Oo][Cc][Aa][Ll]|[Pp][Rr][Ii][Vv][Aa][Tt][Ee]|[Pp][Uu][Bb][Ll][Ii][Cc]|[Ss][Tt][Aa][Tt][Ii][Cc])\s+(?:\w+(?:\s*:=\s*[^,()]*(?:\([^)]*\))?[^,()]*)?\s*,\s*)*n(?:Cnpj|CNPJ|Cgc|CGC)\w*\s*(?::=|,|$)`,
      languages: ['xbase'],
      skipIf: COUNTER_LIKE,
    },
    {
      // Estrutura DBF {"CNPJ", "N", 14, 0} e TCSetField(..., "CNPJ", "N", ...)
      source: String.raw`\{\s*["']\w*{{ID}}\w*["']\s*,\s*["']N["']|TCSetField\([^)]*["']\w*{{ID}}\w*["']\s*,\s*["']N["']`,
      flags: 'i',
      languages: ['xbase'],
    },
    {
      // COBOL: 05 WS-CNPJ PIC 9(14).
      source: String.raw`\b[\w-]*{{ID}}[\w-]*\s+PIC(?:TURE)?\s+(?:IS\s+)?S?9`,
      flags: 'i',
      languages: ['cobol'],
      skipIf: COUNTER_LIKE,
      message: {
        pt: 'Campo COBOL de CNPJ com PIC 9 (numérico); use PIC X(14)',
        en: 'COBOL CNPJ field declared as PIC 9 (numeric); use PIC X(14)',
      },
    },
    {
      source: String.raw`\b(?:u?int(?:32|64)|s?fixed(?:32|64)|sint(?:32|64)|double|float)\s+\w*{{ID}}\w*\s*=\s*\d+`,
      flags: 'i',
      languages: ['protobuf'],
    },
    {
      // GraphQL: cnpj: Int!
      source: String.raw`\b\w*{{ID}}\w*\s*(?:\([^)]*\))?\s*:\s*\[?\s*(?:Int|Float|BigInt|Long|Decimal|BigDecimal)\b`,
      flags: 'i',
      languages: ['graphql', 'javascript', 'typescript'],
      skipIf: COUNTER_LIKE,
    },
    {
      // JSON Schema / OpenAPI / Avro na mesma linha
      source: String.raw`"\w*{{ID}}\w*"\s*:\s*\{\s*"type"\s*:\s*(?:\[\s*)?"(?:integer|number)"|"name"\s*:\s*"\w*{{ID}}\w*"\s*,\s*"type"\s*:\s*(?:\[\s*"null"\s*,\s*)?"(?:long|int|double|float)"`,
      flags: 'i',
      languages: ['json'],
    },
    {
      // JSON Schema / OpenAPI / Avro em várias linhas
      source: String.raw`"type"\s*:\s*(?:\[\s*"null"\s*,\s*)?"(?:integer|number|long|int)"`,
      languages: ['json'],
      scope: { before: 8, after: 0 },
      lineFilter: jsonParentMentionsIdentifier,
    },
    {
      // YAML (OpenAPI, AsyncAPI, Liquibase): cnpj: { type: integer } ou bloco
      source: String.raw`\b\w*{{ID}}\w*\s*:\s*\{[^}]*\btype\s*:\s*['"]?(?:integer|number)\b`,
      flags: 'i',
      languages: ['yaml'],
    },
    {
      source: String.raw`^\s*type\s*:\s*['"]?(?:integer|number|long|bigint|BIGINT|NUMERIC|DECIMAL|NUMBER)\b`,
      flags: 'i',
      languages: ['yaml'],
      scope: { before: 8, after: 0 },
      lineFilter: yamlParentMentionsIdentifier,
    },
    {
      // XSD: <xs:element name="CNPJ" type="xs:long"/>
      source: String.raw`<(?:xs|xsd):(?:element|attribute)\b[^>]*name="\w*{{ID}}\w*"[^>]*type="(?:xs|xsd):(?:long|int|integer|decimal|unsignedLong|positiveInteger|nonNegativeInteger|double|float)"`,
      flags: 'i',
      languages: ['xsd', 'xml'],
    },
  ],
);
