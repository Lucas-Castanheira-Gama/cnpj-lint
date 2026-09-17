import type { Language } from './types.js';
export declare function detectLanguages(fileName: string, extraExtensions?: Readonly<Record<string, Language>>): Language[];
export declare const KNOWN_LANGUAGES: readonly Language[];
