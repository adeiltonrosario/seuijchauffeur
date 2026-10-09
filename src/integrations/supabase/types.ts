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
          motorista: string
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
          criado_em: string
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
          criado_em?: string
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
          criado_em?: string
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
      planos_modalidade: {
        Row: {
          criado_em: string
          desconto: number
          id: string
          modalidade: string
          nome: string
          periodicidade: string
          preco_viagem: number
          viagens_mes: number
        }
        Insert: {
          criado_em?: string
          desconto?: number
          id: string
          modalidade: string
          nome: string
          periodicidade: string
          preco_viagem?: number
          viagens_mes?: number
        }
        Update: {
          criado_em?: string
          desconto?: number
          id?: string
          modalidade?: string
          nome?: string
          periodicidade?: string
          preco_viagem?: number
          viagens_mes?: number
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      meu_codigo_indicacao: {
        Args: { _email: string; _nome: string }
        Returns: Json
      }
      reivindicar_primeiro_admin: { Args: never; Returns: boolean }
      usar_codigo_indicacao: {
        Args: { _codigo: string; _email: string; _nome: string }
        Returns: string
      }
      validar_codigo_indicacao: {
        Args: { _codigo: string; _email: string }
        Returns: string
      }
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
