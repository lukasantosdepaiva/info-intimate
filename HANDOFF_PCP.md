# Handoff PCP — Special Decor (info-intimate)

Última atualização por agente Lovable.

## Estado atual

### 1. Consulta de Saldo (`src/routes/_pcp.pcp.saldos.tsx`)
- **Migrado** de `saldos_pallet` (join manual com `locais_estoque` +
  `pallets` + `referencias`) para a view `vw_saldo_disponivel_pallet`.
- Motivo: é a mesma fonte usada por `gerar_op_com_explosao` para calcular
  disponibilidade real (líquida de empenhos ativos). Antes, o PCP via
  saldo bruto e conflitava com o cálculo da RPC.
- Tela permanece **somente leitura**. Nenhuma lógica de movimentação
  adicionada.
- Busca agora cobre referência, descrição e código do pallet, com
  helpers null-safe (`textoExibicao`, `numeroSeguro`) e
  `toLocaleString("pt-BR")` em quantidades.
- Leitura de colunas é permissiva (com fallbacks) para tolerar variações
  entre revisões da view; se a view for renomeada, ajustar os `pick*`.

### 2. Combobox de SD no `GerarOpModal` (`src/routes/_pcp.pcp.ops.tsx`)
- Fonte trocada de `sds` (filtrando `ativo=true` + `referencia_id`) para
  `vw_sds_disponiveis` filtrando apenas por `referencia_id`.
- View expõe `id, numero_sd, referencia_id` — mesma UX, mas lista somente
  SDs efetivamente disponíveis para geração de OP.
- **Pendência não resolvida (não solicitada nesta tarefa):**
  bidirecionalidade produto ↔ SD (selecionar SD primeiro e inferir
  referência). Manter no backlog.

### 3. Erros de TypeScript (`tsc --noEmit`)
Ambos os erros relatados no handoff anterior estavam **fora do módulo
PCP** (Logística). Corrigidos:
- `src/routes/_app.index.tsx:398` — `<Link to="/saidas">` precisava do
  prop `search` (a rota tem `validateSearch`). Adicionado `search={{}}`.
- `src/routes/_app.inspecao.rnc.tsx:189` — `navigate({ to: "/rnc" })`
  usava rota inexistente; corrigido para `/rncs`.

`npx tsgo --noEmit` roda limpo após as correções.

## Verificações executadas
- `tsgo --noEmit`: sem erros.
- `prettier --write` aplicado nos arquivos alterados por este agente.
- `npm run lint`: ainda apresenta ~530 erros de prettier/formatting
  pré-existentes em arquivos NÃO tocados por esta tarefa (Logística,
  principalmente `_app.veiculos.tsx`, `_app.recebimento.tsx`, etc.). Não
  foram corrigidos para respeitar o escopo (só PCP + os 2 TS errors).

## Regras do módulo (mantidas)
- PCP não movimenta estoque; não seleciona lote/pallet manualmente.
- FEFO automático permanece intacto em `gerar_op_com_explosao`.
- Sem telas novas de pedido/demanda.

## Arquivos alterados nesta rodada
- `src/routes/_pcp.pcp.saldos.tsx` — refactor para `vw_saldo_disponivel_pallet`.
- `src/routes/_pcp.pcp.ops.tsx` — combobox SD via `vw_sds_disponiveis`.
- `src/routes/_app.index.tsx` — fix TS `<Link to="/saidas">` sem `search`.
- `src/routes/_app.inspecao.rnc.tsx` — fix TS rota `/rnc` → `/rncs`.
- `HANDOFF_PCP.md` — este arquivo.
