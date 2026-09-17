# Guia de migração para o CNPJ alfanumérico

Desde julho de 2026 a Receita Federal emite CNPJs com letras (IN RFB 2.229/2024). Os números atuais continuam válidos e os dois formatos vão conviver para sempre. Este guia organiza o que revisar, na ordem em que os problemas costumam aparecer.

> Este material é técnico e não substitui as publicações oficiais. As referências estão no fim da página.

## O que mudou

| | Antes | Agora |
| --- | --- | --- |
| Posições 1 a 12 (raiz + ordem) | dígitos | dígitos **e letras maiúsculas A–Z** |
| Posições 13 e 14 (DV) | dígitos | dígitos |
| Máscara | `XX.XXX.XXX/XXXX-DV` | igual |
| Cálculo do DV | módulo 11 | módulo 11 com **valor ASCII − 48** (`A` = 17, `Z` = 42) |
| Letras aceitas | – | **todas as 26** (P&R 45) |
| `0001` = matriz | por convenção | só na geração; pode mudar depois (P&R 25) |

Exemplo oficial: `12.ABC.345/01DE-35`.

## 1. Descubra onde o sistema quebra

```bash
npx github:Lucas-Castanheira-Gama/cnpj-lint . --verbose
```

Para sistemas grandes, grave um baseline e trate o legado aos poucos, sem deixar surgir código novo com o problema:

```bash
npx github:Lucas-Castanheira-Gama/cnpj-lint . --update-baseline
npx github:Lucas-Castanheira-Gama/cnpj-lint . --baseline cnpj-lint-baseline.json
```

Se o seu código usa outros nomes para o campo (`nr_insc`, `docFederal`, `inscricao`...), informe-os com `--identifier` ou em `identifiers` na configuração.

## 2. Banco de dados

- [ ] Colunas `BIGINT`, `NUMERIC(14)`, `DECIMAL(14,0)` e `NUMBER(14)` → `CHAR(14)` ou `VARCHAR(14)`.
- [ ] Converta os dados preenchendo zeros à esquerda: `LPAD(CAST(cnpj AS VARCHAR(14)), 14, '0')`.
- [ ] Chaves estrangeiras, índices, views, *materialized views*, triggers e procedures que usam a coluna.
- [ ] `CHECK`s e domínios com `[0-9]{14}`, `ISNUMERIC`, `NOT LIKE '%[^0-9]%'`.
- [ ] Collation: letras tornam a comparação sensível a maiúsculas. Grave sempre em maiúsculas e compare a forma normalizada.
- [ ] Particionamento, *sharding* ou *hash* baseados em aritmética sobre o CNPJ.
- [ ] Chave de acesso de DF-e em `NUMERIC(44)` → `CHAR(44)`.

Exemplo para PostgreSQL, com a função de validação de [`examples/sql/postgresql.sql`](../examples/sql/postgresql.sql):

```sql
ALTER TABLE empresa ALTER COLUMN cnpj TYPE char(14) USING lpad(cnpj::text, 14, '0');
ALTER TABLE empresa ADD CONSTRAINT empresa_cnpj_valido CHECK (cnpj_valido(cnpj));
```

## 3. Back-end e APIs

- [ ] Tipos numéricos em entidades, DTOs e contratos (OpenAPI, GraphQL, Protobuf, Avro, JSON Schema).
- [ ] Normalização: troque "remover tudo que não é dígito" por "remover a máscara e converter para maiúsculas".
- [ ] Validação: regex alfanumérica e DV com ASCII − 48 (implementações em [`examples/`](../examples)).
- [ ] Bibliotecas de validação e geração nas [versões com suporte](bibliotecas.md). No Hibernate Validator, use `@CNPJ(format = CNPJ.Format.ALPHANUMERIC)`.
- [ ] Ordenação e comparação: não converta para número; use a string normalizada.
- [ ] Regras que deduzem matriz pela ordem `0001`.
- [ ] Logs, mascaramento (LGPD) e anonimização que assumem só dígitos.

## 4. Front-end e apps

- [ ] Máscaras com tokens numéricos → tokens alfanuméricos ([tabela por biblioteca](regras.md#numeric-mask)).
- [ ] `type="number"`, `inputmode="numeric"`, teclados numéricos em apps.
- [ ] Conversão automática para maiúsculas enquanto o usuário digita.
- [ ] Mensagens de erro e textos de ajuda ("digite apenas números").

## 5. Documentos fiscais e integrações

- [ ] Schemas XSD locais da NF-e/NFC-e, CT-e, MDF-e e NFS-e atualizados (NT 2025.001 e NT 2026.004).
- [ ] Chave de acesso: letras nas posições 7 a 20 e DV com ASCII − 48.
- [ ] Leiautes posicionais (CNAB, EDI, arquivos de bancos e adquirentes) com campos `9(14)` para o CNPJ: confirme a versão do leiaute com cada parceiro.
- [ ] Chave Pix do tipo CNPJ: o CNPJ alfanumérico pode ser chave Pix (P&R 46).
- [ ] Consultas a bureaus, APIs públicas e ERPs de terceiros: confirme o suporte com cada fornecedor.

## 6. Testes

- [ ] Massa de teste com CNPJs alfanuméricos (`npx github:Lucas-Castanheira-Gama/cnpj-lint generate -n 50`), inclusive com letras I, O, U, Q e F.
- [ ] Casos com letras minúsculas na entrada (devem ser normalizados) e com letras nas posições da ordem (filiais).
- [ ] Os [vetores de teste](../examples/test-vectors.txt) deste repositório.
- [ ] Simulador Nacional de CNPJ da Receita Federal para gerar CNPJs fictícios oficiais.
- [ ] O cnpj-lint no CI, para impedir regressões ([GitHub Action](../README.md#github-action)).

## Referências

- Receita Federal. [Perguntas e respostas: CNPJ alfanumérico](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/cnpj/cnpj-alfanumerico.pdf) (formato, cálculo do DV, letras aceitas, matriz e filiais).
- Receita Federal. [Documentos técnicos do CNPJ](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj) (manual de cálculo do DV e arquivos de referência).
- Receita Federal. [Simulador Nacional de CNPJ](https://servicos.receitafederal.gov.br/servico/cnpj-alfa/simular).
- Portal da NF-e. [Nota Técnica Conjunta 2025.001: CNPJ alfanumérico](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=5ZkvIZt10mQ%3D).
- Instrução Normativa RFB nº 2.229, de 15 de outubro de 2024.
