export const DEFAULT_IDENTIFIERS = ['cnpj', 'cgc'];
/** Monta a alternância de identificadores (sem grupos de captura) para uso nas regras. */
export function buildIdentifierSource(extra = []) {
    const all = [...DEFAULT_IDENTIFIERS, ...extra.map((word) => word.trim()).filter(Boolean)];
    return [...new Set(all.map((word) => word.toLowerCase()))]
        .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
}
export function splitLines(text) {
    return text.split(/\r\n|\r|\n/);
}
export function createSourceFile(path, absolutePath, text, languages) {
    const normalized = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    const basename = (path.split('/').pop() ?? path).toLowerCase();
    return {
        path,
        absolutePath,
        basename,
        languages: new Set(languages),
        text: normalized,
        lines: splitLines(normalized),
    };
}
const HASH_COMMENT_LANGUAGES = [
    'python',
    'ruby',
    'shell',
    'yaml',
    'toml',
    'elixir',
    'manifest',
];
function has(languages, candidates) {
    return candidates.some((language) => languages.has(language));
}
/** Heurística de linha que contém apenas comentário, por família de linguagem. */
export function isCommentLine(line, languages) {
    const trimmed = line.trimStart();
    if (trimmed === '')
        return false;
    if (languages.has('cobol')) {
        const indicator = line.charAt(6);
        if (line.length > 6 && (indicator === '*' || indicator === '/'))
            return true;
        if (trimmed.startsWith('*>'))
            return true;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('<!--')) {
        return true;
    }
    if (trimmed.startsWith('*') && !languages.has('cobol'))
        return true;
    if (trimmed.startsWith('#') && has(languages, HASH_COMMENT_LANGUAGES))
        return true;
    if (trimmed.startsWith('--') && languages.has('sql'))
        return true;
    if (trimmed.startsWith('#') && languages.has('sql'))
        return true;
    if (languages.has('vb') && (trimmed.startsWith("'") || /^rem\s/i.test(trimmed)))
        return true;
    if (languages.has('delphi') && (trimmed.startsWith('{') || trimmed.startsWith('(*')))
        return true;
    if (languages.has('xbase') && (trimmed.startsWith('&&') || /^note\s/i.test(trimmed)))
        return true;
    return false;
}
/** Remove menções à própria ferramenta (diretivas, scripts) antes de procurar identificadores. */
const TOOL_MENTION = /cnpj-lint[\w-]*/gi;
export function createRuleContext(file, identifierSource) {
    const identifier = new RegExp(identifierSource, 'i');
    const lineCount = file.lines.length;
    const prefix = new Uint32Array(lineCount + 1);
    file.lines.forEach((line, index) => {
        const mentions = identifier.test(line.replace(TOOL_MENTION, ''));
        prefix[index + 1] = (prefix[index] ?? 0) + (mentions ? 1 : 0);
    });
    const comments = file.lines.map((line) => isCommentLine(line, file.languages));
    return {
        identifierSource,
        hasIdentifier(line, before, after) {
            const start = Math.max(0, line - before);
            const end = Math.min(lineCount, line + after + 1);
            if (start >= end)
                return false;
            return (prefix[end] ?? 0) - (prefix[start] ?? 0) > 0;
        },
        isComment(line) {
            return comments[line] ?? false;
        },
    };
}
