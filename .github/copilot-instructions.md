# copilot-instructions.md — GitHub Copilot Entrypoint

Leia primeiro [AGENTS.md](../AGENTS.md) e [NOTES.md](../NOTES.md). As regras arquiteturais ficam em [rules/](../rules/); a documentação em [docs/](../docs/); e as skills espelhadas em `.agents/skills/`.

## Projeto

- **Produto:** <nome>
- **Papel preferencial:** Pair programming no editor (chat e agent mode), edições cirúrgicas, geração de testes e revisão de PRs.
- **Memória persistente:** opcional; veja [docs/fulltech-memory-integration.md](../docs/fulltech-memory-integration.md)

## Comandos

```bash
make install       # Instala dependências
make dev           # Inicia o servidor local
make lint          # Executa linters
make typecheck     # Checagem de tipos
make test          # Executa testes unitários
make audit         # Auditoria do SafeCode Guardian
make verify        # Verificação end-to-end com evidências
```

## Operação

- **Reancoragem:** Reancore a sessão no estado registrado em `NOTES.md`.
- **Planejamento:** Para tarefas não-triviais, confirme objetivo, requisitos e Definition of Done antes de editar.
- **Trabalho Paralelo:** Opere apenas no worktree atribuído (`make worktree-new NAME=<wave>`).
- **Padrão de Código:** Tipagem estrita sem `any`, tratamento defensivo de exceções, ausência de queries SQL concatenadas e validação obrigatória no backend.
- **Skills:** Consulte as skills em `.agents/skills/` (`commit`, `code-review-b2`, `security-check`, `ux-designer`).
- **Hand-off:** Ao concluir, registre em `NOTES.md` os arquivos alterados e os comandos executados com sucesso.
