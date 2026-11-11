# Performance checklist (31 itens)

Base de auditoria e melhoria de performance para apps gerados com o starter pack. Cada item tem a camada, o sintoma que ele resolve e como verificar.

- **Fonte:** reel de @gustagoat.ai, "Claude, eu não quero que o meu app de vibe coding fique lento e perca usuário" ([link](https://www.instagram.com/reel/Dfby7sPgMPU/)). Extraído em 2026-11-11 a partir do texto na tela; o áudio não foi transcrito.
- **Numeração:** `#N` é a ordem do vídeo, mantida para rastreio. As seções agrupam por camada, com Medição primeiro: sem baseline não dá para provar que um item melhorou algo.
- **Uso:** copie a seção relevante para o card (`backlog task create`) ou para o `## Verify` de uma wave. Item que não se aplica ao projeto: marque `N/A` com o motivo, não apague.

## Medição (faça antes de otimizar)

- [ ] **#18 Rastrear requisições lentas com OpenTelemetry.** Sintoma: não se sabe qual etapa (auth, query, API externa, render) é o gargalo. Verificar: trace de uma rota crítica mostra spans por etapa e o mais lento é identificável.
- [ ] **#30 Monitorar a velocidade dos usuários reais (RUM).** Sintoma: o app é rápido no seu PC e lento na ponta. Verificar: métricas de campo (p75 de LCP/INP/TTFB) coletadas em produção.
- [ ] **#31 Testar no celular e em rede lenta.** Sintoma: experiência quebra em aparelho fraco. Verificar: teste com throttling de CPU (4x) e rede (3G) passa nos fluxos principais.

## Frontend

- [ ] **#1 Skeleton de carregamento.** Sintoma: tela vazia ou saltos de layout ao carregar. Verificar: conteúdo aparece no mesmo lugar do placeholder; CLS baixo.
- [ ] **#4 Debounce na busca e no autocompletar.** Sintoma: uma requisição por tecla. Verificar: digitar uma palavra gera uma única chamada após a pausa.
- [ ] **#11 Remover dependências não usadas.** Sintoma: bundle carrega pacotes que ninguém importa. Verificar: análise de dependências (ex.: `depcheck`, `knip`) sem pendências; tamanho do bundle medido antes e depois.
- [ ] **#14 Atualizar a tela sem esperar o servidor (UI otimista).** Sintoma: clique só responde após o round-trip. Verificar: a ação reflete na hora e reverte com aviso se o servidor falhar.
- [ ] **#15 Lazy loading nas imagens fora da tela.** Sintoma: todas as imagens baixam no primeiro acesso. Verificar: só as imagens visíveis aparecem na aba Network no carregamento inicial.
- [ ] **#21 Carregar scripts de terceiros depois da página.** Sintoma: chat, analytics e anúncios bloqueiam a renderização. Verificar: scripts com `defer`/`async` ou carregados após o evento de load.
- [ ] **#22 Dividir o JavaScript por página (code splitting).** Sintoma: `app.js` único com o código de todas as rotas. Verificar: cada rota baixa só o próprio chunk.
- [ ] **#23 Virtualizar listas longas.** Sintoma: milhares de itens desenhados no DOM. Verificar: o DOM tem só os itens visíveis mais uma margem.
- [ ] **#26 Evitar re-render desnecessário.** Sintoma: tudo redesenha a cada clique. Verificar: profiler mostra só os componentes afetados renderizando.
- [ ] **#29 Hospedar as fontes e limitar os pesos.** Sintoma: fonte vem de servidor externo com muitos pesos. Verificar: fontes servidas pelo próprio domínio, só os pesos usados.

## Rede

- [ ] **#2 Servir imagens em WebP ou AVIF.** Sintoma: PNG/JPEG pesados. Verificar: imagens em formato moderno, com tamanhos responsivos (`srcset`).
- [ ] **#6 Servir arquivos estáticos por uma CDN.** Sintoma: todo asset busca na origem, longe do usuário. Verificar: assets respondem com header de cache da CDN (hit).
- [ ] **#9 Ativar compressão Brotli ou Gzip.** Sintoma: respostas JSON/HTML trafegam sem compressão. Verificar: `Content-Encoding: br` ou `gzip` nas respostas de texto.
- [ ] **#27 Cache dos estáticos no navegador.** Sintoma: segunda visita baixa tudo de novo. Verificar: `Cache-Control` com `max-age` longo e nomes de arquivo com hash.

## API

- [ ] **#3 Evitar chamadas duplicadas na API.** Sintoma: o mesmo dado buscado várias vezes (ex.: cabeçalho, perfil e menu). Verificar: uma requisição por recurso por carregamento (deduplicação ou cache de cliente).
- [ ] **#5 Paginar os resultados da API.** Sintoma: 2.000 itens devolvidos de uma vez. Verificar: endpoint aceita limite/cursor e devolve página fixa (ex.: 20).
- [ ] **#12 Timeout nas APIs externas.** Sintoma: tela presa em "processando" quando o terceiro trava. Verificar: chamada externa tem timeout explícito e a UI oferece "tentar de novo".
- [ ] **#13 Transmitir a resposta da IA token a token (streaming).** Sintoma: tela parada até a resposta inteira chegar. Verificar: a primeira palavra aparece em menos de 1 s.
- [ ] **#16 Disparar em paralelo as requisições independentes.** Sintoma: chamadas em série somando latência. Verificar: requisições sem dependência entre si saem ao mesmo tempo (ex.: `Promise.all`).

## Backend

- [ ] **#7 Mandar as tarefas lentas para uma fila.** Sintoma: gerar PDF, enviar e-mail ou backup trava a requisição. Verificar: endpoint responde na hora e um worker processa em segundo plano.
- [ ] **#10 Cache no Redis dos dados mais consultados.** Sintoma: consulta lenta repetida a cada acesso. Verificar: leituras quentes servidas do cache, com TTL e invalidação definidos.
- [ ] **#19 Colocar o servidor perto do banco de dados.** Sintoma: ida e volta longa entre regiões. Verificar: app e banco na mesma região, em rede privada.
- [ ] **#20 Renderizar no servidor ou no build (SSR/SSG).** Sintoma: tela em branco até o JS chegar. Verificar: o HTML inicial já traz o conteúdo.
- [ ] **#28 Distribuir o tráfego entre várias instâncias.** Sintoma: uma instância cai e o app cai junto. Verificar: balanceador com health check desvia o tráfego de uma instância derrubada.

## Banco de dados

- [ ] **#8 Corrigir as consultas N+1.** Sintoma: uma consulta por item da lista. Verificar: log de queries mostra número constante de consultas por requisição (join ou carregamento em lote).
- [ ] **#17 Criar índices para as consultas mais comuns.** Sintoma: full scan em busca por campo frequente. Verificar: `EXPLAIN` usa índice nas consultas críticas.
- [ ] **#24 Pedir só as colunas necessárias.** Sintoma: `SELECT *` trafega a tabela inteira. Verificar: queries listam colunas explicitamente.
- [ ] **#25 Usar um pool de conexões.** Sintoma: nova conexão aberta a cada requisição. Verificar: pool configurado com tamanho definido e conexões reaproveitadas.
