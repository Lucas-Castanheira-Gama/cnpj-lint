import type { Rule, Severity, Text } from '../types.js';
type Ecosystem = 'npm' | 'pypi' | 'maven' | 'composer' | 'rubygems' | 'go' | 'nuget' | 'pub';
export interface KnownPackage {
    ecosystem: Ecosystem;
    /** Nome como aparece no manifesto (Maven: groupId:artifactId; Go: caminho do módulo). */
    name: string;
    /** Primeira versão com suporte a CNPJ alfanumérico; ausente quando nenhuma versão suporta. */
    since?: string;
    /** Versão recomendada (correções posteriores ao suporte inicial). */
    recommended?: {
        version: string;
        reason: Text;
    };
    /** Observação exibida junto dos problemas. */
    hint?: Text;
    /** Configuração obrigatória mesmo em versões com suporte (vira aviso informativo). */
    usage?: Text;
    source: string;
}
/**
 * Bibliotecas verificadas manualmente (código-fonte e notas de versão) em setembro de 2026.
 * Ao adicionar itens, cite a fonte (PR, release ou commit) em `source` e em docs/bibliotecas.md.
 */
export declare const KNOWN_PACKAGES: readonly KnownPackage[];
export declare function parseVersion(value: string): number[] | undefined;
export declare function compareVersions(a: readonly number[], b: readonly number[]): number;
export interface VersionRange {
    /** Menor versão aceita (undefined = desconhecida/qualquer). */
    min?: number[];
    /** Limite superior exclusivo (undefined = sem limite). */
    maxExclusive?: number[];
    exact: boolean;
}
/** Interpreta faixas npm, PEP 440, Composer, RubyGems, pub e Maven (o suficiente para esta regra). */
export declare function parseRange(spec: string): VersionRange;
interface Declared {
    /** Nome usado na busca em KNOWN_PACKAGES. */
    key: string;
    /** Nome exibido (como escrito no manifesto). */
    name: string;
    spec: string;
    line: number;
    /** Versão exata vinda de lockfile (ou de go.mod). */
    locked?: string;
}
interface Verdict {
    severity: Severity;
    message: Text;
}
export declare function evaluateDependency(item: KnownPackage, declared: Pick<Declared, 'name' | 'spec' | 'locked'>): Verdict | undefined;
export declare const outdatedDependency: Rule;
export {};
