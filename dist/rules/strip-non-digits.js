import { CODE_LANGUAGES, NON_DIGIT, runPatterns } from './engine.js';
const HELPER_NAMES = [
    'only_?numbers?',
    'only_?digits?',
    'only_?num',
    'somente_?numeros?',
    'somente_?digitos?',
    'apenas_?numeros?',
    'apenas_?digitos?',
    'so_?numeros?',
    'so_?digitos?',
    'numbers_?only',
    'digits_?only',
    'just_?numbers',
    'remove_?non_?digits?',
    'remove_?non_?numeric',
    'strip_?non_?digits?',
    'remover_?nao_?numericos?',
    'limpar?_?numeros?',
    'extrai[r]?_?numeros?',
    'retorna_?(?:so_?)?numeros?',
    'get_?(?:only_?)?(?:numbers|digits)',
    'keep_?digits',
    'extract_?digits',
    'clean_?number',
    'numeric_?only',
    'fn_?somente_?numeros?',
].join('|');
/** Evita apontar a declaração do helper (ex.: `bool SomenteNumeros(string cnpj)`). */
const NOT_A_DECLARATION = String.raw `(?<!\b(?:function|def|func|fun|sub|procedure|bool|boolean|string|String|void|static|public|private|protected|internal|async|override)\s+)`;
const HELPER_MESSAGE = {
    pt: 'Função que mantém só dígitos aplicada ao CNPJ apaga as letras',
    en: 'Digits-only helper applied to the CNPJ deletes its letters',
};
const SPECS = [
    {
        // replace(/\D/g, ''), re.sub(r'\D', ...), preg_replace('/[^0-9]/', ...), REGEXP_REPLACE(..., '[^0-9]', ...)
        source: String.raw `(?:\b[Rr]eplace(?:All)?\s*\(|\breplace_all\s*\(|\bsub\s*\(|\bgsub!?[\s(]|\bReplaceAllString\s*\(|\bpreg_replace(?:_callback)?\s*\(|\b[Rr][Ee][Gg][Ee][Xx][Pp]_[Rr][Ee][Pp][Ll][Aa][Cc][Ee]\s*\(|\bReplaceRegExpr\s*\(|\bsed\b).{0,80}?{{NON_DIGIT}}`,
        languages: CODE_LANGUAGES,
        scope: { before: 2, after: 2 },
    },
    {
        // Regex "não dígito" criada perto do CNPJ: re.compile(r'\D'), Pattern.compile("[^0-9]"), const RE = /\D/g
        source: String.raw `(?:re\.compile|Pattern\.compile|new\s+Regex|regexp\.MustCompile|regexp\.Compile|new\s+RegExp|TRegEx\.Create)\s*\(\s*@?r?[\x60"']{{NON_DIGIT}}[+*]?[\x60"']|[=:(,]\s*/{{NON_DIGIT}}[+*]?/[gimsuy]*`,
        languages: CODE_LANGUAGES,
        scope: { before: 2, after: 2 },
    },
    {
        source: String.raw `filter\(\s*str\.isdigit|join\(.{0,60}\.isdigit\(\)|re\.findall\(\s*r?['"]\\d`,
        languages: ['python'],
        scope: { before: 2, after: 2 },
    },
    {
        source: String.raw `filter\(\s*Character::isDigit|CharMatcher\.(?:digit|javaDigit|inRange\(\s*'0'\s*,\s*'9'\s*\))\(\)\s*\.retainFrom|StringUtils\.getDigits\(`,
        languages: ['java', 'kotlin', 'scala', 'groovy', 'markup'],
        scope: { before: 2, after: 2 },
    },
    {
        source: String.raw `Where\(\s*(?:char|Char)\.IsDigit\b|Where\(\s*\w+\s*=>\s*(?:char|Char)\.IsDigit\(`,
        languages: ['csharp', 'markup'],
        scope: { before: 2, after: 2 },
    },
    {
        source: 'FILTER_SANITIZE_NUMBER_INT',
        languages: ['php'],
        scope: { before: 2, after: 2 },
    },
    {
        source: String.raw `\.match\(\s*/\\d\+?/g\s*\)|\.split\(\s*(?:''|""|\x60\x60)\s*\)\s*\.filter\(.{0,40}(?:isNaN|/\\d/)`,
        languages: ['javascript', 'typescript', 'markup'],
        scope: { before: 2, after: 2 },
    },
    {
        source: String.raw `\.delete\(\s*['"]\^0-9['"]\s*\)|\.tr\(\s*['"]\^0-9['"]|\.scan\(\s*/\\d/\s*\)\s*\.join`,
        languages: ['ruby'],
        scope: { before: 2, after: 2 },
    },
    {
        source: String.raw `\btr\s+-(?:cd|dc)\s+['"]?(?:0-9|\[:digit:\])`,
        languages: ['shell'],
        scope: { before: 2, after: 2 },
    },
    {
        source: String.raw `CharOnly\(\s*["']0123456789["']`,
        flags: 'i',
        languages: ['xbase'],
        scope: { before: 2, after: 2 },
    },
    {
        // somenteNumeros(cnpj), onlyDigits(form.cnpj), SoNumeros(edtCNPJ.Text)
        source: String.raw `${NOT_A_DECLARATION}\b(?:${HELPER_NAMES}){{ARGS_ID}}`,
        flags: 'i',
        languages: CODE_LANGUAGES,
        message: HELPER_MESSAGE,
    },
    {
        // cnpj.onlyNumbers(), $cnpj->somenteNumeros()
        source: String.raw `{{ID}}\w*\s*(?:\.|->|\?\.)\s*(?:${HELPER_NAMES})\s*\(`,
        flags: 'i',
        languages: CODE_LANGUAGES,
        message: HELPER_MESSAGE,
    },
];
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Regex "não dígito" atribuída a uma variável (em qualquer lugar do arquivo). */
const REGEX_VARIABLE = new RegExp(String.raw `([A-Za-z_$][\w$]*)\s*(?::[^=]*)?(?::=|=)\s*(?:re\.compile|Pattern\.compile|new\s+Regex|regexp\.MustCompile|regexp\.Compile|new\s+RegExp|TRegEx\.Create)?\s*\(?\s*@?r?[\x60"'/]${NON_DIGIT}[+*]?[\x60"'/]`);
/** Usa a variável da regex para limpar um valor ao lado de um identificador de CNPJ. */
function regexVariableMatches(file, context) {
    const names = new Set();
    file.lines.forEach((text, line) => {
        const name = REGEX_VARIABLE.exec(text)?.[1];
        if (name && !context.isComment(line))
            names.add(name);
    });
    if (names.size === 0)
        return [];
    const alternation = [...names].map(escapeRegex).join('|');
    const usage = new RegExp(String.raw `(?<![\w$])(?:${alternation})\s*\.\s*(?:sub|ReplaceAllString|ReplaceAll|Replace|matcher|replace)\s*\(|\.(?:replace|replaceAll|Replace)\s*\(\s*(?:${alternation})(?![\w$])`);
    const matches = [];
    file.lines.forEach((text, line) => {
        if (context.isComment(line) || !context.hasIdentifier(line, 1, 1))
            return;
        const match = usage.exec(text);
        if (match)
            matches.push({ line, column: match.index, length: match[0].length });
    });
    return matches;
}
export const stripNonDigits = {
    id: 'strip-non-digits',
    severity: 'error',
    tags: ['sanitization', 'data-loss'],
    docs: {
        title: {
            pt: 'Limpeza remove tudo que não é dígito do CNPJ',
            en: 'Sanitization strips every non-digit from the CNPJ',
        },
        description: {
            pt: 'Remover \\D ou [^0-9] apaga as letras do CNPJ em silêncio: "12.ABC.345/01DE-35" vira "123450135", um documento corrompido que só falha longe dali.',
            en: 'Removing \\D or [^0-9] silently deletes the CNPJ letters: "12.ABC.345/01DE-35" becomes "123450135", a corrupted value that fails far away from the source.',
        },
        fix: {
            pt: 'Remova apenas a máscara (".", "/", "-" e espaços) e converta para maiúsculas. Ex.: JS cnpj.replace(/[^0-9A-Za-z]/g, "").toUpperCase(); Python re.sub(r"[^0-9A-Za-z]", "", cnpj).upper().',
            en: 'Remove only the mask (".", "/", "-" and spaces) and upper-case the value. E.g. JS cnpj.replace(/[^0-9A-Za-z]/g, "").toUpperCase(); Python re.sub(r"[^0-9A-Za-z]", "", cnpj).upper().',
        },
    },
    check(file, context) {
        const seen = new Set();
        return [...runPatterns(file, context, SPECS), ...regexVariableMatches(file, context)]
            .filter((match) => {
            if (seen.has(match.line))
                return false;
            seen.add(match.line);
            return true;
        })
            .sort((a, b) => a.line - b.line || a.column - b.column);
    },
};
