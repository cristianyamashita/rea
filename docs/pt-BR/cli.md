# CLI e Evidence

Use a CLI para uma inspeção direta ou em um script. Ela usa os mesmos fluxos de
trabalho de aplicação e os mesmos contratos de Evidence do servidor MCP do REA.
Cada invocação da CLI é um processo separado; salve os resultados quando quiser
usá-los em um comando posterior.

## Executar um comando

Depois de [instalar o REA](installation.md), use `rea`. Também é possível
executar um comando sem instalação global:

```bash
npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json
```

Em um [checkout do código-fonte](installation.md#instalar-a-partir-de-um-checkout-local),
use `node /caminho/absoluto/para/rea/scripts/rea.mjs` no lugar de `rea` ou de
`npx -y rea-agents@latest` em todos os exemplos deste guia.

Use como alvo um diretório de aplicação extraído ou um ASAR. A análise estática
de JavaScript devolve diretamente o grafo da aplicação e o Evidence. O comando
genérico `rea analyze PATH` seleciona esse fluxo para diretórios e arquivos
`.asar` quando nem `--provider` nem `--snapshot` são informados. Veja
[reconstrução de artefatos JavaScript](../javascript-artifact-reconstruction.md)
para resultados, verificações de integridade e cobertura.

O Evidence completo de uma aplicação real pode ter centenas de megabytes. Quando
um agente ou uma pessoa for ler o resultado, salve-o em arquivo e projete um
resumo, uma página de módulos ou um único módulo a partir do Evidence salvo:

```bash
rea analyze-javascript-application /absolute/path/to/app --json > app-evidence.json
jq -c '{source: {kind: "inline", evidence: .}, view: {kind: "summary"}}' app-evidence.json > app-view.json
rea inspect-analysis-view app-view.json
```

Por exemplo, um arquivo de Evidence de 334 MB da aplicação Obsidian gera uma
visão de resumo de cerca de 10 KB. Troque a visão por
`{"kind": "page", "collection": "modules", "offset": 0, "limit": 32}` para uma
página de módulos. Veja
[fluxos de trabalho de aplicações JavaScript](../javascript-application-workflows.md)
para visões, rastreamento de funcionalidades e comparações que recebem o mesmo
Evidence salvo.

## Assemblies gerenciados (.NET)

Para um assembly PE/CLI .NET, inspecione sua identidade e forma de implantação
antes de inspecionar membros. Estes comandos leem metadados e Common
Intermediate Language (CIL) sem carregar ou executar o assembly e não exigem
nenhum motor de análise nativa:

```bash
rea inspect-managed-artifact /absolute/path/Assembly.dll --json
rea inspect-managed-members /absolute/path/Assembly.dll --json
rea inspect-managed-members /absolute/path/Assembly.dll --type Example.Parser --json
```

Substitua `Example.Parser` por um `full_name` exato da inspeção de membros, ou
por um nome de tipo declarante que você já conheça. Omita `--type` para
inspecionar todos os membros, ou repita-o para selecionar vários tipos. A
seleção limita a decodificação aos tipos selecionados; as referências a membros
continuam sendo um inventário de todo o assembly, então a saída ainda pode ser
grande.

Escolha o fluxo a partir do conteúdo do artefato, não da extensão `.exe` ou
`.dll`. O parser gerenciado exige metadados PE/CLI; ele não desempacota hosts
.NET de arquivo único nem decodifica metadados IL2CPP. Corpos de métodos
NativeAOT exigem análise nativa. Veja o
[guia de código gerenciado](../managed-code-analysis.md) para formas de
implantação suportadas, semântica de seleção e limites de cobertura.

## Snapshots SQLite

Para um snapshot local de banco de dados, use
`rea inspect-sqlite-database PATH --json`. Adicione `--table NAME --row-limit 20`
para ler uma amostra limitada de uma tabela comum. Este comando não exige um
provedor de análise nativa. Veja [snapshots de bancos SQLite](../sqlite-databases.md)
para identidade de banco/WAL, tratamento do arquivo de origem e semântica dos
valores das linhas.

## Análise nativa

Inspecione metadados de build Go embutidos sem instalar Go nem configurar um
desmontador:

```bash
rea inspect-go-binary /absolute/path/to/program --json
```

O fluxo compartilhado CLI/MCP reporta versão do compilador, módulos,
substituições, configurações de build, bytes originais e SHA-256. Veja
[binários Go](../go-binaries.md) para contêineres suportados e metadados
ausentes ou malformados.

Inspecione uma lista de dependências Rust cargo-auditable embutida sem instalar
Rust nem configurar um desmontador:

```bash
rea inspect-rust-binary /absolute/path/to/program --json
```

O mesmo fluxo reporta nomes de pacotes, versões, origens, o pacote raiz, arestas
de dependência e o intervalo da seção no arquivo. Uma seção `.dep-v0` ausente é
metadado nulo, não prova de que o binário não tem dependências. Veja
[binários Rust](../rust-binaries.md).

Configure [Hopper ou Ghidra](installation.md#hopper), o
[adaptador IDA](../ida-provider.md) ou o [Kuna](../kuna-provider.md) antes de
analisar um alvo nativo. Substitua seu alvo, texto de busca e nome ou endereço
de função nestes exemplos:

```bash
rea analyze /absolute/path/to/program --provider ghidra --json
rea search /absolute/path/to/program "search" --provider ghidra --json
rea function /absolute/path/to/program main --provider ghidra --json
rea decompile /absolute/path/to/program 0x1000 --provider ghidra --json
rea xrefs /absolute/path/to/program 0x1000 --provider ghidra --json
rea trace /absolute/path/to/program "search" --provider ghidra --json
```

`analyze` e `inspect` compartilham o fluxo de visão geral nativa. `function`
devolve um dossiê da função; `decompile` devolve pseudocódigo. Para apenas as
instruções em assembly, use `rea instructions`. Um bundle `.app` do macOS pode
ser informado diretamente.

Execute `rea --help` ou o `--help` de um comando para argumentos e opções de
saída. O [catálogo gerado](../mcp-contracts.md#generated-catalog) lista todos os
comandos da CLI e ferramentas MCP. O suporte a alvos específico de cada provedor
está descrito no [guia nativo](../native-investigation.md), no
[guia de DOS](../ghidra-dos.md), no [guia de binário bruto](../raw-binary.md) e
no [guia do Ghidra no Windows](../windows-ghidra-p0.md).

## Escolher um provedor

Liste os provedores disponíveis e as operações que suportam:

```bash
rea providers --json
rea capabilities --json
```

Esses comandos descrevem os provedores de sessão binária e as capacidades
auxiliares. Para a superfície MCP completa, use a lista de ferramentas do
servidor conectado e a disponibilidade anunciada pela sessão; os guias
individuais descrevem os pré-requisitos.

Com seleção automática, o REA usa o único provedor disponível que suporta o
alvo. Quando vários provedores o suportam, selecione um explicitamente:

```bash
rea analyze /absolute/path/to/program --provider hopper
```

Defina `REA_ANALYSIS_PROVIDER` para uma preferência permanente. Um `--provider`
explícito a sobrepõe. No MCP, passe `provider_id` para `open_binary`:

```json
{
  "path": "/absolute/path/to/program",
  "provider_id": "hopper"
}
```

O provedor selecionado permanece vinculado à sessão até uma troca ou um
fechamento explícito. Falhas de provedor são devolvidas com o motivo original.
Para um erro de seleção `ambiguous`, escolha entre `details.candidate_ids`;
para `provider_unavailable`, siga `message`, `remediation.action` e os motivos
originais em `details.rejections`. Para Hopper, Ghidra, IDA e JADX, execute
`rea doctor --provider ID --json` para diagnosticar o motor selecionado. Outros
adaptadores, como `pwntools-elf`, reportam seus requisitos de configuração
diretamente e não são aceitos por `doctor --provider`. Veja
[prontidão para a tarefa](installation.md#verificar-o-que-a-sua-tarefa-precisa)
e [seleção de provedor](../mcp-contracts.md#identity-and-discovery).

A sessão reporta trabalho ainda em andamento por meio de `analysis_activity`.
Um timeout do cliente pode encerrar a espera enquanto o provedor continua
analisando. `cleanup_incomplete` identifica recursos cujo desligamento ou
remoção não pôde ser verificado. Veja [contratos MCP](../mcp-contracts.md) para
o ciclo de vida da sessão e
[prazos da primeira consulta do Ghidra](../mcp-contracts.md#ghidra-first-query-deadlines-and-recovery)
para importação, timeouts do cliente e recuperação.

Se uma análise avulsa falha e o fechamento da sua sessão também falha, os
detalhes do erro original permanecem inline e `details.cleanup_error` descreve a
falha posterior de fechamento. Cada diagnóstico retém seus próprios recursos
reportados; a falha posterior não estabelece se um recurso anterior foi
liberado. Saída capturada e observações parciais permanecem nos detalhes
originais.

## Salvar e reutilizar snapshots de análise

Um snapshot retém resultados de análise bem-sucedidos para consultas
posteriores. O REA reutiliza um resultado exato quando os bytes do alvo, a
operação, os parâmetros, o provedor e as configurações coincidem. Mutações e
chamadas dependentes de cursor são excluídas do cache. Arquivos de snapshot são
locais e usam permissões apenas para o proprietário.

Despachar uma escrita de metadados invalida o cache de snapshot da sessão ativa,
mesmo que a resposta falhe: o provedor pode já ter aplicado a escrita. Feche e
reabra o alvo antes de importar ou salvar outro snapshot.

Snapshots retêm integralmente os históricos de questões elegíveis no escopo do
alvo, incluindo Evidence de mutação registrado enquanto outro alvo estava ativo.
Observações e questões relacionadas ainda precisam pertencer ao alvo salvo. Se
essas dependências não puderem ser retidas, todo o histórico é excluído em vez
de reverter a questão a uma revisão ou disposição anterior.

```bash
rea analyze /absolute/path/to/program --provider ghidra --snapshot /absolute/path/to/analysis/program.json
# Repita a mesma consulta para reutilizar o resultado salvo.
rea analyze /absolute/path/to/program --provider ghidra --snapshot /absolute/path/to/analysis/program.json
```

Um acerto exato de cache na CLI normalmente é lido antes de iniciar um processo
de provedor. No Windows, o Ghidra primeiro admite a fonte selecionada por meio
do seu proprietário nativo de snapshot, então a repetição pode iniciar esse
provedor. No MCP, `open_binary` aceita `snapshot_path` para importar um snapshot
atomicamente para o alvo correspondente; um provedor MCP ainda pode iniciar
antes de devolver um resultado em cache. `close_binary` aceita `snapshot_path` e
o opcional `overwrite: true` para salvar antes de liberar os recursos do
provedor. Uma falha ao salvar deixa a sessão aberta para que quem chamou possa
resolver a falha de saída.

O recibo de salvamento do MCP reporta `primitive_entries`, `workflow_entries` e
`evidence_records` separadamente. Zero vínculos primitivos ainda podem
acompanhar resultados de fluxo de trabalho e Evidence retidos. São observações
em cache, não um banco de dados de provedor salvo: só consultas exatas elegíveis
podem reutilizar um resultado, e consultas novas ou ao vivo ainda podem exigir
a inicialização do provedor. A CLI usa o mesmo formato de snapshot e preserva
esses registros ao carregá-lo e atualizá-lo.

## Importar, exportar e comparar Evidence

Registros de Evidence retêm identidade do artefato, localizações na origem,
observações, inferências e conclusões não resolvidas. Valide um bundle
existente, exporte sua forma canônica ou compare dois bundles fornecidos:

```bash
rea evidence-import /absolute/path/to/evidence/bundle.json
rea evidence-export /absolute/path/to/evidence/bundle.json /absolute/path/to/evidence/canonical.json
rea compare /absolute/path/to/evidence/left.json /absolute/path/to/evidence/right.json
```

As exportações preservam um destino existente a menos que `--overwrite` seja
explícito.

Para escrever uma especificação navegável em Markdown do alvo analisado a partir
de um bundle, com findings opcionais do analista ligados a ids de Evidence, use
`rea export-specification`; veja
[exportação de especificação](specification-export.md):

```bash
rea export-specification '{"evidence_bundle":{"path":"/absolute/path/to/evidence/bundle.json"},"output_directory":"/absolute/path/to/specification"}' --json
```

Para rastreamentos de aplicação e comparações de versões, veja
[fluxos de trabalho de aplicações JavaScript](../javascript-application-workflows.md).
As [referências de Evidence retido](../mcp-contracts.md#retained-application-evidence-inputs)
do MCP pertencem a uma conexão. Chamadas separadas da CLI consomem registros
salvos completos.

## Importar código-fonte histórico

Importe uma árvore de código-fonte mais antiga para comparar com o artefato
atual:

```bash
rea import-reference-source /absolute/path/to/source
rea import-reference-source /absolute/path/to/source --detail summary --outline-depth 2 --json
```

O padrão (`--detail full`) devolve o `HistoricalSourceGraph` completo. Escolha
`--detail summary` para um `HistoricalSourceSummary` desse mesmo inventário
confirmado: seu `HistoricalSourceManifest` contém os digests do grafo completo e
da raiz, com proveniência, fatos do VCS, linguagens, caminhos de manifesto,
contagens de entradas e relacionamentos, contagens de falhas de parse, estados
de arquivos/diretórios, exclusões e limitações. O resumo é uma visão de
apresentação, não um grafo aceito pela comparação fonte-para-bundle; guarde a
saída completa para esse fluxo.

`--outline-depth` exige `--detail summary` e aceita um inteiro seguro não
negativo. Profundidade 1 mostra os filhos da raiz, profundidade 2 (o padrão)
mostra também os filhos deles, e profundidade 0 omite todas as entradas do
esquema. Os caminhos mantêm a ordem canônica de pontos de código Unicode.
`outline.omitted_entry_count` conta apenas entradas inventariadas ocultadas pela
profundidade escolhida; não conta filhos não examinados de diretórios excluídos
ou ilegíveis, nem altera `inventory_state`. Exclusões e limitações da origem
permanecem separadas dessa omissão de apresentação.

`file_sizes.known_bytes` é a soma exata dos tamanhos de arquivo inventariados
conhecidos, como texto decimal, para que somas grandes não percam precisão
inteira. Tamanhos desconhecidos são contados em `file_sizes.unknown_file_count`;
caminhos excluídos ou não examinados não entram nesse total. Uma soma zero de
bytes conhecidos, portanto, não estabelece uma árvore de código vazia. A saída
completa retém hashes individuais de arquivos, relacionamentos e diagnósticos de
falha de parse. O modo resumo realiza a mesma importação e limpeza, depois
projeta o resultado confirmado sem reler os arquivos de origem. Ele reduz a
saída selecionada, não a quantidade de código examinado. Uma árvore rasa ou
muitas exclusões ainda podem produzir um resumo grande; a profundidade 0 remove
o esquema mas preserva os demais fatos. Nenhuma melhoria fixa de tamanho de saída
ou tempo de execução é prometida.

A importação registra hashes e metadados dos arquivos fornecidos, separadamente
das observações da aplicação atual. Para um diretório dentro de um checkout Git,
ela registra o HEAD do repositório envolvente mais próximo; se a árvore de
trabalho corresponde a esse commit permanece desconhecido. Ela respeita o
`.gitignore` da árvore de origem e aplica exclusões padrão para caminhos comuns
gerados e de dependências, como `node_modules/`, `dist/` e `*.log`. Exclusões
baseadas em padrão registram o padrão correspondido e se ele veio de política de
projeto, padrão, de quem chamou ou de caminho sensível. Links para caminhos
excluídos retêm os metadados do seu alvo interno; a exclusão explica por que o
alvo não tem entrada de inventário, e o inventário permanece parcial. Exclusões
registram `entry_kind` quando o importador o observou; exclusões salvas mais
antigas sem esse campo têm tipo desconhecido. Um ancestral excluído só prova um
descendente interno quando seu tipo é `directory`. Defina
`REA_REFERENCE_SECRET_PATTERNS_JSON` como um array JSON de padrões de ignore
quando quiser marcar caminhos selecionados como sensíveis; esses padrões são
reportados separadamente como exclusões de segredo configurado.

Reimporte grafos salvos cujas exclusões baseadas em padrão não tenham `pattern`
antes de usá-los em comparações fonte-para-bundle.

O parse de importações JavaScript e TypeScript exige UTF-8 válido. Bytes de
código malformados retêm seus hashes e tamanhos originais com um diagnóstico de
decodificação; o REA não infere alvos de módulo a partir de caracteres de
substituição.

A importação de código-fonte histórico exige aberturas de arquivo seguras sem
seguir links no Linux ou macOS. O Windows nativo devolve `unsupported_host`; use
o REA para Linux dentro do WSL ou outro host suportado. Veja
[comparação fonte-para-bundle](../javascript-application-workflows.md#historical-source-to-bundle-comparison)
para identidades de mapeamento, inferências e unknowns.

## Capturar comportamento em execução

Escolha o guia pelo alvo e pela interação pretendida:

- [Observação de navegador](../browser-observation.md): inspecione uma página selecionada via CDP.
- [Cenários de navegador](../browser-scenario-contract.md): execute interações declaradas e capture seus resultados.
- [Observação de Electron](../electron-observation.md): inspecione um renderer Electron ou capture um cenário de aplicação.
- [Fuses do Electron](../electron-fuses.md): leia os bytes de fuse empacotados antes de esperar que `--inspect` alcance um processo principal do Electron.
- [Inspector Node/Electron](../javascript-runtime-observation.md): registre localizações de scripts e contextos de execução.
- [Captura de processo](../process-capture.md): execute um executável e compare observações de terminal, saída e sistema de arquivos.

Requisições em tempo de execução nomeiam o alvo e as ações. Alvos iniciados
rodam com as permissões do seu usuário; consulte o guia escolhido para
requisitos do host e efeitos.

## Resultado e status de encerramento

`rea mcp doctor --json` verifica a inicialização do MCP de produção e reporta os
logs do processo filho em `diagnostics`. Ele drena o stderr retendo no máximo os
primeiros 64 KiB de bytes brutos como texto, omitindo um ponto de código UTF-8
final se ele cruzar esse limite de bytes. `stderr_bytes` conta todos os bytes
observados, incluindo a saída omitida; `stderr_truncated` indica que a saída
excedeu o limite de retenção. Os mesmos diagnósticos aparecem dentro do relatório
quando `--full-output` é selecionado. A truncagem do log, por si só, não altera a
saúde do diagnóstico nem o código de saída.

O formato padrão no terminal é TOON. Use `--json` ao salvar resultados para um
consumidor JSON. Opções de saída com valor (`--format`, `--filter-output`,
`--token-limit`, `--token-offset`) aceitam `--flag valor` ou `--flag=valor`; um
valor ausente falha com `MISSING_OUTPUT_VALUE` antes de o comando rodar. `--json`
é indentado em um terminal e compacto quando canalizado ou redirecionado, o que
mantém resultados grandes menores para agentes e scripts; canalize por `jq .`
para arquivos indentados. A seleção e a formatação da saída não alteram o status
da operação.

Para `cutter-command`, `--json-output` solicita JSON específico do comando ao
Cutter quando disponível. Isso é separado de `--format json`, que seleciona a
representação do resultado da CLI; a opção global `--json` seleciona essa mesma
representação da CLI.

O Cutter ainda aceita os valores de compatibilidade obsoletos `--json=true` e
`--json=false`. Quando ambas as formas estão presentes, `--json-output` tem
precedência em qualquer ordem de argumentos. Um `--json` isolado mantém seu
significado global de selecionar a formatação de saída JSON da CLI.

| Status    | Significado                                                                                                                                                                                                                                                                                                                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`       | A operação foi concluída. Seu resultado pode incluir evidência parcial, avisos ou questões não resolvidas.                                                                                                                                                                                                                                                                                          |
| `1`       | A operação não pôde ser concluída. A saída estruturada identifica entrada inválida, permissões, cancelamento, timeouts ou outra falha quando disponível.                                                                                                                                                                                                                                            |
| `128 + N` | Status derivado de sinal. Um sinal não tratado pode ter encerrado o processo, com o shell ou o runtime preservando o status convencional; um comando pode, em vez disso, ter tratado o sinal, esperado a operação e a limpeza se assentarem e atribuído o mesmo status (`130` para SIGINT, `143` para SIGTERM). No caso tratado, ele também pode ter impresso um resultado `cancelled` estruturado. |

Um resultado `cancelled` não determina por si só o código de saída; isso depende
do tratamento de sinal do comando. Comandos roteados pelo handler compartilhado
`withCommandCancellation` da CLI definem o status `130` para SIGINT ou `143`
para SIGTERM depois que a operação se assenta. Os registros atuais no código
usam esse handler para captura e comparação de processos (`capture-process`,
`compare-process-captures`), análise de aplicação JavaScript (`analyze` quando
seleciona a via JavaScript, e `analyze-javascript-application`), comandos
selecionados de navegador, web e Electron (incluindo `analyze-web-bundle`,
`observe-web-execution`, `capture-browser-scenario` e
`capture-electron-scenario`) e as famílias de comandos de plataforma e provedor
para Android/ADB, Apktool/JEB/Flutter, firmware, análise de PCAP e sinais,
WASM/EVM, Go/Rust e diagnósticos de binário, instrumentação Frida, o comando
Cutter, objdump, Rizin e GDB. Nesses caminhos, um resultado `cancelled`
estruturado devolvido pode ser impresso antes que o wrapper atribua o status
derivado de sinal. Isso descreve o roteamento atual do código; não é uma
afirmação de que todo comando ou runtime de provedor foi exercitado
independentemente.

Quando o leitor de uma saída canalizada fecha cedo, como faz `rea ... | head`, a
CLI para de escrever, não imprime erro e sai com `141` (`128 + 13`, o status de
um escritor encerrado por SIGPIPE). A operação em si pode ter sido concluída;
apenas sua saída foi recusada.

`inspect-artifact` também devolve um resultado cancelado estruturado, mas seu
caminho de cancelamento de análise direta não define um código de saída
derivado de sinal, então ele sai com `1`. O setup tem seu próprio contrato: o
cancelamento sai com `0`. Trate o resultado estruturado e o status do processo
como sinais separados ao escrever scripts para cancelamento.

`setup --dry-run` devolve `planned` e sai com `0`; um setup cancelado também sai
com `0`. O setup devolve `1` para `needs_confirmation` ou `needs_human`.
`doctor` devolve `1` quando verificações obrigatórias no seu escopo de prontidão
selecionado falham; provedores opcionais indisponíveis permanecem informativos
para tarefas não relacionadas.

Ative `pipefail` em um shell que o suporte para que um formatador a jusante
preserve o status de falha do REA:

```bash
set -o pipefail
rea inspect-artifact ./app.asar --json | jq . > inspection.json
```
