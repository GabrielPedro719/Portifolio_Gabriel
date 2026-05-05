# Plano de Design — Jitsi Chess Mobile

Autor: **Manus AI**

## Visão geral do produto

O **Jitsi Chess Mobile** será um aplicativo móvel em orientação retrato, pensado para uso com uma mão em Android, que combina uma partida de xadrez ao vivo com presença audiovisual entre dois jogadores. A experiência central coloca o tabuleiro no centro da tela, o vídeo do adversário no topo e o vídeo local do jogador na parte inferior, mantendo controles essenciais de microfone, câmera e sala sempre acessíveis sem competir visualmente com o jogo.

> O objetivo de design é criar uma experiência de xadrez social em tempo real, com aparência limpa, foco tático no tabuleiro e feedback audiovisual suficiente para que os jogadores vejam as reações um do outro durante a partida.

## Lista de telas

| Tela | Finalidade | Conteúdo principal | Ações principais |
|---|---|---|---|
| **Entrada / Lobby** | Coletar o username e a chave da sala antes da partida. | Título do app, campo de nome, campo de chave da sala, botão para criar sala, botão para entrar em sala e breve explicação. | Criar chave, entrar na sala, validar campos e iniciar partida. |
| **Partida ao Vivo** | Reunir videoconferência, tabuleiro e controles de xadrez. | Vídeo do amigo no topo, tabuleiro ao centro, vídeo local embaixo, indicadores de turno, nomes dos jogadores e controles de mídia. | Selecionar peça, mover peça, alternar microfone, alternar câmera, copiar chave da sala, reiniciar partida local. |
| **Painel de Status da Partida** | Mostrar detalhes compactos sem interromper o jogo. | Jogador atual, sala, capturas simplificadas, estado de xeque/xeque-mate quando aplicável. | Consultar contexto da partida e voltar rapidamente ao tabuleiro. |

## Conteúdo e funcionalidade por tela

Na tela de **Entrada / Lobby**, o usuário informa um **username** que será exibido na partida. O app também permite criar uma sala com uma chave curta e compartilhável ou digitar uma chave recebida do amigo. Como o usuário pediu uma sala online com chave específica, a primeira versão implementará a geração e entrada de chave de sala no app e usará a mesma chave para montar a sala de videoconferência Jitsi. A sincronização real de lances entre dispositivos poderá ser evoluída com backend em uma etapa posterior; a versão inicial prioriza a interface funcional, as regras locais de xadrez e o encontro por sala.

Na tela de **Partida ao Vivo**, o layout deve obedecer à hierarquia visual: vídeo remoto no topo, tabuleiro no centro e vídeo local na parte inferior. O tabuleiro usará casas alternadas inspiradas em aplicativos modernos de xadrez, com destaque para peças selecionadas, movimentos possíveis e último lance. Os nomes dos jogadores aparecem próximos aos vídeos para reforçar a identidade na chamada.

| Região da tela | Layout retrato 9:16 | Comportamento esperado |
|---|---|---|
| **Topo** | Cartão horizontal de vídeo remoto centralizado, com nome do amigo e estado de conexão. | Mostra a sala Jitsi associada à chave; em prévia web, pode abrir a conferência em navegador incorporado/sistema. |
| **Centro** | Tabuleiro quadrado responsivo, ocupando a maior largura possível com margens seguras. | Toque em peça própria seleciona; toque em destino válido move; feedback visual para seleção e turno. |
| **Inferior** | Cartão de vídeo local centralizado e barra de controles circulares. | Botões de microfone, câmera, copiar sala e reiniciar ficam ao alcance do polegar. |

## Fluxos principais do usuário

O fluxo de criação de sala começa quando o usuário abre o app, digita seu username e toca em **Criar sala**. O app gera uma chave curta, preenche o campo de sala, prepara o link Jitsi correspondente e leva o usuário para a tela de partida. Em seguida, o usuário compartilha a chave com seu amigo, que poderá digitá-la no próprio app para entrar no mesmo ambiente de conferência.

O fluxo de entrada em sala começa quando o amigo digita seu username, informa a chave recebida e toca em **Entrar na sala**. O app valida se há nome e chave, cria o link de videoconferência com base na chave e abre a tela de partida com o mesmo tabuleiro local e a mesma sala Jitsi.

O fluxo de jogo começa quando o jogador toca em uma peça da vez. A peça selecionada recebe destaque; os destinos legais ficam marcados no tabuleiro. Ao tocar em uma casa de destino, o app aplica as regras básicas de xadrez, alterna o turno e atualiza o estado visual. O app deve impedir movimentos inválidos e indicar quando o rei está em xeque.

O fluxo de mídia permite que o usuário toque em **Microfone** para alternar entre ativo e mudo, e toque em **Câmera** para alternar entre ligada e desligada. Como a experiência com Jitsi pode depender do ambiente de execução, os botões também refletem o estado local da interface do app e são preparados para controlar a sessão quando o SDK/API nativo estiver disponível no ambiente final.

## Escolhas de cor e estilo

A identidade visual será inspirada em um clube de xadrez moderno e noturno, com contraste suficiente para leitura rápida durante uma partida. A paleta evita excesso de brilho para manter foco no tabuleiro e nos vídeos.

| Token | Cor | Uso |
|---|---|---|
| **Primária** | `#0F766E` | Botões principais, destaques de ação e indicadores ativos. |
| **Fundo claro** | `#F8F5EF` | Base clara com sensação de tabuleiro físico. |
| **Fundo escuro** | `#111827` | Experiência noturna e foco em vídeo. |
| **Superfície clara** | `#FFFFFF` | Cartões de lobby, painéis e vídeos. |
| **Superfície escura** | `#1F2937` | Cartões elevados no modo escuro. |
| **Casa clara do tabuleiro** | `#E8D8B6` | Casas claras inspiradas em madeira. |
| **Casa escura do tabuleiro** | `#8B5E34` | Casas escuras inspiradas em madeira. |
| **Seleção** | `#FACC15` | Destaque da peça selecionada e origem do lance. |
| **Ameaça / erro** | `#DC2626` | Xeque, erro de validação e estados críticos. |

## Diretrizes de interação móvel

Todas as ações primárias ficarão próximas ao terço inferior da tela para favorecer uso com uma mão. O tabuleiro será grande o suficiente para toques precisos, com casas quadradas e símbolos de peças em alto contraste. Os controles de mídia terão ícones e rótulos curtos, evitando que o usuário precise interpretar apenas cores. A interface seguirá padrões de toque do iOS/Android modernos, com cartões arredondados, espaçamento generoso, tipografia legível e feedback imediato para cada ação.

## Decisões técnicas iniciais

A primeira versão será construída em **React Native com Expo**, usando estado local para o tabuleiro e para os dados de sala. A integração Jitsi será feita por link de sala baseado em `https://meet.jit.si/{chave}`, aberto por componente/navegador compatível com Expo, e a estrutura será preparada para futura substituição por SDK nativo Jitsi quando o ambiente de build aceitar módulos nativos específicos. O jogo de xadrez usará uma implementação local de regras sem dependência externa inicial, para manter controle sobre o comportamento e evitar bloqueios de compatibilidade.

## Referências

[1]: https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/ "Jitsi Meet External API"
[2]: https://developer.apple.com/design/human-interface-guidelines "Apple Human Interface Guidelines"
