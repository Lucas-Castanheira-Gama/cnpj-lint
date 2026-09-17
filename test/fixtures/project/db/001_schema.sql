-- Esquema legado
CREATE TABLE empresa (
    id          SERIAL PRIMARY KEY,
    cnpj        BIGINT NOT NULL,
    cnpj_raiz   NUMERIC(8) NOT NULL,
    razao       VARCHAR(150),
    qtd_cnpj    INTEGER DEFAULT 0,
    CONSTRAINT ck_cnpj CHECK (cnpj_texto ~ '^[0-9]{14}$')
);

CREATE TABLE fornecedor (
    [CNPJ] [numeric](14, 0) NOT NULL,
    [NOME] [varchar](100) NULL
);

ALTER TABLE cliente ALTER COLUMN cnpj TYPE bigint USING cnpj::bigint;

CREATE OR REPLACE FUNCTION busca_empresa(p_cnpj IN NUMBER) RETURN VARCHAR2 IS
BEGIN
    RETURN NULL;
END;

SELECT CAST(e.cnpj AS BIGINT) AS cnpj_num
  FROM empresa e
 WHERE ISNUMERIC(e.cnpj_texto) = 1
   AND e.cnpj_texto NOT LIKE '%[^0-9]%'
   AND TO_NUMBER(e.cnpj_texto) > 0;

SELECT LPAD(cnpj, 14, '0') FROM empresa WHERE SUBSTRING(cnpj, 9, 4) = '0001';

-- Correto: texto de 14 posições
CREATE TABLE empresa_nova (
    cnpj CHAR(14) NOT NULL
);
