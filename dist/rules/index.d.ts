import type { Rule } from '../types.js';
/** Todas as regras, na ordem em que aparecem na documentação. */
export declare const RULES: readonly Rule[];
export declare function findRule(id: string): Rule | undefined;
export { KNOWN_PACKAGES } from './dependencies.js';
