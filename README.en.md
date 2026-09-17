# cnpj-lint

**Find the code that breaks with Brazil's alphanumeric CNPJ, before your customers do.**

[![CI](https://github.com/Lucas-Castanheira-Gama/cnpj-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/Lucas-Castanheira-Gama/cnpj-lint/actions/workflows/ci.yml)
[![Reference implementations](https://github.com/Lucas-Castanheira-Gama/cnpj-lint/actions/workflows/examples.yml/badge.svg)](https://github.com/Lucas-Castanheira-Gama/cnpj-lint/actions/workflows/examples.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Português](README.md)

The CNPJ is the Brazilian company registration number, present in virtually every system that deals with Brazilian businesses: invoices (NF-e), payments, ERPs, banking, e-commerce and KYC. Since **July 2026**, Receita Federal (the Brazilian tax authority) issues CNPJs that contain **letters**, such as `12.ABC.345/01DE-35`. Existing numeric CNPJs remain valid, so both formats will coexist.

For decades the CNPJ was treated as a number: `BIGINT` columns, `replace(/\D/g, '')` sanitization, `parseInt` in the check-digit routine, `99.999.999/9999-99` input masks. Many of these break **silently**: the letters are simply dropped.

**cnpj-lint** is a zero-dependency static analyzer that scans your repository and points out those spots across more than 20 languages and formats (JavaScript/TypeScript, Python, Java, Kotlin, C#, Go, PHP, Ruby, Dart/Flutter, Swift, Rust, SQL, Delphi, COBOL, ADVPL/Harbour, VB, XSD, OpenAPI, GraphQL, Protobuf, Prisma and dependency manifests). It ships with SARIF output for GitHub code scanning, a GitHub Action with PR annotations, and a reference implementation of the new check-digit algorithm tested in 7 languages.

## What changed

| | Before | Now |
| --- | --- | --- |
| Positions 1–12 | digits | digits and upper-case letters (all 26) |
| Positions 13–14 (check digits) | digits | digits |
| Check digits | mod 11 | mod 11 using each character's **ASCII code − 48** (`A` = 17) |
| Mask | `XX.XXX.XXX/XXXX-DV` | unchanged |

## Quick start

Requires Node.js 20+.

```bash
npx github:Lucas-Castanheira-Gama/cnpj-lint --locale en
npx github:Lucas-Castanheira-Gama/cnpj-lint src db --verbose --locale en
npx github:Lucas-Castanheira-Gama/cnpj-lint validate 12.ABC.345/01DE-35
npx github:Lucas-Castanheira-Gama/cnpj-lint generate -n 20 --formatted
```

Set `CNPJ_LINT_LOCALE=en` (or `"locale": "en"` in the config file) to get English messages everywhere.

### GitHub Action

```yaml
permissions:
  contents: read
  security-events: write # only for upload-sarif

steps:
  - uses: actions/checkout@v7
  - uses: Lucas-Castanheira-Gama/cnpj-lint@v1
    with:
      locale: en
      fail-on: error
      upload-sarif: true # public repos or GitHub Advanced Security
```

Inputs: `paths`, `working-directory`, `config`, `fail-on`, `baseline`, `locale`, `annotations`, `summary`, `sarif-file`, `upload-sarif`. Outputs: `errors`, `warnings`, `infos`, `total`, `files-scanned`, `sarif-file`, `failed`.

## Rules

| Rule | Level | Finds |
| --- | --- | --- |
| `numeric-regex` | error | `\d{14}`, `\d{2}.\d{3}.\d{3}/\d{4}-\d{2}` and similar digit-only patterns |
| `strip-non-digits` | error | `replace(/\D/g, '')`, `re.sub(r'\D', ...)`, digits-only helpers applied to CNPJ |
| `numeric-conversion` | error | `parseInt(cnpj)`, `int(cnpj)`, `Long.parseLong`, `CAST(cnpj AS BIGINT)`, `%014d` |
| `numeric-type` | error | `cnpj: number`, `Long cnpj`, `Cnpj int64`, `PIC 9(14)`, `int64 cnpj`, `type: integer` |
| `numeric-storage` | error | Numeric columns and ORM mappings (Prisma, TypeORM, Sequelize, Mongoose, Django, SQLAlchemy, Rails, Laravel, JPA, EF Core, GORM, Liquibase) |
| `digit-only-check` | error | `isdigit()`, `ctype_digit`, `ISNUMERIC`, `isNaN`, `^\d+$` |
| `checksum-numeric-parse` | error | Check-digit routines parsing characters as numbers instead of ASCII − 48 |
| `numeric-mask` | warning | Digit-only input masks |
| `numeric-input` | warning | `type="number"`, `inputmode="numeric"`, numeric keyboards |
| `nfe-access-key` | error | DF-e access keys (which embed the CNPJ) treated as digits only |
| `xsd-numeric-pattern` | error | Local XSD copies with `TCnpj = [0-9]{14}` |
| `hibernate-cnpj-format` | error | Hibernate Validator `@CNPJ` without `format = ALPHANUMERIC` (default is still numeric) |
| `outdated-dependency` | warning | Libraries on versions without alphanumeric support (npm, PyPI, Maven, Composer, RubyGems, Go, NuGet, pub) |
| `branch-0001-headquarters` | warning | Code assuming order `0001` is always the headquarters |
| `excluded-letters` | warning | Validation rejecting some letters (all 26 are valid) |
| `numeric-test-data` | info | Test-data generators that only produce numeric CNPJs |

Detailed documentation (in Portuguese, with code samples) lives in [docs/regras.md](docs/regras.md); the verified library list is in [docs/bibliotecas.md](docs/bibliotecas.md).

## Configuration

`.cnpjlintrc.json`, `.cnpjlintrc`, `cnpj-lint.config.json` or the `"cnpjLint"` key in `package.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/Lucas-Castanheira-Gama/cnpj-lint/main/schema.json",
  "exclude": ["**/legacy/**"],
  "identifiers": ["taxId", "companyDocument"],
  "rules": { "branch-0001-headquarters": "off" },
  "failOn": "warning",
  "locale": "en"
}
```

`identifiers` is important for international codebases: `cnpj` and `cgc` are recognized by default, but you may call the field `taxId`, `registrationNumber` or `document`.

Suppress findings with comments (`cnpj-lint-disable-next-line <rule>`, `cnpj-lint-disable-line`, `cnpj-lint-disable`/`cnpj-lint-enable`, `cnpj-lint-disable-file`) and adopt the tool gradually with a baseline (`--update-baseline`, then `--baseline cnpj-lint-baseline.json`).

## Reference implementation

```ts
import { isValidCnpj, calculateCnpjCheckDigits, formatCnpj, generateCnpj } from 'cnpj-lint/cnpj';

isValidCnpj('12.ABC.345/01DE-35'); // true
calculateCnpjCheckDigits('12ABC34501DE'); // '35'
formatCnpj('12abc34501de35'); // '12.ABC.345/01DE-35'
generateCnpj({ formatted: true });
```

Dependency-free implementations for JavaScript, Python, Java, C#, Go, PHP and PostgreSQL live in [`examples/`](examples) and are validated in CI against shared [test vectors](examples/test-vectors.txt).

## Limitations

cnpj-lint is a pattern-based static analyzer: it may miss code that handles the CNPJ through generically named variables, and it may occasionally flag code that is fine. Everything runs locally. A clean scan does not replace testing your flows with real alphanumeric CNPJs.

## License

[MIT](LICENSE). This project is independent and not affiliated with Receita Federal.
