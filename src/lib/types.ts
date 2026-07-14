// Tipos compartilhados entre múltiplos arquivos do projeto.

// ─── Locais de Estoque ────────────────────────────────────────
export interface LocalRow {
  id: string;
  codigo_local: string;
  armazem_codigo: string;
  armazem_nome: string;
  galpao: string;
  rua: string;
  processo: string | null;
  descricao: string;
}

// ─── Pallets ──────────────────────────────────────────────────
export interface PalletResumo {
  id: string;
  codigo_pallet: string;
  status: string;
  quantidade_total?: number;
  nf_entrada_numero?: string | null;
  cliente_nome?: string | null;
  fornecedor_nome?: string | null;
  referencia_codigo?: string | null;
  sd_numero?: string | null;
  locais?: string | null;
  locais_e_saldos?: string | null;
  locais_saldos?: string | null;
}

export interface PalletBuscaRow {
  id: string;
  codigo_pallet: string;
  referencia_codigo: string;
  sd_numero: string | null;
  nf_entrada_numero: string | null;
  quantidade_total: number;
  status: string | null;
  locais_e_saldos: string | null;
}

// ─── OPs ──────────────────────────────────────────────────────
export interface OpResumo {
  id: string;
  numero_op: string;
  produto_final: string | null;
  referencia_codigo?: string;
  status_op: string | null;
}

export interface OpCompleta {
  id: string;
  numero_op: string;
  referencia_id: string;
  sd_id: string;
  cliente_id: string | null;
  produto_final: string;
  quantidade_op: number;
  status_op: string;
  observacao: string | null;
  created_by_pcp: boolean;
  op_pai_id?: string | null;
}

// ─── PCP: Estruturas de Produto (BOM) ─────────────────────────
export interface EstruturaProduto {
  id: string;
  referencia_id: string;
  revisao: number;
  status: string | null;
  data_inicio_vigencia: string | null;
  data_fim_vigencia: string | null;
  observacao: string | null;
  created_at?: string;
}

export interface EstruturaProdutoItem {
  id: string;
  estrutura_id: string;
  componente_id: string;
  quantidade: number;
  indice_perda: number | null;
  sequencia: number;
}

// ─── PCP: Roteiros de Produção ────────────────────────────────
export interface RoteiroProducao {
  id: string;
  referencia_id: string;
  descricao: string | null;
  ativo: boolean | null;
  created_at?: string;
}

export interface RoteiroOperacao {
  id: string;
  roteiro_id: string;
  sequencia: number;
  descricao: string;
  local_execucao_id: string | null;
  tempo_padrao_min: number | null;
}

// ─── PCP: Cronograma (view) ───────────────────────────────────
export interface CronogramaPcpRow {
  op_id: string;
  numero_op: string;
  produto_final: string | null;
  quantidade_op: number | null;
  status_op: string | null;
  op_pai_id: string | null;
  data_criacao: string | null;
  codigo_referencia: string | null;
  descricao_produto: string | null;
  data_prevista_veiculo: string | null;
  saida_vinculada_id: string | null;
}

// ─── Referências e SDs ────────────────────────────────────────
export interface ReferenciaRow {
  id: string;
  codigo_referencia: string;
  descricao: string;
}

export interface SdRow {
  id: string;
  numero_sd: string;
  referencia_id: string;
}

// ─── Feedback ao usuário ──────────────────────────────────────
export interface Feedback {
  sucesso: boolean;
  mensagem: string;
}
