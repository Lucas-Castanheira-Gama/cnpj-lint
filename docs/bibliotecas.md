# Bibliotecas e versões com suporte ao CNPJ alfanumérico

Lista usada pela regra [`outdated-dependency`](regras.md#outdated-dependency). Cada item foi conferido no código-fonte e nas notas de versão do projeto em **setembro de 2026**. As bibliotecas evoluem: se encontrar algo desatualizado, [abra uma issue](https://github.com/Lucas-Castanheira-Gama/cnpj-lint/issues/new/choose) com a fonte.

| Ecossistema | Pacote | Suporte desde | Observação | Fonte |
| --- | --- | --- | --- | --- |
| npm | `validator` | 13.15.35 | `isTaxID(valor, 'pt-BR')` | [PR #2644](https://github.com/validatorjs/validator.js/pull/2644) |
| npm | `cpf-cnpj-validator` | 2.0.0 | | [v2.0.0](https://github.com/carvalhoviniciusluiz/cpf-cnpj-validator/releases/tag/v2.0.0) |
| npm | `brazilian-values` | 0.14.0 | | [0.14.0](https://github.com/VitorLuizC/brazilian-values/releases/tag/0.14.0) |
| npm | `validation-br` | 1.5.1 | 1.6.4 corrige a geração de filiais | [v.1.6.4](https://github.com/klawdyo/validation-br/releases/tag/v.1.6.4) |
| npm | `@fnando/cnpj` | 2.0.0 | | [repositório](https://github.com/fnando/cnpj) |
| npm | `@brazilian-utils/brazilian-utils` | 1.1.0 | prefira 2.x, com correções | [repositório](https://github.com/brazilian-utils/javascript) |
| npm | `js-brasil` | 2.7.0 | | [npm](https://www.npmjs.com/package/js-brasil) |
| PyPI | `validate-docbr` | 1.11.0 | | [PR #73](https://github.com/alvarofpp/validate-docbr/pull/73) |
| PyPI | `python-stdnum` | 2.2 | `stdnum.br.cnpj` | [2.2](https://github.com/arthurdejong/python-stdnum/releases/tag/2.2) |
| PyPI | `brutils` | 2.5.0 | `generate_cnpj(alphanumeric=True)` | [v2.5.0](https://github.com/brazilian-utils/python/releases/tag/v2.5.0) |
| PyPI | `Faker` | 40.33.0 | `cnpj()` continua numérico; use `cnpj(use_alphanumeric=True)` | [PR #2402](https://github.com/joke2k/faker/pull/2402) |
| Maven | `org.hibernate.validator:hibernate-validator` | 9.0.0.Final | `@CNPJ` continua `NUMERIC`; use `format = CNPJ.Format.ALPHANUMERIC` | [HV-1999](https://hibernate.atlassian.net/browse/HV-1999) |
| Maven | `br.com.caelum.stella:caelum-stella-core` | 2.2.0 | 2.2.2 traz correções | [PR #305](https://github.com/caelum/caelum-stella/pull/305) |
| Maven | `br.com.caelum.stella:caelum-stella-bean-validation` | 2.2.0 | 2.2.2 traz correções | [PR #305](https://github.com/caelum/caelum-stella/pull/305) |
| Composer | `respect/validation` | 2.5.0 | também na 3.0.0 ou superior | [commit](https://github.com/Respect/Validation/commit/570ba481b1) |
| Composer | `laravellegends/pt-br-validator` | 12.2.0 | | [PR #79](https://github.com/LaravelLegends/pt-br-validator/pull/79) |
| RubyGems | `cpf_cnpj` | 1.0.0 | | [PR #40](https://github.com/fnando/cpf_cnpj/pull/40) |
| Go | `github.com/paemuri/brdoc/v3` | v3.0.0 | as linhas v1/v2 (inclusive `github.com/Nhanderu/brdoc`) não aceitam letras | [repositório](https://github.com/paemuri/brdoc) |
| NuGet | `Bogus` | sem suporte | gera apenas CNPJ numérico | [issue #634](https://github.com/bchavez/Bogus/issues/634) |
| pub (Dart) | `brasil_fields` | 1.18.0 | use `CnpjAlfanumericoInputFormatter` e `CnpjAlfanumericoValidator` | [changelog](https://pub.dev/packages/brasil_fields/changelog) |

## Não está na lista?

1. Procure no código da biblioteca a rotina de CNPJ: se ela remove tudo que não é dígito (`\D`, `[^0-9]`) ou converte caracteres com parse numérico, não há suporte.
2. Rode a biblioteca contra os [vetores de teste](../examples/test-vectors.txt).
3. Contribua com a informação: edite `KNOWN_PACKAGES` em [`src/rules/dependencies.ts`](../src/rules/dependencies.ts), adicione a linha nesta tabela com a fonte e abra um PR.
