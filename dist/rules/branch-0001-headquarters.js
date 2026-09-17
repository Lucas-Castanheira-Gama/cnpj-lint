import { CODE_LANGUAGES, patternRule } from './engine.js';
/** Literais de CNPJ completos (dados de teste) não são suposições sobre a matriz. */
const FULL_CNPJ_LITERAL = /[0-9A-Z]{2}\.?[0-9A-Z]{3}\.?[0-9A-Z]{3}\/?0001-?\d{2}/;
export const branch0001Headquarters = patternRule({
    id: 'branch-0001-headquarters',
    severity: 'warning',
    tags: ['business-rule'],
    docs: {
        title: {
            pt: 'Código assume que a ordem 0001 é sempre a matriz',
            en: 'Code assumes order 0001 is always the headquarters',
        },
        description: {
            pt: 'Segundo a Receita Federal (P&R 25 do CNPJ alfanumérico), o sufixo 0001 indica a matriz apenas na geração do CNPJ; com o tempo uma filial pode virar matriz. Montar o CNPJ da matriz com raiz + "0001" ou testar a ordem para saber se é matriz deixa de ser confiável.',
            en: 'According to Receita Federal (alphanumeric CNPJ FAQ #25), the 0001 suffix marks the headquarters only when the CNPJ is created; a branch may later become the headquarters. Building the HQ CNPJ as root + "0001" or testing the order to detect the HQ is no longer reliable.',
        },
        fix: {
            pt: 'Use o indicador matriz/filial do cadastro (ex.: campo "identificador matriz/filial" dos dados abertos do CNPJ ou da sua fonte cadastral) e compare empresas pela raiz (8 primeiras posições).',
            en: 'Use the registry headquarters/branch indicator (e.g. the "matriz/filial" field in the CNPJ open data or your data provider) and group companies by root (first 8 positions).',
        },
    },
}, [
    {
        source: String.raw `['"\x60]\/?0001-?['"\x60]`,
        languages: CODE_LANGUAGES,
        scope: { before: 2, after: 2 },
        quick: ['0001'],
        skipIf: FULL_CNPJ_LITERAL,
    },
    {
        source: String.raw `\bmatriz\b.{0,60}0001|0001.{0,60}\bmatriz\b`,
        flags: 'i',
        languages: CODE_LANGUAGES,
        scope: 'none',
        quick: ['0001'],
        skipIf: FULL_CNPJ_LITERAL,
    },
]);
