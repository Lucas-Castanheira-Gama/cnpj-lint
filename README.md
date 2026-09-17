# cnpj-lint

**Encontre, antes do seu cliente, os pontos do seu código que quebram com o CNPJ alfanumérico.**

[![CI](https://github.com/Lucas-Castanheira-Gama/cnpj-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/Lucas-Castanheira-Gama/cnpj-lint/actions/workflows/ci.yml)
[![Implementações de referência](https://github.com/Lucas-Castanheira-Gama/cnpj-lint/actions/workflows/examples.yml/badge.svg)](https://github.com/Lucas-Castanheira-Gama/cnpj-lint/actions/workflows/examples.yml)
[![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)](LICENSE)
![Node.js 20+](https://img.shields.io/badge/node-%3E%3D20-339933)
![Sem dependências](https://img.shields.io/badge/depend%C3%AAncias-0-brightgreen)

[English](README.en.md)

Desde julho de 2026 a Receita Federal emite CNPJs com letras, como `12.ABC.345/01DE-35`. Os números antigos continuam valendo, então os dois formatos vão conviver. O problema é que o CNPJ passou décadas sendo tratado como número: `BIGINT` no banco, `replace(/\D/g, '')` no back-end, `parseInt` no cálculo do DV, máscara `99.999.999/9999-99` na tela. Boa parte dessas quebras é silenciosa, e a letra simplesmente some no caminho.

O **cnpj-lint** é um analisador estático, open source e sem dependências, que varre o repositório e aponta esses pontos em **mais de 20 linguagens e formatos**: JavaScript/TypeScript, Python, Java, Kotlin, C#, Go, PHP, Ruby, Dart/Flutter, Swift, Rust, SQL, Delphi, COBOL, ADVPL/Harbour, VB, XSD, OpenAPI, GraphQL, Protobuf, Prisma e manifestos de dependências. Ele roda no terminal, gera SARIF para o GitHub code scanning, anota PRs com a GitHub Action e ainda traz uma implementação de referência do novo cálculo, testada em 7 linguagens.

```text
$ npx github:Lucas-Castanheira-Gama/cnpj-lint

api/Empresa.java
  12:13  erro  CNPJ declarado com tipo numérico  numeric-type
  14:5   erro  @CNPJ do Hibernate Validator sem format = ALPHANUMERIC  hibernate-cnpj-format
  36:29  erro  Limpeza remove tudo que não é dígito do CNPJ  strip-non-digits
  44:21  erro  Rotina de DV do CNPJ converte caracteres com parse numérico; letras viram NaN, 0 ou exceção  checksum-numeric-parse

db/001_schema.sql
  4:4    erro   CNPJ armazenado em coluna numérica  numeric-storage
  23:8   erro   CNPJ convertido para número  numeric-conversion
  29:71  aviso  Código assume que a ordem 0001 é sempre a matriz  branch-0001-headquarters

frontend/validar-cnpj.js
  14:21  erro   Rotina de DV do CNPJ converte caracteres com parse numérico; letras viram NaN, 0 ou exceção  checksum-numeric-parse
  35:18  aviso  Máscara de CNPJ aceita apenas dígitos  numeric-mask

manifests/node/package.json
  8:5   erro  validator 13.12.0 não suporta CNPJ alfanumérico; atualize para >= 13.15.35 (isTaxID(valor, 'pt-BR'))  outdated-dependency

✖ 10 problemas (8 erros, 2 avisos, 0 informativos)
```

## Índice

- [Início rápido](#início-rápido)
- [O que é detectado](#o-que-é-detectado)
- [GitHub Action](#github-action)
- [Linha de comando](#linha-de-comando)
- [Configuração](#configuração)
- [Biblioteca de referência](#biblioteca-de-referência)
- [Implementações em outras linguagens](#implementações-em-outras-linguagens)
- [Como funciona e limitações](#como-funciona-e-limitações)
- [Contribuindo](#contribuindo)

## Início rápido

Requer Node.js 20 ou superior. Não é preciso instalar nada no projeto:

```bash
# Analisa o diretório atual (respeita o .gitignore)
npx github:Lucas-Castanheira-Gama/cnpj-lint

# Mostra o trecho e a correção sugerida de cada ocorrência
npx github:Lucas-Castanheira-Gama/cnpj-lint src db --verbose

# Valida CNPJs e gera massa de teste alfanumérica
npx github:Lucas-Castanheira-Gama/cnpj-lint validate 12.ABC.345/01DE-35
npx github:Lucas-Castanheira-Gama/cnpj-lint generate -n 20 --formatted
```

No CI, use a [GitHub Action](#github-action). Para migrar um sistema grande aos poucos, veja [baseline](#baseline) e o [guia de migração](docs/guia-de-migracao.md).

## O que é detectado

| Regra | Nível | O que aponta |
| --- | --- | --- |
| [`numeric-regex`](docs/regras.md#numeric-regex) | erro | `\d{14}`, `\d{2}.\d{3}.\d{3}/\d{4}-\d{2}`, `LIKE '[0-9]...'` |
| [`strip-non-digits`](docs/regras.md#strip-non-digits) | erro | `replace(/\D/g, '')`, `re.sub(r'\D', ...)`, `somenteNumeros(cnpj)`, `FILTER_SANITIZE_NUMBER_INT` |
| [`numeric-conversion`](docs/regras.md#numeric-conversion) | erro | `parseInt(cnpj)`, `int(cnpj)`, `Long.parseLong`, `StrToInt64`, `CAST(cnpj AS BIGINT)`, `%014d` |
| [`numeric-type`](docs/regras.md#numeric-type) | erro | `cnpj: number`, `Long cnpj`, `Cnpj int64`, `PIC 9(14)`, `int64 cnpj`, `type: integer` |
| [`numeric-storage`](docs/regras.md#numeric-storage) | erro | Colunas `BIGINT`/`NUMERIC(14)` e ORMs: Prisma, TypeORM, Sequelize, Mongoose, Django, SQLAlchemy, Rails, Laravel, JPA, EF Core, GORM, Liquibase |
| [`digit-only-check`](docs/regras.md#digit-only-check) | erro | `isdigit()`, `ctype_digit`, `ISNUMERIC`, `isNaN`, `^\d+$`, `'numeric\|digits:14'` |
| [`checksum-numeric-parse`](docs/regras.md#checksum-numeric-parse) | erro | Cálculo do DV com `parseInt`/`int()`/`getNumericValue` em vez de ASCII − 48 |
| [`numeric-mask`](docs/regras.md#numeric-mask) | aviso | Máscaras `99.999.999/9999-99`, `00.000.000/0000-00`, `##.###.###/####-##` |
| [`numeric-input`](docs/regras.md#numeric-input) | aviso | `type="number"`, `inputmode="numeric"`, teclado numérico em apps, `digitsOnly` |
| [`nfe-access-key`](docs/regras.md#nfe-access-key) | erro | Chave de acesso de NF-e/CT-e/MDF-e validada ou guardada como só dígitos |
| [`xsd-numeric-pattern`](docs/regras.md#xsd-numeric-pattern) | erro | Schemas locais com `TCnpj` = `[0-9]{14}` |
| [`hibernate-cnpj-format`](docs/regras.md#hibernate-cnpj-format) | erro | `@CNPJ` do Hibernate Validator sem `format = ALPHANUMERIC` (o padrão continua numérico) |
| [`outdated-dependency`](docs/regras.md#outdated-dependency) | aviso | Bibliotecas em versões sem suporte (npm, PyPI, Maven, Composer, RubyGems, Go, NuGet, pub) |
| [`branch-0001-headquarters`](docs/regras.md#branch-0001-headquarters) | aviso | Código que supõe que `0001` é sempre a matriz |
| [`excluded-letters`](docs/regras.md#excluded-letters) | aviso | Validações que excluem I, O, U, Q, F (todas as 26 letras são válidas) |
| [`numeric-test-data`](docs/regras.md#numeric-test-data) | informativo | Faker, brutils e Bogus gerando só CNPJ numérico |

Detalhes, exemplos de código e correções por linguagem estão em [docs/regras.md](docs/regras.md). A [lista de bibliotecas](docs/bibliotecas.md) diz a partir de qual versão cada uma aceita letras, com a fonte de cada informação.

### O que mudou no CNPJ

| | Antes | Agora |
| --- | --- | --- |
| Posições 1 a 12 | dígitos | dígitos e letras maiúsculas (todas as 26) |
| Posições 13 e 14 (DV) | dígitos | dígitos |
| Cálculo do DV | módulo 11 | módulo 11 com o valor **ASCII − 48** de cada caractere (`A` = 17) |
| Máscara | `XX.XXX.XXX/XXXX-DV` | igual |

Fonte: [Perguntas e respostas da Receita Federal](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/cnpj/cnpj-alfanumerico.pdf). Um detalhe curioso: o primeiro exemplo da pergunta 23 (`AA345678/0003-29`) usa um DV ilustrativo. Pelo algoritmo oficial, o correto seria `AA345678/0003-86`.

## GitHub Action

```yaml
# .github/workflows/cnpj-lint.yml
name: cnpj-lint
on: [push, pull_request]

permissions:
  contents: read
  security-events: write # só para upload-sarif

jobs:
  cnpj-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: Lucas-Castanheira-Gama/cnpj-lint@v1
        with:
          fail-on: error
          upload-sarif: true # requer repositório público ou GitHub Advanced Security
```

A Action anota as linhas no PR, escreve um resumo em Markdown na página do job, grava `cnpj-lint.sarif` e, se pedido, envia o SARIF para a aba **Security → Code scanning**.

| Entrada | Padrão | Descrição |
| --- | --- | --- |
| `paths` | `.` | Arquivos ou diretórios, separados por vírgula ou quebra de linha |
| `working-directory` | `.` | Diretório base (onde fica a configuração) |
| `config` | | Arquivo de configuração; por padrão usa `.cnpjlintrc.json` se existir |
| `fail-on` | `error` | `error`, `warning`, `info` ou `none` |
| `baseline` | | Arquivo de baseline |
| `locale` | `pt-BR` | `pt-BR` ou `en` |
| `annotations` | `true` | Anotações nas linhas do PR |
| `summary` | `true` | Resumo em Markdown no job |
| `sarif-file` | `cnpj-lint.sarif` | Onde gravar o SARIF |
| `upload-sarif` | `false` | Envia o SARIF ao code scanning |

Saídas: `errors`, `warnings`, `infos`, `total`, `files-scanned`, `sarif-file` e `failed`.

## Linha de comando

```text
cnpj-lint [scan] [caminhos...] [opções]
cnpj-lint validate <cnpj...> [--file arquivo] [--strict]
cnpj-lint generate [-n 10] [--numeric] [--formatted] [--root 8CARACTER]
cnpj-lint rules [--format json]
cnpj-lint init
```

| Opção | Descrição |
| --- | --- |
| `-f, --format` | `pretty` (padrão), `json`, `sarif`, `markdown` ou `github` |
| `-o, --output <arquivo>` | Grava o relatório em arquivo |
| `--fail-on <nível>` | Nível que faz o comando sair com código 1 (padrão: `error`) |
| `-c, --config <arquivo>` | Arquivo de configuração |
| `--rule <id=nível>` | Ajusta uma regra (`off`, `info`, `warning`, `error`) |
| `--identifier <nome>` | Nome extra usado para CNPJ no seu código, ex.: `nr_insc` |
| `--include` / `--exclude <glob>` | Filtra caminhos (sintaxe do `.gitignore`) |
| `--no-gitignore` | Não usa `git ls-files` |
| `--no-default-excludes` | Também analisa `node_modules`, `dist`, `build`, `vendor`... |
| `--baseline <arquivo>` / `--update-baseline` | Usa ou grava o baseline |
| `-q, --quiet` | Mostra apenas erros |
| `-v, --verbose` | Mostra o trecho e a correção sugerida |
| `--locale <pt-BR\|en>` | Idioma das mensagens (ou `CNPJ_LINT_LOCALE=en`) |

Códigos de saída: `0` sem ocorrências no nível de `--fail-on`, `1` com ocorrências (ou CNPJ inválido em `validate`) e `2` para erro de uso ou configuração.

> O pacote ainda não foi publicado no npm; `npx github:Lucas-Castanheira-Gama/cnpj-lint` instala direto deste repositório. Também dá para clonar e rodar `node dist/cli.js`.

## Configuração

O cnpj-lint procura `.cnpjlintrc.json`, `.cnpjlintrc`, `cnpj-lint.config.json` ou a chave `"cnpjLint"` do `package.json`. Use `npx github:Lucas-Castanheira-Gama/cnpj-lint init` para criar um arquivo inicial.

```json
{
  "$schema": "https://raw.githubusercontent.com/Lucas-Castanheira-Gama/cnpj-lint/main/schema.json",
  "include": ["src/", "db/"],
  "exclude": ["**/legacy/**", "*.generated.ts"],
  "identifiers": ["nr_insc", "docFederal"],
  "extensions": { ".4gl": "xbase" },
  "rules": {
    "branch-0001-headquarters": "off",
    "numeric-mask": "error"
  },
  "failOn": "warning"
}
```

- `identifiers`: nomes extras de campos de CNPJ. `cnpj` e `cgc` (o nome antigo, comum em sistemas legados) já são reconhecidos em qualquer grafia (`nrCnpj`, `CGC_CPF`, `cpfCnpj`...).
- `extensions`: associa extensões próprias a uma linguagem conhecida.
- `maxFileSize`, `gitignore`, `defaultExcludes`, `locale` e `baseline` também podem ser configurados; o [schema](schema.json) documenta tudo.

### Ignorando ocorrências

Qualquer sintaxe de comentário serve:

```ts
// cnpj-lint-disable-next-line numeric-type -- legado, migração no ticket FIN-123
cnpjAntigo: number;

const valor = Number(cnpj); // cnpj-lint-disable-line numeric-conversion

/* cnpj-lint-disable strip-non-digits */
...
/* cnpj-lint-enable strip-non-digits */
```

`cnpj-lint-disable-file` (com ou sem lista de regras) ignora o arquivo inteiro.

### Baseline

Para adotar o cnpj-lint num sistema com muitas ocorrências, registre o estado atual e faça o CI falhar só com problemas novos:

```bash
npx github:Lucas-Castanheira-Gama/cnpj-lint --update-baseline            # grava cnpj-lint-baseline.json
npx github:Lucas-Castanheira-Gama/cnpj-lint --baseline cnpj-lint-baseline.json
```

As ocorrências são identificadas pelo conteúdo da linha, não pelo número dela, então editar outras partes do arquivo não invalida o baseline.

## Biblioteca de referência

O pacote também exporta uma implementação do CNPJ numérico e alfanumérico, sem dependências:

```ts
import {
  isValidCnpj,
  calculateCnpjCheckDigits,
  formatCnpj,
  normalizeCnpj,
  generateCnpj,
} from 'cnpj-lint/cnpj';

isValidCnpj('12.ABC.345/01DE-35'); // true
isValidCnpj('12abc34501de35'); // true (normaliza máscara e minúsculas)
isValidCnpj('12abc34501de35', { strict: true }); // false
isValidCnpj(11222333000181); // false: CNPJ não é número
calculateCnpjCheckDigits('12ABC34501DE'); // '35'
formatCnpj('12ABC34501DE35'); // '12.ABC.345/01DE-35'
generateCnpj({ formatted: true }); // ex.: 'K3.P0Z.81Q/7B2A-86'
generateCnpj({ root: '12ABC345' }); // filial da mesma raiz
```

A API de análise também está disponível (`scan`, `scanText`, `reportSarif`, `RULES`...). Veja [src/index.ts](src/index.ts).

## Implementações em outras linguagens

A pasta [`examples/`](examples) tem implementações curtas, sem dependências, prontas para copiar. O CI valida todas contra os mesmos [vetores de teste](examples/test-vectors.txt), que incluem os exemplos oficiais da Receita.

| Linguagem | Arquivo | Teste |
| --- | --- | --- |
| JavaScript | [`examples/javascript/cnpj.mjs`](examples/javascript/cnpj.mjs) | `node examples/javascript/test.mjs` |
| Python | [`examples/python/cnpj.py`](examples/python/cnpj.py) | `python examples/python/test_cnpj.py` |
| Java | [`examples/java/Cnpj.java`](examples/java/Cnpj.java) | `java examples/java/Cnpj.java examples/test-vectors.txt` |
| C# | [`examples/csharp/Cnpj.cs`](examples/csharp/Cnpj.cs) | `dotnet run --project examples/csharp -- examples/test-vectors.txt` |
| Go | [`examples/go/cnpj.go`](examples/go/cnpj.go) | `cd examples/go && go test` |
| PHP | [`examples/php/cnpj.php`](examples/php/cnpj.php) | `php examples/php/test.php` |
| PostgreSQL | [`examples/sql/postgresql.sql`](examples/sql/postgresql.sql) | `psql -f examples/sql/test-postgresql.sql` |

Quer ver outra linguagem aqui (Delphi, COBOL, Kotlin, Ruby, SQL Server, Oracle...)? Contribuições são muito bem-vindas.

## Como funciona e limitações

- A análise é **estática e baseada em padrões**. O cnpj-lint não compila nem executa o código: ele procura construções conhecidas perto de identificadores de CNPJ, com heurísticas para reduzir ruído (ignora comentários, contadores como `qtdCnpjs`, outros campos como telefone e CEP, e posições do DV).
- **Pode haver falsos negativos**, principalmente quando o CNPJ passa por variáveis com nomes genéricos (`valor`, `doc`). Use `identifiers` para ensinar os nomes do seu código.
- **Pode haver falsos positivos.** Use as diretivas de supressão e, se achar que a regra errou, [abra uma issue](https://github.com/Lucas-Castanheira-Gama/cnpj-lint/issues/new/choose) com o trecho.
- Tudo roda localmente: nenhum código é enviado para lugar nenhum.
- Uma varredura sem ocorrências não garante que o sistema está pronto. Teste os fluxos com CNPJs alfanuméricos de verdade ([guia de migração](docs/guia-de-migracao.md#6-testes)).

## Contribuindo

Regras novas, padrões de outras linguagens, correções de falsos positivos e implementações de referência são muito bem-vindas. Veja o [guia de contribuição](CONTRIBUTING.md).

```bash
git clone https://github.com/Lucas-Castanheira-Gama/cnpj-lint.git
cd cnpj-lint
npm install
npm run check   # lint + tipos + testes
```

## Licença e aviso

[MIT](LICENSE). Este projeto é independente e não tem vínculo com a Receita Federal. As informações sobre bibliotecas e normas foram conferidas nas fontes citadas, mas podem mudar; confira sempre a documentação oficial.
