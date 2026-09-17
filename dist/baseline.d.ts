import type { Finding } from './types.js';
export interface BaselineFile {
    version: 1;
    tool: 'cnpj-lint';
    generatedAt: string;
    findings: Array<{
        ruleId: string;
        file: string;
        fingerprint: string;
    }>;
}
/**
 * Impressão digital estável: regra + arquivo + conteúdo normalizado da linha + ocorrência.
 * Não usa o número da linha, para sobreviver a edições em outras partes do arquivo.
 */
export declare function assignFingerprints(findings: Finding[]): void;
export declare function readBaseline(path: string): BaselineFile;
export declare function writeBaseline(path: string, findings: readonly Finding[]): void;
/** Remove os achados já registrados no baseline. Retorna os restantes e quantos foram suprimidos. */
export declare function applyBaseline(findings: readonly Finding[], baseline: BaselineFile): {
    findings: Finding[];
    suppressed: number;
};
