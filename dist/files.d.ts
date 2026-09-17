/** Diretórios quase sempre gerados ou de terceiros. */
export declare const DEFAULT_EXCLUDES: readonly string[];
export interface DiscoverOptions {
    cwd: string;
    include: readonly string[];
    exclude: readonly string[];
    /** Usa `git ls-files` para respeitar o .gitignore quando possível. */
    gitignore: boolean;
    /** Ignora a lista DEFAULT_EXCLUDES. */
    noDefaultExcludes?: boolean;
}
export declare function toPosix(path: string): string;
/** Resolve os alvos (arquivos e diretórios) em uma lista de arquivos absolutos, sem repetição. */
export declare function discoverFiles(targets: readonly string[], options: DiscoverOptions): string[];
