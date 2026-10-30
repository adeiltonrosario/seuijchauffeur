export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      acessos_modulos: {
        Row: {
          criado_em: string
          email: string
          modulo: string
        }
        Insert: {
          criado_em?: string
          email: string
          modulo: string
        }
        Update: {
          criado_em?: string
          email?: string
          modulo?: string
        }
        Relationships: []
      }
      candidaturas_corrida: {
        Row: {
          categoria: string
          corrida_id: string
          criado_em: string
          id: string
          motorista_email: string
          motorista_nome: string
          placa: string
          status: string
          veiculo: string
        }
        Insert: {
          categoria?: string
          corrida_id: string
          criado_em?: string
          id?: string
          motorista_email: string
          motorista_nome: string
          placa?: string
          status?: string
          veiculo?: string
        }
        Update: {
          categoria?: string
          corrida_id?: string
          criado_em?: string
          id?: string
          motorista_email?: string
          motorista_nome?: string
          placa?: string
          status?: string
          veiculo?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidaturas_corrida_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
        ]
      }
      carteira_admin_movimentos: {
        Row: {
          chave: string | null
          criado_em: string
          descricao: string
          id: string
          lote_origem: string | null
          quantidade: number
          ref: string | null
          responsavel: string | null
          tipo: string
        }
        Insert: {
          chave?: string | null
          criado_em?: string
          descricao?: string
          id?: string
          lote_origem?: string | null
          quantidade: number
          ref?: string | null
          responsavel?: string | null
          tipo: string
        }
        Update: {
          chave?: string | null
          criado_em?: string
          descricao?: string
          id?: string
          lote_origem?: string | null
          quantidade?: number
          ref?: string | null
          responsavel?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "carteira_admin_movimentos_lote_origem_fkey"
            columns: ["lote_origem"]
            isOneToOne: false
            referencedRelation: "credito_lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      carteira_km_movimentos: {
        Row: {
          agendamento_id: string | null
          ciclo: number | null
          cliente_email: string
          criado_em: string
          id: string
          justificativa: string | null
          km: number
          origem: string
          pedido_id: string | null
          responsavel: string | null
          saldo_anterior: number
          saldo_posterior: number
          tipo: string
        }
        Insert: {
          agendamento_id?: string | null
          ciclo?: number | null
          cliente_email: string
          criado_em?: string
          id?: string
          justificativa?: string | null
          km: number
          origem?: string
          pedido_id?: string | null
          responsavel?: string | null
          saldo_anterior: number
          saldo_posterior: number
          tipo: string
        }
        Update: {
          agendamento_id?: string | null
          ciclo?: number | null
          cliente_email?: string
          criado_em?: string
          id?: string
          justificativa?: string | null
          km?: number
          origem?: string
          pedido_id?: string | null
          responsavel?: string | null
          saldo_anterior?: number
          saldo_posterior?: number
          tipo?: string
        }
        Relationships: []
      }
      casas_de_apoio: {
        Row: {
          ativa: boolean
          criado_em: string
          endereco: string
          id: string
          municipio: string
          nome: string
          telefone: string
        }
        Insert: {
          ativa?: boolean
          criado_em?: string
          endereco: string
          id?: string
          municipio?: string
          nome: string
          telefone?: string
        }
        Update: {
          ativa?: boolean
          criado_em?: string
          endereco?: string
          id?: string
          municipio?: string
          nome?: string
          telefone?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          criado_em: string
          email: string
          id: string
          nome: string
          telefone_whatsapp: string
        }
        Insert: {
          criado_em?: string
          email: string
          id?: string
          nome: string
          telefone_whatsapp: string
        }
        Update: {
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          telefone_whatsapp?: string
        }
        Relationships: []
      }
      codigos_indicacao: {
        Row: {
          codigo: string
          criado_em: string
          titular_email: string
          titular_nome: string
        }
        Insert: {
          codigo: string
          criado_em?: string
          titular_email: string
          titular_nome?: string
        }
        Update: {
          codigo?: string
          criado_em?: string
          titular_email?: string
          titular_nome?: string
        }
        Relationships: []
      }
      compras_saldao: {
        Row: {
          atualizado_em: string
          cliente_email: string
          criado_em: string
          id: string
          lote_id: string | null
          oferta_id: string
          provedor: string
          provedor_pagamento_id: string | null
          quantidade: number
          reserva_expira_em: string
          status: string
          valor: number
        }
        Insert: {
          atualizado_em?: string
          cliente_email: string
          criado_em?: string
          id?: string
          lote_id?: string | null
          oferta_id: string
          provedor?: string
          provedor_pagamento_id?: string | null
          quantidade: number
          reserva_expira_em: string
          status?: string
          valor: number
        }
        Update: {
          atualizado_em?: string
          cliente_email?: string
          criado_em?: string
          id?: string
          lote_id?: string | null
          oferta_id?: string
          provedor?: string
          provedor_pagamento_id?: string | null
          quantidade?: number
          reserva_expira_em?: string
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_saldao_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "credito_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_saldao_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas_saldao"
            referencedColumns: ["id"]
          },
        ]
      }
      corridas: {
        Row: {
          atualizado_em: string
          capacidade: number
          categoria: string
          cliente: string
          cliente_email: string
          cliente_whatsapp: string
          criado_em: string
          desembarque: string
          embarque: string
          id: string
          ida: string
          modalidade: string
          motorista: string
          pagamento: string
          parada: string | null
          retorno: string | null
          status: string
          valor: number
          veiculo: string
        }
        Insert: {
          atualizado_em?: string
          capacidade?: number
          categoria?: string
          cliente: string
          cliente_email?: string
          cliente_whatsapp?: string
          criado_em?: string
          desembarque: string
          embarque: string
          id: string
          ida: string
          modalidade: string
          motorista?: string
          pagamento?: string
          parada?: string | null
          retorno?: string | null
          status?: string
          valor?: number
          veiculo?: string
        }
        Update: {
          atualizado_em?: string
          capacidade?: number
          categoria?: string
          cliente?: string
          cliente_email?: string
          cliente_whatsapp?: string
          criado_em?: string
          desembarque?: string
          embarque?: string
          id?: string
          ida?: string
          modalidade?: string
          motorista?: string
          pagamento?: string
          parada?: string | null
          retorno?: string | null
          status?: string
          valor?: number
          veiculo?: string
        }
        Relationships: []
      }
      credito_config: {
        Row: {
          atualizado_em: string
          creditos_por_km: number
          id: boolean
          preco_credito: number
          taxa_cofre: number
          validade_cofre_meses: number
        }
        Insert: {
          atualizado_em?: string
          creditos_por_km?: number
          id?: boolean
          preco_credito?: number
          taxa_cofre?: number
          validade_cofre_meses?: number
        }
        Update: {
          atualizado_em?: string
          creditos_por_km?: number
          id?: boolean
          preco_credito?: number
          taxa_cofre?: number
          validade_cofre_meses?: number
        }
        Relationships: []
      }
      credito_lotes: {
        Row: {
          cliente_email: string
          concedido_em: string
          id: string
          local: string
          lote_pai: string | null
          origem: string
          origem_ref: string | null
          quantidade: number
          saldo: number
          status: string
          vence_em: string
        }
        Insert: {
          cliente_email: string
          concedido_em?: string
          id?: string
          local?: string
          lote_pai?: string | null
          origem: string
          origem_ref?: string | null
          quantidade: number
          saldo: number
          status?: string
          vence_em: string
        }
        Update: {
          cliente_email?: string
          concedido_em?: string
          id?: string
          local?: string
          lote_pai?: string | null
          origem?: string
          origem_ref?: string | null
          quantidade?: number
          saldo?: number
          status?: string
          vence_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "credito_lotes_lote_pai_fkey"
            columns: ["lote_pai"]
            isOneToOne: false
            referencedRelation: "credito_lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      credito_transacoes: {
        Row: {
          chave: string | null
          cliente_email: string
          criado_em: string
          descricao: string
          id: string
          lote_id: string | null
          quantidade: number
          ref: string | null
          responsavel: string | null
          tipo: string
        }
        Insert: {
          chave?: string | null
          cliente_email: string
          criado_em?: string
          descricao?: string
          id?: string
          lote_id?: string | null
          quantidade: number
          ref?: string | null
          responsavel?: string | null
          tipo: string
        }
        Update: {
          chave?: string | null
          cliente_email?: string
          criado_em?: string
          descricao?: string
          id?: string
          lote_id?: string | null
          quantidade?: number
          ref?: string | null
          responsavel?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "credito_transacoes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "credito_lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_corrida: {
        Row: {
          corrida_id: string
          criado_em: string
          id: string
          origem: string
          texto_mediado: string
        }
        Insert: {
          corrida_id: string
          criado_em?: string
          id?: string
          origem: string
          texto_mediado: string
        }
        Update: {
          corrida_id?: string
          criado_em?: string
          id?: string
          origem?: string
          texto_mediado?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_corrida_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
        ]
      }
      modalidades: {
        Row: {
          caracteristicas: string
          criado_em: string
          franquia_km: number
          nome: string
          por_km: number
          por_turno: boolean
          valor_base: number
          valor_turno: number
        }
        Insert: {
          caracteristicas?: string
          criado_em?: string
          franquia_km?: number
          nome: string
          por_km?: number
          por_turno?: boolean
          valor_base?: number
          valor_turno?: number
        }
        Update: {
          caracteristicas?: string
          criado_em?: string
          franquia_km?: number
          nome?: string
          por_km?: number
          por_turno?: boolean
          valor_base?: number
          valor_turno?: number
        }
        Relationships: []
      }
      motoristas: {
        Row: {
          ajudantes: number
          alterado_por: string | null
          atualizado_em: string
          categoria: string
          cnh: string
          cpf: string
          criado_em: string
          documentos: Json
          email: string
          id: string
          motivo_status: string | null
          nome: string
          placa: string
          status: string
          telefone_whatsapp: string
          valor: number
          valor_ajudante: number
          veiculo: string
        }
        Insert: {
          ajudantes?: number
          alterado_por?: string | null
          atualizado_em?: string
          categoria?: string
          cnh?: string
          cpf?: string
          criado_em?: string
          documentos?: Json
          email?: string
          id?: string
          motivo_status?: string | null
          nome: string
          placa?: string
          status?: string
          telefone_whatsapp?: string
          valor?: number
          valor_ajudante?: number
          veiculo?: string
        }
        Update: {
          ajudantes?: number
          alterado_por?: string | null
          atualizado_em?: string
          categoria?: string
          cnh?: string
          cpf?: string
          criado_em?: string
          documentos?: Json
          email?: string
          id?: string
          motivo_status?: string | null
          nome?: string
          placa?: string
          status?: string
          telefone_whatsapp?: string
          valor?: number
          valor_ajudante?: number
          veiculo?: string
        }
        Relationships: []
      }
      ofertas_saldao: {
        Row: {
          criado_em: string
          criado_por: string | null
          disponivel: number
          id: string
          preco_unitario: number
          quantidade_total: number
          status: string
          termina_em: string | null
          titulo: string
          validade_dias: number
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          disponivel: number
          id?: string
          preco_unitario: number
          quantidade_total: number
          status?: string
          termina_em?: string | null
          titulo: string
          validade_dias?: number
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          disponivel?: number
          id?: string
          preco_unitario?: number
          quantidade_total?: number
          status?: string
          termina_em?: string | null
          titulo?: string
          validade_dias?: number
        }
        Relationships: []
      }
      pedidos_assinatura: {
        Row: {
          atualizado_em: string
          ciclos: number
          cliente_email: string
          codigo_indicacao: string | null
          creditos: number | null
          criado_em: string
          franquia_km: number
          id: string
          modalidade: string
          moeda: string
          periodicidade: string
          provedor: string
          provedor_pagamento_id: string | null
          status: string
          valor: number
        }
        Insert: {
          atualizado_em?: string
          ciclos?: number
          cliente_email: string
          codigo_indicacao?: string | null
          creditos?: number | null
          criado_em?: string
          franquia_km?: number
          id?: string
          modalidade?: string
          moeda?: string
          periodicidade: string
          provedor?: string
          provedor_pagamento_id?: string | null
          status?: string
          valor: number
        }
        Update: {
          atualizado_em?: string
          ciclos?: number
          cliente_email?: string
          codigo_indicacao?: string | null
          creditos?: number | null
          criado_em?: string
          franquia_km?: number
          id?: string
          modalidade?: string
          moeda?: string
          periodicidade?: string
          provedor?: string
          provedor_pagamento_id?: string | null
          status?: string
          valor?: number
        }
        Relationships: []
      }
      pedidos_casa_apoio: {
        Row: {
          ar_condicionado: boolean
          casa_id: string
          categoria: string
          criado_em: string
          data_hora: string
          id: string
          ida_e_volta: boolean
          pacientes: Json
          solicitante_email: string
          status: string
          valor: number
        }
        Insert: {
          ar_condicionado?: boolean
          casa_id: string
          categoria?: string
          criado_em?: string
          data_hora: string
          id?: string
          ida_e_volta?: boolean
          pacientes?: Json
          solicitante_email: string
          status?: string
          valor?: number
        }
        Update: {
          ar_condicionado?: boolean
          casa_id?: string
          categoria?: string
          criado_em?: string
          data_hora?: string
          id?: string
          ida_e_volta?: boolean
          pacientes?: Json
          solicitante_email?: string
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_casa_apoio_casa_id_fkey"
            columns: ["casa_id"]
            isOneToOne: false
            referencedRelation: "casas_de_apoio"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_modalidade: {
        Row: {
          criado_em: string
          desconto: number
          excedente_km: number
          id: string
          km_mes: number
          modalidade: string
          nome: string
          periodicidade: string
          preco_km: number
          preco_viagem: number
          viagens_mes: number
        }
        Insert: {
          criado_em?: string
          desconto?: number
          excedente_km?: number
          id: string
          km_mes?: number
          modalidade: string
          nome: string
          periodicidade: string
          preco_km?: number
          preco_viagem?: number
          viagens_mes?: number
        }
        Update: {
          criado_em?: string
          desconto?: number
          excedente_km?: number
          id?: string
          km_mes?: number
          modalidade?: string
          nome?: string
          periodicidade?: string
          preco_km?: number
          preco_viagem?: number
          viagens_mes?: number
        }
        Relationships: []
      }
      planos_rota_exclusiva: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cliente_email: string
          criado_em: string
          criado_por: string | null
          destino_fixo: string
          forma_pagamento: string
          id: string
          km_rota: number
          minutos_rota: number
          nome: string
          observacao: string | null
          origem_fixa: string
          paradas_fixas: string[]
          por_km_variado: number
          valor_mensal: number
          valor_trecho_fixo: number
          viagens_inclusas: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cliente_email: string
          criado_em?: string
          criado_por?: string | null
          destino_fixo: string
          forma_pagamento?: string
          id?: string
          km_rota?: number
          minutos_rota?: number
          nome?: string
          observacao?: string | null
          origem_fixa: string
          paradas_fixas?: string[]
          por_km_variado?: number
          valor_mensal?: number
          valor_trecho_fixo?: number
          viagens_inclusas?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cliente_email?: string
          criado_em?: string
          criado_por?: string | null
          destino_fixo?: string
          forma_pagamento?: string
          id?: string
          km_rota?: number
          minutos_rota?: number
          nome?: string
          observacao?: string | null
          origem_fixa?: string
          paradas_fixas?: string[]
          por_km_variado?: number
          valor_mensal?: number
          valor_trecho_fixo?: number
          viagens_inclusas?: number
        }
        Relationships: []
      }
      precos_esportivo: {
        Row: {
          atualizado_em: string
          por_km: number
          valor_evento: number
          veiculo: string
        }
        Insert: {
          atualizado_em?: string
          por_km?: number
          valor_evento?: number
          veiculo: string
        }
        Update: {
          atualizado_em?: string
          por_km?: number
          valor_evento?: number
          veiculo?: string
        }
        Relationships: []
      }
      propostas_plano: {
        Row: {
          ciclos: number
          cliente_email: string
          criado_em: string
          criado_por: string | null
          franquia_km: number
          id: string
          modalidade: string
          observacao: string | null
          pedido_id: string | null
          periodicidade: string
          status: string
          valor: number
          viagens_mes: number
        }
        Insert: {
          ciclos?: number
          cliente_email: string
          criado_em?: string
          criado_por?: string | null
          franquia_km: number
          id?: string
          modalidade?: string
          observacao?: string | null
          pedido_id?: string | null
          periodicidade: string
          status?: string
          valor: number
          viagens_mes?: number
        }
        Update: {
          ciclos?: number
          cliente_email?: string
          criado_em?: string
          criado_por?: string | null
          franquia_km?: number
          id?: string
          modalidade?: string
          observacao?: string | null
          pedido_id?: string | null
          periodicidade?: string
          status?: string
          valor?: number
          viagens_mes?: number
        }
        Relationships: []
      }
      solicitantes_casa_apoio: {
        Row: {
          aprovador: string | null
          cargo: string
          casa_id: string | null
          casa_nome_informado: string
          criado_em: string
          email: string
          id: string
          nome: string
          status: string
          whatsapp: string
        }
        Insert: {
          aprovador?: string | null
          cargo?: string
          casa_id?: string | null
          casa_nome_informado?: string
          criado_em?: string
          email: string
          id?: string
          nome: string
          status?: string
          whatsapp?: string
        }
        Update: {
          aprovador?: string | null
          cargo?: string
          casa_id?: string | null
          casa_nome_informado?: string
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          status?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitantes_casa_apoio_casa_id_fkey"
            columns: ["casa_id"]
            isOneToOne: false
            referencedRelation: "casas_de_apoio"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usos_indicacao: {
        Row: {
          codigo: string
          criado_em: string
          id: string
          indicado_email: string
          indicado_nome: string
        }
        Insert: {
          codigo: string
          criado_em?: string
          id?: string
          indicado_email: string
          indicado_nome?: string
        }
        Update: {
          codigo?: string
          criado_em?: string
          id?: string
          indicado_email?: string
          indicado_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "usos_indicacao_codigo_fkey"
            columns: ["codigo"]
            isOneToOne: false
            referencedRelation: "codigos_indicacao"
            referencedColumns: ["codigo"]
          },
        ]
      }
      veiculos: {
        Row: {
          aprovador: string | null
          capacidade: number
          categoria: string
          cnh_categoria: string
          cnh_ear: boolean
          cnh_numero: string
          cnh_validade: string
          cor: string
          criado_em: string
          decidido_em: string | null
          em_uso: boolean
          exercicio_crlv: string
          id: string
          modelo: string
          motivo: string | null
          motorista: string | null
          numero_crlv: string
          origem: string
          placa: string
          renavam: string
          status: string
        }
        Insert: {
          aprovador?: string | null
          capacidade?: number
          categoria: string
          cnh_categoria?: string
          cnh_ear?: boolean
          cnh_numero?: string
          cnh_validade?: string
          cor: string
          criado_em?: string
          decidido_em?: string | null
          em_uso?: boolean
          exercicio_crlv?: string
          id: string
          modelo: string
          motivo?: string | null
          motorista?: string | null
          numero_crlv?: string
          origem?: string
          placa: string
          renavam?: string
          status?: string
        }
        Update: {
          aprovador?: string | null
          capacidade?: number
          categoria?: string
          cnh_categoria?: string
          cnh_ear?: boolean
          cnh_numero?: string
          cnh_validade?: string
          cor?: string
          criado_em?: string
          decidido_em?: string | null
          em_uso?: boolean
          exercicio_crlv?: string
          id?: string
          modelo?: string
          motivo?: string | null
          motorista?: string | null
          numero_crlv?: string
          origem?: string
          placa?: string
          renavam?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _debitar_lotes: {
        Args: {
          _desc: string
          _email: string
          _locais: string[]
          _qtd: number
          _ref: string
          _tipo: string
        }
        Returns: undefined
      }
      _devolver_reserva_saldao: {
        Args: { _compra: string; _novo_status: string }
        Returns: undefined
      }
      _encerrar_oferta_saldao: {
        Args: { _oferta: string; _responsavel: string }
        Returns: undefined
      }
      acesso_casa_apoio: { Args: { _email: string }; Returns: Json }
      cancelar_compra_saldao: { Args: { _compra: string }; Returns: Json }
      candidatar_corrida: { Args: { _corrida: string }; Returns: string }
      conceder_compra_saldao: { Args: { _compra: string }; Returns: string }
      conceder_franquia_pedido: {
        Args: { _ciclo: number; _pedido: string }
        Returns: string
      }
      conceder_lote_plano: { Args: { _pedido: string }; Returns: string }
      consumir_creditos: {
        Args: { _quantidade: number; _ref: string }
        Returns: Json
      }
      contato_motorista_corrida: { Args: { _corrida: string }; Returns: Json }
      criar_oferta_saldao: {
        Args: {
          _preco_unitario: number
          _quantidade: number
          _termina_em: string
          _titulo: string
          _validade_dias: number
        }
        Returns: Json
      }
      criar_pedido_assinatura: {
        Args: {
          _ciclos: number
          _codigo: string
          _email: string
          _franquia_km: number
          _modalidade: string
          _periodicidade: string
          _valor: number
        }
        Returns: string
      }
      criar_pedido_casa_apoio: {
        Args: {
          _ar: boolean
          _categoria: string
          _data_hora: string
          _email: string
          _ida_e_volta: boolean
          _pacientes: Json
          _valor: number
        }
        Returns: string
      }
      email_logado: { Args: never; Returns: string }
      encerrar_oferta_saldao: { Args: { _oferta: string }; Returns: Json }
      expirar_creditos: { Args: { _email?: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      liberar_reservas_saldao: { Args: never; Returns: number }
      meu_codigo_indicacao: {
        Args: { _email: string; _nome: string }
        Returns: Json
      }
      meus_creditos: { Args: { _email: string }; Returns: Json }
      minhas_compras_saldao: { Args: never; Returns: Json }
      modulos_liberados: { Args: { _email: string }; Returns: string[] }
      pagar_proposta: { Args: { _proposta: string }; Returns: string }
      painel_carteira_admin: { Args: never; Returns: Json }
      painel_saldao_admin: { Args: never; Returns: Json }
      papel_na_corrida: { Args: { _corrida: string }; Returns: string }
      reivindicar_primeiro_admin: { Args: never; Returns: boolean }
      reservar_compra_saldao: {
        Args: { _oferta: string; _quantidade: number }
        Returns: Json
      }
      reservar_km_corrida: {
        Args: { _agendamento: string; _email: string; _km: number }
        Returns: Json
      }
      saldo_carteira_km: { Args: { _email: string }; Returns: Json }
      solicitar_acesso_casa_apoio: {
        Args: {
          _cargo: string
          _casa: string
          _email: string
          _nome: string
          _whatsapp: string
        }
        Returns: string
      }
      status_pedido_assinatura: {
        Args: { _email: string; _id: string }
        Returns: string
      }
      transferir_para_cofre: { Args: { _quantidade: number }; Returns: Json }
      usar_codigo_indicacao: {
        Args: { _codigo: string; _email: string; _nome: string }
        Returns: string
      }
      validar_codigo_indicacao: {
        Args: { _codigo: string; _email: string }
        Returns: string
      }
      vencimento_periodo: {
        Args: { _base: string; _periodicidade: string }
        Returns: string
      }
      vincular_motorista: { Args: { _candidatura: string }; Returns: string }
      vitrine_saldao: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "gerente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gerente"],
    },
  },
} as const
