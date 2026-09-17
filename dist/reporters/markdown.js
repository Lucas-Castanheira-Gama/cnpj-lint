import { findRule } from '../rules/index.js';
import { localize } from '../types.js';
import { ruleDocsUrl } from '../version.js';
import { countFindings, formatCount, severityLabel } from './summary.js';
const escapeCell = (text) => text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').replace(/</g, '&lt;');
function fileLink(finding, env) {
    const label = `${finding.file}:${finding.line}`;
    const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repository, GITHUB_SHA: sha } = env;
    if (!server || !repository || !sha)
        return `\`${escapeCell(label)}\``;
    const path = finding.file.split('/').map(encodeURIComponent).join('/');
    return `[\`${escapeCell(label)}\`](${server}/${repository}/blob/${sha}/${path}#L${finding.line})`;
}
/** Relatório em Markdown para resumos de job e comentários de PR. */
export function reportMarkdown(result, options = {}) {
    const locale = result.locale;
    const pt = locale === 'pt-BR';
    const env = options.env ?? process.env;
    const limit = options.limit ?? 100;
    const counts = countFindings(result.findings);
    const lines = [];
    lines.push(`## cnpj-lint: ${pt ? 'prontidão para o CNPJ alfanumérico' : 'alphanumeric CNPJ readiness'}`, '');
    if (counts.total === 0) {
        lines.push(pt
            ? `✅ Nenhum problema encontrado em ${result.filesScanned} arquivo(s).`
            : `✅ No issues found in ${result.filesScanned} file(s).`);
    }
    else {
        const summary = [
            formatCount(counts.error, 'error', locale),
            formatCount(counts.warning, 'warning', locale),
            formatCount(counts.info, 'info', locale),
        ].join(' · ');
        lines.push(`${counts.error > 0 ? '❌' : '⚠️'} **${summary}** ${pt ? 'em' : 'in'} ${result.filesScanned} ${pt ? 'arquivo(s) analisado(s)' : 'scanned file(s)'}`, '', pt ? '| Regra | Ocorrências |' : '| Rule | Findings |', '| --- | ---: |');
        const perRule = new Map();
        for (const finding of result.findings) {
            perRule.set(finding.ruleId, (perRule.get(finding.ruleId) ?? 0) + 1);
        }
        for (const [ruleId, total] of [...perRule].sort((a, b) => b[1] - a[1])) {
            const rule = findRule(ruleId);
            const title = rule ? ` — ${escapeCell(localize(rule.docs.title, locale))}` : '';
            lines.push(`| [\`${ruleId}\`](${ruleDocsUrl(ruleId)})${title} | ${total} |`);
        }
        lines.push('', `<details><summary>${pt ? 'Ocorrências' : 'Findings'}${result.findings.length > limit ? ` (${pt ? 'primeiras' : 'first'} ${limit})` : ''}</summary>`, '', pt ? '| Local | Severidade | Mensagem | Regra |' : '| Location | Severity | Message | Rule |', '| --- | --- | --- | --- |');
        for (const finding of result.findings.slice(0, limit)) {
            lines.push(`| ${fileLink(finding, env)} | ${severityLabel(finding.severity, locale)} | ${escapeCell(finding.message)} | \`${finding.ruleId}\` |`);
        }
        lines.push('', '</details>');
    }
    if (result.suppressedByBaseline > 0) {
        lines.push('', pt
            ? `_${result.suppressedByBaseline} ocorrência(s) do baseline omitida(s)._`
            : `_${result.suppressedByBaseline} baseline finding(s) omitted._`);
    }
    return `${lines.join('\n')}\n`;
}
