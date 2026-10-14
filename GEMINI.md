# GEMINI.md — Antigravity / Gemini Entrypoint

Leia primeiro [AGENTS.md](AGENTS.md) e [NOTES.md](NOTES.md). As regras arquiteturais canônicas ficam em [rules/](rules/); a documentação em [docs/](docs/); e as skills espelhadas em `.agents/skills/`.

## Projeto

- **Produto:** <nome>
- **Papel preferencial:** Planejamento profundo, UI/UX, integração fullstack, browser testing e inspeção visual.
- **Memória persistente:** opcional via MCP; veja [docs/fulltech-memory-integration.md](docs/fulltech-memory-integration.md)

## Slash Commands Recomendados

- `/plan`: Planejamento arquitetural rigoroso antes de alterações complexas.
- `/goal`: Execução de ondas orientadas a metas computacionais verificáveis com teto de tentativas.
- `/compact`: Compactação de contexto (preserva estado com snapshot).
- `/boost`: Análise profunda e verificação de múltiplas perspectivas.
- `/schedule`: Automação e monitoramento periódico de tarefas.

## Comandos do Projeto

```bash
make install          # Instala dependências da stack e CLI backlog.md
make dev              # Inicia o servidor local de desenvolvimento
make lint             # Roda linters
make typecheck        # Checagem de tipagem estrita
make test             # Executa testes
make audit            # Executa auditoria do SafeCode Guardian
make verify           # Verificação end-to-end com evidências
make board            # Inicia o Kanban Fulltech em tempo real SSE
make backlog-browser  # Inicia o Backlog.md Browser oficial (http://localhost:6420)
make board-all        # Inicia ambos os boards simultaneamente (3100 + 6420)
make new-project      # Cria um novo repositório a partir deste starter pack
make retrofit         # Adequa repositório existente ao starter pack (make retrofit TARGET=...)
```

## Operação

1. **Confirmação de Escopo:** Confirme a wave e a Definition of Done em `NOTES.md` antes de codificar.
2. **Isolamento em Worktree:** Trabalhe somente no worktree atribuído (`make worktree-new NAME=<wave>`).
3. **Evidência Real:** Nunca declare sucesso sem executar ferramentas que comprovem o funcionamento (`make verify`).
4. **Inspeção de UI:** Valide fluxos no navegador, incluindo estados vazios, erros, loading e responsividade, consultando [ux-designer](.claude/skills/ux-designer/SKILL.md).
5. **Atualização do Hand-off:** Atualize `NOTES.md` com arquivos modificados e evidências observadas.
