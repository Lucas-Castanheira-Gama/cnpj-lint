-- Uso (na raiz do repositório): psql -v ON_ERROR_STOP=1 -f examples/sql/test-postgresql.sql
\set ON_ERROR_STOP on
\encoding UTF8
\i examples/sql/postgresql.sql

CREATE TEMP TABLE vetores (linha text);
\copy vetores FROM 'examples/test-vectors.txt' WITH (FORMAT text)

CREATE TEMP VIEW casos AS
SELECT
  left(linha, length(linha) - position(';' IN reverse(linha))) AS valor,
  right(linha, position(';' IN reverse(linha)) - 1) = 'true' AS esperado
FROM vetores
WHERE btrim(linha) <> '' AND linha NOT LIKE '#%';

SELECT count(*) AS total,
       count(*) FILTER (WHERE cnpj_valido(valor) IS DISTINCT FROM esperado) AS falhas
FROM casos \gset
\echo PostgreSQL: :total vetores, :falhas falha(s)

SELECT valor, esperado FROM casos WHERE cnpj_valido(valor) IS DISTINCT FROM esperado;

DO $$
BEGIN
  IF cnpj_digitos('12ABC34501DE') <> '35' THEN
    RAISE EXCEPTION 'exemplo oficial da Receita Federal falhou';
  END IF;
  IF EXISTS (SELECT 1 FROM casos WHERE cnpj_valido(valor) IS DISTINCT FROM esperado) THEN
    RAISE EXCEPTION 'há vetores de teste com resultado incorreto';
  END IF;
END
$$;
