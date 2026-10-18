# Exportação de especificação

`export_specification` escreve uma especificação navegável, em Markdown, de um
alvo analisado a partir de um bundle de Evidence, para que o comportamento e a
estrutura do alvo possam ser reaproveitados em outro projeto sem reconstruir a
aplicação e sem ler todas as páginas. CLI e MCP usam o mesmo fluxo de trabalho:

- Ferramenta MCP: `export_specification`
- Comando da CLI: `rea export-specification`

A árvore tem dois tipos de conteúdo. **Páginas de fatos** são renderizações
determinísticas de registros de Evidence: o mesmo bundle sempre produz os mesmos
bytes. **Findings** são afirmações do analista fornecidas por quem chama; o
renderizador as organiza por área, rotula cada uma com o tipo declarado e
rejeita um finding que cite Evidence inexistente no bundle ou que afirme mais
confiança do que as citações sustentam. O REA não inventa nada na árvore.

## Requisição

```sh
rea export-specification '{
  "evidence_bundle": { "path": "/analysis/evidence/bundle.json" },
  "output_directory": "/analysis/specification",
  "title": "Especificação da aplicação de exemplo",
  "findings": [
    {
      "id": "license-check",
      "title": "Existe uma string de chave de licença",
      "statement": "O binário contém o literal `LICENSE_KEY` perto de 0x5000.",
      "kind": "observed",
      "area": "search_strings",
      "evidence_ids": ["ev_<64 hex>"]
    },
    {
      "id": "startup-order",
      "title": "A ordem de inicialização não foi observada",
      "statement": "Não se sabe se a verificação de licença precede a criação da janela.",
      "kind": "unknown",
      "unknown_ids": ["unk_<64 hex>"]
    }
  ]
}' --json
```

A CLI aceita JSON inline ou o caminho de um arquivo JSON e resolve valores
relativos de `output_directory` e `evidence_bundle.path` em relação ao diretório
de trabalho. O MCP exige caminhos absolutos.

| Campo                    | Significado                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `evidence_bundle`        | Um bundle canônico inline, ou `{ "path": ... }` apontando para um arquivo escrito por `export_evidence_bundle` ou `rea evidence-export`.                 |
| `output_directory`       | Diretório absoluto que ainda não deve existir; o diretório pai deve existir. Um diretório ou link simbólico existente é rejeitado sem tocar no conteúdo. |
| `title`                  | Título do `README.md` raiz. Padrão `Specification`.                                                                                                      |
| `findings`               | Findings do analista; veja abaixo. Padrão: nenhum.                                                                                                       |
| `include_evidence_pages` | Escrever cada registro completo como `evidence/<evidence_id>.json`. Padrão `true`.                                                                       |

### Findings

| Campo           | Regra                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | 1–64 letras minúsculas, dígitos e hifens, único na exportação e diferente de nomes estruturais como `index` ou `evidence`. Nomeia `findings/<id>.md`. |
| `title`         | Título curto.                                                                                                                                         |
| `statement`     | Corpo em Markdown. Descreva o comportamento ou a estrutura; cite registros por id quando ajudar.                                                      |
| `kind`          | `observed`, `derived`, `inferred` ou `unknown`. Os três primeiros usam o vocabulário de confiança do Evidence; `unknown` marca uma questão em aberto. |
| `area`          | Opcional: a `operation` do Evidence à qual o finding pertence. Deve existir no bundle; findings sem área aparecem em "General".                       |
| `target_sha256` | Opcional: digest de um artefato do bundle ao qual o finding se restringe.                                                                             |
| `evidence_ids`  | Registros que sustentam o finding. Todo id deve existir no bundle.                                                                                    |
| `unknown_ids`   | Residual unknowns que o finding acompanha. Todo id deve existir no bundle.                                                                            |

Um finding do tipo `observed` precisa citar ao menos um registro com confiança
`observed`; `derived` precisa de um registro `observed` ou `derived`; `inferred`
precisa de qualquer registro citado. `unknown` pode não citar registro algum.
Violações são reportadas como `invalid_request` com o caminho `findings[i]...`
ofensivo, antes de qualquer arquivo ser escrito. Corrija o ledger citando o
registro certo ou reduzindo o tipo; nunca enfraqueça o Evidence para caber em
uma afirmação.

## Layout

