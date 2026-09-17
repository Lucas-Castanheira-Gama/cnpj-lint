import type { Finding, Locale, Severity } from '../types.js';

export interface Counts {
  error: number;
  warning: number;
  info: number;
  total: number;
}

export function countFindings(findings: readonly Finding[]): Counts {
  const counts: Counts = { error: 0, warning: 0, info: 0, total: findings.length };
  for (const finding of findings) counts[finding.severity]++;
  return counts;
}

const LABELS: Record<Locale, Record<Severity, [string, string]>> = {
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

export function severityLabel(severity: Severity, locale: Locale, count = 1): string {
  const [singular, plural] = LABELS[locale][severity];
  return count === 1 ? singular : plural;
}

export function formatCount(count: number, severity: Severity, locale: Locale): string {
  return `${count} ${severityLabel(severity, locale, count)}`;
}

export function groupByFile(findings: readonly Finding[]): Map<string, Finding[]> {
  const groups = new Map<string, Finding[]>();
  for (const finding of findings) {
    const list = groups.get(finding.file) ?? [];
    list.push(finding);
    groups.set(finding.file, list);
  }
  return groups;
}
