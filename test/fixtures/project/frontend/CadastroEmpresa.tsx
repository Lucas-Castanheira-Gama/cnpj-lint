import { z } from 'zod';
import IMask from 'imask';

export interface Empresa {
  razaoSocial: string;
  cnpj: number;
  cnpjMatriz?: bigint;
}

export const empresaSchema = z.object({
  razaoSocial: z.string().min(3),
  cnpj: z.coerce.number().int(),
});

const CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

export function CadastroEmpresa() {
  return (
    <form>
      <input
        id="cnpj"
        name="cnpj"
        type="text"
        inputMode="numeric"
        onChange={(event) => setCnpj(event.target.value)}
      />
      <input name="quantidade" type="number" />
    </form>
  );
}

IMask(document.getElementById('cnpj')!, { mask: '00.000.000/0000-00' });

export function somenteDigitosCnpj(valor: string) {
  const cnpj = valor;
  return onlyDigits(cnpj);
}
