CREATE TABLE empresa (
    cnpj          CHAR(14) NOT NULL,
    cnpj_raiz     CHAR(8)  NOT NULL,
    total_filiais INTEGER  NOT NULL DEFAULT 0,
    CONSTRAINT ck_cnpj CHECK (cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$')
);

-- Valor de cada caractere para o DV: ASCII - 48
SELECT ASCII(SUBSTRING(cnpj FROM 1 FOR 1)) - 48 FROM empresa;
