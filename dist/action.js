#!/usr/bin/env node
/**
 * Entrada da GitHub Action (action.yml). Lê os inputs do ambiente, gera SARIF, anotações e
 * resumo do job, e publica as saídas. Não falha o passo por causa de ocorrências: o action.yml
 * decide isso depois do upload do SARIF.
 */
import { randomUUID } from 'node:crypto';
import { appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, resolveConfig } from './config.js';
import { reportGithub, reportMarkdown, reportPretty, reportSarif } from './reporters/index.js';
import { countFindings } from './reporters/summary.js';
import { scan } from './scanner.js';
import { SEVERITY_ORDER } from './types.js';
const input = (name) => (process.env[`INPUT_${name.replace(/-/g, '_').toUpperCase()}`] ?? '').trim();
const bool = (name, fallback) => {
    const value = input(name).toLowerCase();
    return value === '' ? fallback : value === 'true';
};
function setOutput(name, value) {
    const file = process.env.GITHUB_OUTPUT;
    if (file)
        appendFileSync(file, `${name}=${value}\n`);
}
function main() {
    const cwd = resolve(process.env.GITHUB_WORKSPACE ?? process.cwd(), input('working-directory') || '.');
    const loaded = loadConfig(cwd, input('config') || undefined);
    const failOn = (input('fail-on') || undefined);
    if (failOn && !['error', 'warning', 'info', 'none'].includes(failOn)) {
        throw new Error(`fail-on inválido: ${failOn}`);
    }
    const locale = (input('locale') || undefined);
    const overrides = {
        ...(failOn ? { failOn } : {}),
        ...(locale === 'en' || locale === 'pt-BR' ? { locale } : {}),
        ...(input('baseline') ? { baseline: input('baseline') } : {}),
    };
    const config = resolveConfig(loaded.config, overrides, {
        ...(loaded.path ? { path: loaded.path } : {}),
        warnings: loaded.warnings,
    });
    for (const warning of config.warnings)
        console.log(`::warning::${warning}`);
    const paths = input('paths')
        .split(/[\n,]+/)
        .map((path) => path.trim())
        .filter(Boolean);
    const result = scan({ cwd, paths: paths.length > 0 ? paths : ['.'], config });
    const counts = countFindings(result.findings);
    const sarifFile = resolve(cwd, input('sarif-file') || 'cnpj-lint.sarif');
    writeFileSync(sarifFile, reportSarif(result));
    // O relatório inclui trechos dos arquivos analisados: impede que virem comandos de workflow.
    const token = randomUUID();
    process.stdout.write(`::stop-commands::${token}\n`);
    process.stdout.write(reportPretty(result, { color: true, verbose: true }));
    process.stdout.write(`::${token}::\n`);
    if (bool('annotations', true))
        process.stdout.write(reportGithub(result));
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile && bool('summary', true))
        appendFileSync(summaryFile, reportMarkdown(result));
    const failed = config.failOn !== 'none' &&
        result.findings.some((finding) => SEVERITY_ORDER[finding.severity] >=
            SEVERITY_ORDER[config.failOn]);
    setOutput('errors', String(counts.error));
    setOutput('warnings', String(counts.warning));
    setOutput('infos', String(counts.info));
    setOutput('total', String(counts.total));
    setOutput('files-scanned', String(result.filesScanned));
    setOutput('sarif-file', sarifFile);
    setOutput('failed', String(failed));
    return 0;
}
try {
    process.exitCode = main();
}
catch (error) {
    console.log(`::error title=cnpj-lint::${error.message}`);
    process.exitCode = 2;
}
