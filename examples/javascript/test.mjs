// Uso: node examples/javascript/test.mjs [examples/test-vectors.txt]
import { readFileSync } from 'node:fs';
import { validarCnpj } from './cnpj.mjs';

const arquivo = process.argv[2] ?? new URL('../test-vectors.txt', import.meta.url);
let total = 0;
let falhas = 0;
for (const linha of readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
  if (linha.trim() === '' || linha.startsWith('#')) continue;
  const separador = linha.lastIndexOf(';');
  const valor = linha.slice(0, separador);
  const esperado = linha.slice(separador + 1) === 'true';
  total++;
  if (validarCnpj(valor) !== esperado) {
    falhas++;
    console.error(`FALHOU: "${valor}" esperado ${esperado}`);
  }
}
console.log(`JavaScript: ${total - falhas}/${total} vetores OK`);
process.exitCode = falhas === 0 ? 0 : 1;
