import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
/**
 * Impressão digital estável: regra + arquivo + conteúdo normalizado da linha + ocorrência.
 * Não usa o número da linha, para sobreviver a edições em outras partes do arquivo.
 */
export function assignFingerprints(findings) {
    const occurrences = new Map();
    for (const finding of findings) {
        const content = finding.snippet.replace(/\s+/g, ' ').trim();
        const base = createHash('sha256')
            .update(`${finding.ruleId}\0${finding.file}\0${content}`)
            .digest('hex')
            .slice(0, 20);
        const count = (occurrences.get(base) ?? 0) + 1;
        occurrences.set(base, count);
        finding.fingerprint = `${base}:${count}`;
    }
}
export function readBaseline(path) {
    if (!existsSync(path)) {
        throw new Error(`Baseline não encontrado: ${path}. Gere com --update-baseline.`);
    }
    const data = JSON.parse(readFileSync(path, 'utf8'));
    if (data.tool !== 'cnpj-lint' || !Array.isArray(data.findings)) {
        throw new Error(`Arquivo de baseline inválido: ${path}`);
    }
    return data;
}
export function writeBaseline(path, findings) {
    const data = {
        version: 1,
        tool: 'cnpj-lint',
        generatedAt: new Date().toISOString(),
        findings: findings.map(({ ruleId, file, fingerprint }) => ({ ruleId, file, fingerprint })),
    };
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}
/** Remove os achados já registrados no baseline. Retorna os restantes e quantos foram suprimidos. */
export function applyBaseline(findings, baseline) {
    const known = new Set(baseline.findings.map((item) => `${item.file}\0${item.fingerprint}`));
    const remaining = findings.filter((finding) => !known.has(`${finding.file}\0${finding.fingerprint}`));
    return { findings: remaining, suppressed: findings.length - remaining.length };
}
