// CNPJ numérico e alfanumérico: implementação de referência sem dependências (Node, Deno, Bun e navegadores).

const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const FORMATO = /^[0-9A-Z]{12}[0-9]{2}$/;

/** Remove a máscara (".", "/", "-" e espaços) e converte letras ASCII para maiúsculas. */
export function normalizarCnpj(valor) {
  return valor.replace(/[./\-\s]/g, '').replace(/[a-z]/g, (letra) => letra.toUpperCase());
}

function digito(texto, pesos) {
  let soma = 0;
  for (let i = 0; i < pesos.length; i++) {
    // Valor de cada caractere = código ASCII − 48 ("0" → 0, "A" → 17)
    soma += (texto.charCodeAt(i) - 48) * pesos[i];
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Dígitos verificadores de uma base com 12 caracteres [0-9A-Z]. */
export function calcularDigitos(base) {
  const dv1 = digito(base, PESOS_DV1);
  const dv2 = digito(base + dv1, PESOS_DV2);
  return `${dv1}${dv2}`;
}

export function validarCnpj(valor) {
  if (typeof valor !== 'string') return false;
  const cnpj = normalizarCnpj(valor);
  if (!FORMATO.test(cnpj) || /^(.)\1+$/.test(cnpj)) return false;
  return calcularDigitos(cnpj.slice(0, 12)) === cnpj.slice(12);
}
