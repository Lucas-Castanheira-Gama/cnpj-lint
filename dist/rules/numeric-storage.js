import { COUNTER_LIKE, patternRule } from './engine.js';
const SQL_TYPES = [
    'BIGINT',
    'INT8',
    'INT4',
    'INT2',
    'INTEGER',
    'INT',
    'SMALLINT',
    'MEDIUMINT',
    'NUMERIC',
    'DECIMAL',
    'DEC',
    'NUMBER',
    String.raw `DOUBLE(?:\s+PRECISION)?`,
    String.raw `FLOAT\d*`,
    'REAL',
    'MONEY',
    'SMALLMONEY',
    'BIGSERIAL',
    'SERIAL8',
    'BINARY_DOUBLE',
    'BINARY_FLOAT',
].join('|');
const DDL_STATEMENT = /\b(?:CREATE\s+(?:OR\s+REPLACE\s+)?(?:GLOBAL\s+TEMPORARY\s+)?(?:TABLE|PROCEDURE|FUNCTION|DOMAIN|TYPE|VIEW)|ALTER\s+TABLE|ADD\s+COLUMN|ALTER\s+COLUMN|MODIFY\s+COLUMN|DECLARE\s+@)/i;
/** Em arquivos que não são SQL, só considera DDL dentro de strings/heredocs próximos. */
function isSqlContext(file, _context, line) {
    if (file.languages.has('sql'))
        return true;
    const start = Math.max(0, line - 30);
    for (let index = line; index >= start; index--) {
        if (DDL_STATEMENT.test(file.lines[index] ?? ''))
            return true;
    }
    return false;
}
const MIGRATION_TYPES = 'bigInteger|unsignedBigInteger|integer|unsignedInteger|decimal|unsignedDecimal|double|float|bigIncrements|mediumInteger|biginteger|bigint|numeric';
export const numericStorage = patternRule({
    id: 'numeric-storage',
    severity: 'error',
    tags: ['database', 'schema', 'orm'],
    docs: {
        title: {
            pt: 'CNPJ armazenado em coluna numérica',
            en: 'CNPJ stored in a numeric column',
        },
        description: {
            pt: 'Colunas BIGINT/NUMERIC/DECIMAL (e mapeamentos de ORM equivalentes em Prisma, TypeORM, Sequelize, Mongoose, Django, SQLAlchemy, Rails, Laravel, JPA, EF Core, GORM, Liquibase, Doctrine) não armazenam letras e já perdem zeros à esquerda.',
            en: 'BIGINT/NUMERIC/DECIMAL columns (and equivalent ORM mappings in Prisma, TypeORM, Sequelize, Mongoose, Django, SQLAlchemy, Rails, Laravel, JPA, EF Core, GORM, Liquibase, Doctrine) cannot store letters and already drop leading zeros.',
        },
        fix: {
            pt: 'Migre para CHAR(14)/VARCHAR(14) (ou VARCHAR(18) com máscara), convertendo os dados com LPAD(valor, 14, "0"). Revise índices, chaves estrangeiras e a collation (comparação sensível a maiúsculas).',
            en: 'Migrate to CHAR(14)/VARCHAR(14) (or VARCHAR(18) with mask), converting data with LPAD(value, 14, "0"). Review indexes, foreign keys and collation (case sensitivity).',
        },
    },
}, [
    {
        // cnpj BIGINT, [CNPJ] [numeric](14, 0), p_cnpj IN NUMBER, ALTER COLUMN cnpj TYPE bigint
        source: String.raw `(?:^|[\s,(])["'\x60[]?\w*{{ID}}\w*["'\x60\]]?\s+(?:(?:IN|OUT|IN\s+OUT|INOUT)\s+)?(?:(?:SET\s+DATA\s+)?TYPE\s+)?\[?(?:${SQL_TYPES})\b`,
        flags: 'i',
        lineFilter: isSqlContext,
        skipIf: COUNTER_LIKE,
    },
    {
        // Firebird/PostgreSQL: CREATE DOMAIN D_CNPJ AS NUMERIC(14)
        source: String.raw `\bDOMAIN\s+\w*{{ID}}\w*\s+(?:AS\s+)?(?:${SQL_TYPES})\b`,
        flags: 'i',
    },
    {
        // Rails: t.bigint :cnpj / add_column :empresas, :cnpj, :bigint
        source: String.raw `\bt\.(?:bigint|integer|decimal|float|numeric)\s*\(?\s*:?["']?\w*{{ID}}|\b(?:add_column|change_column)\s*\(?\s*:\w+\s*,\s*:?["']?\w*{{ID}}\w*["']?\s*,\s*:(?:bigint|integer|decimal|float|numeric)\b`,
        flags: 'i',
        languages: ['ruby'],
    },
    {
        // Laravel, Knex, Kysely: $table->bigInteger('cnpj'), table.bigInteger('cnpj'), addColumn('cnpj', 'bigint')
        source: String.raw `(?:->|\.)(?:${MIGRATION_TYPES})\s*\(\s*['"\x60]\w*{{ID}}|addColumn\(\s*['"]\w*{{ID}}\w*['"]\s*,\s*['"](?:bigint|integer|int8|int4|numeric|decimal|real|double precision)['"]`,
        flags: 'i',
        languages: ['php', 'javascript', 'typescript'],
    },
    {
        // Django, Peewee
        source: String.raw `\b\w*{{ID}}\w*\s*=\s*(?:models\.)?(?:BigIntegerField|IntegerField|PositiveBigIntegerField|PositiveIntegerField|DecimalField|FloatField|BigAutoField|SmallIntegerField)\s*\(`,
        flags: 'i',
        languages: ['python'],
        skipIf: COUNTER_LIKE,
    },
    {
        // SQLAlchemy: cnpj = Column(BigInteger) / mapped_column(Numeric(14))
        source: String.raw `\b\w*{{ID}}\w*\s*(?::[^=]*)?=\s*(?:sa\.|db\.|sqlalchemy\.)?(?:Column|mapped_column)\s*\(\s*(?:['"]\w+['"]\s*,\s*)?(?:sa\.|db\.|sqlalchemy\.|types\.)?(?:BigInteger|Integer|Numeric|Float|DECIMAL|BIGINT|NUMERIC|INTEGER|SmallInteger|Double)\b`,
        flags: 'i',
        languages: ['python'],
        skipIf: COUNTER_LIKE,
    },
    {
        // Sequelize e Mongoose
        source: String.raw `\b\w*{{ID}}\w*['"]?\s*:\s*(?:\{[^}]*?type\s*:\s*)?(?:(?:DataTypes|Sequelize)\.(?:BIGINT|INTEGER|DECIMAL|FLOAT|DOUBLE|NUMBER|REAL|NUMERIC)|Number|Schema\.Types\.(?:Number|Decimal128|Long|BigInt)|mongoose\.Schema\.Types\.(?:Number|Decimal128|Long|BigInt)|Decimal128)\b(?!\s*[(.])`,
        languages: ['javascript', 'typescript'],
        skipIf: COUNTER_LIKE,
    },
    {
        // Drizzle: cnpj: bigint('cnpj', { mode: 'number' })
        source: String.raw `\b\w*{{ID}}\w*\s*:\s*(?:bigint|integer|int|numeric|decimal|real|doublePrecision|double|serial|bigserial|mysqlBigint)\s*\(`,
        flags: 'i',
        languages: ['javascript', 'typescript'],
        skipIf: COUNTER_LIKE,
    },
    {
        // TypeORM / MikroORM: @Column('bigint') ou @Column({ type: 'numeric' }) antes da propriedade
        source: String.raw `@(?:Column|PrimaryColumn|Property)\s*\(\s*(?:\{[^}]*?type\s*:\s*)?(?:['"](?:bigint|int|int8|int4|integer|numeric|decimal|float|double|double precision|real|number)['"]|BigIntType|DecimalType|IntegerType|Number\b)`,
        flags: 'i',
        languages: ['javascript', 'typescript'],
        scope: 'none',
        nextDeclaration: true,
    },
    {
        source: String.raw `^\s*\w*{{ID}}\w*\s+(?:BigInt|Int|Decimal|Float)\b`,
        flags: 'i',
        languages: ['prisma'],
        skipIf: COUNTER_LIKE,
    },
    {
        // JPA: @Column(columnDefinition = "NUMERIC(14)")
        source: String.raw `@Column\s*\([^)]*columnDefinition\s*=\s*"(?:BIGINT|NUMERIC|DECIMAL|NUMBER|INT)`,
        flags: 'i',
        languages: ['java', 'kotlin', 'groovy', 'scala'],
        scope: 'none',
        nextDeclaration: true,
    },
    {
        // EF Core
        source: String.raw `\.Property\(\s*\w+\s*=>\s*\w+\.\w*{{ID}}\w*\s*\).*HasColumnType\(\s*"(?:bigint|numeric|decimal|int|money)`,
        flags: 'i',
        languages: ['csharp'],
    },
    {
        source: String.raw `\[Column\([^)]*TypeName\s*=\s*"(?:bigint|numeric|decimal|int|money)`,
        flags: 'i',
        languages: ['csharp'],
        scope: 'none',
        nextDeclaration: true,
    },
    {
        // GORM
        source: 'gorm:"[^"]*type:(?:bigint|numeric|decimal|int)',
        flags: 'i',
        languages: ['go'],
    },
    {
        // Doctrine
        source: String.raw `(?:#\[ORM\\Column|@ORM\\Column)\s*\(\s*(?:type\s*[:=]\s*)?(?:Types::)?['"]?(?:bigint|integer|decimal|float|smallint)\b`,
        flags: 'i',
        languages: ['php'],
        scope: 'none',
        nextDeclaration: true,
        inComments: true,
    },
    {
        // Liquibase (XML) e Hibernate hbm.xml
        source: String.raw `<column\b[^>]*\bname="\w*{{ID}}\w*"[^>]*\btype="(?:BIGINT|INT|INTEGER|NUMERIC|DECIMAL|NUMBER|DOUBLE|FLOAT|LONG|java\.sql\.Types\.(?:BIGINT|NUMERIC))|<column\b[^>]*\btype="(?:BIGINT|INT|INTEGER|NUMERIC|DECIMAL|NUMBER|DOUBLE|FLOAT)[^"]*"[^>]*\bname="\w*{{ID}}|<property\b[^>]*name="\w*{{ID}}\w*"[^>]*type="(?:long|integer|big_integer|big_decimal|double|java\.lang\.Long|java\.math\.BigInteger)"`,
        flags: 'i',
        languages: ['xml'],
    },
]);
