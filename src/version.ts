/** Mantida em sincronia com package.json (verificado nos testes). */
export const VERSION = '1.0.0';

export const REPOSITORY_URL = 'https://github.com/Lucas-Castanheira-Gama/cnpj-lint';

export function ruleDocsUrl(ruleId: string): string {
  return `${REPOSITORY_URL}/blob/main/docs/regras.md#${ruleId}`;
}
