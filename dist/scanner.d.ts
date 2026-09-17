import { type ResolvedConfig } from './config.js';
import { type Finding, type Language, type Rule, type ScanResult, type Severity, type SourceFile } from './types.js';
export interface ScanOptions {
    /** Diretório base para caminhos relativos e busca de configuração. Padrão: process.cwd(). */
    cwd?: string;
    /** Arquivos ou diretórios a analisar. Padrão: ["."]. */
    paths?: readonly string[];
    config?: ResolvedConfig;
}
export interface ActiveRule {
    rule: Rule;
    /** Severidade forçada pela configuração. */
    override?: Severity;
}
export declare function activeRules(config: Pick<ResolvedConfig, 'rules'>): ActiveRule[];
/** Analisa um arquivo já carregado. */
export declare function scanSource(file: SourceFile, config: Pick<ResolvedConfig, 'rules' | 'identifiers' | 'locale'>): Finding[];
/**
 * Analisa um trecho de código em memória, útil em testes e integrações.
 * O nome do arquivo define a linguagem (ex.: "empresa.ts").
 */
export declare function scanText(text: string, fileName: string, options?: {
    config?: Partial<ResolvedConfig>;
    languages?: Language[];
}): Finding[];
/** Descobre os arquivos, aplica as regras, as supressões e o baseline. */
export declare function scan(options?: ScanOptions): ScanResult;
