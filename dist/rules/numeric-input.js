import { runPatterns } from './engine.js';
const NUMERIC_ATTRIBUTE = /\b(?:type\s*=\s*["']?(?:number|tel)\b|input[mM]ode\s*=\s*[{"'`\s]*(?:numeric|decimal|tel)\b|keyboardType\s*=\s*[{"'`\s]*(?:numeric|number-pad|phone-pad|decimal-pad)\b|android:inputType\s*=\s*"(?:number|phone|numberDecimal|numberSigned)|pattern\s*=\s*["'](?:\\d|\[0-9\])|v-only-numbers?\b|onlyNumbers?\b|appOnlyNumbers?\b|numbersOnly\b)/;
/** Tag de abertura; `=>` é aceito dentro de atributos JSX. */
const TAG = /<[A-Za-z][\w.:-]*\b(?:=>|[^>]){0,2000}>/g;
function lineAt(offset, lineStarts) {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if ((lineStarts[middle] ?? 0) <= offset)
            low = middle;
        else
            high = middle - 1;
    }
    return low;
}
/** Procura tags (HTML, JSX, Vue, Android XML...) que citam CNPJ e forçam teclado/entrada numérica. */
function checkTags(file, context) {
    if (!file.languages.has('markup') && !file.languages.has('xml'))
        return [];
    const identifier = new RegExp(context.identifierSource, 'i');
    const lineStarts = [0];
    for (let index = 0; index < file.text.length; index++) {
        if (file.text.charCodeAt(index) === 10)
            lineStarts.push(index + 1);
    }
    const matches = [];
    for (const tag of file.text.matchAll(TAG)) {
        const tagText = tag[0];
        if (tagText.length > 2000 || !identifier.test(tagText.replace(/cnpj-lint[\w-]*/gi, ''))) {
            continue;
        }
        const attribute = NUMERIC_ATTRIBUTE.exec(tagText);
        if (!attribute)
            continue;
        const offset = (tag.index ?? 0) + attribute.index;
        const line = lineAt(offset, lineStarts);
        matches.push({
            line,
            column: offset - (lineStarts[line] ?? 0),
            length: attribute[0].length,
        });
    }
    return matches;
}
const SPECS = [
    {
        // Flutter
        source: String.raw `keyboardType\s*:\s*TextInputType\.(?:number|phone)\b|FilteringTextInputFormatter\.digitsOnly`,
        languages: ['dart'],
        scope: { before: 6, after: 6 },
    },
    {
        // Jetpack Compose
        source: String.raw `keyboardType\s*=\s*KeyboardType\.(?:Number|Phone|NumberPassword|Decimal)\b`,
        languages: ['kotlin'],
        scope: { before: 6, after: 6 },
    },
    {
        // UIKit / SwiftUI
        source: String.raw `\.keyboardType\s*(?:=\s*|\(\s*)\.(?:numberPad|phonePad|decimalPad|asciiCapableNumberPad)\b`,
        languages: ['swift'],
        scope: { before: 2, after: 2 },
    },
    {
        // Delphi: NumbersOnly = True
        source: String.raw `\bNumbersOnly\s*(?:=|:=)\s*True\b`,
        flags: 'i',
        languages: ['delphi', 'delphi-form'],
        scope: { before: 8, after: 8 },
    },
];
export const numericInput = {
    id: 'numeric-input',
    severity: 'warning',
    tags: ['ui', 'forms'],
    docs: {
        title: {
            pt: 'Campo de CNPJ força entrada numérica',
            en: 'CNPJ field forces numeric input',
        },
        description: {
            pt: 'type="number", inputmode="numeric", keyboardType numérico, FilteringTextInputFormatter.digitsOnly ou NumbersOnly impedem que o usuário digite as letras do CNPJ.',
            en: 'type="number", inputmode="numeric", numeric keyboardType, FilteringTextInputFormatter.digitsOnly or NumbersOnly prevent users from typing CNPJ letters.',
        },
        fix: {
            pt: 'Use type="text" com autocapitalize="characters" (e inputmode="text"), aceite [0-9A-Za-z] e converta para maiúsculas. Em apps, use teclado de texto.',
            en: 'Use type="text" with autocapitalize="characters" (and inputmode="text"), accept [0-9A-Za-z] and upper-case the value. In apps, use a text keyboard.',
        },
    },
    check(file, context) {
        const seen = new Set();
        return [...checkTags(file, context), ...runPatterns(file, context, SPECS)]
            .filter((match) => {
            if (seen.has(match.line))
                return false;
            seen.add(match.line);
            return true;
        })
            .sort((a, b) => a.line - b.line || a.column - b.column);
    },
};
