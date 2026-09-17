// cnpj-lint-disable-next-line numeric-type -- legado, migração no ticket FIN-123
export const a: { cnpj: number } = { cnpj: 1 };
export const b = parseInt(cnpj, 10); // cnpj-lint-disable-line
/* cnpj-lint-disable numeric-conversion */
export const c = Number(cnpj);
/* cnpj-lint-enable numeric-conversion */
export const d = Number(cnpj);
