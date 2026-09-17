import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CNPJ_FORMATTED_PATTERN,
  CNPJ_PATTERN,
  calculateCnpjCheckDigits,
  formatCnpj,
  generateCnpj,
  isAlphanumericCnpj,
  isValidCnpj,
  normalizeCnpj,
} from '../src/cnpj.js';

/** Implementação independente e ingênua, só para comparar nos testes. */
function naiveCheckDigits(base: string): string {
  const value = (char: string) =>
    '0123456789'.indexOf(char) >= 0
      ? Number(char)
      : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(char) + 17;
  const digit = (text: string, first: number) => {
    let weight = first;
    let sum = 0;
    for (const char of text) {
      sum += value(char) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  const dv1 = digit(base, 5);
  const dv2 = digit(base + dv1, 6);
  return `${dv1}${dv2}`;
}

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

describe('calculateCnpjCheckDigits', () => {
  it('reproduz o exemplo oficial da Receita Federal (P&R 14)', () => {
    assert.equal(calculateCnpjCheckDigits('12ABC34501DE'), '35');
    assert.equal(calculateCnpjCheckDigits('12.ABC.345/01DE'), '35');
  });

  it('calcula CNPJs numéricos como antes', () => {
    assert.equal(calculateCnpjCheckDigits('112223330001'), '81');
    assert.equal(calculateCnpjCheckDigits('000000000001'), '91');
  });

  it('usa ASCII − 48 para todas as letras', () => {
    assert.equal(calculateCnpjCheckDigits('ZZZZZZZZZZZZ'), '62');
    assert.equal(calculateCnpjCheckDigits('AA345678000A'), '29');
    assert.equal(calculateCnpjCheckDigits('12345678000A'), '08');
  });

  it('concorda com uma implementação independente', () => {
    const random = seeded(42);
    for (let index = 0; index < 500; index++) {
      const cnpj = generateCnpj({ random });
      assert.equal(
        calculateCnpjCheckDigits(cnpj.slice(0, 12)),
        naiveCheckDigits(cnpj.slice(0, 12)),
      );
    }
  });

  it('rejeita bases inválidas', () => {
    assert.throws(() => calculateCnpjCheckDigits('12ABC34501D'), TypeError);
    assert.throws(() => calculateCnpjCheckDigits('12ABC34501DE3'), TypeError);
    assert.throws(() => calculateCnpjCheckDigits('12ABC3450!DE'), TypeError);
  });
});

describe('isValidCnpj', () => {
  const valid = [
    '12.ABC.345/01DE-35',
    '12ABC34501DE35',
    '12abc34501de35',
    ' 12.ABC.345/01DE-35 ',
    'AA345678000A29',
    'AA.345.678/0003-86',
    '12.345.678/000A-08',
    '11.222.333/0001-81',
    '11222333000181',
    'ZZ.ZZZ.ZZZ/ZZZZ-62',
  ];

  it('aceita CNPJs numéricos e alfanuméricos válidos', () => {
    for (const cnpj of valid) assert.equal(isValidCnpj(cnpj), true, cnpj);
  });

  it('aceita todas as letras, inclusive I, O, U, Q e F (P&R 45)', () => {
    const base = 'IOUQF0000000';
    assert.equal(isValidCnpj(base + calculateCnpjCheckDigits(base)), true);
  });

  it('rejeita o exemplo 1 da P&R 23, cujo DV é ilustrativo', () => {
    assert.equal(isValidCnpj('AA345678/0003-29'), false);
    assert.equal(isValidCnpj('AA345678/0003-86'), true);
  });

  it('rejeita valores inválidos', () => {
    const invalid = [
      '',
      '12.ABC.345/01DE-34',
      '12ABC34501DE53',
      '11222333000182',
      '00000000000000',
      '11111111111111',
      '12ABC34501DE3',
      '12ABC34501DE356',
      '12ABC34501DEA5',
      '12ABC3450!DE35',
      '12ABÇ34501DE35',
      '12ABC34501DE3S',
    ];
    for (const cnpj of invalid) assert.equal(isValidCnpj(cnpj), false, cnpj);
  });

  it('rejeita tipos que não são string', () => {
    assert.equal(isValidCnpj(11222333000181), false);
    assert.equal(isValidCnpj(null), false);
    assert.equal(isValidCnpj(undefined), false);
    assert.equal(isValidCnpj({}), false);
  });

  it('modo estrito exige formato canônico e maiúsculas', () => {
    assert.equal(isValidCnpj('12.ABC.345/01DE-35', { strict: true }), true);
    assert.equal(isValidCnpj('12ABC34501DE35', { strict: true }), true);
    assert.equal(isValidCnpj('12abc34501de35', { strict: true }), false);
    assert.equal(isValidCnpj('12ABC.345/01DE-35', { strict: true }), false);
    assert.equal(isValidCnpj(' 12ABC34501DE35', { strict: true }), false);
  });
});

describe('normalizeCnpj, formatCnpj e isAlphanumericCnpj', () => {
  it('normaliza removendo só a máscara', () => {
    assert.equal(normalizeCnpj('12.abc.345/01de-35'), '12ABC34501DE35');
    assert.equal(normalizeCnpj('12 ABC 345'), '12ABC345');
    assert.equal(normalizeCnpj('12#ABC'), '12#ABC');
  });

  it('formata com a máscara padrão', () => {
    assert.equal(formatCnpj('12abc34501de35'), '12.ABC.345/01DE-35');
    assert.equal(formatCnpj('11222333000181'), '11.222.333/0001-81');
    assert.throws(() => formatCnpj('123'), TypeError);
  });

  it('detecta letras', () => {
    assert.equal(isAlphanumericCnpj('12.ABC.345/01DE-35'), true);
    assert.equal(isAlphanumericCnpj('11.222.333/0001-81'), false);
  });

  it('expõe padrões coerentes', () => {
    assert.match('12ABC34501DE35', CNPJ_PATTERN);
    assert.match('12.ABC.345/01DE-35', CNPJ_FORMATTED_PATTERN);
    assert.doesNotMatch('12ABC34501DEAB', CNPJ_PATTERN);
  });
});

describe('generateCnpj', () => {
  it('gera CNPJs alfanuméricos válidos com ao menos uma letra', () => {
    for (let index = 0; index < 1000; index++) {
      const cnpj = generateCnpj();
      assert.equal(isValidCnpj(cnpj), true, cnpj);
      assert.equal(isAlphanumericCnpj(cnpj), true, cnpj);
    }
  });

  it('gera CNPJs numéricos e formatados', () => {
    for (let index = 0; index < 200; index++) {
      const cnpj = generateCnpj({ alphanumeric: false, formatted: true });
      assert.match(cnpj, /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/);
      assert.equal(isValidCnpj(cnpj), true, cnpj);
    }
  });

  it('respeita raiz e ordem fixas', () => {
    const cnpj = generateCnpj({ root: '12.ABC.345', order: '01DE' });
    assert.equal(cnpj, '12ABC34501DE35');
    const branch = generateCnpj({ root: '12345678', random: seeded(7) });
    assert.equal(branch.slice(0, 8), '12345678');
    assert.equal(isAlphanumericCnpj(branch.slice(8, 12)), true);
  });

  it('é determinístico com fonte de aleatoriedade própria', () => {
    assert.equal(generateCnpj({ random: seeded(1) }), generateCnpj({ random: seeded(1) }));
  });

  it('valida opções', () => {
    assert.throws(() => generateCnpj({ root: '123' }), TypeError);
    assert.throws(() => generateCnpj({ order: 'ABCDE' }), TypeError);
    assert.throws(() => generateCnpj({ root: '00000000', order: '0000' }), Error);
  });
});
