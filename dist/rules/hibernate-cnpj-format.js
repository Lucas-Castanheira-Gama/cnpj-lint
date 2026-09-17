const JVM_LANGUAGES = ['java', 'kotlin', 'groovy', 'scala'];
const HIBERNATE_IMPORT = /org\.hibernate\.validator\.constraints\.br\.(?:CNPJ\b|\*)/;
const ANNOTATION = /@(?:(?:field|get|set|param|property):)?(?:org\.hibernate\.validator\.constraints\.br\.)?CNPJ\b/;
export const hibernateCnpjFormat = {
    id: 'hibernate-cnpj-format',
    severity: 'error',
    tags: ['java', 'bean-validation'],
    docs: {
        title: {
            pt: '@CNPJ do Hibernate Validator sem format = ALPHANUMERIC',
            en: 'Hibernate Validator @CNPJ without format = ALPHANUMERIC',
        },
        description: {
            pt: 'No Hibernate Validator, @CNPJ usa format = CNPJ.Format.NUMERIC por padrão (o atributo existe desde a 9.0.0.Final). Sem configurar, CNPJs alfanuméricos são rejeitados mesmo na versão mais recente.',
            en: 'In Hibernate Validator, @CNPJ defaults to format = CNPJ.Format.NUMERIC (the attribute exists since 9.0.0.Final). Unless configured, alphanumeric CNPJs are rejected even on the latest version.',
        },
        fix: {
            pt: 'Atualize para hibernate-validator >= 9.0.0.Final e use @CNPJ(format = CNPJ.Format.ALPHANUMERIC).',
            en: 'Upgrade to hibernate-validator >= 9.0.0.Final and use @CNPJ(format = CNPJ.Format.ALPHANUMERIC).',
        },
    },
    check(file, context) {
        if (!JVM_LANGUAGES.some((language) => file.languages.has(language)))
            return [];
        const qualified = /@(?:\w+:)?org\.hibernate\.validator\.constraints\.br\.CNPJ\b/.test(file.text);
        if (!qualified && !HIBERNATE_IMPORT.test(file.text))
            return [];
        const matches = [];
        file.lines.forEach((text, line) => {
            if (context.isComment(line) || /^\s*import\b/.test(text))
                return;
            const annotation = ANNOTATION.exec(text);
            if (!annotation)
                return;
            // Junta os argumentos da anotação, que podem ocupar várias linhas.
            let rest = text.slice(annotation.index + annotation[0].length);
            if (/^\s*\(/.test(rest)) {
                let depth = 0;
                let collected = '';
                let index = line;
                outer: while (index < Math.min(file.lines.length, line + 10)) {
                    for (const char of rest) {
                        collected += char;
                        if (char === '(')
                            depth++;
                        if (char === ')') {
                            depth--;
                            if (depth === 0)
                                break outer;
                        }
                    }
                    index++;
                    rest = file.lines[index] ?? '';
                }
                if (/ALPHANUMERIC/.test(collected))
                    return;
            }
            matches.push({ line, column: annotation.index, length: annotation[0].length });
        });
        return matches;
    },
};
