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
export type SuppressionCheck = (ruleId: string, line: number) => boolean;
export declare function parseSuppressions(lines: readonly string[], knownRules: ReadonlySet<string>): SuppressionCheck;
