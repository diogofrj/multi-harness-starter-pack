---
name: readme-format
description: Padroniza o README.md de projetos Fulltech no formato "produto navegável" inspirado no Archify (tt-a1i/archify): proposta de valor em uma frase, quick start, diagrama de arquitetura e "como funciona" antes de qualquer outra seção. Use ao criar o README inicial de um projeto, ao fechar uma wave que mude a arquitetura, ou quando pedirem "documenta o projeto", "atualiza o README", "formata a documentação". Não copia elementos de marketing de produto open source (sponsors, comunidade, badges de estrelas) que não se aplicam a repositórios internos.
allowed-tools: Read, Grep, Glob, Bash
---

# README format — padrão Fulltech (inspirado em Archify)

Referência de estilo: [tt-a1i/archify README_EN.md](https://github.com/tt-a1i/archify/blob/main/README_EN.md).
Aproveite a estrutura (o leitor entende o produto e já sabe rodar em menos de um
minuto de leitura) e o princípio de "diagrama como prova", não o conteúdo de
marketing de produto open source.

## Ordem obrigatória de seções

1. **Título + proposta de valor em uma frase.** Sem jargão interno; quem nunca viu o
   projeto entende o que ele faz.
2. **Quick start.** Comandos reais e testados (`make install`, `make dev`,
   `backlog board` ou equivalente). Sem passos que dependam de acesso que o leitor
   não tem.
3. **Diagrama de arquitetura.** Obrigatório. No mínimo um diagrama Mermaid versionado
   no próprio README (renderiza nativamente no GitHub/VS Code, sem dependência
   externa). Se o harness tiver a skill **Archify** instalada
   (`npx skills add tt-a1i/archify -g`), gere também o HTML interativo como artefato
   complementar em `docs/architecture/` e linke a partir do README — ele nunca
   substitui o Mermaid, porque o Mermaid é a versão portátil e sem JavaScript.
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
