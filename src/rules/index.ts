import type { Rule } from '../types.js';
import { branch0001Headquarters } from './branch-0001-headquarters.js';
import { checksumNumericParse } from './checksum-numeric-parse.js';
import { outdatedDependency } from './dependencies.js';
import { digitOnlyCheck } from './digit-only-check.js';
import { excludedLetters } from './excluded-letters.js';
import { hibernateCnpjFormat } from './hibernate-cnpj-format.js';
import { nfeAccessKey } from './nfe-access-key.js';
import { numericConversion } from './numeric-conversion.js';
import { numericInput } from './numeric-input.js';
import { numericMask } from './numeric-mask.js';
import { numericRegex } from './numeric-regex.js';
import { numericStorage } from './numeric-storage.js';
import { numericTestData } from './numeric-test-data.js';
import { numericType } from './numeric-type.js';
import { stripNonDigits } from './strip-non-digits.js';
import { xsdNumericPattern } from './xsd-numeric-pattern.js';

/** Todas as regras, na ordem em que aparecem na documentação. */
export const RULES: readonly Rule[] = [
  numericRegex,
  stripNonDigits,
  numericConversion,
  numericType,
  numericStorage,
  digitOnlyCheck,
  checksumNumericParse,
  numericMask,
  numericInput,
  nfeAccessKey,
  xsdNumericPattern,
  hibernateCnpjFormat,
  outdatedDependency,
  branch0001Headquarters,
  excludedLetters,
  numericTestData,
];

export function findRule(id: string): Rule | undefined {
  return RULES.find((rule) => rule.id === id);
}

export { KNOWN_PACKAGES } from './dependencies.js';
