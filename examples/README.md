# Implementações de referência

Implementações curtas e sem dependências da validação do CNPJ numérico e alfanumérico, para copiar para o seu projeto. Todas seguem as mesmas regras:

1. **Normalização:** remove `.`, `/`, `-` e espaços e converte **apenas letras ASCII** para maiúsculas (assim `ı` não vira `I`).
2. **Formato:** 12 caracteres `[0-9A-Z]` seguidos de 2 dígitos. Valores com todos os caracteres iguais são rejeitados.
3. **Dígitos verificadores:** módulo 11 com pesos `5,4,3,2,9,8,7,6,5,4,3,2` e `6,5,4,3,2,9,8,7,6,5,4,3,2`, usando o valor **ASCII − 48** de cada caractere (`'0'` = 0, `'A'` = 17, `'Z'` = 42). Resto menor que 2 gera DV 0; nos demais casos, DV = 11 − resto.

O workflow [`examples.yml`](../.github/workflows/examples.yml) roda cada implementação contra os mesmos [vetores de teste](test-vectors.txt), que incluem os exemplos oficiais da Receita Federal.

| Linguagem | Implementação | Como testar (na raiz do repositório) |
| --- | --- | --- |
| JavaScript | [`javascript/cnpj.mjs`](javascript/cnpj.mjs) | `node examples/javascript/test.mjs` |
| Python 3.8+ | [`python/cnpj.py`](python/cnpj.py) | `python examples/python/test_cnpj.py` |
| Java 11+ | [`java/Cnpj.java`](java/Cnpj.java) | `java examples/java/Cnpj.java examples/test-vectors.txt` |
| C# (.NET 8+) | [`csharp/Cnpj.cs`](csharp/Cnpj.cs) | `dotnet run --project examples/csharp -- examples/test-vectors.txt` |
| Go | [`go/cnpj.go`](go/cnpj.go) | `cd examples/go && go test` |
| PHP 8+ | [`php/cnpj.php`](php/cnpj.php) | `php examples/php/test.php` |
| PostgreSQL 12+ | [`sql/postgresql.sql`](sql/postgresql.sql) | `psql -f examples/sql/test-postgresql.sql` |

A implementação TypeScript completa (com formatação e geração) fica em [`src/cnpj.ts`](../src/cnpj.ts).

## Vetores de teste

[`test-vectors.txt`](test-vectors.txt) tem uma entrada por linha no formato `valor;esperado`. Linhas vazias e iniciadas por `#` são ignoradas, e espaços dentro do valor fazem parte do teste. Ao adicionar uma linguagem:

1. crie a pasta com a implementação e um teste que leia os vetores e termine com código diferente de zero em caso de falha;
2. adicione um job em `.github/workflows/examples.yml`;
3. inclua a linha na tabela acima e no README principal.
