const COMMAND = { error: 'error', warning: 'warning', info: 'notice' };
const escapeData = (value) => value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (value) => escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');
/** Comandos de workflow do GitHub Actions (viram anotações no PR). */
export function reportGithub(result) {
    return result.findings
        .map((finding) => {
        const properties = [
            `file=${escapeProperty(finding.file)}`,
            `line=${finding.line}`,
            `col=${finding.column}`,
            `endColumn=${finding.endColumn}`,
            `title=${escapeProperty(`cnpj-lint (${finding.ruleId})`)}`,
        ].join(',');
        return `::${COMMAND[finding.severity]} ${properties}::${escapeData(finding.message)}\n`;
    })
        .join('');
}
