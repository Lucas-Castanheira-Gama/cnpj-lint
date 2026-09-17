/**
 * Glob mínimo, sem dependências, com a semântica usual de .gitignore:
 * `*`, `?`, `**`, `{a,b}`, `[abc]`; padrões sem "/" casam com qualquer segmento do caminho;
 * padrões terminados em "/" (ou que casam um diretório) incluem tudo abaixo dele.
 */
function escapeCharacter(char) {
    return /[.+^$()|\\]/.test(char) ? `\\${char}` : char;
}
function translate(pattern) {
    let result = '';
    for (let index = 0; index < pattern.length; index++) {
        const char = pattern.charAt(index);
        if (char === '*') {
            if (pattern.charAt(index + 1) === '*') {
                const slashAfter = pattern.charAt(index + 2) === '/';
                result += slashAfter ? '(?:.*/)?' : '.*';
                index += slashAfter ? 2 : 1;
            }
            else {
                result += '[^/]*';
            }
        }
        else if (char === '?') {
            result += '[^/]';
        }
        else if (char === '{') {
            const close = pattern.indexOf('}', index);
            if (close < 0) {
                result += '\\{';
                continue;
            }
            const options = pattern
                .slice(index + 1, close)
                .split(',')
                .map(translate);
            result += `(?:${options.join('|')})`;
            index = close;
        }
        else if (char === '[') {
            const close = pattern.indexOf(']', index + 1);
            if (close < 0) {
                result += '\\[';
                continue;
            }
            let body = pattern.slice(index + 1, close);
            if (body.startsWith('!'))
                body = `^${body.slice(1)}`;
            result += `[${body.replace(/\\/g, '\\\\')}]`;
            index = close;
        }
        else {
            result += escapeCharacter(char);
        }
    }
    return result;
}
export function compileGlob(input) {
    let pattern = input.trim().replace(/\\/g, '/');
    if (pattern.startsWith('./'))
        pattern = pattern.slice(2);
    const directoryOnly = pattern.endsWith('/');
    pattern = pattern.replace(/\/+$/, '');
    const anchored = pattern.includes('/');
    if (pattern.startsWith('/'))
        pattern = pattern.slice(1);
    const body = translate(pattern);
    // Casa o próprio caminho ou qualquer coisa dentro dele (diretório).
    const regex = anchored
        ? new RegExp(`^${body}(?:/.*)?$`)
        : new RegExp(`(?:^|/)${body}${directoryOnly ? '/' : '(?:/|$)'}`);
    return (path) => regex.test(path.replace(/\\/g, '/'));
}
export function compileGlobs(patterns) {
    const matchers = patterns.filter((pattern) => pattern.trim() !== '').map(compileGlob);
    return (path) => matchers.some((matcher) => matcher(path));
}
