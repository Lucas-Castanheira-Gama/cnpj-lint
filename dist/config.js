import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { KNOWN_LANGUAGES } from './languages.js';
import { RULES } from './rules/index.js';
export const CONFIG_FILES = ['.cnpjlintrc.json', '.cnpjlintrc', 'cnpj-lint.config.json'];
export const DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024;
export class ConfigError extends Error {
    name = 'ConfigError';
}
const SETTINGS = ['off', 'info', 'warning', 'error'];
const FAIL_ON = ['none', 'info', 'warning', 'error'];
const LOCALES = ['pt-BR', 'en'];
function stringArray(value, field, source) {
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
        throw new ConfigError(`${source}: "${field}" deve ser uma lista de textos.`);
    }
    return value;
}
/** Valida um objeto de configuração vindo de JSON. */
export function validateConfig(value, source) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new ConfigError(`${source}: a configuração deve ser um objeto JSON.`);
    }
    const input = value;
    const config = {};
    const warnings = [];
    const known = new Set(RULES.map((rule) => rule.id));
    for (const [key, field] of Object.entries(input)) {
        switch (key) {
            case '$schema':
                break;
            case 'include':
            case 'exclude':
            case 'identifiers':
                config[key] = stringArray(field, key, source);
                break;
            case 'rules': {
                if (!field || typeof field !== 'object' || Array.isArray(field)) {
                    throw new ConfigError(`${source}: "rules" deve ser um objeto { "id-da-regra": "error" }.`);
                }
                const rules = {};
                for (const [id, setting] of Object.entries(field)) {
                    if (!SETTINGS.includes(setting)) {
                        throw new ConfigError(`${source}: regra "${id}" com valor inválido; use ${SETTINGS.join(', ')}.`);
                    }
                    if (!known.has(id))
                        warnings.push(`${source}: regra desconhecida "${id}" ignorada.`);
                    else
                        rules[id] = setting;
                }
                config.rules = rules;
                break;
            }
            case 'extensions': {
                if (!field || typeof field !== 'object' || Array.isArray(field)) {
                    throw new ConfigError(`${source}: "extensions" deve ser um objeto { ".ext": "linguagem" }.`);
                }
                const extensions = {};
                for (const [extension, language] of Object.entries(field)) {
                    if (!KNOWN_LANGUAGES.includes(language)) {
                        throw new ConfigError(`${source}: linguagem "${String(language)}" desconhecida para "${extension}". Opções: ${KNOWN_LANGUAGES.join(', ')}.`);
                    }
                    const normalized = extension.startsWith('.') ? extension : `.${extension}`;
                    extensions[normalized.toLowerCase()] = language;
                }
                config.extensions = extensions;
                break;
            }
            case 'maxFileSize':
                if (typeof field !== 'number' || !Number.isFinite(field) || field <= 0) {
                    throw new ConfigError(`${source}: "maxFileSize" deve ser um número positivo (bytes).`);
                }
                config.maxFileSize = field;
                break;
            case 'gitignore':
            case 'defaultExcludes':
                if (typeof field !== 'boolean') {
                    throw new ConfigError(`${source}: "${key}" deve ser true ou false.`);
                }
                config[key] = field;
                break;
            case 'failOn':
                if (!FAIL_ON.includes(field)) {
                    throw new ConfigError(`${source}: "failOn" deve ser ${FAIL_ON.join(', ')}.`);
                }
                config.failOn = field;
                break;
            case 'locale':
                if (!LOCALES.includes(field)) {
                    throw new ConfigError(`${source}: "locale" deve ser ${LOCALES.join(' ou ')}.`);
                }
                config.locale = field;
                break;
            case 'baseline':
                if (typeof field !== 'string') {
                    throw new ConfigError(`${source}: "baseline" deve ser o caminho de um arquivo.`);
                }
                config.baseline = field;
                break;
            default:
                warnings.push(`${source}: opção desconhecida "${key}" ignorada.`);
        }
    }
    return { config, warnings };
}
function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    }
    catch (error) {
        throw new ConfigError(`Não foi possível ler ${path}: ${error.message}`);
    }
}
/** Procura a configuração no diretório de trabalho (ou usa o caminho informado). */
export function loadConfig(cwd, explicitPath) {
    if (explicitPath) {
        const path = resolve(cwd, explicitPath);
        if (!existsSync(path))
            throw new ConfigError(`Arquivo de configuração não encontrado: ${explicitPath}`);
        return { ...validateConfig(readJson(path), explicitPath), path };
    }
    for (const name of CONFIG_FILES) {
        const path = resolve(cwd, name);
        if (existsSync(path))
            return { ...validateConfig(readJson(path), name), path };
    }
    const packagePath = resolve(cwd, 'package.json');
    if (existsSync(packagePath)) {
        const packageJson = readJson(packagePath);
        if (packageJson && typeof packageJson === 'object' && 'cnpjLint' in packageJson) {
            return {
                ...validateConfig(packageJson.cnpjLint, 'package.json#cnpjLint'),
                path: packagePath,
            };
        }
    }
    return { config: {}, warnings: [] };
}
export function defaultLocale() {
    return process.env.CNPJ_LINT_LOCALE === 'en' ? 'en' : 'pt-BR';
}
/** Combina configuração do arquivo com opções da linha de comando (que têm prioridade). */
export function resolveConfig(file, overrides = {}, meta = {}) {
    const baseline = overrides.baseline ?? file.baseline;
    return {
        include: [...(file.include ?? []), ...(overrides.include ?? [])],
        exclude: [...(file.exclude ?? []), ...(overrides.exclude ?? [])],
        rules: { ...(file.rules ?? {}), ...(overrides.rules ?? {}) },
        identifiers: [...(file.identifiers ?? []), ...(overrides.identifiers ?? [])],
        extensions: { ...(file.extensions ?? {}), ...(overrides.extensions ?? {}) },
        maxFileSize: overrides.maxFileSize ?? file.maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
        gitignore: overrides.gitignore ?? file.gitignore ?? true,
        defaultExcludes: overrides.defaultExcludes ?? file.defaultExcludes ?? true,
        failOn: overrides.failOn ?? file.failOn ?? 'error',
        locale: overrides.locale ?? file.locale ?? defaultLocale(),
        ...(baseline ? { baseline } : {}),
        ...(meta.path ? { path: meta.path } : {}),
        warnings: meta.warnings ?? [],
    };
}
