---
name: readme-format
description: >-
  Padroniza o README.md de projetos Fulltech no formato "produto navegável"
  inspirado no Archify (tt-a1i/archify): proposta de valor em uma frase, quick
  start, diagrama de arquitetura e "como funciona" antes de qualquer outra
  seção. Use ao criar o README inicial de um projeto, ao fechar uma wave que
  mude a arquitetura, ou quando pedirem "documenta o projeto", "atualiza o
  README", "formata a documentação". Não copia elementos de marketing de
  produto open source (sponsors, comunidade, badges de estrelas) que não se
  aplicam a repositórios internos.
allowed-tools: Read, Grep, Glob, Bash
---

# README format — padrão Fulltech (inspirado em Archify)

Referência de estilo: [tt-a1i/archify README_EN.md](https://github.com/tt-a1i/archify/blob/main/README_EN.md).
Aproveite a estrutura (o leitor entende o produto e já sabe rodar em menos de um
minuto de leitura) e o princípio de "diagrama como prova", não o conteúdo de
marketing de produto open source.

## Ordem obrigatória de seções

1. **Título + proposta de valor em uma frase.** Sem jargão interno; quem nunca viu o
   projeto entende o que ele faz. Logo abaixo do título, inclua a logo do projeto:
   `docs/assets/logo.svg` (ou `.png`) se o projeto já tiver uma; caso contrário, use
   o fallback genérico `docs/assets/fulltech-generic-logo.svg` do
   `multi-harness-starter-pack` (copie-o para o projeto na primeira geração do
   README). Nunca deixe a imagem sem `alt` nem sem link de origem quando for um
   placeholder.
2. **Quick start.** Comandos reais e testados (`make install`, `make dev`,
   `backlog board` ou equivalente). Sem passos que dependam de acesso que o leitor
   não tem.
3. **Diagrama de arquitetura.** Obrigatório. No mínimo um diagrama Mermaid versionado
   no próprio README (renderiza nativamente no GitHub/VS Code, sem dependência
   externa). A skill **Archify** (`tt-a1i/archify`) está instalada globalmente
   (`~/.claude/skills/archify`, `~/.agents/skills/archify`); quando ela gerar o HTML
   interativo, salve o artefato em `docs/architecture/<nome>.html`, referencie no
   README (`[ver diagrama interativo](docs/architecture/<nome>.html)`) e mantenha o
   Mermaid como fonte portátil, nunca substituída — o HTML nunca deve ser o único
   registro do diagrama.
4. **Como funciona.** Tabela curta passo → o que acontece (mesmo estilo da seção
   "How it works" do Archify), ligada ao diagrama.
5. **Estrutura do repositório.** Árvore de diretórios relevante (sem gerar árvore
   completa de `node_modules`, `.git`, etc.).
6. **Referência.** Links para `AGENTS.md`, `NOTES.md`, spec/ADRs do projeto
   (`backlog/decisions/`), runbooks relacionados. Sem duplicar conteúdo, só linkar.
7. **Licença**, se o repositório tiver uma.

## Fora de escopo (não incluir)

Badges de estrelas/trending, seção de sponsors, comunidade (Discord/WeChat/QQ),
star history, links afiliados, changelog completo embutido (linke para
`CHANGELOG.md` ou para o histórico do Backlog.md em vez de colar seções inteiras).
Repositório interno da Fulltech não é produto open source e não precisa simular um.

## Frases de acionamento

O roteador de skills casa por similaridade semântica com a `description`, não por
comando exato — mas estas frases são as que mais confiavelmente acionam cada uma:

- `readme-format`: "documenta o projeto", "documenta a wave X", "atualiza o
  README", "formata a documentação (readme-format)", "gera o README no padrão
  Fulltech".
- `archify` (skill irmã, usada na seção 3 acima): "gera o diagrama de
  arquitetura", "visualiza a arquitetura do sistema", "cria um diagrama
  interativo do fluxo X", "converte esse Mermaid pro Archify".
- Fluxo combinado (README + diagrama interativo): "documenta a arquitetura do
  projeto com diagrama".
- Sem depender do roteador, cite o nome exato: "usa a skill `readme-format`" /
  "usa a skill `archify`".

## Higiene de `docs/assets`

`docs/assets` guarda só o que o README (ou outro doc linkado) referencia de fato:
logo do projeto, fallback genérico, e artefatos de diagrama quando aplicável. Antes
de fechar a atualização do README, confira a pasta: todo arquivo nela precisa ter
ao menos um link apontando para ele em algum `.md` versionado; arquivo órfão,
duplicado ou deixado por uma geração anterior do diagrama é lixo e deve ser
removido no mesmo commit. Não vendorize aqui assets de marketing de terceiros
(sponsors, banners, QR codes) mesmo que uma skill de terceiros (como o Archify)
traga os seus próprios em outro lugar do sistema.

## Como aplicar

1. Releia `SPEC.md`/`NOTES.md`/`backlog/` para extrair componentes e fluxo reais;
   não invente arquitetura que a spec não sustenta.
2. Escreva o diagrama Mermaid a partir do fluxo documentado (`flowchart` ou
   `sequenceDiagram`, o que representar melhor o sistema).
3. Gere o README seguindo a ordem acima. Cada seção deve caber na tela sem scroll
   excessivo; detalhe longo vai para docs linkados, não para o README.
4. Se o README já existir, atualize por seção preservando conteúdo correto; não
   reescreva do zero sem necessidade.
5. Rode uma revisão final conferindo que nenhuma seção "fora de escopo" foi
   adicionada e que todo link aponta para arquivo existente no repositório.
