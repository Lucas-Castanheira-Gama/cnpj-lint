import { localize } from '../types.js';
import { REPOSITORY_URL, ruleDocsUrl, VERSION } from '../version.js';
const LEVEL = {
    error: 'error',
    warning: 'warning',
    info: 'note',
};
const PROBLEM_SEVERITY = {
    error: 'error',
    warning: 'warning',
    info: 'recommendation',
};
const pascalCase = (id) => id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
/** SARIF 2.1.0, compatível com o GitHub code scanning. */
export function reportSarif(result) {
    const locale = result.locale;
    const rules = result.rules;
    const index = new Map(rules.map((rule, position) => [rule.id, position]));
    const sarif = {
        $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
        version: '2.1.0',
        runs: [
            {
                tool: {
                    driver: {
                        name: 'cnpj-lint',
                        informationUri: REPOSITORY_URL,
                        version: VERSION,
                        semanticVersion: VERSION,
                        rules: rules.map((rule) => {
                            const fix = localize(rule.docs.fix, locale);
                            const description = localize(rule.docs.description, locale);
                            return {
                                id: rule.id,
                                name: pascalCase(rule.id),
                                shortDescription: { text: localize(rule.docs.title, locale) },
                                fullDescription: { text: description },
                                help: {
                                    text: `${description}\n\n${fix}`,
                                    markdown: `${description}\n\n**${locale === 'en' ? 'How to fix' : 'Como corrigir'}:** ${fix}\n\n[${locale === 'en' ? 'Documentation' : 'Documentação'}](${ruleDocsUrl(rule.id)})`,
                                },
                                helpUri: ruleDocsUrl(rule.id),
                                defaultConfiguration: { level: LEVEL[rule.severity] },
                                properties: {
                                    tags: ['cnpj', 'cnpj-alfanumerico', ...rule.tags],
                                    precision: 'medium',
                                    'problem.severity': PROBLEM_SEVERITY[rule.severity],
                                },
                            };
                        }),
                    },
                },
                columnKind: 'utf16CodeUnits',
                results: result.findings.map((finding) => ({
                    ruleId: finding.ruleId,
                    ...(index.has(finding.ruleId) ? { ruleIndex: index.get(finding.ruleId) } : {}),
                    level: LEVEL[finding.severity],
                    message: { text: finding.message },
                    locations: [
                        {
                            physicalLocation: {
                                artifactLocation: { uri: encodeURI(finding.file), uriBaseId: '%SRCROOT%' },
                                region: {
                                    startLine: finding.line,
                                    startColumn: finding.column,
                                    endColumn: Math.max(finding.column + 1, finding.endColumn),
                                    snippet: { text: finding.snippet },
                                },
                            },
                        },
                    ],
                    partialFingerprints: { 'cnpjLint/v1': finding.fingerprint },
                })),
            },
        ],
    };
    return `${JSON.stringify(sarif, null, 2)}\n`;
}
