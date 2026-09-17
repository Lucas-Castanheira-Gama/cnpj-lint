import type {
  Language,
  Rule,
  RuleContext,
  RuleMatch,
  Severity,
  SourceFile,
  Text,
} from '../types.js';

/** Token de dígito como aparece no código-fonte de uma regex: \d, \\d, [0-9], [\d]. */
export const DIGIT = String.raw`(?:\\{1,2}d|\[0-9\]|\[\\{1,2}d\])`;
/** Classe "não dígito": \D, \\D, [^0-9], [^\d], [^[:digit:]]. */
export const NON_DIGIT = String.raw`(?:\\{1,2}D|\[\^0-9\]|\[\^\\{1,2}d\]|\[\^\[:digit:\]\])`;

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
  scope?: 'line' | 'none' | { before: number; after: number };
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
export const COUNTER_LIKE =
  /(?:\b(?:len|count|size|sizeof)\s*\(|\.(?:size|count)\b|(?:qtd|qtde|quant|quantidade|total|count|contador|cont|tot)[_-]?(?:de[_-]?)?cnpjs?|cnpjs?[_-]?(?:qtd|qtde|count|total|len|length|size|idx|index|id|ids|seq|pk|fk)\b|\bid[_-]?cnpj)/i;

/**
 * Acesso às posições de dígitos verificadores (sempre numéricos): cnpj[12], cnpj.charAt(13),
 * chave[43], valor[-1]... Converter esses caracteres para número é seguro.
 */
export const DV_ACCESS =
  /\[\s*(?:12|13|43|-1|-2)\s*(?::\s*)?\]|(?:charAt|substring|substr|slice|Substring|at)\(\s*(?:12|13|43|-1|-2)\s*[,)]/;

/** Palavras que indicam outro campo/documento (telefone, CEP, CPF...). */
const OTHER_FIELD_WORDS = new Set([
  'telefone',
  'tel',
  'phone',
  'fone',
  'celular',
  'whatsapp',
  'cep',
  'zip',
  'zipcode',
  'postal',
  'cpf',
  'rg',
  'pis',
  'nis',
  'cnh',
  'placa',
  'renavam',
  'cartao',
  'card',
  'boleto',
  'barras',
  'barcode',
  'agencia',
  'conta',
  'passaporte',
]);

/** Palavras dos identificadores da linha, separando camelCase e snake_case. */
export function identifierWords(text: string): string[] {
  return (text.match(/[A-Za-z][A-Za-z0-9]*/g) ?? []).flatMap((token) =>
    token
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(' '),
  );
}

/**
 * Para regras com janela de contexto: descarta a linha quando ela fala de outro campo
 * (ex.: `telefone.replace(/\D/g, '')` logo abaixo da limpeza do CNPJ).
 */
export function notAboutOtherField(file: SourceFile, context: RuleContext, line: number): boolean {
  if (context.hasIdentifier(line, 0, 0)) return true;
  return !identifierWords(file.lines[line] ?? '').some((word) => OTHER_FIELD_WORDS.has(word));
}

const compiled = new WeakMap<PatternSpec, Map<string, RegExp>>();

/** Torna letras ASCII insensíveis a maiúsculas sem usar a flag `i` (preserva escapes). */
export function caseInsensitiveSource(source: string): string {
  let result = '';
  for (let index = 0; index < source.length; index++) {
    const char = source.charAt(index);
    if (char === '\\') {
      result += char + source.charAt(index + 1);
      index++;
    } else if (/[a-z]/i.test(char)) {
      result += `[${char.toLowerCase()}${char.toUpperCase()}]`;
    } else {
      result += char;
    }
  }
  return result;
}

function compile(spec: PatternSpec, identifierSource: string): RegExp {
  let byIdentifier = compiled.get(spec);
  if (!byIdentifier) {
    byIdentifier = new Map();
    compiled.set(spec, byIdentifier);
  }
  const cached = byIdentifier.get(identifierSource);
  if (cached) return cached;
  const insensitive = spec.flags?.includes('i') ?? false;
  const id = `(?:${insensitive ? identifierSource : caseInsensitiveSource(identifierSource)})`;
  const source = spec.source
    .replaceAll('{{ARGS_ID}}', String.raw`\s*\((?:[^()]|\([^()]*\)){0,120}?${id}`)
    .replaceAll('{{ID}}', id)
    .replaceAll('{{NON_DIGIT}}', NON_DIGIT)
    .replaceAll('{{DIGIT}}', DIGIT);
  const regex = new RegExp(source, spec.flags ?? '');
  byIdentifier.set(identifierSource, regex);
  return regex;
}

const DECORATOR_OR_TRIVIA = /^\s*(?:$|@|#\[|\[[A-Z]|\/\/|\/\*|\*)/;

function nextDeclarationHasIdentifier(
  file: SourceFile,
  context: RuleContext,
  line: number,
): boolean {
  if (context.hasIdentifier(line, 0, 0)) return true;
  for (let index = line + 1; index < Math.min(file.lines.length, line + 6); index++) {
    const text = file.lines[index] ?? '';
    if (DECORATOR_OR_TRIVIA.test(text)) continue;
    return context.hasIdentifier(index, 0, 0);
  }
  return false;
}

function appliesTo(spec: PatternSpec, file: SourceFile): boolean {
  if (spec.languages && !spec.languages.some((language) => file.languages.has(language))) {
    return false;
  }
  return spec.fileFilter ? spec.fileFilter(file) : true;
}

export function runPatterns(
  file: SourceFile,
  context: RuleContext,
  specs: readonly PatternSpec[],
): RuleMatch[] {
  const matches: RuleMatch[] = [];
  const seen = new Set<number>();
  for (const spec of specs) {
    if (!appliesTo(spec, file)) continue;
    const regex = compile(spec, context.identifierSource);
    const scope = spec.scope ?? 'line';
    const insensitive = spec.flags?.includes('i') ?? false;
    const quick = insensitive ? spec.quick?.map((item) => item.toLowerCase()) : spec.quick;
    file.lines.forEach((text, line) => {
      if (seen.has(line)) return;
      if (!spec.inComments && context.isComment(line)) return;
      if (quick && quick.length > 0) {
        const haystack = insensitive ? text.toLowerCase() : text;
        if (!quick.some((item) => haystack.includes(item))) return;
      }
      if (scope === 'line' && !context.hasIdentifier(line, 0, 0)) return;
      if (typeof scope === 'object') {
        if (!context.hasIdentifier(line, scope.before, scope.after)) return;
        if (!notAboutOtherField(file, context, line)) return;
      }
      if (spec.skipIf?.test(text)) return;
      const match = regex.exec(text);
      if (!match) return;
      if (spec.nextDeclaration && !nextDeclarationHasIdentifier(file, context, line)) return;
      if (spec.lineFilter && !spec.lineFilter(file, context, line)) return;
      seen.add(line);
      matches.push({
        line,
        column: match.index,
        length: Math.max(1, match[0].length),
        ...(spec.message ? { message: spec.message } : {}),
        ...(spec.severity ? { severity: spec.severity } : {}),
      });
    });
  }
  return matches.sort((a, b) => a.line - b.line || a.column - b.column);
}

export type RuleMeta = Omit<Rule, 'check'>;

export function patternRule(meta: RuleMeta, specs: readonly PatternSpec[]): Rule {
  return { ...meta, check: (file, context) => runPatterns(file, context, specs) };
}

/** Linguagens em que regex e strings aparecem de forma parecida. */
export const CODE_LANGUAGES: readonly Language[] = [
  'javascript',
  'typescript',
  'markup',
  'python',
  'java',
  'kotlin',
  'scala',
  'groovy',
  'csharp',
  'vb',
  'c',
  'go',
  'php',
  'ruby',
  'rust',
  'dart',
  'swift',
  'elixir',
  'sql',
  'cobol',
  'delphi',
  'delphi-form',
  'xbase',
  'xml',
  'xsd',
  'json',
  'yaml',
  'toml',
  'graphql',
  'protobuf',
  'prisma',
  'shell',
];
