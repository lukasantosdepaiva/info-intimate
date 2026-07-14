
# Módulo PCP — Plano de implementação

## Escopo

Criar um novo módulo "PCP" separado, visível apenas para perfis `pcp` e `admin`, sem alterar nada do módulo de Logística.

O arquivo atual `src/routes/_app.pcp.tsx` (lista simples de OPs) será **substituído** por uma landing/redirect do módulo, e as funcionalidades serão movidas/expandidas nas novas subrotas. Nenhuma tabela/RPC do banco será alterada — o banco (tfppcbjphnfjbbbkotlm) já tem `estruturas_produto`, `estruturas_produto_itens`, `roteiros_producao`, `roteiro_operacoes`, `ops_pcp` (com `op_pai_id`), `vw_cronograma_pcp` e a RPC `gerar_op_com_explosao`.

## Estrutura de rotas

```
src/routes/
  _app.pcp.tsx                        → layout do módulo (guard perfil + sub-nav + <Outlet />)
  _app.pcp.index.tsx                  → Dashboard (vw_cronograma_pcp)
  _app.pcp.estruturas.tsx             → Lista de BOMs
  _app.pcp.estruturas.$id.tsx         → Editor de BOM (criar/editar + nova revisão)
  _app.pcp.roteiros.tsx               → Lista de roteiros
  _app.pcp.roteiros.$id.tsx           → Editor de roteiro
  _app.pcp.ops.tsx                    → Lista de OPs com hierarquia + botão "Gerar OP"
  _app.pcp.saldos.tsx                 → Consulta de saldo (read-only)
```

## Telas

### 1. Dashboard (`/pcp`)
- Consulta `vw_cronograma_pcp` via `getSupabase()`.
- Filtro por semana (input `week` nativo) — filtra client-side ou por range de datas.
- Tabela com colunas principais da view (OP, produto, quantidade, data planejada, status). Timeline visual simples: barra proporcional dentro de cada linha por semana.

### 2. Estruturas de Produto (`/pcp/estruturas`)
- Lista: produto pai (join `referencias`), revisão, vigência (`data_inicio_vigencia`/`data_fim_vigencia`), `status_estrutura`.
- Filtro por status (ativa/inativa) e busca por referência.
- Editor `/pcp/estruturas/$id` (`$id = "novo"` cria):
  - Seleciona `referencia_id` (produto pai)
  - Itens: componente (referencia), quantidade, índice de perda (%), sequência
  - Salvar cria linha em `estruturas_produto` + linhas em `estruturas_produto_itens`
  - Botão "Nova revisão a partir desta": duplica com `revisao + 1`, marca a antiga com `status = 'inativa'` e `data_fim_vigencia = now()`. Feito em transação client via 2 updates + 1 insert (ordem segura); ideal seria RPC mas usaremos ops sequenciais com tratamento de erro.
  - Revisão vigente não é editável — só permite "criar nova revisão" ou editar campos não-vigência (observação).

### 3. Roteiros (`/pcp/roteiros`)
- Lista `roteiros_producao` com join em `referencias`.
- Editor: operações em sequência (sequência, descrição, `local_execucao_id` de `locais_estoque` via contexto, tempo padrão min).
- Drag-and-drop opcional — usar apenas input numérico de sequência para manter simples.

### 4. Ordens de Produção (`/pcp/ops`)
- Lista `ops_pcp` com joins (`referencias`, `sds`, `clientes`), filtros por `status_op`, produto, cliente.
- Renderização hierárquica: ops com `op_pai_id = null` no topo; filhas indentadas com ícone `CornerDownRight` sob a pai.
- Botão "Gerar OP": modal com referência, SD (filtrada por referência), cliente, quantidade, produto_final → chama RPC:
  ```ts
  supabase.rpc('gerar_op_com_explosao', {
    p_referencia_id, p_sd_id, p_cliente_id, p_quantidade, p_produto_final
  })
  ```
- Após sucesso, refetch da lista. Toast mostra quantas OPs foram geradas (pai + filhas).

### 5. Consulta de Saldo (`/pcp/saldos`)
- Somente leitura. Query em `saldos_pallet` com join em `locais_estoque` e `referencias`.
- Filtros: referência, armazém (do contexto `locais-estoque-context`).
- **Nenhum** botão de ação, movimentação, edição.

