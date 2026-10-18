# Manuais em português (Brasil)

Esta pasta reúne traduções em português dos manuais do REA. O texto em inglês é
a referência canônica: quando uma tradução e o original divergirem, vale o
original, e correções de tradução são bem-vindas conforme o
[guia de contribuição](https://github.com/morluto/rea/blob/main/CONTRIBUTING.md#translation-corrections).

| Manual                                                 | Original em inglês                                    | Conteúdo                                                                                                       |
| ------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [Instalação e configuração](installation.md)           | [installation.md](../installation.md)                 | Configuração dos agentes, instalação a partir do código-fonte, verificação de prontidão, Hopper, Ghidra e MCP. |
| [CLI e Evidence](cli.md)                               | [cli.md](../cli.md)                                   | Comandos da CLI, seleção de provedor, snapshots, Evidence, saída e códigos de saída.                           |
| [Exportação de especificação](specification-export.md) | [specification-export.md](../specification-export.md) | Gerar uma especificação em Markdown indexada a partir de um bundle de Evidence, com findings do analista.      |

Os demais guias (provedores, análise de JavaScript, Android, firmware, captura
de processos e contratos MCP) permanecem apenas em inglês; o
[índice da documentação](../index.md) lista todos eles. O
[README em português](https://github.com/morluto/rea/blob/main/docs/readme/README_pt-BR.md) apresenta o projeto.

Convenções usadas nas traduções: nomes de comandos, opções, variáveis de
ambiente, chaves JSON e códigos de erro não são traduzidos. "Evidence" é mantido
como termo do produto para o registro tipado de observações; "finding" é traduzido
como "finding" quando se refere ao campo de entrada da ferramenta e como
"conclusão" no texto corrido.
