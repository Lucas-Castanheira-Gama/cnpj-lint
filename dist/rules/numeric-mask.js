import { CODE_LANGUAGES, DIGIT, patternRule } from './engine.js';
const D = '[09#]';
const PROGRESSIVE = /\.replace\(\s*\/[^/\n]*\((?:\\d|\[0-9\])(?:\{\d(?:,\d)?\})?\)[^/\n]*\/[gimsuy]*\s*,\s*['"\x60][^'"\x60]*\$1/;
/** Regex completa no formato 2-3-3-4-2: já coberta por numeric-regex. */
const FULL_SHAPE = new RegExp(String.raw `${DIGIT}\{2\}.{0,30}?${DIGIT}\{3\}.{0,30}?${DIGIT}\{3\}.{0,30}?${DIGIT}\{4\}.{0,30}?${DIGIT}\{2\}`);
export const numericMask = patternRule({
    id: 'numeric-mask',
    severity: 'warning',
    tags: ['ui', 'mask'],
    docs: {
        title: {
            pt: 'Máscara de CNPJ aceita apenas dígitos',
            en: 'CNPJ input mask only accepts digits',
        },
        description: {
            pt: 'Máscaras como 99.999.999/9999-99, 00.000.000/0000-00 ou ##.###.###/####-## (jQuery Mask, ngx-mask, IMask, Inputmask, vue-the-mask, Delphi, WinForms, Flutter) bloqueiam a digitação de letras.',
            en: 'Masks such as 99.999.999/9999-99, 00.000.000/0000-00 or ##.###.###/####-## (jQuery Mask, ngx-mask, IMask, Inputmask, vue-the-mask, Delphi, WinForms, Flutter) block typing letters.',
        },
        fix: {
            pt: 'Use o token alfanumérico da sua biblioteca nas 12 primeiras posições e dígito nas 2 últimas (ex.: jQuery Mask/ngx-mask "AA.AAA.AAA/AAAA-00", Inputmask "**.***.***/****-99", Delphi ">AA.AAA.AAA/AAAA-00;0;_") e converta para maiúsculas. Veja docs/regras.md#numeric-mask.',
            en: 'Use your library\'s alphanumeric token for the first 12 positions and digits for the last 2 (e.g. jQuery Mask/ngx-mask "AA.AAA.AAA/AAAA-00", Inputmask "**.***.***/****-99", Delphi ">AA.AAA.AAA/AAAA-00;0;_") and upper-case the value. See docs/regras.md#numeric-mask.',
        },
    },
}, [
    {
        // 99.999.999/9999-99, 00.000.000/0000-00, ##.###.###/####-##, 00"."000"."000"/"0000"-"00, 00\.000\.000\/0000\-00
        source: String.raw `(?<![\w.])${D}{2}"?\\{0,2}\."?${D}{3}"?\\{0,2}\."?${D}{3}"?\\{0,2}\/"?${D}{4}"?\\{0,2}-"?${D}{2}(?!\w)`,
        languages: CODE_LANGUAGES,
        scope: 'none',
        quick: ['/'],
        skipIf: /placeholder|hint|exemplo|example/i,
    },
    {
        // Mesma máscara usada só como placeholder: não bloqueia, mas orienta errado
        source: String.raw `(?<![\w.])${D}{2}\.${D}{3}\.${D}{3}\/${D}{4}-${D}{2}(?!\w)`,
        languages: CODE_LANGUAGES,
        scope: 'none',
        quick: ['/'],
        severity: 'info',
        message: {
            pt: 'Placeholder de CNPJ sugere apenas dígitos; considere "AA.AAA.AAA/AAAA-00" ou um texto de ajuda',
            en: 'CNPJ placeholder suggests digits only; consider "AA.AAA.AAA/AAAA-00" or helper text',
        },
    },
    {
        // RedMadRobot input-mask (Android/iOS): [00].[000].[000]/[0000]-[00]
        source: String.raw `\[${D}{2}\]\.\[${D}{3}\]\.\[${D}{3}\]\/\[${D}{4}\]-\[${D}{2}\]`,
        languages: CODE_LANGUAGES,
        scope: 'none',
        quick: ['['],
    },
    {
        // text-mask: [/\d/, /\d/, '.', /\d/, ...]
        source: String.raw `/\\d/\s*,\s*/\\d/\s*,\s*['"]\.['"]`,
        languages: ['javascript', 'typescript', 'markup'],
        scope: { before: 3, after: 3 },
    },
    {
        // Máscara progressiva: v.replace(/^(\d{2})(\d)/, '$1.$2'). Uma ocorrência por bloco.
        source: PROGRESSIVE.source,
        languages: ['javascript', 'typescript', 'markup'],
        scope: { before: 6, after: 6 },
        skipIf: FULL_SHAPE,
        lineFilter: (file, _context, line) => !PROGRESSIVE.test(file.lines[line - 1] ?? ''),
        message: {
            pt: 'Máscara progressiva de CNPJ baseada em \\d descarta letras',
            en: 'Progressive CNPJ mask built on \\d drops letters',
        },
    },
    {
        // Flutter brasil_fields
        source: String.raw `\bCnpjInputFormatter\s*\(`,
        languages: ['dart'],
        scope: 'none',
        message: {
            pt: 'CnpjInputFormatter (brasil_fields) é numérico; use CnpjAlfanumericoInputFormatter (brasil_fields >= 1.18.0)',
            en: 'CnpjInputFormatter (brasil_fields) is numeric; use CnpjAlfanumericoInputFormatter (brasil_fields >= 1.18.0)',
        },
    },
]);
