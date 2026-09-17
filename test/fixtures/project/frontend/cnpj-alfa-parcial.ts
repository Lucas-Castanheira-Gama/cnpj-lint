// Adaptação incompleta: aceita letras, mas exclui I, O, U, Q e F
export const CNPJ_ALFA = /^[0-9A-EG-HJ-NPR-TV-Z]{12}\d{2}$/;

export function cnpjValido(cnpj: string): boolean {
  return CNPJ_ALFA.test(cnpj.toUpperCase());
}
