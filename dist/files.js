import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { compileGlobs } from './glob.js';
/** Diretórios quase sempre gerados ou de terceiros. */
export const DEFAULT_EXCLUDES = [
    'node_modules/',
    '.git/',
    '.hg/',
    '.svn/',
    'vendor/',
    'bower_components/',
    'jspm_packages/',
    'dist/',
    'build/',
    'out/',
    'target/',
    'coverage/',
    '.next/',
    '.nuxt/',
    '.svelte-kit/',
    '.output/',
    '.turbo/',
    '.cache/',
    '.parcel-cache/',
    '.gradle/',
    '.idea/',
    '.vs/',
    '.venv/',
    'venv/',
    '__pycache__/',
    '.mypy_cache/',
    '.pytest_cache/',
    '.tox/',
    '.dart_tool/',
    'Pods/',
    'DerivedData/',
    'obj/',
    '.terraform/',
    '.test-build/',
    '**/bin/Debug/**',
    '**/bin/Release/**',
];
export function toPosix(path) {
    return path.split(sep).join('/');
}
function gitFiles(directory) {
    const result = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '.'], { cwd: directory, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true });
    if (result.error || result.status !== 0)
        return undefined;
    return result.stdout
        .split('\0')
        .filter(Boolean)
        .map((file) => join(directory, file));
}
function walk(directory, skip, output) {
    let entries;
    try {
        entries = readdirSync(directory, { withFileTypes: true });
    }
    catch {
        return;
    }
    for (const entry of entries) {
        const absolute = join(directory, entry.name);
        if (entry.isSymbolicLink())
            continue;
        if (entry.isDirectory()) {
            if (!skip(`${absolute}${sep}`))
                walk(absolute, skip, output);
        }
        else if (entry.isFile()) {
            output.push(absolute);
        }
    }
}
/** Resolve os alvos (arquivos e diretórios) em uma lista de arquivos absolutos, sem repetição. */
export function discoverFiles(targets, options) {
    const excludes = compileGlobs([
        ...(options.noDefaultExcludes ? [] : DEFAULT_EXCLUDES),
        ...options.exclude,
    ]);
    const includes = options.include.length > 0 ? compileGlobs(options.include) : undefined;
    const relativePath = (absolute) => {
        const path = toPosix(relative(options.cwd, absolute));
        return path.startsWith('..') || isAbsolute(path) ? toPosix(absolute) : path;
    };
    const excluded = (absolute) => {
        const path = relativePath(absolute.replace(/[\\/]+$/, ''));
        const isDirectory = /[\\/]$/.test(absolute);
        return excludes(isDirectory ? `${path}/` : path);
    };
    const found = new Set();
    for (const target of targets.length > 0 ? targets : ['.']) {
        const absolute = resolve(options.cwd, target);
        if (!existsSync(absolute)) {
            throw new Error(`Caminho não encontrado: ${target}`);
        }
        if (statSync(absolute).isFile()) {
            found.add(absolute);
            continue;
        }
        const files = (options.gitignore ? gitFiles(absolute) : undefined) ?? [];
        if (files.length === 0)
            walk(absolute, excluded, files);
        for (const file of files) {
            try {
                if (statSync(file).isFile())
                    found.add(resolve(file));
            }
            catch {
                // Arquivo listado pelo git mas removido do disco.
            }
        }
    }
    // Ordena pelo caminho com "/" para o resultado ser igual em qualquer sistema operacional.
    return [...found]
        .filter((file) => !excluded(file))
        .filter((file) => !includes || includes(relativePath(file)))
        .map((file) => ({ file, key: toPosix(file) }))
        .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
        .map((item) => item.file);
}