```
<output_directory>/
  README.md                 como ler a árvore; identidade; alvos, áreas, findings e unknowns em resumo
  manifest.json             o resultado inline sem o próprio descritor
  targets/index.md          uma linha por digest de artefato → targets/<sha256>.md
  targets/unattributed.md   registros sem artefato (só quando existem)
  areas/index.md            operações agrupadas por tipo de predicado
  areas/<operation>/index.md        resumo, findings, contagem de limitações, tabela paginada de registros
  areas/<operation>/items/<ev>.md   uma página de fatos por registro
  findings/index.md         findings por área → findings/<id>.md
  unknowns/index.md         revisão atual de cada residual unknown → unknowns/<unk>.md
  coverage.md               provedores, ambientes, cenários, capturas, confiança por autoridade, todas as limitações
  evidence/<ev>.json        o registro canônico completo (quando include_evidence_pages)
```

Uma **área** é uma operação do Evidence, como `analyze_function` ou
`analyze_javascript_application`. Um **alvo** é um SHA-256 de artefato.
Registros sem subject, como comparações, ficam listados em
`targets/unattributed.md` como um unknown explícito, nunca descartados.

As tabelas de índice têm no máximo 100 linhas; tabelas maiores continuam em
`index-2.md`, `index-3.md` e assim por diante, cada página nomeando seu
intervalo de linhas e ligando às vizinhas. É uma regra de legibilidade para
tabelas feitas para serem varridas com o olhar, não um orçamento de agente:
todo registro mantém sua linha e sua página.

Uma página de fatos mostra a identidade do registro, provedor, ambiente,
parâmetros, localizações, limitações, Evidence ligado, os findings e unknowns
que o citam e a **forma** do seu `normalized_result` (chaves, tipos e
tamanhos). Os valores do resultado nunca são incorporados no Markdown; leia a
página em `evidence/` ou o bundle de origem.

## Resultado

A ferramenta devolve um registro de Evidence cujo `normalized_result` lista
cada arquivo escrito com caminho relativo à árvore, SHA-256 e tamanho em bytes,
o descritor de `manifest.json`, contagens, a origem do bundle (inline, ou o
caminho do arquivo e seu SHA-256), as limitações fixas e
`specification_digest`: um SHA-256 das identidades ordenadas dos arquivos. Bundle,
findings e título idênticos produzem um digest idêntico em qualquer diretório.
As páginas Markdown não contêm caminhos do host, então a árvore pode ser movida
ou versionada como está.

Quando o bundle veio de um arquivo, o subject do registro é esse arquivo. Um
bundle inline não tem subject e diz isso em suas limitações. `evidence_links`
nomeia os registros citados pelos findings.

## Propriedade e limpeza

O REA cria o diretório de saída com exclusividade, escreve cada arquivo com
verificação de digest e releitura durável, escreve `manifest.json` por último e
então confirma. Cancelamento ou qualquer falha antes da confirmação desfaz
apenas os arquivos que o REA criou. Se o rollback falhar, o erro reporta o
diretório residual. Se a limpeza falhar depois de uma confirmação bem-sucedida,
o erro retém o resultado completo como observação parcial e informa que a saída
publicada continua disponível.

## Interpretação e limites

- A ausência de uma página não é ausência de comportamento, e Evidence estático
  nunca estabelece execução. Leia `coverage.md` e as limitações de cada registro
  antes de confiar em uma conclusão.
- Nesta versão as páginas de fatos são genéricas entre tipos de alvo: uma página
  por registro, intitulada pelo id do Evidence. Títulos conscientes da operação,
  como nomes de procedimentos ou ids de módulo, são um passo futuro planejado.
- As páginas em `evidence/` praticamente duplicam o bundle em disco. Passe
  `include_evidence_pages: false` para manter apenas o Markdown.
- O perfil compacto de esquema de entrada do MCP anuncia esta ferramenta de
  forma reduzida porque o esquema do bundle inline é estruturalmente grande; o
  servidor continua aplicando o contrato completo.

## Fluxo de trabalho

O prompt MCP `write_specification` e a skill empacotada descrevem o fluxo em
etapas: faça um levantamento do alvo, investigue uma área por vez, registre
residual unknowns conforme avança, mantenha um ledger de findings ligado a ids
de Evidence com um tipo por entrada, exporte o bundle da sessão com
`export_evidence_bundle` e então chame `export_specification`. Leia primeiro o
`README.md` gerado e siga um caminho até o fim para confirmar que o índice
responde à pergunta com que você começou.
