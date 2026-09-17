import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { caseInsensitiveSource } from '../src/rules/engine.js';
import { RULES } from '../src/rules/index.js';
import { findings, linesOf, lint } from './helpers.js';

/** Afirma que cada linha marcada com `// !` (ou `-- !`, `# !`, `' !`) é apontada pela regra, e só elas. */
function expectMarked(ruleId: string, code: string, fileName: string): void {
  const expected = code
    .split('\n')
    .map((line, index) =>
      /(?:\/\/|--|#|'|\*>|<!--)\s*!\s*(?:-->)?\s*$/.test(line) ? index + 1 : 0,
    )
    .filter(Boolean);
  assert.deepEqual(linesOf(code, fileName, ruleId), expected);
}

describe('catálogo de regras', () => {
  it('tem ids únicos, documentação bilíngue e severidade válida', () => {
    const ids = new Set<string>();
    for (const rule of RULES) {
      assert.match(rule.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.equal(ids.has(rule.id), false, rule.id);
      ids.add(rule.id);
      assert.ok(['error', 'warning', 'info'].includes(rule.severity));
      for (const text of [rule.docs.title, rule.docs.description, rule.docs.fix]) {
        assert.ok(text.pt.length > 10 && text.en.length > 10, rule.id);
      }
    }
  });

  it('torna identificadores insensíveis a maiúsculas preservando escapes', () => {
    assert.equal(caseInsensitiveSource('cnpj'), '[cC][nN][pP][jJ]');
    assert.equal(caseInsensitiveSource('a\\w_1'), '[aA]\\w_1');
  });
});

describe('numeric-regex', () => {
  it('aponta regex numéricas de CNPJ em várias linguagens', () => {
    expectMarked(
      'numeric-regex',
      [
        'const RE = /^\\d{2}\\.\\d{3}\\.\\d{3}\\/\\d{4}-\\d{2}$/; // !',
        'const cnpjOk = /^\\d{14}$/.test(valor); // !',
        "fmt = cnpj.replace(/(\\d{2})(\\d{3})(\\d{3})(\\d{4})(\\d{2})/, '$1.$2.$3/$4-$5') // !",
        'const cpf = /^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$/;',
        'const cep = /^\\d{5}-\\d{3}$/;',
        'const novo = /^[0-9A-Z]{12}[0-9]{2}$/;',
        'const raizCnpj = /^\\d{8}$/; // !',
        'const cep8 = /^\\d{8}$/;',
      ].join('\n'),
      'a.ts',
    );
    expectMarked(
      'numeric-regex',
      ['    @Pattern(regexp = "\\\\d{14}") // !', '    private String cnpj;'].join('\n'),
      'A.java',
    );
  });

  it('ignora 14 dígitos sem CNPJ por perto', () => {
    assert.deepEqual(
      linesOf('const TIMESTAMP = /^\\d{14}$/;\n\n\n\nconst x = 1;', 'a.ts', 'numeric-regex'),
      [],
    );
  });

  it('aceita identificadores extras', () => {
    const code = 'const nrInsc = valor.match(/^\\d{14}$/);';
    assert.deepEqual(lint(code, 'a.ts'), []);
    assert.deepEqual(lint(code, 'a.ts', ['nrInsc']), ['1:numeric-regex']);
  });
});

describe('strip-non-digits', () => {
  it('aponta remoção de não dígitos em várias linguagens', () => {
    expectMarked(
      'strip-non-digits',
      "const limpo = cnpj.replace(/\\D/g, ''); // !\nconst tel = telefone.replace(/\\D/g, '');",
      'a.ts',
    );
    expectMarked('strip-non-digits', 'cnpj = re.sub(r"[^0-9]", "", cnpj)  # !', 'a.py');
    expectMarked('strip-non-digits', "$cnpj = preg_replace('/[^\\d]/', '', $cnpj); // !", 'a.php');
    expectMarked('strip-non-digits', 'String c = cnpj.replaceAll("\\\\D", ""); // !', 'A.java');
    expectMarked('strip-non-digits', 'var c = Regex.Replace(cnpj, @"[^0-9]", ""); // !', 'A.cs');
    expectMarked(
      'strip-non-digits',
      "SELECT REGEXP_REPLACE(cnpj, '[^0-9]', '', 'g') FROM empresa; -- !",
      'a.sql',
    );
    expectMarked('strip-non-digits', "cnpj = ''.join(c for c in cnpj if c.isdigit())  # !", 'a.py');
    expectMarked(
      'strip-non-digits',
      'var c = new string(cnpj.Where(char.IsDigit).ToArray()); // !',
      'A.cs',
    );
    expectMarked('strip-non-digits', 'echo "$CNPJ" | tr -cd \'0-9\' # !', 'a.sh');
    expectMarked(
      'strip-non-digits',
      '$cnpj = filter_var($cnpj, FILTER_SANITIZE_NUMBER_INT); // !',
      'a.php',
    );
  });

  it('aponta helpers aplicados ao CNPJ, mas não a declaração deles', () => {
    expectMarked(
      'strip-non-digits',
      [
        'export function somenteNumeros(cnpj: string) {',
        '  return valor;',
        '}',
        'const a = somenteNumeros(form.cnpj); // !',
        'const b = onlyDigits(telefone);',
        'const c = empresa.cnpj.onlyNumbers(); // !',
      ].join('\n'),
      'a.ts',
    );
  });

  it('rastreia regex guardada em variável', () => {
    expectMarked(
      'strip-non-digits',
      [
        'var naoDigitos = regexp.MustCompile(`\\D`)',
        '',
        '',
        '',
        'func Limpa(cnpj string) string {',
        '\treturn naoDigitos.ReplaceAllString(cnpj, "") // !',
        '}',
        'func Tel(t string) string { return naoDigitos.ReplaceAllString(t, "") }',
      ].join('\n'),
      'a.go',
    );
  });

  it('não aponta remoção apenas da máscara', () => {
    assert.deepEqual(
      linesOf(
        "const c = cnpj.replace(/[^0-9A-Za-z]/g, '').toUpperCase();",
        'a.ts',
        'strip-non-digits',
      ),
      [],
    );
    assert.deepEqual(
      linesOf("const c = cnpj.replace(/[./-]/g, '');", 'a.ts', 'strip-non-digits'),
      [],
    );
  });
});

describe('numeric-conversion', () => {
  it('aponta conversões do CNPJ para número', () => {
    expectMarked(
      'numeric-conversion',
      [
        'const a = parseInt(cnpj, 10); // !',
        'const b = Number(dados.cnpj); // !',
        'const c = BigInt(cnpj.replace(".", "")); // !',
        'const d = +cnpjTexto; // !',
        'const e = parseInt(quantidade);',
        'const f = Number(cnpj.charAt(12));',
        'const g = String(cnpj).padStart(14, "0"); // !',
        'const total = Number(qtdCnpjs);',
      ].join('\n'),
      'a.ts',
    );
    expectMarked(
      'numeric-conversion',
      'valor = int(cnpj)  # !\nn = int(len(cnpjs))\ndv = int(cnpj[12])',
      'a.py',
    );
    expectMarked('numeric-conversion', 'long v = Long.parseLong(cnpj); // !', 'A.java');
    expectMarked(
      'numeric-conversion',
      'var v = long.Parse(cnpj); // !\nvar w = Convert.ToInt64(empresa.Cnpj); // !',
      'A.cs',
    );
    expectMarked('numeric-conversion', 'v, _ := strconv.ParseInt(cnpj, 10, 64) // !', 'a.go');
    expectMarked(
      'numeric-conversion',
      '$v = intval($cnpj); // !\n$w = (int) $this->cnpj; // !',
      'a.php',
    );
    expectMarked('numeric-conversion', 'valor = cnpj.to_i # !', 'a.rb');
    expectMarked('numeric-conversion', 'val v = cnpj.toLong() // !', 'a.kt');
    expectMarked(
      'numeric-conversion',
      "  N := StrToInt64(edtCnpj.Text); // !\n  M := Qry.FieldByName('CNPJ').AsFloat; // !",
      'a.pas',
    );
    expectMarked('numeric-conversion', 'nValor := Val(cCnpj) // !', 'a.prw');
    expectMarked(
      'numeric-conversion',
      [
        'SELECT CAST(cnpj AS BIGINT) FROM empresa; -- !',
        'SELECT CONVERT(BIGINT, e.cnpj) FROM empresa e; -- !',
        'SELECT TO_NUMBER(cnpj) FROM empresa; -- !',
        'SELECT cnpj::bigint FROM empresa; -- !',
        "SELECT TO_CHAR(cnpj, '00000000000000') FROM empresa; -- !",
        'SELECT CAST(valor AS BIGINT) FROM empresa;',
      ].join('\n'),
      'a.sql',
    );
    expectMarked('numeric-conversion', 'cnpj_fmt = "%014d" % cnpj  # !', 'a.py');
  });
});

describe('numeric-type', () => {
  it('aponta tipos numéricos em várias linguagens', () => {
    expectMarked(
      'numeric-type',
      [
        'interface Empresa {',
        '  cnpj: number; // !',
        '  cnpjRaiz?: bigint; // !',
        '  totalCnpjs: number;',
        '  cnpjTexto: string;',
        '}',
        'const schema = z.object({ cnpj: z.number() }); // !',
        'class Dto {',
        '  @IsNumber() // !',
        '  cnpj: string;',
        '  @IsNumber()',
        '  quantidade: number;',
        '}',
      ].join('\n'),
      'a.ts',
    );
    expectMarked(
      'numeric-type',
      'private Long cnpj; // !\nprivate String cnpjTexto;\nprivate int cnpjCount;',
      'A.java',
    );
    expectMarked(
      'numeric-type',
      'public long Cnpj { get; set; } // !\npublic string CnpjTexto { get; set; }',
      'A.cs',
    );
    expectMarked(
      'numeric-type',
      'type Empresa struct {\n\tCnpj int64 // !\n\tNome string\n}',
      'a.go',
    );
    expectMarked(
      'numeric-type',
      'class E(BaseModel):\n    cnpj: int  # !\n    cnpj_texto: str',
      'a.py',
    );
    expectMarked('numeric-type', 'data class E(val cnpj: Long) // !', 'a.kt');
    expectMarked('numeric-type', 'public function __construct(private int $cnpj) {} // !', 'a.php');
    expectMarked('numeric-type', "Dim cnpj As Long ' !", 'a.vb');
    expectMarked('numeric-type', '  FCnpj: Int64; // !\n  FNome: string;', 'a.pas');
    expectMarked(
      'numeric-type',
      '       05 WS-CNPJ PIC 9(14).                                    *> !\n       05 WS-CNPJ-TXT PIC X(14).',
      'a.cbl',
    );
    expectMarked(
      'numeric-type',
      'message E {\n  int64 cnpj = 1; // !\n  string nome = 2;\n}',
      'a.proto',
    );
    expectMarked('numeric-type', 'type E {\n  cnpj: Int! # !\n  nome: String\n}', 'a.graphql');
  });

  it('entende JSON Schema/OpenAPI em várias linhas', () => {
    const yaml = [
      'properties:',
      '  cnpj:',
      '    description: CNPJ',
      '    type: integer # !',
      '  quantidade:',
      '    type: integer',
    ].join('\n');
    expectMarked('numeric-type', yaml, 'a.yaml');
    const json = [
      '{',
      '  "cnpj": {',
      '    "type": "number"',
      '  },',
      '  "total": { "type": "integer" }',
      '}',
    ].join('\n');
    assert.deepEqual(linesOf(json, 'a.json', 'numeric-type'), [3]);
  });
});

describe('numeric-storage', () => {
  it('aponta colunas e mapeamentos numéricos', () => {
    expectMarked(
      'numeric-storage',
      [
        'CREATE TABLE empresa (',
        '  cnpj BIGINT NOT NULL, -- !',
        '  cnpj_texto CHAR(14),',
        '  qtd_cnpj INTEGER',
        ');',
        'ALTER TABLE cliente ADD cgc NUMERIC(14); -- !',
        'CREATE DOMAIN D_CNPJ AS NUMERIC(14); -- !',
        'SELECT CAST(e.cnpj AS BIGINT) FROM empresa e;',
      ].join('\n'),
      'a.sql',
    );
    expectMarked(
      'numeric-storage',
      'model E {\n  cnpj BigInt // !\n  nome String\n}',
      'schema.prisma',
    );
    expectMarked(
      'numeric-storage',
      '  cnpj = models.BigIntegerField()  # !\n  total_cnpjs = models.IntegerField()',
      'a.py',
    );
    expectMarked('numeric-storage', '  t.bigint :cnpj # !\n  t.string :cnpj_texto', 'a.rb');
    expectMarked(
      'numeric-storage',
      "  $table->bigInteger('cnpj'); // !\n  $table->char('cnpj_texto', 14);",
      'a.php',
    );
    expectMarked(
      'numeric-storage',
      [
        'const E = new Schema({ cnpj: { type: Number } }); // !',
        'const x = { cnpj: Number(valor) };',
      ].join('\n'),
      'a.js',
    );
    expectMarked(
      'numeric-storage',
      "  @Column('bigint') // !\n  cnpj: string;\n  @Column('bigint')\n  total: number;",
      'a.ts',
    );
    expectMarked(
      'numeric-storage',
      '<column name="cnpj" type="BIGINT"/> <!-- ! -->\n<column name="nome" type="VARCHAR(100)"/>',
      'changelog.xml',
    );
    expectMarked('numeric-storage', 'const q = `CREATE TABLE e (cnpj BIGINT)`; // !', 'a.ts');
    assert.deepEqual(linesOf('type E struct {\n\tCnpj int\n}', 'a.go', 'numeric-storage'), []);
  });
});

describe('digit-only-check', () => {
  it('aponta validações só numéricas', () => {
    expectMarked(
      'digit-only-check',
      'if not cnpj.isdigit():  # !\n    pass\nif not telefone.isdigit():\n    pass',
      'a.py',
    );
    expectMarked(
      'digit-only-check',
      "if (!ctype_digit($cnpj)) {} // !\n$r = ['cnpj' => 'required|numeric|digits:14']; // !",
      'a.php',
    );
    expectMarked('digit-only-check', 'if (StringUtils.isNumeric(cnpj)) {} // !', 'A.java');
    expectMarked('digit-only-check', 'if (isNaN(cnpj)) {} // !\nif (isNaN(valor)) {}', 'a.ts');
    expectMarked(
      'digit-only-check',
      "WHERE ISNUMERIC(cnpj) = 1 -- !\nAND cnpj NOT LIKE '%[^0-9]%' -- !",
      'a.sql',
    );
    expectMarked('digit-only-check', 'const ok = /^\\d+$/.test(cnpj); // !', 'a.ts');
    expectMarked('digit-only-check', 'validates :cnpj, numericality: true # !', 'a.rb');
  });
});

describe('checksum-numeric-parse', () => {
  it('aponta o snippet clássico de validação em JavaScript', () => {
    const code = [
      'function validarCNPJ(cnpj) {',
      '  var numeros = cnpj.substring(0, 12);',
      '  var soma = 0, pos = 5;',
      '  for (var i = 12; i >= 1; i--) {',
      '    soma += numeros.charAt(12 - i) * pos--; // !',
      '    if (pos < 2) pos = 9;',
      '  }',
      '  return soma;',
      '}',
    ].join('\n');
    expectMarked('checksum-numeric-parse', code, 'a.js');
  });

  it('aponta parse de caractere perto dos pesos e ignora o DV', () => {
    const code = [
      'PESOS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]',
      '',
      'def dv(cnpj):',
      '    soma = sum(int(c) * p for c, p in zip(cnpj, PESOS))  # !',
      '    return soma % 11',
      '',
      'def confere(cnpj):',
      '    return int(cnpj[12]) == dv(cnpj)',
    ].join('\n');
    expectMarked('checksum-numeric-parse', code, 'a.py');
  });

  it('não aponta rotinas que já usam ASCII − 48', () => {
    const code = [
      'const PESOS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];',
      'for (let i = 0; i < 12; i++) soma += (cnpj.charCodeAt(i) - 48) * PESOS[i];',
      'return Number(cnpj.charAt(12)) === dv;',
    ].join('\n');
    assert.deepEqual(linesOf(code, 'a.ts', 'checksum-numeric-parse'), []);
    const java = [
      'int[] pesos = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};',
      "for (int i = 0; i < 12; i++) soma += (cnpj.charAt(i) - '0') * pesos[i + 1];",
    ].join('\n');
    assert.deepEqual(linesOf(java, 'A.java', 'checksum-numeric-parse'), []);
  });

  it('encontra a variável dos pesos em várias sintaxes de declaração', () => {
    const delphi = [
      'const',
      '  Pesos: array[0..11] of Integer = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2);',
      '',
      '',
      '',
      '',
      'function Soma(const S: string): Integer;',
      'var I: Integer;',
      'begin',
      '  for I := 1 to 12 do',
      '    Result := Result + StrToInt(S[I]) * Pesos[I - 1]; // !',
      'end;',
    ].join('\n');
    expectMarked('checksum-numeric-parse', delphi, 'a.pas');
    const inline =
      'soma = sum(int(c) * p for c, p in zip(cnpj, (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)))  # !';
    expectMarked('checksum-numeric-parse', inline, 'a.py');
  });

  it('não confunde CPF com CNPJ', () => {
    const code = [
      'function validarCpf(cpf) {',
      '  let soma = 0;',
      '  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);',
      '  return soma % 11;',
      '}',
    ].join('\n');
    assert.deepEqual(linesOf(code, 'a.js', 'checksum-numeric-parse'), []);
  });
});

describe('numeric-mask', () => {
  it('aponta máscaras numéricas', () => {
    expectMarked(
      'numeric-mask',
      [
        "$('#doc').mask('00.000.000/0000-00'); // !",
        "IMask(el, { mask: '99.999.999/9999-99' }); // !",
        '<input v-mask="\'##.###.###/####-##\'" /> <!-- ! -->',
        "const tel = '(99) 99999-9999';",
        "const nova = 'AA.AAA.AAA/AAAA-00';",
        "const cnpjExemplo = '11.222.333/0001-81';",
      ].join('\n'),
      'a.tsx',
    );
    expectMarked('numeric-mask', "  EditMask = '99.999.999/9999-99;0;_' // !", 'a.dfm');
  });

  it('rebaixa placeholders para informativo', () => {
    const result = findings('<input placeholder="00.000.000/0000-00" name="doc">', 'a.html');
    assert.deepEqual(
      result.map((item) => [item.ruleId, item.severity]),
      [['numeric-mask', 'info']],
    );
  });
});

describe('numeric-input', () => {
  it('aponta campos de CNPJ com entrada numérica', () => {
    expectMarked(
      'numeric-input',
      [
        '<input name="cnpj" type="number" /> <!-- ! -->',
        '<input name="idade" type="number" />',
        '<input',
        '  id="cnpj"',
        '  onChange={(e) => setCnpj(e.target.value)}',
        '  inputMode="numeric" // !',
        '/>',
      ].join('\n'),
      'a.tsx',
    );
    expectMarked(
      'numeric-input',
      '<EditText android:id="@+id/cnpj" android:inputType="number" /> <!-- ! -->',
      'layout.xml',
    );
    expectMarked(
      'numeric-input',
      "TextField(\n  decoration: InputDecoration(labelText: 'CNPJ'),\n  keyboardType: TextInputType.number, // !\n)",
      'a.dart',
    );
  });
});

describe('nfe-access-key', () => {
  it('aponta chave de acesso só numérica', () => {
    expectMarked(
      'nfe-access-key',
      [
        'const CHAVE_ACESSO = /^\\d{44}$/; // !',
        'const chNFe = BigInt(nota.chNFe); // !',
        'interface Nota { chaveAcesso: bigint } // !',
        'const codigoBarras = /^\\d{44}$/;',
        '',
        '',
        '',
        'const outro = /^\\d{44}$/;',
      ].join('\n'),
      'a.ts',
    );
    expectMarked('nfe-access-key', 'CREATE TABLE nfe (chave_acesso NUMERIC(44)); -- !', 'a.sql');
  });
});

describe('xsd-numeric-pattern', () => {
  it('aponta TCnpj numérico e ignora tipos novos e não relacionados', () => {
    const xsd = [
      '<xs:simpleType name="TCnpjOpc">',
      '  <xs:restriction base="xs:string">',
      '    <xs:pattern value="[0-9]{0}|[0-9]{14}"/> <!-- ! -->',
      '  </xs:restriction>',
      '</xs:simpleType>',
      '<xs:simpleType name="TCnpj">',
      '  <xs:restriction base="xs:string">',
      '    <xs:pattern value="[A-Z0-9]{12}[0-9]{2}"/>',
      '  </xs:restriction>',
      '</xs:simpleType>',
      '<xs:simpleType name="TCep">',
      '  <xs:restriction base="xs:string">',
      '    <xs:pattern value="[0-9]{8}"/>',
      '  </xs:restriction>',
      '</xs:simpleType>',
    ].join('\n');
    expectMarked('xsd-numeric-pattern', xsd, 'tipos.xsd');
  });
});

describe('hibernate-cnpj-format', () => {
  const header = 'import org.hibernate.validator.constraints.br.CNPJ;\n';
  it('exige format = ALPHANUMERIC, inclusive em várias linhas', () => {
    const code = [
      header.trim(),
      'class E {',
      '  @CNPJ // !',
      '  String a;',
      '  @CNPJ(message = "inválido") // !',
      '  String b;',
      '  @CNPJ(format = CNPJ.Format.ALPHANUMERIC)',
      '  String c;',
      '  @CNPJ(',
      '    message = "x",',
      '    format = CNPJ.Format.ALPHANUMERIC',
      '  )',
      '  String d;',
      '}',
    ].join('\n');
    expectMarked('hibernate-cnpj-format', code, 'E.java');
  });

  it('ignora o @CNPJ do Stella', () => {
    const code =
      'import br.com.caelum.stella.bean.validation.CNPJ;\nclass E {\n  @CNPJ\n  String a;\n}';
    assert.deepEqual(linesOf(code, 'E.java', 'hibernate-cnpj-format'), []);
  });
});

describe('branch-0001-headquarters, excluded-letters e numeric-test-data', () => {
  it('aponta suposição de matriz 0001', () => {
    expectMarked(
      'branch-0001-headquarters',
      [
        "const matriz = cnpj.slice(8, 12) === '0001'; // !",
        "const cnpjMatriz = raiz + '0001' + dv; // !",
        "const exemplo = '11.222.333/0001-81'; // cnpj de teste",
      ].join('\n'),
      'a.ts',
    );
  });

  it('aponta exclusão de letras', () => {
    expectMarked(
      'excluded-letters',
      'const CNPJ_RE = /^[A-HJ-NP-Z0-9]{12}\\d{2}$/; // !\nconst HEX = /^[A-Fa-f0-9]+$/;',
      'a.ts',
    );
  });

  it('aponta geradores de massa só numérica', () => {
    const python =
      'from faker import Faker\nfake = Faker("pt_BR")\na = fake.cnpj()  # !\nb = fake.cnpj(use_alphanumeric=True)';
    expectMarked('numeric-test-data', python, 'a.py');
    const findingsList = findings(python, 'a.py');
    assert.equal(
      findingsList.find((item) => item.ruleId === 'numeric-test-data')?.severity,
      'info',
    );
  });
});

describe('comentários', () => {
  it('ignora código comentado', () => {
    const code = "// const a = parseInt(cnpj);\n/* cnpj.replace(/\\D/g, '') */\n * Number(cnpj)";
    assert.deepEqual(lint(code, 'a.ts'), []);
    assert.deepEqual(lint('# valor = int(cnpj)', 'a.py'), []);
    assert.deepEqual(lint('-- SELECT CAST(cnpj AS BIGINT)', 'a.sql'), []);
  });
});
