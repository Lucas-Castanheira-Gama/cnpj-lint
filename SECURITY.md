# Política de segurança

## Versões suportadas

| Versão | Suporte |
| --- | --- |
| 1.x | ✅ |

## Como relatar uma vulnerabilidade

**Não abra issues públicas para problemas de segurança.** Use o [relato privado de vulnerabilidades do GitHub](https://github.com/Lucas-Castanheira-Gama/cnpj-lint/security/advisories/new).

Inclua, se possível:

- descrição do problema e impacto;
- passos para reproduzir (versão, sistema operacional, comando usado);
- sugestão de correção, se houver.

Você deve receber uma resposta em até 7 dias. Pedimos que a divulgação pública aconteça só depois da correção, em comum acordo.

## Escopo

O cnpj-lint roda localmente e não envia código nem dados para serviços externos. Estão no escopo, por exemplo:

- leitura de arquivos fora dos caminhos solicitados;
- execução de código a partir de arquivos analisados ou da configuração (a configuração é sempre JSON, nunca executada);
- expressões regulares com custo exponencial (ReDoS) acionáveis por arquivos analisados;
- injeção de comandos de workflow ou de Markdown nos relatórios da GitHub Action.
