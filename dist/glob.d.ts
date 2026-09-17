/**
 * Glob mínimo, sem dependências, com a semântica usual de .gitignore:
 * `*`, `?`, `**`, `{a,b}`, `[abc]`; padrões sem "/" casam com qualquer segmento do caminho;
 * padrões terminados em "/" (ou que casam um diretório) incluem tudo abaixo dele.
 */
export type GlobMatcher = (path: string) => boolean;
export declare function compileGlob(input: string): GlobMatcher;
export declare function compileGlobs(patterns: readonly string[]): GlobMatcher;
