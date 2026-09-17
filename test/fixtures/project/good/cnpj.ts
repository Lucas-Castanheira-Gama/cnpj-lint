// Implementação já adaptada ao CNPJ alfanumérico: nada aqui deve ser apontado.
import { z } from 'zod';

const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_REGEX = /^[0-9A-Z]{12}[0-9]{2}$/;

export interface Empresa {
  cnpj: string;
  totalFiliais: number;
}

export const empresaSchema = z.object({
  cnpj: z.string().regex(CNPJ_REGEX),
});

export function normalizar(cnpj: string): string {
  return cnpj.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

function digito(base: string, pesos: number[]): number {
  let soma = 0;
  for (let i = 0; i < pesos.length; i++) {
    soma += (base.charCodeAt(i) - 48) * pesos[i];
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validar(entrada: string): boolean {
  const cnpj = normalizar(entrada);
  if (!CNPJ_REGEX.test(cnpj)) return false;
  const dv1 = digito(cnpj, PESOS_DV1);
  const dv2 = digito(cnpj.slice(0, 12) + dv1, PESOS_DV2);
  return cnpj.endsWith(`${dv1}${dv2}`) && Number(cnpj.charAt(12)) === dv1;
}

export const mascara = 'AA.AAA.AAA/AAAA-00';
export const quantidadeCnpjs: number = 0;
