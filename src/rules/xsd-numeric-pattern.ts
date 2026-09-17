import type { Rule, RuleMatch, Text } from '../types.js';

const PATTERN_FACET = /<(?:xs|xsd):pattern\s+value\s*=\s*"([^"]*)"/;
const RESTRICTION_NUMERIC =
  /<(?:xs|xsd):restriction\s+base\s*=\s*"(?:xs|xsd):(?:long|int|integer|decimal|unsignedLong|positiveInteger|nonNegativeInteger)"/;
const DIGIT_QUANTIFIER = /(?:\[0-9\]|\\d)\{(?:\d+,)?(?:14|12|8|43|44)\}/;
const NAMED_DECLARATION =
  /<(?:xs|xsd):(?:simpleType|complexType|element|attribute)\b[^>]*\bname\s*=\s*"([^"]*)"/;
const CNPJ_NAME = /cnpj|cgc/i;
const ACCESS_KEY_NAME = /ch(?:nfe|nfce|cte|mdfe|bpe|dfe)|chave/i;

const CNPJ_MESSAGE: Text = {
  pt: 'Tipo XSD de CNPJ aceita apenas dígitos; o leiaute novo usa [A-Z0-9]{12}[0-9]{2}',
  en: 'XSD CNPJ type only accepts digits; the new layout uses [A-Z0-9]{12}[0-9]{2}',
};
const ACCESS_KEY_MESSAGE: Text = {
  pt: 'Tipo XSD da chave de acesso aceita apenas dígitos; a chave passa a conter o CNPJ alfanumérico',
  en: 'XSD access-key type only accepts digits; keys now carry the alphanumeric CNPJ',
};

export const xsdNumericPattern: Rule = {
  id: 'xsd-numeric-pattern',
  severity: 'error',
  tags: ['nfe', 'xml', 'schema'],
  docs: {
    title: {
      pt: 'Schema XSD com CNPJ só numérico',
      en: 'XSD schema with digits-only CNPJ',
    },
    description: {
      pt: 'Cópias locais de schemas (NF-e, CT-e, MDF-e, NFS-e, eSocial, EFD-Reinf, WSDLs de parceiros) com TCnpj = [0-9]{14} rejeitam XMLs válidos. As NTs 2025.001 e 2026.004 atualizaram os padrões.',
      en: 'Local schema copies (NF-e, CT-e, MDF-e, NFS-e, eSocial, EFD-Reinf, partner WSDLs) with TCnpj = [0-9]{14} reject valid XMLs. Technical notes 2025.001 and 2026.004 updated the patterns.',
    },
    fix: {
      pt: 'Atualize os schemas para a versão publicada no portal do respectivo DF-e (padrão [A-Z0-9]{12}[0-9]{2} para CNPJ) e revalide os XMLs de teste.',
      en: 'Update the schemas to the version published on the DF-e portal (pattern [A-Z0-9]{12}[0-9]{2} for CNPJ) and revalidate test XMLs.',
    },
  },
  check(file) {
    if (!file.languages.has('xsd') && !file.languages.has('xml')) return [];
    const matches: RuleMatch[] = [];
    /** Nome da declaração nomeada mais próxima acima (o tipo ao qual a faceta pertence). */
    const nameAbove = (line: number): string => {
      for (let index = line; index >= Math.max(0, line - 15); index--) {
        const name = NAMED_DECLARATION.exec(file.lines[index] ?? '')?.[1];
        if (name !== undefined) return name;
      }
      return '';
    };
    file.lines.forEach((text, line) => {
      const facet = PATTERN_FACET.exec(text);
      const restriction = facet ? null : RESTRICTION_NUMERIC.exec(text);
      const found = facet ?? restriction;
      if (!found) return;
      if (facet) {
        const value = facet[1] ?? '';
        if (/A-Z/.test(value) || !DIGIT_QUANTIFIER.test(value)) return;
      }
      const name = nameAbove(line);
      const message = CNPJ_NAME.test(name)
        ? CNPJ_MESSAGE
        : ACCESS_KEY_NAME.test(name)
          ? ACCESS_KEY_MESSAGE
          : undefined;
      if (!message) return;
      matches.push({ line, column: found.index, length: found[0].length, message });
    });
    return matches;
  },
};
