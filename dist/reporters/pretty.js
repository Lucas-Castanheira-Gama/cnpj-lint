import { findRule } from '../rules/index.js';
import { localize } from '../types.js';
import { REPOSITORY_URL } from '../version.js';
import { countFindings, formatCount, groupByFile, severityLabel } from './summary.js';
const CODES = {
    reset: '[0m',
    bold: '[1m',
    dim: '[2m',
    red: '[31m',
    yellow: '[33m',
    cyan: '[36m',
    green: '[32m',
    underline: '[4m',
};
export function reportPretty(result, options) {
    const paint = (text, ...styles) => options.color ? `${styles.map((style) => CODES[style]).join('')}${text}${CODES.reset}` : text;
    const locale = result.locale;
    const pt = locale === 'pt-BR';
    const severityColor = { error: 'red', warning: 'yellow', info: 'cyan' };
    const lines = [];
    for (const [file, findings] of groupByFile(result.findings)) {
        lines.push('', paint(file, 'underline'));
        const width = Math.max(...findings.map((item) => `${item.line}:${item.column}`.length));
        const severityWidth = Math.max(...findings.map((item) => severityLabel(item.severity, locale).length));
        for (const finding of findings) {
            const position = `${finding.line}:${finding.column}`.padEnd(width);
            const severity = severityLabel(finding.severity, locale).padEnd(severityWidth);
            lines.push(`  ${paint(position, 'dim')}  ${paint(severity, severityColor[finding.severity])}  ${finding.message}  ${paint(finding.ruleId, 'dim')}`);
            if (options.verbose) {
                lines.push(`  ${' '.repeat(width)}  ${paint(`│ ${finding.snippet}`, 'dim')}`);
                const rule = findRule(finding.ruleId);
                if (rule) {
                    lines.push(`  ${' '.repeat(width)}  ${paint(`↳ ${localize(rule.docs.fix, locale)}`, 'green')}`);
                }
            }
        }
    }
    for (const error of result.errors) {
        lines.push('', paint(`${pt ? 'Não foi possível analisar' : 'Could not scan'} ${error.file}: ${error.message}`, 'yellow'));
    }
    const counts = countFindings(result.findings);
    const seconds = (result.durationMs / 1000).toLocaleString(locale, { maximumFractionDigits: 2 });
    const scanned = pt
        ? `${result.filesScanned} arquivo${result.filesScanned === 1 ? '' : 's'} analisado${result.filesScanned === 1 ? '' : 's'} em ${seconds}s`
        : `${result.filesScanned} file${result.filesScanned === 1 ? '' : 's'} scanned in ${seconds}s`;
    lines.push('');
    if (counts.total === 0) {
        lines.push(paint(pt
            ? `✔ Nenhum problema de CNPJ alfanumérico encontrado (${scanned}).`
            : `✔ No alphanumeric CNPJ issues found (${scanned}).`, 'green', 'bold'));
    }
    else {
        const summary = [
            formatCount(counts.error, 'error', locale),
            formatCount(counts.warning, 'warning', locale),
            formatCount(counts.info, 'info', locale),
        ].join(', ');
        const problems = pt
            ? `${counts.total} problema${counts.total === 1 ? '' : 's'}`
            : `${counts.total} problem${counts.total === 1 ? '' : 's'}`;
        lines.push(paint(`✖ ${problems} (${summary})`, counts.error > 0 ? 'red' : 'yellow', 'bold'), paint(`  ${scanned}`, 'dim'));
        if (!options.verbose) {
            lines.push(paint(pt
                ? '  Use --verbose para ver trecho e correção sugerida de cada ocorrência.'
                : '  Use --verbose to show the snippet and suggested fix for each finding.', 'dim'));
        }
        lines.push(paint(`  ${pt ? 'Guia de correção' : 'Fix guide'}: ${REPOSITORY_URL}/blob/main/docs/regras.md`, 'dim'));
    }
    if (result.suppressedByBaseline > 0) {
        lines.push(paint(pt
            ? `  ${result.suppressedByBaseline} ocorrência(s) já registrada(s) no baseline foram omitidas.`
            : `  ${result.suppressedByBaseline} finding(s) already in the baseline were omitted.`, 'dim'));
    }
    return `${lines.join('\n').replace(/^\n/, '')}\n`;
}
