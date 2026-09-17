import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
/**
 * Bibliotecas verificadas manualmente (código-fonte e notas de versão) em setembro de 2026.
 * Ao adicionar itens, cite a fonte (PR, release ou commit) em `source` e em docs/bibliotecas.md.
 */
export const KNOWN_PACKAGES = [
    {
        ecosystem: 'npm',
        name: 'validator',
        since: '13.15.35',
        hint: { pt: "isTaxID(valor, 'pt-BR')", en: "isTaxID(value, 'pt-BR')" },
        source: 'https://github.com/validatorjs/validator.js/pull/2644',
    },
    {
        ecosystem: 'npm',
        name: 'cpf-cnpj-validator',
        since: '2.0.0',
        source: 'https://github.com/carvalhoviniciusluiz/cpf-cnpj-validator/releases/tag/v2.0.0',
    },
    {
        ecosystem: 'npm',
        name: 'brazilian-values',
        since: '0.14.0',
        source: 'https://github.com/VitorLuizC/brazilian-values/releases/tag/0.14.0',
    },
    {
        ecosystem: 'npm',
        name: 'validation-br',
        since: '1.5.1',
        recommended: {
            version: '1.6.4',
            reason: {
                pt: 'corrige a geração de filiais alfanuméricas',
                en: 'fixes alphanumeric branch generation',
            },
        },
        source: 'https://github.com/klawdyo/validation-br/releases/tag/v.1.6.4',
    },
    {
        ecosystem: 'npm',
        name: '@fnando/cnpj',
        since: '2.0.0',
        source: 'https://github.com/fnando/cnpj',
    },
    {
        ecosystem: 'npm',
        name: '@brazilian-utils/brazilian-utils',
        since: '1.1.0',
        recommended: {
            version: '2.0.0',
            reason: {
                pt: 'traz correções na validação e na geração',
                en: 'ships validation and generation fixes',
            },
        },
        source: 'https://github.com/brazilian-utils/javascript',
    },
    {
        ecosystem: 'npm',
        name: 'js-brasil',
        since: '2.7.0',
        source: 'https://www.npmjs.com/package/js-brasil',
    },
    {
        ecosystem: 'pypi',
        name: 'validate-docbr',
        since: '1.11.0',
        source: 'https://github.com/alvarofpp/validate-docbr/pull/73',
    },
    {
        ecosystem: 'pypi',
        name: 'python-stdnum',
        since: '2.2',
        source: 'https://github.com/arthurdejong/python-stdnum/releases/tag/2.2',
    },
    {
        ecosystem: 'pypi',
        name: 'brutils',
        since: '2.5.0',
        source: 'https://github.com/brazilian-utils/python/releases/tag/v2.5.0',
    },
    {
        ecosystem: 'pypi',
        name: 'faker',
        since: '40.33.0',
        usage: {
            pt: 'cnpj() continua numérico por padrão: use cnpj(use_alphanumeric=True) nos testes',
            en: 'cnpj() stays numeric by default: use cnpj(use_alphanumeric=True) in tests',
        },
        source: 'https://github.com/joke2k/faker/pull/2402',
    },
    {
        ecosystem: 'maven',
        name: 'org.hibernate.validator:hibernate-validator',
        since: '9.0.0',
        usage: {
            pt: '@CNPJ continua NUMERIC por padrão: use @CNPJ(format = CNPJ.Format.ALPHANUMERIC)',
            en: '@CNPJ stays NUMERIC by default: use @CNPJ(format = CNPJ.Format.ALPHANUMERIC)',
        },
        source: 'https://hibernate.atlassian.net/browse/HV-1999',
    },
    {
        ecosystem: 'maven',
        name: 'br.com.caelum.stella:caelum-stella-core',
        since: '2.2.0',
        recommended: {
            version: '2.2.2',
            reason: { pt: 'traz correções para o formato alfanumérico', en: 'ships alphanumeric fixes' },
        },
        source: 'https://github.com/caelum/caelum-stella/pull/305',
    },
    {
        ecosystem: 'maven',
        name: 'br.com.caelum.stella:caelum-stella-bean-validation',
        since: '2.2.0',
        recommended: {
            version: '2.2.2',
            reason: { pt: 'traz correções para o formato alfanumérico', en: 'ships alphanumeric fixes' },
        },
        source: 'https://github.com/caelum/caelum-stella/pull/305',
    },
    {
        ecosystem: 'composer',
        name: 'respect/validation',
        since: '2.5.0',
        source: 'https://github.com/Respect/Validation/commit/570ba481b1',
    },
    {
        ecosystem: 'composer',
        name: 'laravellegends/pt-br-validator',
        since: '12.2.0',
        source: 'https://github.com/LaravelLegends/pt-br-validator/pull/79',
    },
    {
        ecosystem: 'rubygems',
        name: 'cpf_cnpj',
        since: '1.0.0',
        source: 'https://github.com/fnando/cpf_cnpj/pull/40',
    },
    {
        ecosystem: 'go',
        name: 'github.com/paemuri/brdoc/v3',
        since: '3.0.0',
        hint: {
            pt: 'as linhas v1/v2 (inclusive github.com/Nhanderu/brdoc) não aceitam letras',
            en: 'the v1/v2 lines (including github.com/Nhanderu/brdoc) do not accept letters',
        },
        source: 'https://github.com/paemuri/brdoc',
    },
    {
        ecosystem: 'nuget',
        name: 'Bogus',
        hint: {
            pt: 'gera apenas CNPJ numérico (issue bchavez/Bogus#634); complemente a massa de teste',
            en: 'only generates numeric CNPJs (issue bchavez/Bogus#634); add alphanumeric test data yourself',
        },
        source: 'https://github.com/bchavez/Bogus/issues/634',
    },
    {
        ecosystem: 'pub',
        name: 'brasil_fields',
        since: '1.18.0',
        usage: {
            pt: 'use CnpjAlfanumericoInputFormatter e CnpjAlfanumericoValidator',
            en: 'use CnpjAlfanumericoInputFormatter and CnpjAlfanumericoValidator',
        },
        source: 'https://pub.dev/packages/brasil_fields/changelog',
    },
];
// ---------------------------------------------------------------------------
// Versões
export function parseVersion(value) {
    const match = /(\d+(?:\.\d+)*)/.exec(value.replace(/^[\s=v]+/, ''));
    return match?.[1]?.split('.').map(Number);
}
export function compareVersions(a, b) {
    for (let index = 0; index < Math.max(a.length, b.length); index++) {
        const difference = (a[index] ?? 0) - (b[index] ?? 0);
        if (difference !== 0)
            return Math.sign(difference);
    }
    return 0;
}
const bumpLast = (version) => [
    ...version.slice(0, -1),
    (version.at(-1) ?? 0) + 1,
];
function caretUpper(version) {
    const [major = 0, minor = 0, patch = 0] = version;
    if (major > 0)
        return [major + 1, 0, 0];
    if (minor > 0)
        return [0, minor + 1, 0];
    return [0, 0, patch + 1];
}
function parseRangePart(part) {
    const hyphen = /^\s*(\S+)\s+-\s+(\S+)\s*$/.exec(part);
    if (hyphen) {
        const min = parseVersion(hyphen[1] ?? '');
        const max = parseVersion(hyphen[2] ?? '');
        return {
            ...(min ? { min } : {}),
            ...(max ? { maxExclusive: bumpLast(max) } : {}),
            exact: false,
        };
    }
    const tokens = part.trim().replace(/,/g, ' ').split(/\s+/).filter(Boolean);
    let min;
    let maxExclusive;
    let exact = false;
    let tokenIndex = 0;
    while (tokenIndex < tokens.length) {
        let token = tokens[tokenIndex] ?? '';
        // "~> 1.0" e ">= 2" podem vir separados por espaço
        if (/^(?:~>|>=|<=|>|<|===|==|=|\^|~=|~)$/.test(token) && tokens[tokenIndex + 1]) {
            token += tokens[tokenIndex + 1];
            tokenIndex++;
        }
        tokenIndex++;
        const operator = /^(~>|>=|<=|>|<|===|==|=|\^|~=|~|!=)?/.exec(token)?.[1] ?? '';
        const body = token.slice(operator.length);
        if (operator === '!=')
            continue;
        const wildcard = /^(\d+(?:\.\d+)*)\.[x*]/i.exec(body);
        const version = parseVersion(wildcard?.[1] ?? body);
        if (!version)
            continue;
        switch (operator) {
            case '^':
                min = version;
                maxExclusive = caretUpper(version);
                break;
            case '~':
                min = version;
                maxExclusive = [version[0] ?? 0, (version[1] ?? 0) + 1, 0];
                break;
            case '~>':
            case '~=':
                min = version;
                maxExclusive = bumpLast(version.length > 1 ? version.slice(0, -1) : version);
                break;
            case '>=':
            case '>':
                min = version;
                break;
            case '<':
                maxExclusive = version;
                break;
            case '<=':
                maxExclusive = bumpLast(version);
                break;
            default:
                min = version;
                if (wildcard)
                    maxExclusive = bumpLast(version);
                else
                    exact = true;
        }
    }
    return { ...(min ? { min } : {}), ...(maxExclusive ? { maxExclusive } : {}), exact };
}
/** Interpreta faixas npm, PEP 440, Composer, RubyGems, pub e Maven (o suficiente para esta regra). */
export function parseRange(spec) {
    const cleaned = spec.trim().replace(/^npm:[^@]+@/, '');
    if (cleaned === '' ||
        /^(?:\*|x|latest|any|dev-|git|github:|file:|link:|workspace:|https?:)/i.test(cleaned)) {
        return { exact: false };
    }
    const maven = /^([[(])\s*([^,\])]*)\s*,\s*([^\])]*)\s*([\])])$/.exec(cleaned);
    if (maven) {
        const min = parseVersion(maven[2] ?? '');
        const max = parseVersion(maven[3] ?? '');
        const maxExclusive = max ? (maven[4] === ']' ? bumpLast(max) : max) : undefined;
        return { ...(min ? { min } : {}), ...(maxExclusive ? { maxExclusive } : {}), exact: false };
    }
    const parts = cleaned.split(/\|\|?/).map(parseRangePart);
    const mins = parts.map((part) => part.min);
    if (mins.some((min) => min === undefined))
        return { exact: false };
    const min = mins.reduce((lowest, current) => compareVersions(current, lowest) < 0 ? current : lowest);
    const maxes = parts.map((part) => part.maxExclusive);
    const maxExclusive = maxes.some((max) => max === undefined)
        ? undefined
        : maxes.reduce((highest, current) => compareVersions(current, highest) > 0 ? current : highest);
    return {
        min,
        ...(maxExclusive ? { maxExclusive } : {}),
        exact: parts.length === 1 && (parts[0]?.exact ?? false),
    };
}
function lineOf(file, needle) {
    const index = file.lines.findIndex((text) => text.includes(needle));
    return Math.max(0, index);
}
function lineAtOffset(text, offset) {
    let line = 0;
    for (let index = 0; index < offset && index < text.length; index++) {
        if (text.charCodeAt(index) === 10)
            line++;
    }
    return line;
}
function readSibling(file, names) {
    for (const name of names) {
        const path = join(dirname(file.absolutePath), name);
        try {
            if (existsSync(path))
                return readFileSync(path, 'utf8');
        }
        catch {
            // Lockfile ilegível: segue com a faixa declarada.
        }
    }
    return undefined;
}
function safeJson(text) {
    if (!text)
        return undefined;
    try {
        const value = JSON.parse(text);
        return value && typeof value === 'object' ? value : undefined;
    }
    catch {
        return undefined;
    }
}
function record(value) {
    return value && typeof value === 'object' ? value : {};
}
function readNpm(file, names) {
    const json = safeJson(file.text);
    if (!json)
        return [];
    const lock = safeJson(readSibling(file, ['package-lock.json', 'npm-shrinkwrap.json']));
    const lockPackages = record(lock?.packages);
    const lockDependencies = record(lock?.dependencies);
    const result = [];
    for (const section of [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
    ]) {
        for (const [name, spec] of Object.entries(record(json[section]))) {
            if (!names.has(name) || typeof spec !== 'string')
                continue;
            const locked = record(lockPackages[`node_modules/${name}`]).version ??
                record(lockDependencies[name]).version;
            result.push({
                key: name,
                name,
                spec,
                line: lineOf(file, `"${name}"`),
                ...(typeof locked === 'string' ? { locked } : {}),
            });
        }
    }
    return result;
}
const normalizePython = (name) => name.toLowerCase().replace(/[-_.]+/g, '-');
function pythonLocks(file) {
    const locks = new Map();
    const text = readSibling(file, ['poetry.lock', 'uv.lock']);
    if (!text)
        return locks;
    for (const match of text.matchAll(/name\s*=\s*"([^"]+)"\s*\r?\nversion\s*=\s*"([^"]+)"/g)) {
        if (match[1] && match[2])
            locks.set(normalizePython(match[1]), match[2]);
    }
    return locks;
}
const PYTHON_DEPENDENCY = /(?:^|["'\s[,])([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:\[[^\]]*\])?\s*(?:=\s*(?:\{[^}]*version\s*=\s*)?["']([^"']*)["']|((?:===|[<>=!~^]=?)\s*[^;,"'\s#]+(?:\s*,\s*(?:[<>=!~^]=?)\s*[^;,"'\s#]+)*)|(?=["',\s\]]|$))/g;
function readPython(file, names) {
    const locks = file.basename === 'pyproject.toml' ? pythonLocks(file) : new Map();
    const result = [];
    file.lines.forEach((text, line) => {
        const withoutComment = text.replace(/(^|\s)#.*$/, '');
        for (const match of withoutComment.matchAll(PYTHON_DEPENDENCY)) {
            const key = normalizePython(match[1] ?? '');
            if (!names.has(key))
                continue;
            const locked = locks.get(key);
            result.push({
                key,
                name: match[1] ?? key,
                spec: (match[2] ?? match[3] ?? '').trim(),
                line,
                ...(locked ? { locked } : {}),
            });
        }
    });
    return result;
}
function mavenProperties(text) {
    const properties = new Map();
    for (const block of text.matchAll(/<properties>([\s\S]*?)<\/properties>/g)) {
        for (const match of (block[1] ?? '').matchAll(/<([\w.-]+)>\s*([^<]+?)\s*<\/\1>/g)) {
            if (match[1] && match[2])
                properties.set(match[1], match[2]);
        }
    }
    return properties;
}
function readMaven(file, names) {
    const result = [];
    if (file.basename === 'pom.xml') {
        const properties = mavenProperties(file.text);
        for (const block of file.text.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)) {
            const body = block[1] ?? '';
            const group = /<groupId>\s*([^<]+?)\s*<\/groupId>/.exec(body)?.[1];
            const artifact = /<artifactId>\s*([^<]+?)\s*<\/artifactId>/.exec(body)?.[1];
            const key = `${group}:${artifact}`;
            if (!group || !artifact || !names.has(key))
                continue;
            let version = /<version>\s*([^<]+?)\s*<\/version>/.exec(body)?.[1] ?? '';
            const reference = /^\$\{([^}]+)\}$/.exec(version);
            if (reference?.[1])
                version = properties.get(reference[1]) ?? '';
            const offset = (block.index ?? 0) + (block[0].indexOf(artifact) ?? 0);
            result.push({ key, name: key, spec: version, line: lineAtOffset(file.text, offset) });
        }
        return result;
    }
    // Gradle: "group:artifact:version" ou group: '...', name: '...', version: '...'
    file.lines.forEach((text, line) => {
        for (const match of text.matchAll(/["']([\w.-]+):([\w.-]+)(?::([^"'@]+))?(?:@\w+)?["']/g)) {
            const key = `${match[1]}:${match[2]}`;
            if (names.has(key))
                result.push({ key, name: key, spec: match[3] ?? '', line });
        }
        const named = /group\s*[:=]\s*["']([\w.-]+)["']\s*,\s*name\s*[:=]\s*["']([\w.-]+)["'](?:\s*,\s*version\s*[:=]\s*["']([^"']+)["'])?/.exec(text);
        const key = `${named?.[1]}:${named?.[2]}`;
        if (named && names.has(key))
            result.push({ key, name: key, spec: named[3] ?? '', line });
    });
    return result;
}
function readComposer(file, names) {
    const json = safeJson(file.text);
    if (!json)
        return [];
    const lock = safeJson(readSibling(file, ['composer.lock']));
    const lockVersions = new Map();
    for (const section of ['packages', 'packages-dev']) {
        const list = lock?.[section];
        if (!Array.isArray(list))
            continue;
        for (const item of list) {
            const entry = record(item);
            if (typeof entry.name === 'string' && typeof entry.version === 'string') {
                lockVersions.set(entry.name.toLowerCase(), entry.version);
            }
        }
    }
    const result = [];
    for (const section of ['require', 'require-dev']) {
        for (const [name, spec] of Object.entries(record(json[section]))) {
            const key = name.toLowerCase();
            if (!names.has(key) || typeof spec !== 'string')
                continue;
            const locked = lockVersions.get(key);
            result.push({
                key,
                name,
                spec,
                line: lineOf(file, `"${name}"`),
                ...(locked ? { locked } : {}),
            });
        }
    }
    return result;
}
function readGemfile(file, names) {
    const lock = readSibling(file, ['Gemfile.lock', 'gems.locked']) ?? '';
    const result = [];
    file.lines.forEach((text, line) => {
        const match = /^\s*gem\s+["']([\w-]+)["']((?:\s*,\s*["'][^"']+["'])*)/.exec(text);
        const name = match?.[1];
        if (!name || !names.has(name))
            return;
        const spec = [...(match[2] ?? '').matchAll(/["']([^"']+)["']/g)]
            .map((item) => item[1])
            .join(', ');
        const locked = new RegExp(`^\\s{4}${name} \\(([^)]+)\\)`, 'm').exec(lock)?.[1];
        result.push({ key: name, name, spec, line, ...(locked ? { locked } : {}) });
    });
    return result;
}
function readGoMod(file) {
    const result = [];
    file.lines.forEach((text, line) => {
        const match = /\b(github\.com\/(?:paemuri|Nhanderu)\/brdoc(?:\/v\d+)?)\s+(v[\w.+-]+)/.exec(text);
        if (!match?.[1] || !match[2])
            return;
        result.push({
            key: 'github.com/paemuri/brdoc/v3',
            name: match[1],
            spec: match[2],
            line,
            locked: match[2],
        });
    });
    return result;
}
function readNuget(file, names) {
    const result = [];
    file.lines.forEach((text, line) => {
        const match = /<(?:PackageReference|PackageVersion|package)\b[^>]*\b(?:Include|id)\s*=\s*"([^"]+)"(?:[^>]*\bVersion\s*=\s*"([^"]+)")?/i.exec(text);
        if (match?.[1] && names.has(match[1])) {
            result.push({ key: match[1], name: match[1], spec: match[2] ?? '', line });
        }
    });
    return result;
}
function readPub(file, names) {
    const lock = readSibling(file, ['pubspec.lock']) ?? '';
    const result = [];
    file.lines.forEach((text, line) => {
        const match = /^\s+([a-z0-9_]+)\s*:\s*["']?([^"'#\n]*?)["']?\s*(?:#.*)?$/.exec(text);
        const name = match?.[1];
        if (!name || !names.has(name))
            return;
        const locked = new RegExp(`^  ${name}:\\s*$[\\s\\S]*?^\\s+version:\\s*"([^"]+)"`, 'm').exec(lock)?.[1];
        result.push({ key: name, name, spec: match[2] ?? '', line, ...(locked ? { locked } : {}) });
    });
    return result;
}
function namesFor(ecosystem) {
    return new Set(KNOWN_PACKAGES.filter((item) => item.ecosystem === ecosystem).map((item) => ecosystem === 'pypi' ? normalizePython(item.name) : item.name));
}
function detect(file) {
    const name = file.basename;
    if (name === 'package.json') {
        return { ecosystem: 'npm', declared: readNpm(file, namesFor('npm')) };
    }
    if (/^requirements[\w.-]*\.txt$/.test(name) || name === 'pyproject.toml' || name === 'pipfile') {
        return { ecosystem: 'pypi', declared: readPython(file, namesFor('pypi')) };
    }
    if (name === 'pom.xml' || name === 'build.gradle' || name === 'build.gradle.kts') {
        return { ecosystem: 'maven', declared: readMaven(file, namesFor('maven')) };
    }
    if (name === 'composer.json') {
        return { ecosystem: 'composer', declared: readComposer(file, namesFor('composer')) };
    }
    if (name === 'gemfile') {
        return { ecosystem: 'rubygems', declared: readGemfile(file, namesFor('rubygems')) };
    }
    if (name === 'go.mod')
        return { ecosystem: 'go', declared: readGoMod(file) };
    if (/\.(?:cs|vb|fs)proj$/.test(name) ||
        name === 'packages.config' ||
        name === 'directory.packages.props') {
        return { ecosystem: 'nuget', declared: readNuget(file, namesFor('nuget')) };
    }
    if (name === 'pubspec.yaml') {
        return { ecosystem: 'pub', declared: readPub(file, namesFor('pub')) };
    }
    return undefined;
}
function join2(text, extra) {
    return extra ? { pt: `${text.pt} (${extra.pt})`, en: `${text.en} (${extra.en})` } : text;
}
export function evaluateDependency(item, declared) {
    const { name } = declared;
    const problem = (severity, message) => ({
        severity,
        message: join2(join2(message, item.hint), item.usage),
    });
    if (!item.since) {
        return problem('info', {
            pt: `${name} não tem versão com suporte a CNPJ alfanumérico`,
            en: `${name} has no version supporting alphanumeric CNPJ`,
        });
    }
    if (item.ecosystem === 'go' && !/\/v(?:[3-9]|\d{2,})$/.test(name)) {
        return problem('error', {
            pt: `${name} ${declared.spec} não suporta CNPJ alfanumérico; migre para github.com/paemuri/brdoc/v3`,
            en: `${name} ${declared.spec} does not support alphanumeric CNPJ; migrate to github.com/paemuri/brdoc/v3`,
        });
    }
    const since = parseVersion(item.since) ?? [];
    const range = parseRange(declared.locked ?? declared.spec);
    const raw = declared.locked ?? declared.spec;
    const shown = declared.locked || range.exact ? raw.replace(/^[\s=v]+/, '') : raw;
    if (!range.min) {
        return problem('info', {
            pt: `não foi possível determinar a versão de ${name}; garanta >= ${item.since}`,
            en: `could not determine the ${name} version; make sure it is >= ${item.since}`,
        });
    }
    if (declared.locked || range.exact) {
        if (compareVersions(range.min, since) < 0) {
            return problem('error', {
                pt: `${name} ${shown} não suporta CNPJ alfanumérico; atualize para >= ${item.since}`,
                en: `${name} ${shown} does not support alphanumeric CNPJ; upgrade to >= ${item.since}`,
            });
        }
    }
    else if (range.maxExclusive && compareVersions(range.maxExclusive, since) <= 0) {
        return problem('error', {
            pt: `a faixa "${shown}" de ${name} nunca instala uma versão com suporte a CNPJ alfanumérico (>= ${item.since})`,
            en: `the "${shown}" range for ${name} never installs a version supporting alphanumeric CNPJ (>= ${item.since})`,
        });
    }
    else if (compareVersions(range.min, since) < 0) {
        return problem('warning', {
            pt: `a faixa "${shown}" de ${name} aceita versões sem suporte a CNPJ alfanumérico; exija >= ${item.since}`,
            en: `the "${shown}" range for ${name} allows versions without alphanumeric CNPJ support; require >= ${item.since}`,
        });
    }
    const recommended = item.recommended && parseVersion(item.recommended.version);
    if (item.recommended && recommended && compareVersions(range.min, recommended) < 0) {
        return {
            severity: 'info',
            message: join2({
                pt: `${name} ${shown} suporta CNPJ alfanumérico, mas a ${item.recommended.version} ${item.recommended.reason.pt}`,
                en: `${name} ${shown} supports alphanumeric CNPJ, but ${item.recommended.version} ${item.recommended.reason.en}`,
            }, item.usage),
        };
    }
    if (item.usage) {
        return {
            severity: 'info',
            message: {
                pt: `${name} ${shown} suporta CNPJ alfanumérico; ${item.usage.pt}`,
                en: `${name} ${shown} supports alphanumeric CNPJ; ${item.usage.en}`,
            },
        };
    }
    return undefined;
}
export const outdatedDependency = {
    id: 'outdated-dependency',
    severity: 'warning',
    tags: ['dependencies', 'supply-chain'],
    docs: {
        title: {
            pt: 'Dependência de CNPJ sem suporte ao formato alfanumérico',
            en: 'CNPJ dependency without alphanumeric support',
        },
        description: {
            pt: 'Bibliotecas de validação/geração de CNPJ só aceitam letras a partir de certas versões (npm, PyPI, Maven/Gradle, Composer, RubyGems, Go, NuGet e pub). A lista verificada está em docs/bibliotecas.md.',
            en: 'CNPJ validation/generation libraries only accept letters from specific versions on (npm, PyPI, Maven/Gradle, Composer, RubyGems, Go, NuGet and pub). The verified list lives in docs/bibliotecas.md.',
        },
        fix: {
            pt: 'Atualize para a versão indicada e confira a observação da biblioteca (algumas exigem configuração extra).',
            en: 'Upgrade to the indicated version and check the library note (some need extra configuration).',
        },
    },
    check(file) {
        if (!file.languages.has('manifest'))
            return [];
        const detected = detect(file);
        if (!detected)
            return [];
        const matches = [];
        for (const declared of detected.declared) {
            const item = KNOWN_PACKAGES.find((candidate) => candidate.ecosystem === detected.ecosystem &&
                (candidate.ecosystem === 'pypi'
                    ? normalizePython(candidate.name) === declared.key
                    : candidate.name === declared.key));
            if (!item)
                continue;
            const verdict = evaluateDependency(item, declared);
            if (!verdict)
                continue;
            const text = file.lines[declared.line] ?? '';
            matches.push({
                line: declared.line,
                column: Math.max(0, text.search(/\S/)),
                length: Math.max(1, text.trim().length),
                severity: verdict.severity,
                message: verdict.message,
            });
        }
        return matches;
    },
};
