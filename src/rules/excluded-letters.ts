import { CODE_LANGUAGES, patternRule } from './engine.js';

export const excludedLetters = patternRule(
  {
    id: 'excluded-letters',
    severity: 'warning',
    tags: ['validation'],
    docs: {
      title: {
        pt: 'Validação rejeita algumas letras do CNPJ',
        en: 'Validation rejects some CNPJ letters',
      },
      description: {
        pt: 'Circula a informação de que I, O, U, Q e F não seriam usadas. A Receita Federal orienta que os sistemas aceitem todas as 26 letras (P&R 45); o bloqueio de combinações é feito internamente na geração.',
        en: 'Some sources claim I, O, U, Q and F are never used. Receita Federal instructs systems to accept all 26 letters (FAQ #45); forbidden combinations are filtered internally at generation time.',
      },
      fix: {
        pt: 'Aceite [A-Z] completo nas 12 primeiras posições.',
        en: 'Accept the full [A-Z] range in the first 12 positions.',
      },
    },
  },
  [
    {
      // [A-HJ-NP-Z0-9]: mais de uma faixa de maiúsculas na mesma classe
      source: String.raw`\[\^?[^\]\n]*[A-Z]-[A-Z][^\]\n]*[A-Z]-[A-Z][^\]\n]*\]`,
      languages: CODE_LANGUAGES,
      scope: { before: 2, after: 2 },
      quick: ['-'],
    },
    {
      source: String.raw`\[\^[IOUQF]{3,5}\]|['"\x60][IOUQF]{4,5}['"\x60]|\[\s*['"][IOUQF]['"]\s*,\s*['"][IOUQF]['"]\s*,\s*['"][IOUQF]['"]`,
      languages: CODE_LANGUAGES,
      scope: { before: 3, after: 3 },
    },
  ],
);
