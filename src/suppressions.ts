/**
 * Diretivas em comentários (qualquer sintaxe de comentário):
 *
 *   cnpj-lint-disable-file [regras]
 *   cnpj-lint-disable [regras]  ...  cnpj-lint-enable [regras]
 *   cnpj-lint-disable-line [regras]
 *   cnpj-lint-disable-next-line [regras]
 *
 * Sem lista de regras, a diretiva vale para todas. Um texto após " -- " é tratado como justificativa.
 */

const DIRECTIVE =
  /cnpj-lint-(disable-file|disable-next-line|disable-line|disable|enable)\b([^\n]*)/g;

export type SuppressionCheck = (ruleId: string, line: number) => boolean;

function parseRules(rest: string, known: ReadonlySet<string>): Set<string> | 'all' {
  const beforeReason = rest.split(/\s--\s|-->|\*\/|\*\)|\}/)[0] ?? '';
  const ids = beforeReason
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter((token) => known.has(token));
  return ids.length > 0 ? new Set(ids) : 'all';
}

const covers = (scope: Set<string> | 'all', ruleId: string): boolean =>
  scope === 'all' || scope.has(ruleId);

export function parseSuppressions(
  lines: readonly string[],
  knownRules: ReadonlySet<string>,
): SuppressionCheck {
  const fileScopes: Array<Set<string> | 'all'> = [];
  const lineScopes = new Map<number, Array<Set<string> | 'all'>>();
  /** Intervalos [início, fim) por regra ("*" = todas). */
  const blocks: Array<{ scope: Set<string> | 'all'; start: number; end: number }> = [];
  const open: Array<{ scope: Set<string> | 'all'; start: number }> = [];

  const addLine = (line: number, scope: Set<string> | 'all') => {
    const list = lineScopes.get(line) ?? [];
    list.push(scope);
    lineScopes.set(line, list);
  };

  lines.forEach((text, line) => {
    if (!text.includes('cnpj-lint-')) return;
    for (const match of text.matchAll(DIRECTIVE)) {
      const kind = match[1];
      const scope = parseRules(match[2] ?? '', knownRules);
      switch (kind) {
        case 'disable-file':
          fileScopes.push(scope);
          break;
        case 'disable-line':
          addLine(line, scope);
          break;
        case 'disable-next-line':
          addLine(line + 1, scope);
          break;
        case 'disable':
          open.push({ scope, start: line });
          break;
        case 'enable': {
          for (let index = open.length - 1; index >= 0; index--) {
            const candidate = open[index];
            if (!candidate) continue;
            const matchesScope =
              scope === 'all' ||
              (candidate.scope !== 'all' && [...scope].every((id) => covers(candidate.scope, id)));
            if (matchesScope) {
              blocks.push({ scope: candidate.scope, start: candidate.start, end: line });
              open.splice(index, 1);
              if (scope !== 'all') break;
            }
          }
          break;
        }
      }
    }
  });
  for (const candidate of open) {
    blocks.push({ scope: candidate.scope, start: candidate.start, end: Number.POSITIVE_INFINITY });
  }

  return (ruleId, line) =>
    fileScopes.some((scope) => covers(scope, ruleId)) ||
    (lineScopes.get(line) ?? []).some((scope) => covers(scope, ruleId)) ||
    blocks.some((block) => line >= block.start && line < block.end && covers(block.scope, ruleId));
}
