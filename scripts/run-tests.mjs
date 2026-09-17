// Executa os testes compilados com o runner nativo do Node.
// Os arquivos são passados explicitamente para funcionar igual no Node 20, 22 e 24.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join('.test-build', 'test');

function collect(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collect(path);
    return entry.name.endsWith('.test.js') ? [path] : [];
  });
}

const files = collect(root).sort();
if (files.length === 0) {
  console.error(`Nenhum teste encontrado em ${root}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