## Guardas de acesso

- Layout `_app.pcp.tsx` usa `usePerfil()` (já existe em `src/hooks/use-perfil.ts`) e renderiza `<PageGuard>` ou redirect se perfil não é `pcp` nem `admin`.
- `src/lib/perfis.ts` → `ROTAS_POR_PERFIL.pcp` já inclui `/pcp`. Adicionar as subrotas (`/pcp/estruturas`, `/pcp/roteiros`, `/pcp/ops`, `/pcp/saldos`) ao array de `admin` e `pcp`.
- Botões de escrita (criar/editar/nova revisão/gerar OP) só renderizam se `perfil in ('pcp','admin')`. RLS no banco continua sendo a fonte de verdade.

## Navegação lateral

- `src/components/app-sidebar.tsx`: adicionar entrada "PCP" (visível conforme `ROTAS_POR_PERFIL`), com submenu para as 5 telas quando a rota atual estiver sob `/pcp`. Se o sidebar atual não suportar submenu, uso uma sub-nav interna dentro do layout `_app.pcp.tsx` (tabs no topo do módulo) — abordagem preferida para não mexer no sidebar global.

## Tipos compartilhados

Adicionar em `src/lib/types.ts`:
```ts
export interface EstruturaProduto { id; referencia_id; revisao; status_estrutura; data_inicio_vigencia; data_fim_vigencia; observacao; }
export interface EstruturaProdutoItem { id; estrutura_id; componente_id; quantidade; indice_perda; sequencia; }
export interface RoteiroProducao { id; referencia_id; descricao; ativo; }
export interface RoteiroOperacao { id; roteiro_id; sequencia; descricao; local_execucao_id; tempo_padrao_min; }
export interface CronogramaPcpRow { /* colunas da view */ }
export interface SaldoPalletRow { /* saldos_pallet + joins */ }
```

## Regras não-negociáveis

- Não alterar arquivos do módulo Logística (`_app.movimentacoes`, `_app.recebimento`, `_app.saidas`, `_app.veiculos`, `_app.estoque`, `_app.pallets.*`).
- Não editar `routeTree.gen.ts` (auto-gerado).
- Não usar `service_role`.
- Não mesclar movimentação/recebimento no módulo PCP.
- Manter padrão `getSupabase()`, `useCallback`/`useEffect`, shadcn/ui, Tailwind.
- Reusar `LocalCascadeSelector` e `useLocaisEstoque()` onde couber.
- Reusar tipos já em `src/lib/types.ts`.

## Ordem de execução

1. Ampliar `src/lib/types.ts` com tipos PCP.
2. Atualizar `src/lib/perfis.ts` com novas subrotas para `admin` e `pcp`.
3. Substituir `_app.pcp.tsx` por layout com sub-nav + `<Outlet />` + guard.
4. Criar `_app.pcp.index.tsx` (Dashboard).
5. Criar `_app.pcp.ops.tsx` (migrando/refatorando a UI existente + hierarquia + botão "Gerar OP" chamando RPC).
6. Criar `_app.pcp.estruturas.tsx` + `_app.pcp.estruturas.$id.tsx`.
7. Criar `_app.pcp.roteiros.tsx` + `_app.pcp.roteiros.$id.tsx`.
8. Criar `_app.pcp.saldos.tsx`.
9. Verificar typecheck e ajustar.

## Pontos que preciso confirmar antes de codar

1. **Nomes exatos de colunas** da view `vw_cronograma_pcp`, tabela `saldos_pallet`, `estruturas_produto` (`status_estrutura`? `status`?) e `roteiros_producao`. Posso inferir e ajustar reativamente se der erro em runtime, mas preferia confirmação — ou posso simplesmente `select("*")` e renderizar dinamicamente as chaves principais que existirem.
2. **Sidebar**: adiciono link "PCP" no sidebar global apontando para `/pcp` e uso sub-nav (tabs) dentro do módulo? (essa é minha proposta padrão). Ou você quer submenu expansível no sidebar?
3. A tela atual `_app.pcp.tsx` com o form "Nova OP" simples (sem explosão) — posso remover totalmente e substituir pela versão com `gerar_op_com_explosao`, certo? A RPC substitui o insert manual.

Se estiver tudo ok, executo os 9 passos em sequência.
