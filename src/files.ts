import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { compileGlobs } from './glob.js';

/** Diretórios quase sempre gerados ou de terceiros. */
export const DEFAULT_EXCLUDES: readonly string[] = [
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

export interface DiscoverOptions {
  cwd: string;
  include: readonly string[];
  exclude: readonly string[];
  /** Usa `git ls-files` para respeitar o .gitignore quando possível. */
  gitignore: boolean;
  /** Ignora a lista DEFAULT_EXCLUDES. */
  noDefaultExcludes?: boolean;
}

export function toPosix(path: string): string {
  return path.split(sep).join('/');
}

function gitFiles(directory: string): string[] | undefined {
  const result = spawnSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '.'],
    { cwd: directory, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true },
  );
  if (result.error || result.status !== 0) return undefined;
  return result.stdout
    .split('\0')
    .filter(Boolean)
    .map((file) => join(directory, file));
}

function walk(directory: string, skip: (absolute: string) => boolean, output: string[]): void {
  let entries: import('node:fs').Dirent[];
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (!skip(`${absolute}${sep}`)) walk(absolute, skip, output);
    } else if (entry.isFile()) {
      output.push(absolute);
    }
  }
}

/** Resolve os alvos (arquivos e diretórios) em uma lista de arquivos absolutos, sem repetição. */
export function discoverFiles(targets: readonly string[], options: DiscoverOptions): string[] {
  const excludes = compileGlobs([
    ...(options.noDefaultExcludes ? [] : DEFAULT_EXCLUDES),
    ...options.exclude,
  ]);
  const includes = options.include.length > 0 ? compileGlobs(options.include) : undefined;
  const relativePath = (absolute: string): string => {
    const path = toPosix(relative(options.cwd, absolute));
    return path.startsWith('..') || isAbsolute(path) ? toPosix(absolute) : path;
  };
  const excluded = (absolute: string): boolean => {
    const path = relativePath(absolute.replace(/[\\/]+$/, ''));
    const isDirectory = /[\\/]$/.test(absolute);
    return excludes(isDirectory ? `${path}/` : path);
  };

  const found = new Set<string>();
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
    if (files.length === 0) walk(absolute, excluded, files);
    for (const file of files) {
      try {
        if (statSync(file).isFile()) found.add(resolve(file));
      } catch {
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
