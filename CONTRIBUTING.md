# Contribuindo com o cnpj-lint

Obrigado pelo interesse! O objetivo do projeto é ajudar a comunidade brasileira a atravessar a migração para o CNPJ alfanumérico com o menor número possível de incidentes. Toda ajuda conta: relatar um falso positivo é tão valioso quanto escrever uma regra nova.

## Formas de contribuir

- **Falso positivo ou falso negativo:** abra uma issue com o trecho de código (sem dados reais), a linguagem e o que você esperava.
- **Nova linguagem ou framework:** padrões de Delphi, COBOL, ABAP, ADVPL, Kotlin, Swift, Ruby, Elixir, ORMs e bibliotecas de máscara são muito bem-vindos.
- **Bibliotecas:** informe a versão a partir da qual uma biblioteca aceita CNPJ alfanumérico, com a fonte (PR, release, commit). Veja [docs/bibliotecas.md](docs/bibliotecas.md).
- **Implementações de referência:** novas linguagens em [`examples/`](examples), sempre testadas contra [`examples/test-vectors.txt`](examples/test-vectors.txt) no workflow `examples.yml`.
- **Documentação:** correções, exemplos e traduções.

## Ambiente

Requisitos: Node.js 20 ou superior e git.

```bash
git clone https://github.com/Lucas-Castanheira-Gama/cnpj-lint.git
cd cnpj-lint
npm install
npm run check       # Biome (lint/formatação) + TypeScript + testes
npm run build       # gera dist/, usado pela GitHub Action
node dist/cli.js test/fixtures/project --no-gitignore --verbose
```

O projeto não tem dependências de runtime; mantenha assim. As dependências de desenvolvimento são só `typescript`, `@types/node` e `@biomejs/biome`.

## Estrutura

```text
src/
  cnpj.ts             implementação de referência (validação, DV, formatação, geração)
  scanner.ts          descoberta de arquivos, supressões, baseline
  rules/              uma regra por arquivo
    engine.ts         motor de padrões (placeholders, escopo, filtros)
  reporters/          pretty, json, sarif, markdown, github
  cli-main.ts         linha de comando
  action.ts           entrada da GitHub Action (action.yml)
test/
  fixtures/project/   projeto de exemplo com código "quebrado" e código correto (good/)
  fixtures/expected.txt  snapshot revisado das ocorrências do projeto de exemplo
examples/             implementações de referência em várias linguagens
docs/                 regras, bibliotecas e guia de migração
```

## Escrevendo ou ajustando uma regra

A maioria das regras é uma lista de `PatternSpec` (veja [`src/rules/engine.ts`](src/rules/engine.ts)):

```ts
{
  // Comentário curto com exemplos do que a regex encontra
  source: String.raw`\bparseInt\b{{ARGS_ID}}`,
  languages: ['javascript', 'typescript'],
  scope: 'line',          // 'line' | 'none' | { before, after }
  skipIf: COUNTER_LIKE,   // descarta linhas que falam de contadores
}
```

Placeholders disponíveis: `{{ID}}` (identificadores de CNPJ, incluindo os configurados pelo usuário), `{{ARGS_ID}}` (parênteses de chamada cujos argumentos citam o identificador), `{{DIGIT}}` (`\d`, `[0-9]`...) e `{{NON_DIGIT}}` (`\D`, `[^0-9]`...).

Checklist de uma mudança em regra:

1. Adicione casos positivos **e negativos** em [`test/rules.test.ts`](test/rules.test.ts). Linhas marcadas com `// !` (ou `# !`, `-- !`, `<!-- ! -->`) devem ser apontadas; as demais, não.
2. Se fizer sentido, acrescente um exemplo realista em `test/fixtures/project/` e atualize o snapshot com `UPDATE_FIXTURES=1 npm test`. **Revise o diff do `expected.txt` linha a linha**: ele é a nossa proteção contra falsos positivos.
3. Garanta que nada em `test/fixtures/project/good/` é apontado.
4. Documente em [`docs/regras.md`](docs/regras.md) (há um teste que exige uma seção por regra) e, se criar regra nova, registre em `src/rules/index.ts`, `schema.json` e nas tabelas dos READMEs.
5. Mensagens sempre nas duas línguas (`pt` e `en`), curtas e acionáveis.
6. Rode `npm run check` e `npm run build` e inclua o `dist/` atualizado no commit (o CI confere).

Prefira precisão a abrangência: um falso positivo frequente faz as pessoas desligarem a ferramenta.

## Commits e pull requests

- Mensagens de commit no formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`, `test:`...), em português ou inglês.
- Um assunto por PR. Descreva o problema, a solução e como testou.
- Nunca inclua CNPJs, CPFs ou outros dados reais em testes, issues ou PRs. Use `node dist/cli.js generate`.

## Versões

O projeto segue [SemVer](https://semver.org/lang/pt-BR/). Regras novas e padrões novos entram em versões *minor*; ajustes de precisão, em *patch*. A tag móvel `v1` aponta sempre para a última versão 1.x, usada pela GitHub Action.

## Código de conduta

Ao participar, você concorda com o nosso [Código de Conduta](CODE_OF_CONDUCT.md).
