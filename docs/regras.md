# Regras do cnpj-lint

Cada regra aponta um padrão que, de acordo com a especificação da Receita Federal, deixa de funcionar quando o CNPJ passa a ter letras. A análise é estática e heurística: ela procura padrões de código perto de identificadores de CNPJ (`cnpj`, `cgc` e os nomes que você configurar em `identifiers`).

| Regra | Nível | Resumo |
| --- | --- | --- |
| [`numeric-regex`](#numeric-regex) | erro | Regex de CNPJ que aceita apenas dígitos |
| [`strip-non-digits`](#strip-non-digits) | erro | Limpeza que remove tudo que não é dígito |
| [`numeric-conversion`](#numeric-conversion) | erro | CNPJ convertido para número |
| [`numeric-type`](#numeric-type) | erro | CNPJ declarado com tipo numérico |
| [`numeric-storage`](#numeric-storage) | erro | CNPJ em coluna numérica ou mapeamento de ORM numérico |
| [`digit-only-check`](#digit-only-check) | erro | Validação que aceita apenas dígitos |
| [`checksum-numeric-parse`](#checksum-numeric-parse) | erro | Cálculo do DV com parse numérico de caracteres |
| [`numeric-mask`](#numeric-mask) | aviso | Máscara de entrada só numérica |
| [`numeric-input`](#numeric-input) | aviso | Campo de formulário que força teclado ou entrada numérica |
| [`nfe-access-key`](#nfe-access-key) | erro | Chave de acesso de DF-e tratada como só dígitos |
| [`xsd-numeric-pattern`](#xsd-numeric-pattern) | erro | Schema XSD com CNPJ ou chave só numéricos |
| [`hibernate-cnpj-format`](#hibernate-cnpj-format) | erro | `@CNPJ` do Hibernate Validator sem `format = ALPHANUMERIC` |
| [`outdated-dependency`](#outdated-dependency) | aviso | Dependência sem suporte ao formato alfanumérico |
| [`branch-0001-headquarters`](#branch-0001-headquarters) | aviso | Código que assume que a ordem `0001` é sempre a matriz |
| [`excluded-letters`](#excluded-letters) | aviso | Validação que rejeita algumas letras |
| [`numeric-test-data`](#numeric-test-data) | informativo | Gerador de massa de teste que só produz CNPJ numérico |

Para ajustar o nível ou desligar uma regra, use `rules` no [arquivo de configuração](../README.md#configuração) ou `--rule id=nível` na linha de comando. Para ignorar uma ocorrência pontual, use as [diretivas em comentário](../README.md#ignorando-ocorrências).

---

## `numeric-regex`

**Nível padrão:** erro

Expressões regulares que só aceitam dígitos no CNPJ: `\d{14}`, `[0-9]{14}`, o formato completo `\d{2}.\d{3}.\d{3}/\d{4}-\d{2}` (inclusive os grupos usados para formatar), a raiz com `\d{8}` e padrões `LIKE '[0-9][0-9]...'` do SQL Server.

```js
// Quebra
const CNPJ = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

// Funciona
const CNPJ = /^[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-[0-9]{2}$/;
cnpj.replace(/^(\w{2})(\w{3})(\w{3})(\w{4})(\d{2})$/, '$1.$2.$3/$4-$5');
```

```java
// Quebra
@Pattern(regexp = "\\d{14}")
// Funciona
@Pattern(regexp = "[0-9A-Z]{12}[0-9]{2}")
```

**Correção:** use `[0-9A-Z]{12}[0-9]{2}` (sem máscara) ou `[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-[0-9]{2}` (com máscara) e normalize a entrada para maiúsculas antes de validar.

## `strip-non-digits`

**Nível padrão:** erro

É o ponto de quebra mais perigoso, porque **não gera erro**: remover `\D` ou `[^0-9]` apaga as letras em silêncio. `12.ABC.345/01DE-35` vira `123450135`, um valor corrompido que segue adiante e só falha longe dali (ou pior: é gravado).

Detecta `replace(/\D/g, '')`, `re.sub(r'\D', ...)`, `preg_replace('/[^0-9]/', ...)`, `replaceAll("\\D", "")`, `Regex.Replace(..., @"\D", "")`, `REGEXP_REPLACE(..., '[^0-9]', ...)`, `filter(str.isdigit, ...)`, `Where(char.IsDigit)`, `FILTER_SANITIZE_NUMBER_INT`, `tr -cd '0-9'`, regex "não dígito" guardada em variável e usada perto do CNPJ, e helpers como `somenteNumeros(cnpj)`, `onlyDigits(cnpj)` e `SoNumeros(edtCNPJ.Text)`.

```python
# Quebra
cnpj = re.sub(r"\D", "", cnpj)
# Funciona
cnpj = re.sub(r"[^0-9A-Za-z]", "", cnpj).upper()
```

```php
// Quebra
$cnpj = preg_replace('/\D/', '', $cnpj);
// Funciona
$cnpj = strtoupper(preg_replace('/[^0-9A-Za-z]/', '', $cnpj));
```

**Correção:** remova apenas a máscara (`.`, `/`, `-`, espaços) e converta para maiúsculas.

## `numeric-conversion`

**Nível padrão:** erro (formatação numérica como `%014d` e `padStart(14, '0')` é aviso)

Conversões do CNPJ para número falham (`NaN`, `NumberFormatException`, `ValueError`) ou corrompem o valor (`intval('12ABC')` vira `12`), além de perder zeros à esquerda.

| Linguagem | Exemplos detectados |
| --- | --- |
| JavaScript/TypeScript | `parseInt(cnpj)`, `Number(cnpj)`, `BigInt(cnpj)`, `+cnpj` |
| Python | `int(cnpj)`, `Decimal(cnpj)`, `"%014d" % cnpj`, `str(cnpj).zfill(14)` |
| Java/Kotlin | `Long.parseLong(cnpj)`, `new BigInteger(cnpj)`, `cnpj.toLong()` |
| C# | `long.Parse(cnpj)`, `Convert.ToInt64(cnpj)`, `ToString(@"00\.000\.000\/0000\-00")` |
| Go | `strconv.ParseInt(cnpj, 10, 64)`, `strconv.Atoi(cnpj)` |
| PHP | `intval($cnpj)`, `(int) $cnpj` |
| Ruby | `cnpj.to_i`, `Integer(cnpj)` |
| Delphi | `StrToInt64(edtCnpj.Text)`, `FieldByName('CNPJ').AsLargeInt`, `FormatFloat('00"."000...')` |
| VB/ADVPL/Harbour | `CLng(cnpj)`, `Val(cCnpj)`, `StrZero(nCnpj, 14)` |
| SQL | `CAST(cnpj AS BIGINT)`, `CONVERT(BIGINT, cnpj)`, `TO_NUMBER(cnpj)`, `cnpj::bigint`, `TO_CHAR(cnpj, '00000000000000')` |

Acessos às posições dos dígitos verificadores (`cnpj[12]`, `cnpj.charAt(13)`) são ignorados, porque essas posições continuam numéricas.

**Correção:** trate o CNPJ sempre como texto de 14 caracteres. Para ordenar, comparar ou indexar, use a string normalizada.

## `numeric-type`

**Nível padrão:** erro

Declarações que tipam o CNPJ como número em código, contratos e esquemas:

- TypeScript `cnpj: number`, JSDoc `@param {number} cnpj`, zod/yup/joi/valibot `cnpj: z.number()`, class-validator `@IsNumber()`/`@IsNumberString()`;
- Java/C#/Dart/C `Long cnpj`, `public long Cnpj { get; set; }`; Kotlin/Scala/Swift/Rust `cnpj: Long`; Go `Cnpj int64`;
- Python `cnpj: int`, marshmallow/DRF `fields.Integer()`; PHP `int $cnpj` e `$casts`; VB `Cnpj As Long`;
- Delphi `FCNPJ: Int64`, `TLargeintField`, `function ...Cnpj(...): Int64`, `DataType = ftLargeint` em DFM;
- COBOL `PIC 9(14)`; Harbour/ADVPL `Local nCnpj` e estruturas DBF `{"CNPJ", "N", 14, 0}`;
- Protobuf `int64 cnpj`, GraphQL `cnpj: Int`, Avro `"type": "long"`, JSON Schema/OpenAPI `type: integer`, XSD `type="xs:long"`.

```yaml
# Quebra (OpenAPI)
cnpj:
  type: integer
# Funciona
cnpj:
  type: string
  pattern: '^[0-9A-Z]{12}[0-9]{2}$'
```

```cobol
      * Quebra
           05  WS-CNPJ        PIC 9(14).
      * Funciona
           05  WS-CNPJ        PIC X(14).
```

**Correção:** use tipos de texto (`string`, `String`, `char(14)`, `PIC X(14)`, `TStringField`) e valide o formato com a regra alfanumérica.

## `numeric-storage`

**Nível padrão:** erro

Colunas numéricas em DDL (`BIGINT`, `NUMERIC(14)`, `DECIMAL(14,0)`, `NUMBER(14)`, domínios Firebird, parâmetros PL/SQL) e mapeamentos equivalentes em ORMs e migrações: Prisma `BigInt`, TypeORM `@Column('bigint')`, Sequelize `DataTypes.BIGINT`, Mongoose `Number`, Drizzle `bigint()`, Knex/Laravel `bigInteger('cnpj')`, Rails `t.bigint :cnpj`, Django `BigIntegerField`, SQLAlchemy `Column(BigInteger)`, JPA `columnDefinition`, EF Core `HasColumnType("bigint")`, GORM `type:bigint`, Doctrine e Liquibase.

```sql
-- Quebra
CREATE TABLE empresa (cnpj BIGINT NOT NULL);
-- Funciona
CREATE TABLE empresa (cnpj CHAR(14) NOT NULL);
```

**Correção:** migre para `CHAR(14)`/`VARCHAR(14)` convertendo com `LPAD(valor, 14, '0')`. Revise chaves estrangeiras, índices e a collation: com letras, a comparação passa a depender de maiúsculas e minúsculas. Veja o [guia de migração](guia-de-migracao.md#banco-de-dados).

## `digit-only-check`

**Nível padrão:** erro

Validações que só aceitam dígitos: `cnpj.isdigit()`, `ctype_digit($cnpj)`, `is_numeric($cnpj)`, `StringUtils.isNumeric(cnpj)`, `cnpj.All(char.IsDigit)`, `isNaN(cnpj)`, `/^\d+$/`, `ISNUMERIC(cnpj)`, `cnpj NOT LIKE '%[^0-9]%'`, `REGEXP_LIKE(cnpj, '^[0-9]+$')`, a regra Laravel `'cnpj' => 'numeric|digits:14'`, `validates :cnpj, numericality: true` e o `CNPJValidator` numérico do `brasil_fields` (Flutter).

**Correção:** valide com a regra alfanumérica e o DV por ASCII − 48. Em bibliotecas, confira a [lista de versões com suporte](bibliotecas.md).

## `checksum-numeric-parse`

**Nível padrão:** erro

O DV do CNPJ alfanumérico é calculado com o **código ASCII de cada caractere menos 48** (`'0'` = 0, `'A'` = 17, `'Z'` = 42), segundo a pergunta 14 do FAQ da Receita Federal. Rotinas que convertem cada caractere com `parseInt`, `int()`, `Integer.parseInt`, `Character.getNumericValue` (que devolve 10 para `'A'`), `char.GetNumericValue` (−1), `intval`/`.to_i` (0), `StrToInt` ou `CAST(SUBSTRING(...) AS INT)` passam a falhar ou a calcular errado.

A regra localiza rotinas de DV pelos pesos (`5,4,3,2,9,8,7,6,5,4,3,2`), pelo idioma clássico `if (pos < 2) pos = 9` e, para chaves de acesso, pelo ciclo de pesos 2 a 9. Rotinas que já usam `charCodeAt`, `ord()`, `ASCII()` ou `- '0'` são ignoradas.

```js
// Quebra (snippet clássico)
soma += numeros.charAt(tamanho - i) * pos--;
// Funciona
soma += (numeros.charCodeAt(tamanho - i) - 48) * pos--;
```

**Correção:**

| Linguagem | Valor do caractere |
| --- | --- |
| JavaScript/TypeScript | `c.charCodeAt(0) - 48` |
| Python | `ord(c) - 48` |
| Java, C#, C | `c - '0'` |
| Go | `int(c - '0')` |
| PHP | `ord($c) - 48` |
| Delphi | `Ord(c) - 48` |
| SQL | `ASCII(c) - 48` |

Há implementações completas e testadas em [`examples/`](../examples).

## `numeric-mask`

**Nível padrão:** aviso (placeholders são informativos)

Máscaras com tokens só numéricos no formato de CNPJ: `99.999.999/9999-99`, `00.000.000/0000-00`, `##.###.###/####-##`, a variante do Delphi `00"."000"."000"/"0000"-"00`, a do RedMadRobot `[00].[000].[000]/[0000]-[00]`, arrays do text-mask, máscaras progressivas feitas com `replace(/(\d{2})(\d)/, '$1.$2')` e o `CnpjInputFormatter` do `brasil_fields`.

**Correção:** use o token alfanumérico da biblioteca nas 12 primeiras posições e converta para maiúsculas:

| Biblioteca | Máscara alfanumérica |
| --- | --- |
| jQuery Mask Plugin | `'AA.AAA.AAA/AAAA-00'` (`A` = letra ou dígito) |
| ngx-mask | `'AA.AAA.AAA/AAAA-00'` |
| Inputmask / react-input-mask | `'**.***.***/****-99'` (`*` = letra ou dígito) |
| vue-the-mask | `'XX.XXX.XXX/XXXX-##'` (`X` = letra ou dígito) |
| maska | `'**.***.***/****-##'` |
| IMask | `mask: '##.###.###/####-00'` com `definitions: { '#': /[0-9A-Za-z]/ }` |
| Delphi `TMaskEdit` | `'>AA.AAA.AAA/AAAA-00;0;_'` (`>` converte para maiúsculas) |
| WinForms `MaskedTextBox` | `'>AA.AAA.AAA/AAAA-00'` |
| Flutter `brasil_fields` | `CnpjAlfanumericoInputFormatter()` (versão 1.18.0 ou superior) |
| Flutter `mask_text_input_formatter` | `mask: '##.###.###/####-##'` com `filter: {'#': RegExp(r'[0-9A-Za-z]')}` |

Confira a documentação da versão que você usa: o significado dos tokens pode variar.

## `numeric-input`

**Nível padrão:** aviso

Campos de CNPJ que forçam teclado ou entrada numérica: `type="number"`, `inputmode="numeric"`, `pattern="\d*"`, `keyboardType="numeric"` (React Native), `android:inputType="number"`, `TextInputType.number` e `FilteringTextInputFormatter.digitsOnly` (Flutter), `KeyboardType.Number` (Compose), `.numberPad` (iOS) e `NumbersOnly = True` (Delphi).

```html
<!-- Quebra -->
<input name="cnpj" inputmode="numeric" />
<!-- Funciona -->
<input name="cnpj" type="text" autocapitalize="characters" maxlength="18" />
```

**Correção:** use campo de texto com letras maiúsculas e aceite `[0-9A-Za-z]`.

## `nfe-access-key`

**Nível padrão:** erro

A chave de acesso de 44 posições (NF-e, NFC-e, CT-e, MDF-e, BP-e) contém o CNPJ do emitente nas posições 7 a 20. Com o CNPJ alfanumérico ([NT 2025.001](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=)), a chave também pode ter letras, e o DV dela passa a usar ASCII − 48. A regra aponta `\d{44}` perto de identificadores de chave (`chNFe`, `chave_acesso`, `accessKey`...), chaves guardadas em `NUMERIC(44)`, convertidas com `BigInt`/`BigInteger` ou tipadas como número, e máscaras de exibição numéricas. Códigos de barras de boleto (também com 44 dígitos) são ignorados.

**Correção:** aceite letras nas posições do CNPJ (por exemplo `^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$`), guarde a chave como `CHAR(44)` e calcule o DV com ASCII − 48.

## `xsd-numeric-pattern`

**Nível padrão:** erro

Cópias locais de schemas XSD/WSDL (NF-e, CT-e, MDF-e, NFS-e, eSocial, EFD-Reinf, integrações com parceiros) cujo tipo de CNPJ (`TCnpj`, `TCnpjOpc`, `TCnpjVar`...) ou de chave de acesso ainda usa `[0-9]{14}`/`[0-9]{44}`, ou que declaram o CNPJ como `xs:long`.

**Correção:** atualize os schemas para a versão publicada no portal do documento fiscal. O leiaute novo usa `[A-Z0-9]{12}[0-9]{2}` para CNPJ (NT 2025.001 e NT 2026.004).

## `hibernate-cnpj-format`

**Nível padrão:** erro

No Hibernate Validator, `@CNPJ` tem o atributo `format`, que **continua `NUMERIC` por padrão** mesmo nas versões novas. O atributo existe desde a 9.0.0.Final ([HV-1999](https://hibernate.atlassian.net/browse/HV-1999)). A regra só atua em arquivos que importam `org.hibernate.validator.constraints.br.CNPJ`; o `@CNPJ` do Caelum Stella não é afetado.

```java
// Quebra
@CNPJ
private String cnpj;
// Funciona
@CNPJ(format = CNPJ.Format.ALPHANUMERIC)
private String cnpj;
```

## `outdated-dependency`

**Nível padrão:** aviso (versões instaladas sem suporte são erro; lembretes são informativos)

Lê `package.json` (e `package-lock.json`), `requirements*.txt`, `pyproject.toml` (e `poetry.lock`/`uv.lock`), `Pipfile`, `pom.xml` (resolvendo propriedades), `build.gradle(.kts)`, `composer.json` (e `composer.lock`), `Gemfile` (e `Gemfile.lock`), `go.mod`, `*.csproj`/`packages.config`/`Directory.Packages.props` e `pubspec.yaml` (e `pubspec.lock`). Compara as versões com a [lista verificada de bibliotecas](bibliotecas.md) e diferencia:

- versão instalada (lockfile) ou fixa sem suporte → **erro**;
- faixa que nunca alcança uma versão com suporte (ex.: `^1.0.3` quando o suporte veio na 2.0.0) → **erro**;
- faixa que aceita versões antigas → **aviso**;
- versão desconhecida, versão com correções recomendadas ou biblioteca que exige configuração extra → **informativo**.

## `branch-0001-headquarters`

**Nível padrão:** aviso

Segundo a pergunta 25 do FAQ da Receita Federal, o sufixo `0001` indica a matriz apenas quando o CNPJ é gerado; com o tempo, uma filial pode virar matriz. Montar o CNPJ da matriz com `raiz + '0001'`, ou decidir se é matriz testando `substring(8, 12) === '0001'`, deixa de ser confiável.

**Correção:** use o indicador matriz/filial do cadastro, como o campo "identificador matriz/filial" dos [dados abertos do CNPJ](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj), e agrupe empresas pela raiz (8 primeiras posições).

## `excluded-letters`

**Nível padrão:** aviso

Circula a informação de que as letras I, O, U, Q e F não seriam usadas. A Receita Federal orienta o contrário: os sistemas devem **aceitar todas as 26 letras** (pergunta 45). O controle de combinações proibidas é feito internamente, na geração. A regra aponta classes como `[A-HJ-NP-Z]` perto de identificadores de CNPJ.

**Correção:** aceite `[A-Z]` completo nas 12 primeiras posições.

## `numeric-test-data`

**Nível padrão:** informativo

Se a massa de teste só tem CNPJs numéricos, a suíte continua verde enquanto o sistema quebra. A regra aponta geradores que produzem apenas CNPJ numérico por padrão: `fake.cnpj()` e `factory.Faker('cnpj')` do Faker (Python), `generate_cnpj()` do brutils e `.Cnpj()` do Bogus (.NET), que ainda não gera alfanuméricos ([bchavez/Bogus#634](https://github.com/bchavez/Bogus/issues/634)).

**Correção:** Faker 40.33.0 ou superior com `cnpj(use_alphanumeric=True)`; brutils 2.5.0 ou superior com `generate_cnpj(alphanumeric=True)`; ou gere massa com `npx github:Lucas-Castanheira-Gama/cnpj-lint generate -n 100`.
