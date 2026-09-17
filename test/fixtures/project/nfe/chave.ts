const CHAVE_ACESSO = /^\d{44}$/;

export function chaveValida(chaveAcesso: string): boolean {
  if (!CHAVE_ACESSO.test(chaveAcesso)) return false;
  let soma = 0;
  let peso = 2;
  for (let i = 42; i >= 0; i--) {
    soma += parseInt(chaveAcesso[i], 10) * peso;
    peso++;
    if (peso > 9) peso = 2;
  }
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return dv === Number(chaveAcesso[43]);
}

export interface NotaFiscal {
  chaveAcesso: bigint;
  numero: number;
}
