// Padrões parecidos que NÃO são CNPJ: não devem ser apontados.
export const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
export const CEP_REGEX = /^\d{5}-\d{3}$/;
export const TELEFONE_MASK = '(99) 99999-9999';
export const TIMESTAMP_REGEX = /^\d{14}$/;
export const DATA_MASK = '99/99/9999';

export function soma(quantidade: string, preco: string): number {
  return parseInt(quantidade, 10) * Number(preco);
}

export function limparTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

export interface Pedido {
  id: number;
  total: number;
}
