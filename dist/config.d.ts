import type { Language, Locale, RuleSetting, Severity } from './types.js';
export type FailOn = Severity | 'none';
export interface UserConfig {
    include?: string[];
    exclude?: string[];
    rules?: Record<string, RuleSetting>;
    identifiers?: string[];
    extensions?: Record<string, Language>;
    maxFileSize?: number;
    gitignore?: boolean;
    defaultExcludes?: boolean;
    failOn?: FailOn;
    locale?: Locale;
    baseline?: string;
}
export interface ResolvedConfig {
    include: string[];
    exclude: string[];
    rules: Record<string, RuleSetting>;
    identifiers: string[];
    extensions: Record<string, Language>;
    maxFileSize: number;
    gitignore: boolean;
    defaultExcludes: boolean;
    failOn: FailOn;
    locale: Locale;
    baseline?: string;
    /** Caminho do arquivo de configuração usado, se houver. */
    path?: string;
    warnings: string[];
}
export declare const CONFIG_FILES: readonly ['.cnpjlintrc.json', '.cnpjlintrc', 'cnpj-lint.config.json'];
export declare const DEFAULT_MAX_FILE_SIZE: number;
export declare class ConfigError extends Error {
    name: string;
}
/** Valida um objeto de configuração vindo de JSON. */
export declare function validateConfig(value: unknown, source: string): {
    config: UserConfig;
    warnings: string[];
};
/** Procura a configuração no diretório de trabalho (ou usa o caminho informado). */
export declare function loadConfig(cwd: string, explicitPath?: string): {
    config: UserConfig;
    path?: string;
    warnings: string[];
};
export declare function defaultLocale(): Locale;
/** Combina configuração do arquivo com opções da linha de comando (que têm prioridade). */
export declare function resolveConfig(file: UserConfig, overrides?: UserConfig, meta?: {
    path?: string;
    warnings?: string[];
}): ResolvedConfig;
