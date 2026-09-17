export function localize(text, locale) {
    return locale === 'en' ? text.en : text.pt;
}
export const SEVERITY_ORDER = { info: 1, warning: 2, error: 3 };
