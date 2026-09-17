export function countFindings(findings) {
    const counts = { error: 0, warning: 0, info: 0, total: findings.length };
    for (const finding of findings)
        counts[finding.severity]++;
    return counts;
}
const LABELS = {
    'pt-BR': {
        error: ['erro', 'erros'],
        warning: ['aviso', 'avisos'],
        info: ['informativo', 'informativos'],
    },
    en: {
        error: ['error', 'errors'],
        warning: ['warning', 'warnings'],
        info: ['info', 'infos'],
    },
};
export function severityLabel(severity, locale, count = 1) {
    const [singular, plural] = LABELS[locale][severity];
    return count === 1 ? singular : plural;
}
export function formatCount(count, severity, locale) {
    return `${count} ${severityLabel(severity, locale, count)}`;
}
export function groupByFile(findings) {
    const groups = new Map();
    for (const finding of findings) {
        const list = groups.get(finding.file) ?? [];
        list.push(finding);
        groups.set(finding.file, list);
    }
    return groups;
}
