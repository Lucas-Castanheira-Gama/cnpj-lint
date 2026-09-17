# Changelog

Todas as mudanças relevantes do projeto são registradas aqui. O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

## [1.0.0] - 2026-09-17

### Adicionado

- Analisador estático com 16 regras para o CNPJ alfanumérico: `numeric-regex`, `strip-non-digits`, `numeric-conversion`, `numeric-type`, `numeric-storage`, `digit-only-check`, `checksum-numeric-parse`, `numeric-mask`, `numeric-input`, `nfe-access-key`, `xsd-numeric-pattern`, `hibernate-cnpj-format`, `outdated-dependency`, `branch-0001-headquarters`, `excluded-letters` e `numeric-test-data`.
- Suporte a JavaScript/TypeScript (inclusive JSX, Vue e Svelte), Python, Java, Kotlin, Scala, Groovy, C#, VB, C/C++, Go, PHP, Ruby, Rust, Dart, Swift, Elixir, SQL, COBOL, Delphi (PAS/DFM), ADVPL/Harbour, HTML e templates, XML/XSD/WSDL, JSON/Avro, YAML, TOML, GraphQL, Protobuf, Prisma e shell.
- Leitura de manifestos e lockfiles de npm, PyPI, Maven, Gradle, Composer, RubyGems, Go, NuGet e pub, com lista verificada de versões com suporte.
- Relatórios `pretty`, `json`, `sarif` (2.1.0), `markdown` e `github`; mensagens em português e inglês.
- Configuração em JSON com schema, identificadores e extensões personalizados, diretivas de supressão em comentários e baseline por impressão digital do conteúdo.
- Comandos `validate`, `generate`, `rules` e `init`.
- GitHub Action com anotações, resumo do job, SARIF e upload opcional para o code scanning.
- Implementação de referência em TypeScript (`cnpj-lint/cnpj`) e em JavaScript, Python, Java, C#, Go, PHP e PostgreSQL, validadas contra vetores de teste compartilhados.
- Documentação das regras, guia de migração e lista de bibliotecas.

[Não lançado]: https://github.com/Lucas-Castanheira-Gama/cnpj-lint/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Lucas-Castanheira-Gama/cnpj-lint/releases/tag/v1.0.0
