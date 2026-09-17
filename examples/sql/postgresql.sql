-- CNPJ numérico e alfanumérico: funções de referência para PostgreSQL 12+.
-- Carregue com: psql -f examples/sql/postgresql.sql

-- Remove a máscara (".", "/", "-" e espaços) e converte letras ASCII para maiúsculas.
CREATE OR REPLACE FUNCTION cnpj_normalizar(valor text)
RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$
  SELECT translate(
    regexp_replace(valor, '[./[:space:]-]', '', 'g'),
    'abcdefghijklmnopqrstuvwxyz',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  )
$$;

-- Dígitos verificadores de uma base com 12 caracteres [0-9A-Z].
CREATE OR REPLACE FUNCTION cnpj_digitos(base text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE
AS $$
DECLARE
  pesos_dv1 CONSTANT int[] := ARRAY[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  pesos_dv2 CONSTANT int[] := ARRAY[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  pesos int[];
  texto text := base;
  soma int;
  resto int;
  digito int;
  resultado text := '';
BEGIN
  FOR etapa IN 1..2 LOOP
    pesos := CASE etapa WHEN 1 THEN pesos_dv1 ELSE pesos_dv2 END;
    soma := 0;
    FOR i IN 1..array_length(pesos, 1) LOOP
      -- Valor de cada caractere = código ASCII - 48 ('0' -> 0, 'A' -> 17)
      soma := soma + (ascii(substr(texto, i, 1)) - 48) * pesos[i];
    END LOOP;
    resto := soma % 11;
    digito := CASE WHEN resto < 2 THEN 0 ELSE 11 - resto END;
    texto := texto || digito::text;
    resultado := resultado || digito::text;
  END LOOP;
  RETURN resultado;
END;
$$;

CREATE OR REPLACE FUNCTION cnpj_valido(valor text)
RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT COALESCE(
    c ~ '^[0-9A-Z]{12}[0-9]{2}$'
      AND c !~ '^(.)\1*$'
      AND cnpj_digitos(substr(c, 1, 12)) = substr(c, 13, 2),
    false
  )
  FROM (SELECT cnpj_normalizar(valor) AS c) AS normalizado
$$;

-- Exemplo de migração de uma coluna numérica:
--   ALTER TABLE empresa ALTER COLUMN cnpj TYPE char(14) USING lpad(cnpj::text, 14, '0');
--   ALTER TABLE empresa ADD CONSTRAINT empresa_cnpj_valido CHECK (cnpj_valido(cnpj));
