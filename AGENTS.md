# AGENTS.md — Contrato Canônico Multi-Harness

Este é o documento de autoridade comum para todos os harnesses usados no projeto. Arquivos específicos de ferramenta devem apenas complementar ou apontar para estas regras.

## 1. Princípios de engenharia

- Torne premissas explícitas e pergunte quando uma variável crítica estiver ausente.
- Prefira a menor mudança que satisfaça critérios verificáveis.
- Não refatore código vizinho fora do escopo.
- Não declare sucesso sem executar a verificação correspondente.
- Preserve alterações do usuário e nunca use operações destrutivas sem alvo e autorização claros.
- Não versione, exponha ou envie segredos.

## 2. Início de tarefa

1. Leia este arquivo, o entrypoint do harness e `NOTES.md`.
2. Confirme objetivo, escopo, restrições e Definition of Done.
3. Verifique o estado real do repositório antes de editar.
4. Para tarefa substancial, registre o plano e a wave em `NOTES.md`.
5. Se memória persistente estiver configurada, recupere apenas o contexto relevante. Indisponibilidade da memória não bloqueia o trabalho local.

## 3. Trabalho paralelo

Nunca opere dois harnesses no mesmo diretório de trabalho. Cada executor recebe:

- um Git worktree e uma branch próprios;
- arquivos/áreas de responsabilidade explícitos;
- critérios de conclusão e comandos de verificação;
- obrigação de não editar arquivos reservados a outro executor.

O coordenador integra as branches somente após revisão e checks. Dependências entre waves devem ser serializadas.

## 4. Continuidade e hand-off

`NOTES.md` é a fonte local de continuidade. Ao fechar uma wave:

- atualize status, decisões e próximos passos;
- liste arquivos alterados e verificações realmente executadas;
- registre bloqueios e riscos sem esconder falhas;
- grave na memória persistente apenas decisões, padrões ou lições duráveis, quando configurada;
- não armazene segredos, dados pessoais ou contexto bruto desnecessário.

## 5. Fulltech Memory opcional

A integração com Fulltech Memory é um bônus, não uma dependência do template. Consulte `docs/fulltech-memory-integration.md`.

Quando as tools estiverem disponíveis, descubra seus nomes/capacidades em vez de assumir prefixos. Projetos legados podem expor tools `muninn_*`; trate-as como compatibilidade, não como identidade principal do produto.

## 6. Falhas de tools e relatos

Diferencie erro recuperável de provável defeito:

- valide argumentos, formato, permissões e disponibilidade;
- faça no máximo uma repetição segura quando houver razão concreta;
- registre no hand-off o comando/tool, classe do erro e impacto;
- jamais envie automaticamente conversa, código, caminhos privados ou payloads.

Se evidência externa puder ajudar, mostre ao usuário exatamente o trecho sanitizado e peça consentimento explícito antes do envio. Recusa não pode bloquear o uso do produto. O destino deve ser privado e rastreável.

## 7. Git, segurança e qualidade

- Branches: `feat/<wave>-<descricao>`, `fix/<descricao>`, `chore/<descricao>`.
- Commits: Conventional Commits.
- Sem force-push em `main`.
- Dependências novas exigem justificativa e auditoria.
- TypeScript não usa `any` sem justificativa técnica.
- Faça revisão de segurança para autenticação, autorização, criptografia, upload, execução de comandos e dados sensíveis.
