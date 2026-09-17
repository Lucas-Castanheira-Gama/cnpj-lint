import { patternRule } from './engine.js';

export const numericTestData = patternRule(
  {
    id: 'numeric-test-data',
    severity: 'info',
    tags: ['tests', 'test-data'],
    docs: {
      title: {
        pt: 'Gerador de dados de teste produz só CNPJ numérico',
        en: 'Test-data generator only produces numeric CNPJs',
      },
      description: {
        pt: 'Se a massa de teste só tem CNPJs numéricos, os testes continuam verdes enquanto o sistema quebra com CNPJs alfanuméricos.',
        en: 'If test data only contains numeric CNPJs, tests stay green while the system breaks on alphanumeric CNPJs.',
      },
      fix: {
        pt: 'Inclua CNPJs alfanuméricos: Faker (Python) >= 40.33.0 com cnpj(use_alphanumeric=True); brutils generate_cnpj(alphanumeric=True); `npx github:Lucas-Castanheira-Gama/cnpj-lint generate`.',
        en: 'Include alphanumeric CNPJs: Faker (Python) >= 40.33.0 with cnpj(use_alphanumeric=True); brutils generate_cnpj(alphanumeric=True); `npx github:Lucas-Castanheira-Gama/cnpj-lint generate`.',
      },
    },
  },
  [
    {
      source: String.raw`\b(?:fake|faker|self\.fake|self\.faker|Faker\([^)]*\))\s*\.\s*(?:cnpj|company_id)\s*\(\s*\)`,
      languages: ['python'],
      scope: 'none',
      message: {
        pt: 'Faker gera CNPJ numérico por padrão; use cnpj(use_alphanumeric=True) (Faker >= 40.33.0)',
        en: 'Faker generates numeric CNPJs by default; use cnpj(use_alphanumeric=True) (Faker >= 40.33.0)',
      },
    },
    {
      source: String.raw`\bFaker\(\s*['"](?:cnpj|company_id)['"]\s*\)`,
      languages: ['python'],
      scope: 'none',
      message: {
        pt: 'factory.Faker("cnpj") gera CNPJ numérico; passe use_alphanumeric=True',
        en: 'factory.Faker("cnpj") generates numeric CNPJs; pass use_alphanumeric=True',
      },
    },
    {
      source: String.raw`\bgenerate_cnpj\s*\((?![^)]*alphanumeric\s*=\s*True)[^)]*\)`,
      languages: ['python'],
      scope: 'none',
      fileFilter: (file) => file.text.includes('brutils'),
      message: {
        pt: 'brutils.generate_cnpj() gera CNPJ numérico por padrão; use alphanumeric=True (brutils >= 2.5.0)',
        en: 'brutils.generate_cnpj() generates numeric CNPJs by default; use alphanumeric=True (brutils >= 2.5.0)',
      },
    },
    {
      source: String.raw`\.Cnpj\s*\(`,
      languages: ['csharp'],
      scope: 'none',
      fileFilter: (file) => /\bBogus\b/.test(file.text),
      message: {
        pt: 'Bogus gera apenas CNPJ numérico (issue bchavez/Bogus#634); complemente com CNPJs alfanuméricos',
        en: 'Bogus only generates numeric CNPJs (issue bchavez/Bogus#634); add alphanumeric CNPJs yourself',
      },
    },
  ],
);
