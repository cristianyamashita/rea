# Instalação e configuração

Execute o REA, conecte os agentes selecionados e verifique as ferramentas
necessárias para a sua tarefa. O setup mostra uma prévia das alterações de
configuração e pede aprovação antes de aplicá-las.

Esta é uma tradução de [installation.md](../installation.md); o original em
inglês é a referência canônica.

| Tarefa                             | Seção                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Conectar um agente                 | [Iniciar o setup](#iniciar-o-setup), depois [revisar as alterações](#revisar-o-plano-do-setup)             |
| Diagnosticar uma tarefa            | [Verificações de prontidão com escopo](#verificar-o-que-a-sua-tarefa-precisa)                              |
| Configurar um motor de análise     | [Hopper](#hopper), [Ghidra](#ghidra), o [guia do IDA](../ida-provider.md) ou o [Kuna](../kuna-provider.md) |
| Atualizar ou remover o REA         | [Manutenção](#diagnosticar-atualizar-e-remover)                                                            |
| Instalar sem o registro do npm     | [Checkout local do código-fonte](#instalar-a-partir-de-um-checkout-local)                                  |
| Resolver um problema de um cliente | [Configuração de clientes](../client-configuration.md)                                                     |

## Iniciar o setup

```bash
npx rea-agents setup
```

Escolha os agentes a configurar, revise os caminhos e alterações propostos e
aprove o plano. A aprovação de download de pacote do npm e a aprovação do setup
do REA são separadas. O setup pergunta antes de alterar a configuração de um
agente ou instalar o Hopper. Reinicie os agentes nomeados na mensagem de
conclusão. Encerre completamente o Claude Desktop antes de aprovar, porque um
aplicativo em execução pode sobrescrever o registro; no Windows, veja
[onde o Claude Desktop lê sua configuração](../client-configuration.md#claude-desktop).

Para a versão publicada mais recente, use `npx rea-agents@latest setup`.
[Opções de package runner e instalação global](#package-runners-e-instalar-globalmente)
cobrem versões explícitas, Bun, requisitos de runtime e o wrapper em curl. Para
usar um fork ou um commit específico sem o registro do npm, veja
[instalar a partir de um checkout local](#instalar-a-partir-de-um-checkout-local).

## Revisar o plano do setup

`rea setup` primeiro oferece os agentes suportados em uma seleção múltipla.
Registros existentes do REA vêm selecionados por padrão. Clientes recém
detectados permanecem disponíveis mas não selecionados: a detecção dá contexto
ao setup, não permissão para adicionar um novo registro. Clientes sem
configuração detectada ainda podem ser selecionados. Opções `--client`
explícitas pulam essa pergunta.

O setup adiciona acesso MCP para os clientes selecionados. Ele instala o fluxo
de trabalho empacotado do REA junto com essas integrações por padrão; use
`--skill=false` para omiti-lo. Se nenhum agente for selecionado, o setup oferece
o fluxo de trabalho separadamente para uso na CLI, com Não como padrão. O Hopper
é uma escolha opcional separada: o setup mostra a instalação ou conexão proposta
e exige sua própria aprovação explícita. Ele também pode salvar caminhos
verificados de uma instalação existente do Ghidra.

Após a seleção, revise os caminhos e alterações exatos do plano e aprove antes
que o REA escreva arquivos ou instale o Hopper. Você pode cancelar em qualquer
pergunta.

Antes de aplicar alterações, o REA verifica sua configuração atual. O plano
lista:

- uma instalação existente do Hopper, uma instalação existente verificada do Ghidra, ou o pacote oficial do Hopper que ele propõe instalar;
- cada caminho de configuração de agente detectado;
- cada destino de skill do REA selecionado;
- software externo, origens de rede, evidência de integridade e comandos de
  gerenciador de pacotes.

Uma configuração existente malformada ou insegura bloqueia toda a transação
antes da instalação do Hopper ou de qualquer escrita de arquivo. Recusar ou
pressionar Ctrl-C não faz alterações. As escritas na configuração de agentes
preservam entradas e comentários não relacionados, criam backups, preparam as
alterações em um diretório privado e verificam o resultado. Antes da
publicação, elas recusam alterações detectadas na configuração selecionada. A
substituição usa um destino explícito sob o diretório pai canônico selecionado;
ela não segue um link simbólico de destino recém inserido. O setup de primeira
execução usa um hard link exclusivo e falha sem sobrescrever um destino recém
criado; sistemas de arquivos sem suporte a hard link não conseguem publicar uma
configuração de primeira execução. Setup e uninstall retêm um `.rea.backup`
existente em vez de substituir o primeiro snapshot. Se esse snapshot diferir da
configuração atual, setup e uninstall preservam uma cópia verificada
`.rea.backup.<sha256>.recovery` dos bytes atuais antes de editar; o setup também
a mostra na prévia. Os dois snapshots permanecem disponíveis. Quando uma edição
criou um backup, uma atualização ou restauração de uninstall com falha e uma
releitura ou rollback de setup com falha nomeiam o caminho do backup que guarda
os bytes de imediatamente antes daquela edição. Se o setup não conseguir
verificar uma configuração recém criada, ele retém o arquivo e reporta
recuperação manual em vez de apagar um caminho que pode ter mudado. Para uma
configuração existente, a recuperação de setup e uninstall recusa uma
substituição ou edição detectada e nomeia o backup de recuperação. Encerre os
clientes antes de editar sua configuração; essas verificações não impedem outro
escritor de modificar o mesmo arquivo no lugar, nem excluem mudanças de caminho
entre a verificação final e a publicação. O setup também retém overrides de
ambiente válidos na entrada de servidor existente do REA, como
`REA_MCP_INPUT_SCHEMA_PROFILE`, `REA_MCP_OUTPUT_SCHEMA_PROFILE` e
`REA_MCP_MAX_RESPONSE_BYTES`. Configurações de provedor detectadas substituem
apenas as chaves de ambiente correspondentes. Setup e doctor reportam um mapa de
ambiente do REA malformado ou uma configuração de runtime inválida antes que o
setup escreva arquivos. Repare a configuração nomeada na configuração do
cliente; o setup não descarta silenciosamente o restante do mapa. Isso inclui
arrays JSON de loader/exclusão malformados e uma especificação de compilador do
Ghidra sem o identificador de linguagem obrigatório. Overrides válidos mantêm
suas strings originais, incluindo argumentos vazios do Hopper. Expressões de
ambiente `!!js` do DeepSeek Harness permanecem não avaliadas e preservadas; o
alinhamento do registro não verifica os valores em runtime que essas expressões
produzirão. Para arquivos em camadas do OpenCode, os valores de cada arquivo são
verificados antes da mesclagem, enquanto as dependências entre configurações são
verificadas contra o ambiente mesclado efetivo. O setup preserva os overrides de
cada camada em vez de copiar configurações herdadas para o arquivo que atualiza.

Após o setup, o REA reporta quais agentes, ferramentas de análise e arquivos de
fluxo de trabalho passaram nas verificações finais. Reinicie qualquer agente
nomeado na mensagem de conclusão e então comece sua investigação. Etapas com
falha e diagnósticos permanecem no histórico do terminal.

Selecione clientes exatos em scripts com opções `--client` repetíveis. Cada
cliente explícito pula a seleção interativa. Use `--all-detected` apenas quando
pretender configurar todos os clientes suportados detectados. `--skill=false`
omite o fluxo de trabalho, e `--dry-run` devolve um plano somente leitura com
status `planned` e código de saída 0:

```bash
rea setup --client codex --client cursor --skill=false --dry-run
```

A interface de perguntas e o progresso são escritos em stderr, para que stdout
permaneça disponível para resultados estruturados e pipelines. `NO_COLOR=1`
desativa as cores. Use `--accessible` para perguntas sim/não sequenciais,
renderizadas verticalmente. O setup interativo implícito exige que stdin, stdout
e stderr sejam todos terminais; quando qualquer fluxo é redirecionado, o setup
permanece não interativo. Recusar ou cancelar devolve o status `cancelled` com
código de saída 0.

Para automação, `rea setup --json` reporta o plano e uma projeção compacta de
prontidão `.doctor` sem aplicá-lo. Use `rea doctor --json` para diagnósticos
completos de saúde e detalhes do catálogo canônico de ferramentas. Combine
`--yes` com um escopo explícito como `--client codex`, ou use `--all-detected`
quando o escopo amplo for intencional. Sem uma opção de escopo, `--yes` fica
limitado aos registros existentes de propriedade do REA; ele não seleciona todos
os clientes detectados. Uma aplicação real não aprovada reporta
`needs_confirmation` e sai com 1. Instalar um Hopper ausente de forma não
interativa exige adicionalmente `--install-hopper`:

```bash
rea setup --yes --all-detected --install-hopper --json
```

### Destinos da skill

A skill empacotada é instalada no diretório pessoal de skills de cada cliente
selecionado. Veja [configuração de clientes](../client-configuration.md) para
raízes, perfis e overrides de ambiente específicos de cada cliente. Uma seleção
mista planeja cada destino distinto. Selecionar a skill sem um cliente usa
`~/.agents/skills`. O setup deixa intactas cópias existentes da skill em outros
locais. O setup recusa links simbólicos no diretório de skill selecionado ou no
seu diretório gerenciado `references`, seguindo as mesmas regras de propriedade
de uninstall e update. Use um diretório de skill comum, ou selecione
`--skill=false` para configurar o registro do cliente sem instalar a skill
empacotada. Os diretórios finais selecionados são verificados antes da aprovação
e novamente antes que o setup altere qualquer cliente ou instalação do Hopper.
Destinos de clientes não selecionados não bloqueiam as outras escolhas do setup.
O doctor reporta caminhos de skill com link ou que não são diretórios como
`unmanaged`, nomeia os caminhos afetados e oferece essas alternativas; uma
identidade de skill ilegível permanece `unknown`. O uninstall retém e reporta
arquivos que não pode remover com segurança, incluindo seu manifesto de
propriedade.

`rea setup --skill-client claude_code --yes --json` atualiza e verifica o
destino de skill selecionado independentemente da seleção de registro MCP. O
`doctor.scope.skill_clients` final registra quais destinos de skill foram
verificados; `doctor.scope.clients` continua descrevendo os registros
obrigatórios. Uma skill compartilhada não selecionada não afeta uma atualização
apenas de cliente.

`doctor --skill --json` verifica as cópias selecionadas contra as instruções e
referências empacotadas. Consumidores devem usar `identity.skill.state`,
`installed_version` e `installed_tool_count` para a prontidão da skill. O campo
obsoleto `installed_catalog_digest` foi removido; a identidade atual do catálogo
continua disponível em `identity.catalog`.

O setup fixa registros MCP via package runner na versão exata do REA instalada,
instala a skill correspondente e as referências sob demanda no mesmo plano e
adiciona `startup_timeout_sec = 30` para Codex e Grok Build. O Codex também
recebe um `tool_timeout_sec` derivado do tempo conhecido de inicialização do
provedor mais folga para a operação.

## Limitar o REA a um projeto ou perfil de agente

O setup registra o REA para o cliente inteiro. Para o Claude Code ele escreve
`mcpServers.rea` em `~/.claude.json` e instala a skill empacotada em
`~/.claude/skills`, então todo projeto que o Claude Code abrir pode chamar o REA.
Para oferecer as ferramentas do REA apenas onde forem desejadas, use uma das
rotas abaixo.

Ambas as rotas controlam quais sessões descobrem o servidor MCP e a skill do
REA. Elas deixam comandos de shell, acesso ao sistema de arquivos e acesso à
rede disponíveis. Um agente sob a mesma conta do SO pode executar `rea` a partir
do `PATH` ou de `npx` e ler outros perfis e saídas do REA. Para separação em
sala limpa, use um ambiente de implementação com restrições de sistema de
arquivos e rede que impeçam ler ou buscar o REA, o alvo e a saída de análise,
inclusive por meio de instalações compartilhadas e registros de pacotes. Uma
conta ou contêiner separado precisa impor essas restrições.

Para o Claude Code, verifique o estado existente do perfil padrão antes de
escolher qualquer rota. O setup é aditivo: um registro do REA em nível de usuário
anterior e uma skill pessoal permanecem ativos em outros projetos. Faça backup
da configuração padrão e da skill do REA primeiro; depois, com
`CLAUDE_CONFIG_DIR` não definido, remova o registro de usuário do REA com
`claude mcp remove --scope user rea` e remova o diretório conhecido instalado
pelo REA `~/.claude/skills/reverse-engineer-anything`. Preserve registros e
skills não relacionados. `rea uninstall` se aplica também a outros clientes,
então é mais amplo do que essa migração só do Claude.

**Um perfil separado do Claude Code.** O Claude Code mantém configurações,
skills e histórico de sessões em `CLAUDE_CONFIG_DIR`. O setup segue a mesma
variável: ele escreve o registro em `$CLAUDE_CONFIG_DIR/.claude.json` e a skill
em `$CLAUDE_CONFIG_DIR/skills`. Para o setup do REA, um `CLAUDE_CONFIG_DIR`
vazio é tratado como não definido: o registro vai para `~/.claude.json` e a skill
para `~/.claude/skills`.

```bash
CLAUDE_CONFIG_DIR=~/.claude-rea npx rea-agents setup --client claude_code
CLAUDE_CONFIG_DIR=~/.claude-rea claude
```

Um novo perfil pode precisar de autenticação. Logins de console sem chave de API
são armazenados fora de `CLAUDE_CONFIG_DIR`; veja
[autenticação do Claude Code](https://code.claude.com/docs/en/authentication#log-in-with-multiple-accounts).
Sessões iniciadas sem a variável usam o registro, a skill e o histórico do
perfil padrão.

Atribuições inline se aplicam apenas àquele comando. Mantenha o mesmo prefixo em
toda verificação de perfil, repetição de setup, atualização ou remoção; comandos
sem prefixo usam o ambiente atual e podem, de outro modo, inspecionar ou recriar
o estado do perfil padrão:

```bash
CLAUDE_CONFIG_DIR=~/.claude-rea claude mcp list
CLAUDE_CONFIG_DIR=~/.claude-rea npx rea-agents doctor --client claude_code --skill --json
CLAUDE_CONFIG_DIR=~/.claude-rea npx -y rea-agents@latest setup --client claude_code --dry-run
```

Depois de revisar um plano de atualização, execute novamente o mesmo comando de
setup com prefixo sem `--dry-run` e aprove suas alterações exatas. A remoção do
perfil também precisa do prefixo em `claude mcp remove --scope user rea` e em
qualquer comando `rea uninstall`; tenha em mente o escopo mais amplo do
uninstall em relação aos clientes. Reinicie o perfil selecionado após alterar
seu registro fixado.

`claude mcp remove` remove apenas o registro. Para remover o REA desse perfil
sem executar o fluxo mais amplo de uninstall, primeiro faça backup do diretório
de skill gerenciado pelo REA no perfil e então remova também
`$CLAUDE_CONFIG_DIR/skills/reverse-engineer-anything`. Mantenha as outras skills
do perfil intactas.

Os comandos acima usam a sintaxe de atribuição de shells POSIX. No PowerShell
nativo do Windows, selecione o perfil para toda a sessão de
setup/inicialização/verificação e restaure a seleção anterior depois:

```powershell
$previousClaudeConfigDir = $env:CLAUDE_CONFIG_DIR
try {
  $env:CLAUDE_CONFIG_DIR = Join-Path $HOME ".claude-rea"
  npx rea-agents setup --client claude_code
  claude mcp list
  npx rea-agents doctor --client claude_code --skill --json
  npx -y rea-agents@latest setup --client claude_code --dry-run
  # Depois de revisar o plano, repita o setup sem --dry-run e aprove-o.
  claude
  # A remoção do perfil, quando pretendida, também pertence a este escopo selecionado:
  # claude mcp remove --scope user rea
} finally {
  if ($null -eq $previousClaudeConfigDir) {
    Remove-Item Env:CLAUDE_CONFIG_DIR -ErrorAction SilentlyContinue
  } else {
    $env:CLAUDE_CONFIG_DIR = $previousClaudeConfigDir
  }
}
```

Use o PowerShell para esses exemplos no Windows em vez de colar atribuições
POSIX no cmd.exe. Mantenha atualizações de perfil, verificações de prontidão e
remoção dentro do mesmo ambiente selecionado; o bloco `finally` restaura o
perfil anterior ou remove a variável quando ela estava ausente.

**Um único projeto.** Instale sem configurar o Claude Code: use o `--no-setup`
do instalador em curl, ou execute o setup apenas para outros clientes. Depois
registre o REA a partir do diretório do projeto no escopo local do Claude Code.

Essa rota usa o perfil padrão do Claude. Mantenha `CLAUDE_CONFIG_DIR` não
definido durante todo o ciclo de vida local: registro, backup, listagem,
substituição de versão e remoção. Em shells POSIX execute
`unset CLAUDE_CONFIG_DIR`; no PowerShell execute
`Remove-Item Env:CLAUDE_CONFIG_DIR -ErrorAction SilentlyContinue` antes desses
comandos. Anote uma seleção existente primeiro se pretender restaurá-la ao
terminar. O caminho de configuração abaixo é o `~/.claude.json` do perfil
padrão; um perfil ativo diferente usa a própria raiz de configuração.

Registre com a variável não definida:

```bash
claude mcp add --scope local rea -- npx -y rea-agents@6.5.0 mcp
```

No Windows nativo, use o mesmo diretório do projeto e envolva o shim do package
runner para que o cliente stdio consiga iniciá-lo:

```powershell
claude mcp add --scope local rea -- cmd.exe /d /c npx -y rea-agents@6.5.0 mcp
```

O escopo local guarda a entrada sob o caminho desse diretório em
`~/.claude.json`, então outros projetos não a carregam. Essa rota não instala a
skill empacotada. Evite `--scope project`, que escreve `.mcp.json` dentro do
repositório, onde pode ser versionado ou copiado. `rea doctor` e `rea uninstall`
leem apenas a entrada em nível de usuário, então não reportam nem removem um
registro de escopo local; remova-o com `claude mcp remove --scope local rea` a
partir do mesmo diretório. `rea update` também não o atualiza, então ele fica na
versão que nomeia. Para movê-lo a uma versão mais nova, primeiro faça backup da
entrada do projeto em `~/.claude.json` e anote seu ambiente e outros metadados.
Em particular, preserve overrides selecionados por quem chamou, como
`REA_MCP_INPUT_SCHEMA_PROFILE` e `REA_MCP_MAX_RESPONSE_BYTES`. Execute
`claude mcp remove --scope local rea` a partir do mesmo diretório e então recrie
a entrada com o comando apropriado à plataforma acima e a nova versão.
Reaplique cada valor de ambiente anotado com as opções `mcp add --env NAME=value`
do Claude Code e restaure qualquer outro metadado retido da entrada antes de
reiniciar a sessão do projeto. Remoção e readição não preservam esses valores
automaticamente. Executar o setup para o Claude Code, em vez disso, adicionaria
uma entrada em nível de usuário para todos os projetos.

Verifique o perfil separado com o `claude mcp list` com prefixo acima e compare
com o perfil padrão com `CLAUDE_CONFIG_DIR` não definido. Para o escopo local,
execute `claude mcp list` a partir do projeto selecionado e novamente a partir
de outro projeto.

## Verificar o que a sua tarefa precisa

Execute `rea doctor` quando precisar de diagnóstico. Ele lê os pré-requisitos do
host e a configuração dos agentes sem alterá-los. Sem opções, ele audita todos
os registros detectados, a skill instalada e os motores de análise opcionais;
seu valor geral `healthy` pode ser falso enquanto o fluxo de trabalho que você
escolheu funciona.

As `providerInspections` do doctor são verificações de motor e registro em
nível de host, não uma linha de prontidão para cada superfície de adaptador MCP
anunciada. `tools/list` continua sendo o catálogo estável completo. Chame
`binary_session` com `{}` antes de escolher uma operação; isso funciona antes
de um alvo ser aberto, e `result.tool_availability` reporta disponibilidade por
operação, motivos e requisitos de cliente para o estado atual da sessão. Isso
não garante que uma entrada específica fornecida por quem chama será válida.
Veja [descoberta MCP](../mcp-contracts.md#identity-and-discovery).

Selecione a parte que quer verificar:

| Tarefa                                     | Verificação de prontidão                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Análise estática de JavaScript/Electron    | Execute `rea analyze-javascript-application PATH --json` diretamente.              |
| Um motor de análise                        | `rea doctor --provider ghidra --json` (ou `hopper`, `ida`)                         |
| Um registro de agente                      | `rea doctor --client codex --json` (veja os [ids de cliente](#agentes-suportados)) |
| Instruções de fluxo de trabalho instaladas | `rea doctor --skill --json`                                                        |

Um relatório com escopo tem `scope.mode: "explicit"`. Suas `scope_checks`
determinam `healthy` e o status de saída. Outras verificações aparecem em
`informational_checks`; `environment_healthy` resume a auditoria completa.
`--target` adiciona uma verificação de alvo, mas o relatório continua abrangendo
toda a auditoria a menos que uma opção de escopo também seja fornecida.

Siga a remediação da verificação que falhou. Se um alvo nativo tem vários
provedores disponíveis, escolha um com `--provider` na CLI ou `provider_id` em
`open_binary`. Uma falha `capability_unavailable` traz
`details.selection_reason`: `ambiguous` pede que você escolha entre
`details.candidate_ids`, enquanto `provider_unavailable` pede que você repare o
motor selecionado. Veja [seleção de provedor](cli.md#escolher-um-provedor).

### Requisito de processos no Linux

No Linux, o supervisor de processos compartilhado do REA exige um `ps`
compatível com procps no `PATH` do REA para verificações de propriedade antes de
iniciar um filho. Ghidra, JADX, ferramentas de firmware e a análise estática de
JavaScript/Electron usam essas verificações. Instale o pacote `procps` ou
`procps-ng` da sua distribuição, ou coloque outro `ps` compatível com procps no
`PATH` antes de executar esses fluxos. Um comando ausente ou incompatível causa
uma recusa antes que o filho supervisionado inicie.

O código de erro público varia conforme quem chama: `capability_unavailable`,
`provider_unavailable` ou `execution_failure`. Alguns adaptadores de provedor
reportam apenas um erro genérico de inicialização. Verifique esse pré-requisito
antes de seguir conselhos de recuperação específicos de provedor.

## Diagnosticar, atualizar e remover

`rea doctor --json` é estritamente somente leitura. `rea update` atualiza apenas
a instalação global npm ou Bun que possui a CLI em execução. Checkouts do
código-fonte e cópias via package runner precisam ser atualizados pelo mecanismo
que os possui; uma nova invocação via package runner pode usar
`npx rea-agents@latest` ou `bunx rea-agents@latest`. `rea uninstall` remove
apenas registros de agentes e arquivos de skill de propriedade do REA;
`--purge-data` remove adicionalmente os caminhos de cache e estado do REA.

```bash
rea update
rea uninstall
rea uninstall --purge-data
```

O uninstall preserva Hopper, Node.js, arquivos de Evidence, capturas, skills não
relacionadas e outros servidores MCP. A purga remove apenas o cache e o estado
do REA em `~/.rea`. Uma configuração de cliente malformada, ilegível ou em um
caminho inseguro interrompe a operação antes que qualquer coisa seja removida, e
um cliente que falha durante a atualização interrompe as remoções restantes. Um
caminho de purga que é um link simbólico é retido e reportado em vez de seguido.
O uninstall verifica os locais de skill compartilhados gerenciados pelo REA e o
pessoal do Claude Code. Veja o [guia da CLI](cli.md#resultado-e-status-de-encerramento)
para os códigos de saída.

### Atualizar a instalação proprietária

`rea update` instala a versão exata resolvida no prefixo do npm ou no diretório
global do Bun que possui o pacote em execução, depois verifica a versão do novo
executável antes de reportar sucesso. Ele não reabre o onboarding. Para
instalações npm, a consulta e a instalação da versão usam o registro configurado
do npm. Atualizações globais do Bun exigem Bun 1.2.17 ou posterior, que
introduziu `bun info`. O atualizador verifica `bun --version` primeiro e para com
uma instrução para atualizar o Bun manualmente se a versão for mais antiga ou
não puder ser interpretada; ele não atualiza o Bun por conta própria. Para
instalações globais do Bun suportadas, `bun info` e
`bun add --global --ignore-scripts` usam o registro configurado do Bun e rodam
dentro do diretório global do Bun proprietário (`BUN_INSTALL_GLOBAL_DIR`, senão
`$BUN_INSTALL/install/global`, senão `$XDG_CACHE_HOME/.bun/install/global`,
senão `~/.bun/install/global`), nunca no projeto atual de quem chama. Um
diretório global do Bun sem seu `package.json` não é tratado como instalação
proprietária, porque o Bun instalaria no projeto ancestral mais próximo. Seu
plano de manutenção seleciona apenas registros existentes do REA e uma skill do
REA já instalada. Execute o comando de setup com escopo devolvido para revisar e
aprovar essas alterações, depois reinicie os agentes afetados. O plano é
devolvido nos modos terminal, não TTY e JSON sem aplicar alterações de
configuração.

## Pacote publicado e main

O main do repositório documenta seu código atual e o catálogo gerado. `@latest`
seleciona a versão do npm, e registros MCP persistentes são fixados na versão
que executou o setup. Instalar instruções mais novas não atualiza um servidor em
execução nem seu registro.

A versão do npm verificada em **2026-10-11** era a **6.4.0**, publicada a partir
de [`a56f7bb6`](https://github.com/morluto/rea/commit/a56f7bb668ab23fec8d33f7af353ac7ed2fe1895).
O pacote real do registro aceitou planos de setup em dry-run para os 17 ids de
cliente daquela versão, incluindo Qwen Code, Pi e Hermes. Sete ids de cliente
estão incluídos a partir da 6.5.0 e estavam ausentes do pacote npm 6.4.0
verificado: `droid`, `dsh`, `kimi`, `qoder`, `trae`, `workbuddy` e `zcode`. A
verificação do registro 6.4.0 não estabelece a publicação da 6.5.0 nem a
integração ao vivo com a API do DeepSeek. O plano do OpenCode selecionou
`OPENCODE_CONFIG_DIR` mesmo quando esse diretório ainda não existia. Essas
verificações usaram um home isolado no macOS com Node 24; elas verificam o
planejamento e a admissão de argumentos, sem escrever configuração de cliente
nem estabelecer integração ao vivo com todos os clientes. Isso resolve as
lacunas de setup do npm 6.3.0 acompanhadas em
[#1650](https://github.com/morluto/rea/issues/1650).

O catálogo do main descreve o código atual. Um build a partir do código-fonte ou
uma versão posterior contendo alterações após esse ponto de verificação é
necessário para funcionalidades mais novas. A inicialização do pacote, por si só,
não verifica o fluxo real de plataforma de um provedor.

Para verificar a versão publicada, execute `npm view rea-agents dist-tags.latest`.
Use a lista real de ferramentas e os esquemas de entrada anunciados pelo servidor
conectado para selecionar funcionalidades. A mesma string de versão de pacote em
um checkout de desenvolvimento não estabelece que seus bytes correspondem ao
tarball do npm. Atualize um registro por meio de um plano de setup revisado e
com escopo, depois reinicie/reconecte o agente.

## Instalar a partir de um checkout local

Use esta rota quando o REA não for instalado pelo registro do npm: um fork, um
commit fixado, a revisão de alterações ainda não publicadas, ou um host sem
acesso ao registro para o próprio REA. Um checkout precisa ser compilado antes
que qualquer comando da CLI ou do MCP funcione; `npm ci` sozinho só instala as
dependências.

Os pré-requisitos são Git, um Node.js suportado (a versão em `.nvmrc`, ou
qualquer versão no intervalo listado em
[package runners](#package-runners-e-instalar-globalmente)) com o npm que o
acompanha e, no Linux, o `ps` compatível com procps descrito em
[pré-requisito de processos próprios no Linux](#requisito-de-processos-no-linux).
Os motores de análise continuam sendo fornecidos por você, exatamente como em
uma instalação pelo registro.

```bash
git clone https://github.com/morluto/rea.git
cd rea
nvm use            # opcional: seleciona a toolchain fixada em .nvmrc
npm ci
npm run build
node scripts/rea.mjs --help
```

Substitua a URL do clone pela do seu fork. `npm ci` baixa as dependências
travadas no lockfile; `npm run build` compila o runtime, registra os digests do
catálogo e empacota a skill de autoria no diretório ignorado `skills/`. Se você
alterar `package.json`, o lockfile ou a versão da skill, execute
`npm run metadata:generate` antes de compilar. O `rea --version` de um checkout
pode coincidir com uma versão publicada sem que seus bytes correspondam ao
tarball do npm; use a lista real de ferramentas do servidor conectado para
selecionar funcionalidades.

### Executar comandos a partir do checkout

`scripts/rea.mjs` é o mesmo despachante que o pacote publicado instala como
`rea`. Execute-o a partir de qualquer diretório de trabalho:

```bash
node /caminho/absoluto/para/rea/scripts/rea.mjs analyze-javascript-application /absolute/path/to/app --json
node /caminho/absoluto/para/rea/scripts/rea.mjs doctor --json
```

Onde esta documentação escreve `rea` ou `npx -y rea-agents@latest`, substitua
por `node /caminho/absoluto/para/rea/scripts/rea.mjs`. Para um comando `rea`
visível no shell que acompanhe o checkout conforme você o recompila, vincule o
checkout ao seu prefixo global do npm:

```bash
npm link
rea --help
```

`npm link` cria um link simbólico global para o checkout em vez de uma cópia,
então um `npm run build` posterior é refletido sem reinstalar.
`npm install --global .`, por outro lado, instala um snapshot do build atual no
prefixo global, como o pacote publicado, e precisa ser repetido após cada
recompilação.

### Registrar o checkout em um agente

O setup executado diretamente a partir do checkout, e não por `npx` ou `bunx`,
registra o ponto de entrada direto
`node /caminho/absoluto/para/rea/scripts/rea.mjs mcp` e instala a skill
empacotada por `npm run build`:

```bash
node scripts/rea.mjs setup --client codex --dry-run
node scripts/rea.mjs setup --client codex
```

Revise os caminhos e alterações planejados antes de aprovar, depois reinicie o
agente. O setup executado por um `rea` global vinculado registra o mesmo ponto
de entrada direto. O registro nomeia o caminho absoluto do checkout, então
mover, apagar ou substituir o checkout quebra o servidor REA do agente até que o
setup seja executado novamente a partir do novo local. Não registre um caminho
dentro do cache temporário de pacotes do npm.

Para um cliente que exige configuração manual, a entrada stdio equivalente é:

```json
{
  "mcpServers": {
    "rea": {
      "command": "node",
      "args": ["/caminho/absoluto/para/rea/scripts/rea.mjs", "mcp"]
    }
  }
}
```

No Windows, use o caminho completo de `node.exe` como comando e um caminho do
Windows para o despachante; nenhum wrapper `cmd.exe` é necessário porque `node`
é um executável real.

### Atualizar uma instalação a partir do código-fonte

`rea update` só atualiza uma instalação global npm ou Bun que possui o pacote em
execução. Para um checkout ele para com uma instrução para atualizar pelo
mecanismo que possui a instalação. Atualize com Git e recompile:

```bash
git pull
npm ci
npm run build
```

Um `rea` vinculado e todo ponto de entrada direto registrado passam a executar o
novo build. Depois de `npm install --global .`, repita esse comando. Execute
novamente o comando de setup com escopo quando a atualização alterar a skill
empacotada, para que a cópia instalada da skill corresponda, e reinicie os
agentes afetados. `rea doctor --skill --json` reporta se a skill instalada
corresponde ao pacote do checkout.

### Limites de um checkout do código-fonte

- Um checkout do código-fonte não tem o addon nativo do Windows. No Windows, os
  controles que dependem dele ficam indisponíveis até que você compile o
  artefato conforme descrito no
  [guia de contribuição](https://github.com/morluto/rea/blob/main/CONTRIBUTING.md#windows-source-checkouts);
  a compilação do artefato em si roda no Linux.
- As instruções de recuperação da própria skill empacotada nomeiam
  `npx -y rea-agents@latest`. Esses comandos baixam o pacote publicado, não o
  seu checkout; substitua pelo caminho do despachante acima ao reparar uma
  instalação a partir do código-fonte.
- O instalador em curl, `rea update` e a entrada no MCP Registry descrevem todos
  o pacote npm publicado e não se aplicam a um checkout.

## Instalação apenas da skill

```bash
npx skills add morluto/rea --skill reverse-engineer-anything
```

Isso instala as instruções do agente e as referências empacotadas, não o
registro MCP do REA nem os motores de análise. Siga o
[guia de conexão condicional](https://github.com/morluto/rea/blob/main/.agents/skills/reverse-engineer-anything/SKILL.md#connect-only-when-needed)
da skill. Ferramentas que funcionam podem ser usadas imediatamente. Se faltarem
ferramentas, inspecione o registro do cliente atual com
`doctor --client codex --json` (substitua pelo id do cliente), depois planeje
reparos com `setup --client codex --dry-run --json`. Mostre e aprove as
alterações exatas antes de aplicar esse escopo. Um registro alinhado com
ferramentas ausentes da sessão ativa precisa de reinício/reconexão; o `doctor`
verifica arquivos e pré-requisitos, não a conexão ao vivo do agente.

O setup guiado instala por padrão a skill correspondente ao pacote. A rota do
skills.sh pode selecionar instruções mais novas do repositório, então siga os
esquemas reais do servidor e a fronteira de versão acima. A inspeção estática de
JavaScript pela CLI pode prosseguir enquanto o MCP estiver indisponível:

```bash
npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json
```

Ela devolve o registro de Evidence completo diretamente e não exige motor
nativo. Falhas de provedor no doctor não impedem ferramentas sem alvo não
relacionadas. Para verificar a prontidão de uma tarefa em vez de auditar todas
as integrações, veja
[verificar a prontidão para a sua tarefa](#verificar-o-que-a-sua-tarefa-precisa).

## Agentes suportados

O setup pode configurar estes clientes para o servidor MCP local do REA. O Grok
Bot usa um conector hospedado manual; veja
[sua configuração](../client-configuration.md#other-client-settings).

| Cliente            | Valor de `--client` |
| ------------------ | ------------------- |
| Claude Code        | `claude_code`       |
| Claude Desktop     | `claude_desktop`    |
| Codex              | `codex`             |
| Cursor             | `cursor`            |
| Gemini CLI         | `gemini_cli`        |
| Windsurf           | `windsurf`          |
| Devin              | `devin`             |
| OpenCode           | `opencode`          |
| Antigravity        | `antigravity`       |
| GitHub Copilot CLI | `copilot_cli`       |
| Command Code       | `commandcode`       |
| Qwen Code          | `qwen_code`         |
| Kimi Code          | `kimi`              |
| VS Code            | `vscode`            |
| Grok Build         | `grok_build`        |
| OMP                | `omp`               |
| Pi                 | `pi`                |
| Hermes             | `hermes`            |
| Qoder              | `qoder`             |
| Factory Droid      | `droid`             |
| Trae               | `trae`              |
| WorkBuddy          | `workbuddy`         |
| ZCode              | `zcode`             |
| DeepSeek Harness   | `dsh`               |

`droid`, `dsh`, `kimi`, `qoder`, `trae`, `workbuddy` e `zcode` exigem
`rea-agents@6.5.0` ou posterior. A verificação do registro 6.4.0 acima não os
cobre.

Veja [configuração de clientes e solução de problemas](../client-configuration.md)
para caminhos de configuração, perfis, políticas de confiança e contornos para
limites de esquema.

### DeepSeek Harness

Veja [o patch do Cordis e a configuração do launcher](../client-configuration.md#deepseek-harness).

### Outras configurações de cliente

Veja [configurações do OpenCode, Grok Build e Grok Bot](../client-configuration.md#other-client-settings).

## Hopper

O Hopper é um software comercial separado, com licença própria. Sua demo
gratuita tem limites definidos pelo fornecedor, e uma licença paga é opcional. O
REA reutiliza qualquer instalação detectada e preserva o Hopper durante o
uninstall.

O instalador automatizado do Hopper suporta macOS 12+, Ubuntu 24.04+, Fedora
41+, Nobara 44+, Arch Linux 64 bits, CachyOS ou Omarchy. O próprio REA roda em
qualquer distribuição Linux com uma família de pacotes apt, dnf ou pacman
reconhecida, onde um launcher existente do Hopper é selecionado por
`HOPPER_LAUNCHER_PATH`. Ghidra e IDA têm seus próprios requisitos de host
específicos de provedor; o Ghidra no Windows usa a
[fronteira experimental P0](../windows-ghidra-p0.md).

No macOS, o setup aprovado baixa o DMG oficial, verifica seu tamanho e digest
publicados, valida o bundle da aplicação e o instala atomicamente em
`~/Applications/Hopper Disassembler.app`. O REA então abre o Hopper para que o
operador escolha o modo demo ou ative uma licença existente. Homebrew e acesso
de administrador não são usados.

A ação do launcher do Hopper usada pelo REA cria um documento a partir de um
executável; sua interface de linha de comando suportada não se anexa a um
documento já aberto. Enquanto outra sessão ativa do REA possui o mesmo alvo e
perfil de loader, uma segunda sessão reporta o id da execução proprietária em
vez de abrir um documento duplicado. No macOS, fechar a sessão proprietária do
REA libera essa guarda; o Hopper mantém seu documento aberto. Uma sessão
posterior do REA pode, portanto, abrir outro documento para o mesmo alvo. O REA
atualmente não identifica, foca nem reutiliza esse documento existente da GUI, e
o launcher suportado não expõe ação de anexar ou reutilizar para ele.

O REA atualmente recusa alvos de banco de dados salvo do Hopper (`.hop`) no
macOS porque a rota nativa de abertura `open database` não executa o script da
ponte do REA. Para analisar esse programa com o REA, selecione seu executável
original como alvo e abra-o pelo Hopper; isso inicia a rota suportada da ponte.
Isso não recupera anotações ou alterações de análise exclusivas do banco. A
análise de banco salvo no Linux continua usando sua rota suportada de
inicialização da demo.

Diretórios de lease do Hopper precisam ser legíveis e pertencer ao usuário
atual. O REA valida e protege um diretório aberto antes de reservar um lease.
Se a abertura desse diretório falhar com erro de permissão, o diagnóstico
identifica o caminho e os passos de recuperação, deixando as permissões
inalteradas. Verifique a propriedade e o acesso ao diretório pai, depois
restaure permissões de leitura, escrita e busca apenas do proprietário (`0700`)
em um diretório seu antes de tentar novamente.

Em distribuições Linux suportadas, o setup aprovado verifica o pacote `.deb`,
`.rpm` ou Arch oficial do Hopper antes de invocar o gerenciador de pacotes
nativo. O feed oficial de versões seleciona a demo pública atual sem fixar
versão. O REA verifica a assinatura PGP destacada do pacote contra a impressão
digital primária estável do Hopper `7C2D73BAFAF5B9A710A69DA1A26DF815099B1BCD`,
depois confere que o pacote assinado e o launcher instalado concordam com
`main_exe_hash`. Subchaves de assinatura rotativas permanecem vinculadas a essa
identidade primária. A linha do feed em si não é assinada com PGP; o doctor
rotula sua versão de exibição como `reported_release_version`, separadamente da
identidade autenticada do launcher.

O plano de aprovação inclui o local de cache selecionado por quem chama. O setup
aprovado retém o arquivo assinado, a chave pública e os metadados da versão em
`${XDG_CACHE_HOME:-$HOME/.cache}/rea/hopper-releases/<launcher-sha256>`. Um
`XDG_CACHE_HOME` vazio usa `$HOME/.cache`. O setup aprovado pode reparar uma
entrada danificada de propriedade de quem chama após autenticar um pacote novo;
a entrada anterior é preservada ao lado como `<launcher-sha256>.backup-<id>`.
O doctor comum e as inicializações rejeitam evidência danificada e nunca a
reparam implicitamente. Publicações aprovadas da mesma entrada canônica de
cache compartilham um lease apoiado em processo. Setups concorrentes esperam sem
mover a evidência de outro escritor; uma substituição com falha restaura o
diretório anterior quando possível e reporta qualquer caminho de backup retido.
Leituras indisponíveis ou ferramentas nativas de inspeção não autorizam
substituir evidência existente. Doctor e inicializações autenticam essa
evidência para uso offline; um recibo de digest editável, por si só, não pode
autorizar um launcher. A verificação reutiliza no máximo oito provas imutáveis
de pacote por processo, indexadas pelo pacote completo, chave, assinatura,
formato do pacote e digest esperado do launcher. Leituras de arquivos em cache
ainda verificam identidade e conteúdo. Sem evidência retida, inspecionar uma
instalação existente exige o pacote oficial atual correspondente e acesso à
rede. Uma inspeção ao vivo bem-sucedida pode ser reutilizada dentro desse
processo após recalcular o hash do launcher; ela não escreve um cache
persistente nem afirma que uma versão observada anteriormente ainda é a mais
recente. Builds mais antigos sem cache exigem uma atualização aprovada enquanto
o feed expõe apenas sua versão atual.

O REA executa o build de demo suportado em um display Xvfb privado e seleciona o
modo demo oferecido pelo Hopper para cada sessão de análise; ele não exige o
display da área de trabalho do usuário. O acesso não assistido ao gerenciador de
pacotes exige `--yes --install-hopper`. Se o host expõe `/tmp/.X11-unix` como
uma montagem imutável, o REA primeiro verifica o conflito e então usa um
namespace de usuário e de montagem sem privilégios com um tmpfs privado de modo
1777 apenas sobre esse diretório. A montagem do host e o restante de `/tmp`
permanecem inalterados; esse fallback nunca invoca `sudo`.
`rea doctor --provider hopper --json` reporta a estratégia selecionada e os
fatos de montagem tanto do host quanto efetivos.

Quando a etapa do gerenciador de pacotes falha, o setup reporta o comando que
falhou e sua saída capturada, para que um conflito de pacote seja distinguível
de uma falha de autorização. No CachyOS, um pacote de compatibilidade sem versão
como `zlib-ng-compat` pode conflitar com a dependência `zlib` versionada do
Hopper. Resolva o conflito de pacote por conta própria ou instale o pacote
oficial do Hopper manualmente, depois execute `rea setup` novamente.

A demo Linux suportada encaminha inicializações adicionais para sua aplicação
existente, mesmo entre displays privados. O REA, portanto, reserva uma aplicação
Hopper Linux por usuário entre processos REA cooperantes. Uma sessão CLI ou MCP
concorrente recebe o id da sessão proprietária antes que o Hopper seja iniciado,
tanto para o mesmo alvo quanto para um alvo diferente. Troque de alvo por meio
dessa sessão MCP, ou feche-a antes de iniciar outra sessão. Fechar a
proprietária libera a reserva e para a aplicação demo e o display privado de
propriedade do REA; a demo Linux sem interface não retém documentos após o
desligamento do MCP. Seu helper observa um pipe privado de tempo de vida, então
uma queda ou SIGKILL da proprietária também para esses filhos, sem depender de
um PID reutilizável ou de uma varredura por nome de processo. Uma sessão
posterior recupera o lease obsoleto da proprietária morta após a limpeza dos
filhos; arquivos privados de runtime podem permanecer quando o próprio REA foi
morto. Isso não se anexa a aplicações Hopper abertas manualmente nem reivindica
sua propriedade. Uma aplicação deixada em execução por uma versão mais antiga do
REA ainda precisa ser fechada antes de iniciar uma nova sessão.

A recuperação de lease obsoleto é serializada. Se uma recuperação interrompida
deixar seu diretório de reserva, o diagnóstico identifica esse caminho exato.
Pare as sessões do REA antes de remover esse diretório de recuperação e tentar
novamente.

### Caminhos do launcher e solução de problemas

No macOS, o REA verifica launchers executáveis do Hopper nesta ordem: a
aplicação canônica do sistema, a aplicação canônica instalada por `rea setup` em
`~/Applications`, depois outros bundles `Hopper*.app` em `/Applications` e
`~/Applications`. O local do cask do Homebrew é um diagnóstico opcional do
`rea doctor`; para usar um launcher instalado pelo Homebrew na inicialização
CLI/MCP, defina `HOPPER_LAUNCHER_PATH` com o caminho reportado pelo doctor. O
REA não executa o Homebrew ao carregar a configuração de runtime. A descoberta
automática aceita arquivos regulares executáveis, incluindo links simbólicos de
arquivo, e ignora diretórios. No Linux, ele prefere `/opt/hopper/bin/Hopper`
executável, depois `~/.local/share/rea/hopper/bin/Hopper` executável, seguidos
de `/opt/hopper-v4/bin/hopper` e `/usr/bin/hopper`; se nenhum existir, o
primeiro continua sendo o fallback de diagnóstico. `HOPPER_LAUNCHER_PATH`
sobrepõe essas escolhas:

```bash
export HOPPER_LAUNCHER_PATH=/absolute/path/to/Hopper
rea doctor --provider hopper --json
```

A inicialização do Hopper permite 120.000 ms para lançamento, análise inicial e
prontidão autenticada da ponte. Para alvos grandes, defina
`REA_HOPPER_STARTUP_TIMEOUT_MS` como um inteiro decimal de 1 a 2.147.483.647
milissegundos no ambiente que inicia o REA. CLI e MCP usam a mesma configuração;
valores inválidos falham na validação da configuração. O timeout de requisição
do próprio cliente MCP também precisa permitir tempo suficiente. `open_binary`
valida e seleciona um alvo sem esperar pela prontidão do provedor nativo.
Durante a inicialização do Hopper, `binary_session.provider_operation_health`
reporta `busy` no estágio `launch`; `analysis_activity` descreve requisições à
ponte e pode permanecer ocioso até o socket estar pronto. O trabalho de limpeza
reporta `busy` no estágio `connection`.

Se o macOS negar Apple Events, permita a aplicação que inicia o REA em
**Ajustes do Sistema → Privacidade e Segurança → Automação** e tente novamente.
O REA libera a reserva do alvo quando o helper nativo reporta sua rejeição
completa de autorização e seus argumentos não podem alterar o AppleScript gerado
pelo helper. Argumentos contendo aspas, barras invertidas ou quebras de linha
permanecem inalterados mas não podem estabelecer que um handoff com falha não
abriu documento algum. Outros handoffs com falha retêm a propriedade até que o
fechamento do documento seja confirmado. Se uma ponte que sofreu timeout ficar
pronta depois, `close_binary` conecta-se a essa execução, autentica sua
identidade e solicita o desligamento do documento. Depois que seu listener está
pronto, a ponte permite 30 segundos para a primeira conexão e validação de
capacidades. Após uma conexão cair, ela permite o mesmo período de carência para
uma reconexão autenticada de limpeza e então libera a thread de execução Python
do Hopper. A análise inicial está fora desse período de carência do listener, e o
trabalho nativo autenticado não é limitado por ele. O vencimento não estabelece
o fechamento do documento, então o REA retém a propriedade não confirmada. Tente
fechar novamente enquanto a ponte permanecer disponível.

Se um launcher Linux existe mas não consegue iniciar, inspecione suas
bibliotecas compartilhadas:

```bash
ldd /absolute/path/to/Hopper | grep 'not found'
```

Instale os pacotes ausentes e execute novamente a verificação com escopo.
Sessões de demo no Linux precisam de Xvfb, Python 3, X11 e XTEST; o setup
aprovado instala essas dependências em distribuições suportadas. Adicione o
diretório de executáveis reportado pelo instalador em curl, normalmente
`~/.local/bin`, ao `PATH` do seu shell se necessário.

O REA inicia o Hopper quando necessário. No macOS, conclua seu prompt de demo ou
licença na mesma sessão de usuário antes da primeira operação CLI/MCP ou job não
assistido. Abra o Hopper manualmente se necessário; seu launcher também pode
trazer o diálogo para a frente. Se a inicialização reportar
`Cannot launch Hopper! Connection is invalid.` ou esperar pela prontidão da
ponte, verifique no Hopper um diálogo pendente de demo, licença ou loader.
Conclua o diálogo e tente novamente. Se o REA reportar `cleanup_incomplete`,
siga a orientação sobre recursos retidos abaixo antes de reabrir o alvo.

No macOS, o Hopper pode mostrar uma sobreposição `Executing Python Script...`
enquanto a ponte do REA atende a uma conexão MCP ativa. Clientes MCP de longa
duração podem manter essa conexão aberta entre turnos do agente, então a
sobreposição pode permanecer visível depois que as chamadas de análise
terminam; por si só, ela não estabelece uma inicialização travada. O REA não
fecha automaticamente por ociosidade um alvo ainda conectado. Quando a
investigação terminar, exporte primeiro um bundle de Evidence se precisar manter
o ledger da sessão, depois chame `close_binary`; defina `snapshot_path` para
salvar um snapshot de análise neutro em relação ao provedor como parte do
fechamento. Um fechamento bem-sucedido desliga a ponte do REA e limpa sua
sobreposição; o REA não controla o tempo de vida da aplicação Hopper no macOS.
O comportamento do botão Cancelar da GUI do Hopper para essa ponte não foi
verificado; `close_binary` é o caminho de limpeza suportado.

O Hopper serializa requisições de análise. Cancelar uma espera pode deixar
trabalho do provedor em execução, o que a sessão reporta. A descompilação
bem-sucedida fica em cache até que uma renomeação ou um comentário relevante a
altere.

Chamadas de análise e anotação permanecem vinculadas ao documento nativo do
Hopper do alvo ativo, mesmo quando o foco da GUI muda ou outros documentos têm
o mesmo nome de exibição. Use `open_binary` para trocar de alvo. Leituras de
bytes param em um limite de segmento e devolvem o prefixo legível com
`complete: false`. O mapeamento de offset de arquivo verifica a busca reversa e
os limites do executável original; a memória sintética de símbolos externos não
tem offset de arquivo original. Para Mach-O FAT, os offsets se referem ao
arquivo contêiner original. Os resultados retêm o offset relativo à imagem do
Hopper, a base observada da fatia e o caminho do executável de origem. A seleção
do loader lê o cabeçalho do contêiner Mach-O, incluindo arquivos FAT com uma
única arquitetura. Para contêineres FAT32 e FAT64, o REA valida a tabela de
arquiteturas e o cabeçalho Mach-O selecionado, prepara uma imagem thin privada
e a carrega com o loader Mach-O nativo do Hopper em vez da escolha implícita de
fatia FAT do Hopper. Para alvos arm64, o REA classifica as bases de subtipo 0
(arm64 simples) e 2 (arm64e), ignorando bits de capacidade na classificação mas
retendo o subtipo bruto para a identidade da fatia. As codificações de entrada
de função dessas fatias são decodificadas com `--aarch64`, à frente da variante
arm64e.x1 da Apple (subtipo base 12), que é selecionada apenas quando é a única
candidata da família arm64. O REA verifica o SHA-256 da origem inteira ao copiar
a fatia; a identidade da origem e os offsets reportados ainda se referem ao
contêiner original. Qualquer outro subtipo de arquitetura ambíguo exige uma
imagem thin extraída explicitamente; o REA não adivinha. Argumentos de loader
configurados continuam sendo overrides explícitos. FAT64 é distinto da
arquitetura da CPU: contêineres FAT32 podem conter imagens executáveis de 64
bits. Essa preparação evita o diálogo do loader Raw Binary observado com o
carregamento FAT64 nativo no Hopper 6.1.0-demo. A imagem preparada e seu
documento próprio fecham juntos, inclusive na saída do MCP; se o fechamento do
documento não for confirmado, o REA retém a imagem de apoio e reporta
`cleanup_incomplete` com seu caminho. Documentos comuns mantêm seu comportamento
existente na saída do MCP. Prazos de inicialização reportam a prontidão ausente
da ponte e preservam o resultado do launcher; uma saída bem-sucedida do helper
não prova que um diálogo de loader foi concluído. Se um processo de provedor
próprio sair, as falhas de requisição preservam seu código de saída ou sinal
observado e a saída limitada em `details.launcher`. Uma saída pode preceder o
fechamento do fluxo de saída; `output_closed: false` mantém essa incerteza
explícita. Requisições posteriores retêm a saída conhecida em vez de reduzi-la a
perda de socket. A saída do helper de uma GUI externa não estabelece que a
própria GUI saiu. Para navegação de cursor, decodificação de strings, limites de
nomes de símbolos e correspondência por regex, veja
[comportamento de análise do Hopper](../native-investigation.md#hopper-analysis-behavior).

Fechar ou trocar um alvo fecha seu documento vinculado do Hopper, desliga a
ponte do REA e remove seu diretório de socket temporário. A aplicação Hopper do
macOS e documentos não relacionados permanecem abertos; a aplicação demo Linux
própria é parada. Um resultado `cleanup_incomplete` identifica recursos cuja
limpeza não pôde ser verificada. O REA retém a propriedade de limpeza não
resolvida e quaisquer fases de desligamento confirmadas. Depois de tratar a
falha reportada, tente `close_binary` novamente na mesma conexão. Limpeza não
confirmada de documento ou processo retém o lease do alvo/aplicação e impede que
outro cliente inicie contra esse recurso próprio. Uma vez confirmados o
fechamento do documento e do processo, o lease pode ser liberado mesmo que a
limpeza de arquivos temporários falhe. Outro cliente pode então iniciar, mas o
cliente proprietário precisa terminar sua limpeza retida antes de começar de
novo. Um documento externo não confirmado pode ser tentado novamente enquanto
sua ponte autenticada permanecer disponível. A mesma autenticação e captura de
identidade de processo se aplicam quando o primeiro handshake bem-sucedido
ocorre durante a limpeza após um timeout de inicialização. O REA pode confirmar
o fechamento se exatamente esse processo autenticado sair, inclusive enquanto
uma requisição de desligamento está em andamento. A saída do helper, sozinha, é
insuficiente, e uma aplicação que nunca autenticou não tem identidade de
processo verificada. Se nenhuma ponte correspondente ficar disponível,
inspecione e feche o documento reportado no Hopper antes de encerrar a conexão
proprietária do REA. Exporte o bundle de Evidence antes que `close_binary` limpe
os registros da sessão. `binary_session.cleanup_pending` permanece verdadeiro
enquanto a limpeza do provedor é retida, e a saúde do provedor permanece visível
mesmo com `open: false`; essa flag, por si só, não estabelece limpeza
bem-sucedida.

### Hopper em CI

O caminho Linux não assistido do REA é validado contra o modo demo oferecido pelo
Hopper. Uma licença paga não é necessária para esse caminho, e o REA não lê,
instala nem automatiza credenciais de licença. Instalações licenciadas do Hopper
continuam suportadas, mas a ativação da licença é um pré-requisito do operador,
não parte do setup do REA.

O macOS exige que a interface de primeira execução do Hopper seja concluída na
mesma sessão de usuário que executará o REA: escolha o modo demo ou ative uma
licença existente antes de iniciar um job não assistido. Runners macOS efêmeros,
portanto, precisam de uma sessão de usuário pré-provisionada ou de uma etapa
interativa deliberada de bootstrap.

Quando o Hopper não consegue iniciar em CI, execute
`rea doctor --provider hopper --json` no runner que falhou. Falhas estruturadas
distinguem dependências de display privado, um diálogo ou build de demo não
suportado, conflitos de propriedade de processo e uma saída precoce do ciclo de
vida. Aplique a remediação reportada em vez de expor a área de trabalho do
runner, copiar segredos de licença para logs ou matar processos Hopper não
relacionados.

## Ghidra

O REA conecta-se a uma instalação existente do Ghidra em Linux x64/arm64, macOS
x64/arm64 ou Windows x64 P0 experimental. Ele aceita o Ghidra 12.1.x e o JDK
completo de 64 bits declarado por `application.java.min` e
`application.java.max` dessa instalação. A plataforma reportada pelo JDK também
precisa mapear para o mesmo diretório de descompilador nativo do host: um JDK
rodando sob emulação (por exemplo x86_64 sob Rosetta em Apple Silicon) ou
reportando um `os.name` que não é o do host falha no doctor mesmo sendo um JDK
completo de 64 bits aceito em outros aspectos. Selecione um JDK compatível por
`JAVA_HOME`; adicionar outro descompilador no diretório selecionado pela JVM não
satisfaz essa regra de admissão validada pelo host. As versões 12.1 atuais
exigem JDK 21 ou mais novo e não definem máximo. A ponte é verificada com o
Ghidra 12.1.4 e o JDK 21. Cada instalação precisa incluir o descompilador nativo
para a arquitetura do host em `Ghidra/Features/Decompiler/os/<platform>/` ou no
diretório `build/os/<platform>/` correspondente. O Linux ARM64 usa
`linux_arm_64`; arquivos de versão oficiais podem exigir que você compile esse
componente nativo separadamente. O REA verifica o pré-requisito do executável
inspecionando o cabeçalho executável do próprio arquivo, então um componente
nativo compilado para outra plataforma ou arquitetura é reportado como
incompatível em vez de admitido pelo nome do diretório, e um cabeçalho que não
pode ser lido ou reconhecido é reportado como desconhecido. O REA não compila
nem instala ferramentas nativas, nem altera configurações de quarentena do
Gatekeeper.

O adaptador expõe 26 operações somente leitura: catorze operações de
inventário/nome/busca e doze operações de análise de função. Elas cobrem
metadados, descompilação, assembly, chamadas resolvidas, referências tipadas,
xrefs, dossiês de função, instruções, tipos de dados recuperados, mapeamentos de
carregamento medidos, bytes de memória carregados e offsets de arquivo
observados. A atestação independente de imagem carregada suporta DOS MZ, COM
selecionado explicitamente e importações explícitas de binário bruto; PE devolve
medições com um status de atestação não suportado. No Linux e macOS,
`annotate_native_function` também edita atomicamente o nome de uma função e/ou
comentários de entrada e devolve a análise atualizada, e `set_address_name` e
`set_addresses_names` nomeiam uma entrada de função ou qualquer outro endereço
mapeado (criando ou renomeando seu rótulo primário) com resultados de sucesso
por endereço. Essas edições de metadados de sessão deixam os bytes executáveis
inalterados e são descartadas no fechamento. Controles de GUI exigem o Hopper; o
Windows P0 permanece somente leitura.

O Windows P0 admite aplicações e DLLs PE nativas x86, x86-64, ARMNT (Thumb-2) e
ARM64, além de [imagens brutas NMOS 6502](../raw-binary.md#nmos-6502)
selecionadas explicitamente com uma entrada fornecida por quem chama no offset 0
do arquivo, em volumes NTFS locais fixos. Outras famílias de CPU brutas
permanecem sem suporte no Windows. O pacote npm inclui propriedade nativa de Job
Object, DACLs privadas protegidas de runtime e admissão de caminho baseada em
handle; nenhuma instalação separada de addon é necessária. Veja o
[guia do Ghidra P0 no Windows](../windows-ghidra-p0.md) para o escopo verificado
e as limitações.

Extraia o Ghidra e instale o JDK fora do REA, depois exporte caminhos absolutos:

```bash
export GHIDRA_INSTALL_DIR=/absolute/path/to/ghidra_12.1.4_PUBLIC
export JAVA_HOME=/absolute/path/to/jdk-21 # opcional se java/javac estiverem no PATH
rea doctor --json
rea setup
```

No macOS, o [OpenJDK do Homebrew é keg-only](https://formulae.brew.sh/formula/openjdk)
e pode estar indisponível para o wrapper `java` do sistema. Defina `JAVA_HOME`
como o `libexec/openjdk.jdk/Contents/Home` da fórmula selecionada, por exemplo
`/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home` ou
`/usr/local/opt/openjdk/libexec/openjdk.jdk/Contents/Home`. Use um JDK dentro
dos limites de versão Java declarados pela sua instalação do Ghidra; o REA não
seleciona outro JDK instalado automaticamente. O doctor distingue um comando
Java ausente de um comando que roda e falha, e retém a saída limitada da sonda e
quaisquer propriedades interpretadas quando o runtime selecionado não pode ser
admitido.

No Windows, configure a instalação existente no PowerShell:

```powershell
$env:GHIDRA_INSTALL_DIR = "C:\tools\ghidra_12.1.4_PUBLIC"
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
rea doctor --json
rea providers --json
```

`rea setup` pode configurar agentes Windows suportados e instalar a skill
empacotada do REA após aprovação. Registros diretos usam o Node para iniciar o
script de entrada do REA; registros via package runner usam o comando `npx` ou
`bunx` fixado. A instalação do Hopper permanece indisponível no Windows. O setup
nunca instala Ghidra, Java ou Python. Ele preserva configurações válidas
detectadas de Ghidra/JDK nos registros de agentes. Veja
[Ghidra P0 no Windows](../windows-ghidra-p0.md) para diagnósticos do provedor.

Quando `GHIDRA_INSTALL_DIR` não está definido, o doctor e o provedor Ghidra
também buscam `ghidra` ou `ghidraRun` no `PATH`, resolvem o launcher selecionado
pelo seu caminho real e o aceitam apenas quando esse local pertence a uma árvore
do Ghidra com os metadados da aplicação e o launcher headless. Um
`GHIDRA_INSTALL_DIR` fornecido explicitamente sempre tem precedência, inclusive
quando é inválido; o REA reporta esse erro em vez de selecionar silenciosamente
outra instalação. Essa descoberta é somente leitura e não executa o launcher do
Ghidra.

O doctor valida a plataforma, a arquitetura, a versão de aplicação Ghidra
12.1.x, `support/analyzeHeadless` ou `support/analyzeHeadless.bat`, o intervalo
de versão major do Java da instalação, a arquitetura de 64 bits do JDK e a
presença de `javac`/`javac.exe`. Ele também verifica que o `os.arch` e o
`os.name` reportados pela JVM mapeiam para o mesmo diretório de descompilador
nativo validado para o host; arquiteturas reportadas não reconhecidas ou um
sistema operacional que não é o do host são recusados. Overrides de qualquer das
propriedades pelo LaunchSupport, inclusive por variáveis de opções da JVM no
ambiente do helper, são rejeitados na inicialização. Quando o Java é encontrado
pelo `PATH`, o setup registra o home do JDK observado para que clientes MCP de
GUI não dependam de um caminho de shell incidental. O setup mostra cada entrada
exata de ambiente no seu plano, escreve apenas após aprovação e nunca baixa,
instala, atualiza ou modifica Ghidra ou Java.

A inspeção da instalação deriva a identidade do diretório de configuração
privado de `application.version` e `application.release.name` em
`Ghidra/application.properties`. A grafia da versão do diretório segue o Ghidra
(por exemplo, `12.1.0` vira `12.1`), enquanto a versão reportada do provedor
preserva o valor original. O launcher usa essa coordenada inspecionada; ele não
relê as propriedades nem adivinha pelo nome da pasta extraída. Se a identidade
estiver ausente, malformada ou for insegura como componente único de caminho, o
launcher falha antes de preparar seus diretórios home/cache/config/temp ou
iniciar o Java. O cliente pode já ter alocado recursos privados de
runtime/endpoint e um snapshot do alvo; a limpeza existente de falha de
inicialização ainda se aplica. Restaure as propriedades da versão selecionada em
vez de renomear sua pasta de instalação. A inspeção segue links simbólicos das
propriedades selecionadas, admite apenas um arquivo regular e limita o payload
de metadados a 1 MiB sob o orçamento de recursos do REA. Uma sonda final de um
byte verifica crescimento. Isso não é um limite do formato Java Properties.
Leituras preservam o mapeamento de bytes Latin-1 do Ghidra e verificam o
descritor e o nome selecionado quanto a mudanças. Falhas de permissão e recusas
de recursos permanecem explícitas; uma limpeza de descritor com falha precisa ter
sucesso antes que esse proprietário admita outra inspeção. A inspeção de
compatibilidade do descompilador nativo segue o link simbólico do executável
selecionado e lê no máximo os primeiros 4096 bytes pelo mesmo proprietário de
descritor. Ela verifica a extensão completa e o nome selecionado quanto a
mudanças sem ler o restante. Um cabeçalho ilegível ou não reconhecido deixa a
compatibilidade desconhecida; os diagnósticos retêm falhas de leitura.
Cancelamento e limpeza incompleta se propagam como falhas, e uma limpeza com
falha retém o descritor exato para nova tentativa. Essa coordenada seleciona
apenas o diretório de configuração privado da sessão do REA, não a instalação
nem um diretório de configuração de usuário existente.

Cada sessão verificada usa um projeto temporário efêmero e caminhos isolados de
home/cache/config/temp. O REA passa `-readOnly`, `-deleteProject`, usa as
configurações padrão de análise do Ghidra e carrega sua ponte Java empacotada
via `-scriptPath`; ele nunca abre um projeto de usuário existente. Linux e macOS
usam um socket local da ponte e um descritor exclusivos do usuário atual. O
projeto permanece sob o diretório temporário selecionado. Se o caminho do seu
socket Unix excederia o limite de bytes do host, o REA aloca um diretório de
socket separado, apenas do proprietário, em `/tmp` e o remove no fechamento,
cancelamento ou falha. Os diagnósticos retêm o endpoint real e os dois
diretórios próprios. No Linux e macOS, o REA inicia a JVM inspecionada
diretamente usando a configuração LaunchSupport do próprio Ghidra. Wrappers de
shell das plataformas Apple escondem seus ambientes da inspeção de propriedade,
então reter esses wrappers impediria o cancelamento verificado de grupo de
processos durante a inicialização. Se a propriedade permanecer não verificável,
ele reporta o motivo e retém o supervisor de processos e o runtime privado em
vez de remover arquivos sob um provedor ativo. A inicialização preserva uma
falha de lançamento observada quando o cancelamento chega durante o rollback. O
cancelamento pelo produtor retém o motivo exato de quem chamou separadamente dos
avisos do LaunchSupport e das falhas de limpeza. Um rollback com falha mantém o
proprietário original do processo para uma nova tentativa de limpeza
posterior. O transporte experimental do Windows usa loopback IPv4 autenticado
com um descritor bearer privado de propriedade nativa e propriedade de processo
por Job Object.

As operações começam apenas após a conclusão da auto-análise padrão.
`open_binary` seleciona e valida o vínculo alvo/provedor; ele não espera pela
importação e auto-análise do Ghidra. A primeira consulta apoiada no Ghidra
inicia esse trabalho sob demanda. O prazo de inicialização do provedor é de
330.000 ms por padrão para importação, análise, ponte e prontidão de saúde.
Binários grandes podem precisar de mais: defina `REA_GHIDRA_STARTUP_TIMEOUT_MS`
como um inteiro entre 1 e 2.147.483.647 milissegundos no ambiente do servidor.
Uma configuração ausente usa o padrão; valores fornecidos vazios, inválidos ou
fora do intervalo falham na validação da configuração. Quando o prazo expira, o
erro `provider_timeout` nomeia `REA_GHIDRA_STARTUP_TIMEOUT_MS` com o prazo que
foi aplicado e sugere `REA_GHIDRA_DISABLED_ANALYZERS` para analisadores que
dominam o tempo. O REA interpreta o ambiente de configuração fornecido e passa
o prazo a cada cliente de provedor; uma falha de inicialização é devolvida pela
consulta que a desencadeou, sem expor análise parcial. Esse prazo é separado da
inicialização do transporte MCP e do prazo do cliente para aquela chamada de
ferramenta individual. Um cliente pode expirar antes mesmo quando o Ghidra
concluiria dentro do seu prazo de inicialização. Veja
[prazos da primeira consulta do Ghidra e recuperação](../mcp-contracts.md#ghidra-first-query-deadlines-and-recovery)
para opções do cliente e o fluxo de recuperação por fechar/reabrir.

Uma sessão contém exatamente um Program importado; use `provider_id: "ghidra"`,
`--provider ghidra` ou `REA_ANALYSIS_PROVIDER=ghidra` quando Hopper e Ghidra
suportam o alvo. Um descompilador persistente é de propriedade do Program, e uma
fila serial mantém as chamadas da API do Ghidra na thread do Program
proprietário sem um comprimento fixo de fila. As operações rodam até um
resultado, o cancelamento por quem chamou ou o desligamento do provedor; não há
teto fixo por operação ou de tamanho de resposta. Chamadas computadas não
resolvidas permanecem desconhecidas, a proveniência do tipo de referência é
preservada, e o pseudocódigo específico do provedor nunca é tratado como código
original ou como texto equivalente ao do Hopper.

### Descompilador nativo ausente no macOS

Se `rea doctor --json` reporta `native_decompiler` como ausente no macOS x64, o
arquivo extraído do Ghidra pode incluir o código do descompilador sem o
executável para macOS. Para o Ghidra 12.1.4, você pode compilá-lo manualmente
com uma instalação existente do Xcode Command Line Tools, `make` e `bison`:

```bash
cd "$GHIDRA_INSTALL_DIR/Ghidra/Features/Decompiler/src/decompile/cpp"
make ghidra_opt
decompiler_dir="$GHIDRA_INSTALL_DIR/Ghidra/Features/Decompiler/os/mac_x86_64"
mkdir -p "$decompiler_dir"
test ! -e "$decompiler_dir/decompile" && test ! -L "$decompiler_dir/decompile" &&
  install -m 755 ghidra_opt "$decompiler_dir/decompile"
rea doctor --json
```

A etapa de cópia exige que o destino esteja ausente e preserva um descompilador
existente. Esta receita é específica do macOS x64: o
[Makefile do Ghidra 12.1.4](https://github.com/NationalSecurityAgency/ghidra/blob/Ghidra_12.1.4_build/Ghidra/Features/Decompiler/src/decompile/cpp/Makefile)
seleciona explicitamente `-arch x86_64` no Darwin. Para um build com Gradle,
siga as
[instruções de componentes nativos](https://github.com/NationalSecurityAgency/ghidra/blob/Ghidra_12.1.4_build/GhidraDocs/GettingStarted.md#building-native-components)
da versão correspondente. O REA aceita o executável correspondente em
`os/<platform>/` ou `build/os/<platform>/`; ele não compila o componente durante
o setup ou o diagnóstico.

### Descompilador nativo no macOS arm64

No Apple Silicon o mesmo build a partir do código funciona com overrides
explícitos; não são necessárias edições no Makefile nem Rosetta. O bloco Darwin
do [Makefile do Ghidra 12.1.4](https://github.com/NationalSecurityAgency/ghidra/blob/Ghidra_12.1.4_build/Ghidra/Features/Decompiler/src/decompile/cpp/Makefile)
fixa `-arch x86_64`, mas `ARCH_TYPE` e `OSDIR` são variáveis comuns do make, e
atribuições na linha de comando as substituem em toda regra de compilação e
link:

```bash
cd "$GHIDRA_INSTALL_DIR/Ghidra/Features/Decompiler/src/decompile/cpp"
make ghidra_opt ARCH_TYPE="-arch arm64" OSDIR=mac_arm_64
decompiler_dir="$GHIDRA_INSTALL_DIR/Ghidra/Features/Decompiler/os/mac_arm_64"
mkdir -p "$decompiler_dir"
test ! -e "$decompiler_dir/decompile" && test ! -L "$decompiler_dir/decompile" &&
  install -m 755 ghidra_opt "$decompiler_dir/decompile"
rea doctor --json
```

Verificado de ponta a ponta no macOS 15.6 arm64 com Apple clang 17 e o bison
2.3 padrão, contra o Ghidra 12.1.4: o build produz um `ghidra_opt` Mach-O
arm64, a verificação `ghidra-native_decompiler` do doctor fica saudável com
"reports mach-o arm64, which matches darwin/arm64", e `rea decompile` em um
Mach-O arm64 devolve C descompilado pelo provedor headless. O JDK não é
necessário para a etapa do make, apenas para o provedor Ghidra. Se sua toolchain
rejeitar a flag herdada `-mmacosx-version-min=10.6`, repita o make com
`ADDITIONAL_FLAGS="-w"`.

### Linguagem de importação do Ghidra e seeds de análise

O Ghidra detecta a linguagem pelo cabeçalho do executável. Para defini-la (por
exemplo, imagens PE do Borland C++):

```bash
export REA_GHIDRA_LANGUAGE_ID="x86:LE:32:default"
export REA_GHIDRA_COMPILER_SPEC_ID="borlandcpp"   # opcional; exige uma linguagem
```

O REA passa `-processor`/`-cspec`, verifica ambos contra os `.ldefs` da
instalação e os registra no perfil de análise. Importações DOS rejeitam um
override.

Definições de linguagem precisam ser XML bem formado codificado em UTF-8 ou
UTF-16 com BOM, com qualquer declaração de codificação correspondendo aos bytes.
Caracteres de substituição Unicode literais (U+FFFD) são aceitos; bytes de
origem malformados são rejeitados.

Para semear código que a auto-análise não consegue alcançar (saltos computados,
ponteiros em dados):

```bash
export REA_GHIDRA_SEED_FILE=/absolute/path/to/seeds.tsv
```

Cada linha é `address<TAB>kind[<TAB>name]`, onde kind é `function`, `code` ou
`label` (um rótulo precisa de nome). Endereços são hexadecimais `0x` no espaço
padrão; linhas com `#` são comentários. Um pré-script aplica as seeds antes da
auto-análise: funções do endereço mais alto para baixo, depois código, depois
rótulos. O digest das seeds faz parte do perfil de análise, e a sessão falha se
as seeds aplicadas diferirem. As limitações do resultado reportam as contagens
do desfecho; uma seed falha quando sobrepõe uma instrução que o Ghidra já
decodificou.

Seeds de rótulo podem nomear armazenamento não inicializado mapeado, como
`.bss`; seeds de função e código exigem bytes inicializados.

Para pular um auto-analisador nomeado do Ghidra (por exemplo, quando a
auto-análise padrão trava em um analisador em um Mach-O arm64 Swift/Objective-C):

```bash
export REA_GHIDRA_DISABLED_ANALYZERS="Objective-C Message Analyzer"
```

O valor é uma lista separada por vírgulas de nomes exatos de analisadores do
Ghidra. Um pré-script desativa cada nome antes da auto-análise, o perfil de
análise registra o override em `analyzer_preset` (por exemplo
`ghidra-default+disabled:Objective-C Message Analyzer`), e uma sessão falha ao
abrir quando seu perfil confirmado e a configuração diferem. Um nome começa com
letra ou dígito e contém apenas letras, dígitos, espaços, pontos, sublinhados e
hifens; no máximo 32 nomes são admitidos, cada um com até 120 caracteres. Os
nomes precisam identificar analisadores registrados para o programa
selecionado. Nomes desconhecidos ou opções que permanecem ativadas abortam a
importação headless antes da auto-análise e da ponte, então um override
malsucedido não pode produzir uma sessão afirmando que o analisador foi
desativado. Para a análise de recursos PE do Windows, o nome exato é
`WindowsResourceReference`. Desativar um analisador pula os fatos que ele teria
produzido.

### Controles de heap e CPU do Ghidra

Defina os controles de recursos no ambiente que inicia a CLI ou o servidor MCP,
antes de abrir uma nova sessão do Ghidra. No Linux e macOS, o REA escolhe a
primeira configuração não vazia nesta ordem: `GHIDRA_HEADLESS_MAXMEM`,
`GHIDRA_MAXMEM`, depois `2G`. O valor escolhido vira o argumento `-Xmx` da JVM.
Use um valor de tamanho de heap da JVM como `512M` ou `2G`; um valor inválido
faz a inicialização do Java falhar. O script headless suportado do Ghidra 12.1.4
no Windows consome as mesmas configurações com a mesma precedência.

Para um alvo pequeno em um host restrito:

```bash
export GHIDRA_HEADLESS_MAXMEM=512M
```

No PowerShell:

```powershell
$env:GHIDRA_HEADLESS_MAXMEM = "512M"
```

Um cliente MCP precisa passar essa configuração ao seu processo servidor do REA;
alterar o ambiente de um terminal não relacionado não reconfigura um servidor ou
JVM existente. Um heap de 512 MiB foi verificado com fixtures nativas pequenas,
mas alvos maiores podem exigir mais memória. O limite de heap do Java não
restringe o RSS da JVM, o heap do Node nem a memória total usada pela família de
processos. O prazo de inicialização controla o tempo de espera
independentemente dessas configurações de memória.

O REA limpa `_JAVA_OPTIONS`, `JAVA_TOOL_OPTIONS`, `JDK_JAVA_OPTIONS` e
`GHIDRA_JAVA_OPTIONS` herdadas de quem chama, e é proprietário de
`GHIDRA_HEADLESS_JAVA_OPTIONS`. Flags personalizadas injetadas por essas
variáveis não são configuração suportada. No Windows, o REA substitui
`JDK_JAVA_OPTIONS` por suas próprias configurações isoladas de home/temp e
`-XX:-UsePerfData`; no Linux e macOS ele fornece caminhos isolados diretamente
ao Java. Use as configurações de heap suportadas acima em vez de adicionar um
segundo `-Xmx` por uma variável de injeção.

A inicialização no Linux/macOS define `-XX:ParallelGCThreads=2` e
`-XX:CICompilerCount=2`; o script headless suportado do Windows também define
essas contagens. Elas restringem pools de threads específicos da JVM, não todas
as threads de análise ou o uso de CPU. O REA não passa a opção `-max-cpu` do
Ghidra nem expõe um limite geral de CPU do Ghidra. Quando necessário, aplique
controles de afinidade e agendamento de CPU do host ao processo do REA e
verifique a afinidade resultante da JVM. Selecione CPUs permitidas no host; não
assuma que números de CPU de outra máquina são válidos.

Verifique os controles no seu consumidor depois que a primeira consulta apoiada
no Ghidra iniciar a JVM: inspecione o `-Xmx` efetivo e as flags de GC/compilador
dessa JVM própria, a afinidade de CPU e o uso de memória observado. Não os
infira a partir do ambiente do shell pai ou da ausência de um erro. No Linux,
`/proc/<jvm-pid>/cmdline` contém os argumentos de inicialização e
`/proc/<jvm-pid>/status` reporta `Cpus_allowed_list` e `VmRSS`. Inspecione
apenas o processo pertencente a esta sessão e retenha as flags de recursos
necessárias para a medição em vez de copiar linhas de comando ou ambientes
completos para relatórios. Configurações de heap e afinidade afetam custo e
latência; elas não fazem parte da identidade do perfil de análise semântica do
REA. Veja [testes com provedores reais](../testing.md) para fluxos de verificação
limitados.

### Diagnósticos e verificação do Ghidra

Falhas inesperadas de requisição retêm sua causa interna original. Erros de CLI
e MCP expõem nomes de Error, mensagens e códigos disponíveis em
`details.diagnostics.failure_cause`, incluindo causas aninhadas limitadas e
marcadores explícitos de truncagem. Falhas de compilação do helper de
propriedade no Darwin também retêm o resultado do compilador, código de saída ou
sinal e stderr limitado; um compilador que sofreu timeout permanece distinguível
de um compilador que saiu com erro. O prazo de compilação do helper tem padrão
de 120.000 ms; defina `REA_SWIFTC_COMPILE_TIMEOUT_MS` como um inteiro entre 1 e
2.147.483.647 quando um host ocupado precisar de mais tempo. No macOS, a sonda
de pré-requisito do Java espera por essa preparação limitada independentemente
antes de iniciar seu prazo de comando de cinco segundos. O cancelamento por quem
chamou ainda interrompe a preparação, e a limpeza com falha do helper permanece
de propriedade para nova tentativa. A preparação da tabela de processos do Linux
permanece dentro do prazo do comando. Outros valores de rejeição retêm seu valor
primitivo ou um tipo explícito. Avisos de desligamento incluem o tipo de falha,
a mensagem e os diagnósticos, enquanto a limpeza de processo e de projeto
temporário continua. Essas mensagens redigem tokens conhecidos de autenticação
da ponte e preservam caminhos locais e outro contexto de análise.

Execute `GHIDRA_INSTALL_DIR=... npm run verify:ghidra` a partir de um checkout
do código-fonte para compilar e analisar fixtures nativas do host com e sem
símbolos (ELF no Linux x64/arm64 ou Mach-O no macOS), além de um objeto nativo
de layout de tipos DWARF 4. Essa via precisa de um compilador C do host além do
Ghidra e do seu JDK.

Execute `GHIDRA_INSTALL_DIR=... npm run verify:ghidra:cross-format` para
adicionar cobertura de fixtures ELF AArch64, PE x86-64 e Mach-O x86-64. Essa via
separada precisa de `clang`, LLD e `lld-link` no `PATH`; `REA_CLANG` e
`REA_LLD_LINK` selecionam caminhos alternativos de comando. Ferramentas de
compilação cruzada ausentes não bloqueiam a via de aceitação do Ghidra nativa do
host.

Em um runner Windows x64 controlado, use `npm run verify:ghidra:windows`. O
verificador gera uma fixture PE nativa determinística a partir de bytes de
origem e exige a autoridade nativa do Windows antes de abrir o provedor. Os
controles estão implementados no main; veja a
[fronteira de versão](#pacote-publicado-e-main). A via verifica todas as 26
operações somente leitura admitidas, a identidade por digest e a limpeza do
runtime. A via separada `verify:ghidra:windows:package` verifica a fronteira
CLI/MCP empacotada com um usuário comum. Ela exige o bundle nativo do Windows
compilado e uma instalação existente de Ghidra/JDK; nenhum dos dois é inferido
apenas pela inicialização.

## MCP Registry

O REA está publicado no MCP Registry oficial como `io.github.morluto/rea`.
Clientes do Registry podem descobrir o servidor e instalar o pacote npm público
`rea-agents` existente; a entrada no Registry não introduz um segundo artefato
de distribuição.

Para um cliente que suporta descoberta pelo Registry, busque
`io.github.morluto/rea` e selecione o pacote npm. Os metadados publicados iniciam
o servidor stdio existente por `npx` com o comando `mcp`.

Para um cliente que exige configuração manual, use:

```json
{
  "mcpServers": {
    "rea": {
      "command": "npx",
      "args": ["-y", "rea-agents@6.5.0", "mcp"]
    }
  }
}
```

Registros persistentes devem usar uma versão exata do pacote. `rea setup`
escreve a mesma forma de package runner, ou `bunx rea-agents@<version> mcp`
quando o setup roda por `bunx`, e a fixa na versão exata que executou o setup.
Execute o setup atual para atualizar um registro mais antigo, depois reinicie o
cliente.

## Package runners e instalar globalmente

Uma invocação via package runner pode usar uma versão do REA instalada no
projeto atual. Para solicitar explicitamente a versão mais recente, use:

```bash
npx rea-agents@latest setup
```

O REA executa a versão que o npm seleciona. Para atualizar registros de agentes
mais antigos, execute o comando da versão mais recente e revise seu plano de
setup. Para downloads de pacote não assistidos, adicione `--yes` antes do nome
do pacote; isso não aprova as alterações de setup do REA.

Para um rollback intencional, torne a solicitação do pacote explícita:

```bash
npm exec --yes --package=rea-agents@2.4.0 -- rea setup
```

O setup continua fixando registros MCP persistentes na versão exata que executou
o setup. Executar o setup atual depois migra registros gerenciados sem versão ou
mais antigos pela transação normal de setup revisado.

Com Bun, `bunx rea-agents setup` (ou `bunx rea-agents@latest setup`) é o ponto
de entrada equivalente. O setup executado por `npx` registra
`npx -y rea-agents@<version> mcp`; o setup executado por `bunx` ou `bun x`
registra `bunx rea-agents@<version> mcp`. No Windows, o setup envolve qualquer
dos comandos em `cmd.exe /d /c` para que os clientes consigam iniciar o shim de
comando do runner. Nenhum dos registros aponta para o cache temporário de
pacotes do runner.

O REA suporta Node.js 22.x (>=22.19), 24.x (>=24.11) e 26+. Node.js 23, 25 e
pré-lançamentos não são suportados. Ele usa o npm já emparelhado com esse
runtime e nunca atualiza Node.js, npm ou Homebrew.

Quando o REA roda no Bun, a verificação `node` do `rea doctor` reporta a versão
do Bun e a versão de compatibilidade com Node.js que o Bun declara, e passa
quando essa versão de compatibilidade está no intervalo suportado. O Bun não
aplica as flags de heap do V8 que o REA dá aos seus processos helper próprios,
então o Evidence que reporta esses limites no Node.js os registra como
indisponíveis sob o Bun. No Windows, o Job Object próprio de cada helper
JavaScript (analisador de código, codec de source map e decodificador HAR)
limita, em vez disso, sua memória confirmada ao orçamento de heap daquele helper
mais uma reserva de 512 MiB para o próprio Bun, e o Evidence reporta esse
limite. Isso precisa do artefato nativo do Windows empacotado correspondente; um
artefato sem o controle recusa iniciar o helper em vez de executá-lo sem
limite. A CI testa apenas Node.js.

Executar `npm install rea-agents` sem `--global` instala o executável apenas em
`node_modules/.bin` do projeto atual; isso não torna `rea` disponível no `PATH`
do shell. Use o comando de setup acima para a jornada de configuração guiada,
`npx -y rea-agents@latest` para comandos avulsos não assistidos, ou instale
globalmente com `npm install --global rea-agents` para um comando `rea` visível
no shell.

Para muitas sessões de agente concorrentes, execute o setup diretamente de uma
instalação global para evitar manter um processo separado do launcher do npm
para cada conexão MCP:

```bash
npm install --global rea-agents
rea setup
```

Revise o plano, aprove as alterações dos clientes selecionados e então reinicie
esses clientes. Isso registra diretamente o ponto de entrada instalado; instalar
o pacote global sozinho não substitui registros `npx` existentes. Cada cliente
ainda tem seu próprio processo REA e estado de análise. Registros diretos seguem
a CLI instalada; use `rea update` para atualizá-la. Executar o setup por `npx`
novamente seleciona o comando fixado de package runner. Não registre caminhos
dentro do cache temporário de pacotes do npm.

O wrapper opcional em curl instala apenas o pacote npm global:

```bash
curl -fsSL https://raw.githubusercontent.com/morluto/rea/main/install.sh | bash
```

Ele imprime a versão, o runtime, o comando npm e o destino antes de instalar.
Quando existe um terminal de controle ele inicia `rea setup`; caso contrário
imprime o comando para executar depois.

Passe opções com `bash -s --`:

```bash
curl -fsSL https://raw.githubusercontent.com/morluto/rea/main/install.sh |
  bash -s -- --dry-run
```

As opções suportadas são `--version <semver>`, `--dry-run`, `--no-setup`,
`--no-prompt` e `--verbose`. Nem `--no-prompt` nem um shell não interativo
concedem permissão para instalar dependências externas.
