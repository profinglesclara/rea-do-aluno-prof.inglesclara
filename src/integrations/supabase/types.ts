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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      atividades_sugeridas: {
        Row: {
          aluno: string
          categoria: Database["public"]["Enums"]["categoria_topico"]
          descricao: string | null
          link_recurso: string | null
          status: Database["public"]["Enums"]["status_sugestao"]
          sugestao_id: string
          titulo: string
        }
        Insert: {
          aluno: string
          categoria: Database["public"]["Enums"]["categoria_topico"]
          descricao?: string | null
          link_recurso?: string | null
          status?: Database["public"]["Enums"]["status_sugestao"]
          sugestao_id?: string
          titulo: string
        }
        Update: {
          aluno?: string
          categoria?: Database["public"]["Enums"]["categoria_topico"]
          descricao?: string | null
          link_recurso?: string | null
          status?: Database["public"]["Enums"]["status_sugestao"]
          sugestao_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_sugeridas_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      atividades_tarefas: {
        Row: {
          aluno: string
          atividade_id: string
          descricao: string | null
          link: string | null
          status: Database["public"]["Enums"]["status_atividade"]
          titulo: string
        }
        Insert: {
          aluno: string
          atividade_id?: string
          descricao?: string | null
          link?: string | null
          status?: Database["public"]["Enums"]["status_atividade"]
          titulo: string
        }
        Update: {
          aluno?: string
          atividade_id?: string
          descricao?: string | null
          link?: string | null
          status?: Database["public"]["Enums"]["status_atividade"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_tarefas_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      aulas: {
        Row: {
          aluno: string
          aula_id: string
          conteudo: string | null
          data_aula: string
          observacoes: string | null
          status: Database["public"]["Enums"]["status_aula"]
        }
        Insert: {
          aluno: string
          aula_id?: string
          conteudo?: string | null
          data_aula: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_aula"]
        }
        Update: {
          aluno?: string
          aula_id?: string
          conteudo?: string | null
          data_aula?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_aula"]
        }
        Relationships: [
          {
            foreignKeyName: "aulas_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conquistas: {
        Row: {
          aluno: string
          conquista_id: string
          data_conquista: string | null
          descricao: string | null
          status: Database["public"]["Enums"]["status_conquista"]
          tipo: Database["public"]["Enums"]["tipo_conquista"]
          titulo: string
        }
        Insert: {
          aluno: string
          conquista_id?: string
          data_conquista?: string | null
          descricao?: string | null
          status?: Database["public"]["Enums"]["status_conquista"]
          tipo: Database["public"]["Enums"]["tipo_conquista"]
          titulo: string
        }
        Update: {
          aluno?: string
          conquista_id?: string
          data_conquista?: string | null
          descricao?: string | null
          status?: Database["public"]["Enums"]["status_conquista"]
          tipo?: Database["public"]["Enums"]["tipo_conquista"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "conquistas_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      relatorios_mensais: {
        Row: {
          aluno: string
          arquivo_pdf: string | null
          comentario_automatico: string | null
          conteudo_gerado: string | null
          data_geracao: string | null
          mes_referencia: string
          porcentagem_concluida: number | null
          porcentagem_em_desenvolvimento: number | null
          relatorio_id: string
        }
        Insert: {
          aluno: string
          arquivo_pdf?: string | null
          comentario_automatico?: string | null
          conteudo_gerado?: string | null
          data_geracao?: string | null
          mes_referencia: string
          porcentagem_concluida?: number | null
          porcentagem_em_desenvolvimento?: number | null
          relatorio_id?: string
        }
        Update: {
          aluno?: string
          arquivo_pdf?: string | null
          comentario_automatico?: string | null
          conteudo_gerado?: string | null
          data_geracao?: string | null
          mes_referencia?: string
          porcentagem_concluida?: number | null
          porcentagem_em_desenvolvimento?: number | null
          relatorio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_mensais_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      topicos_progresso: {
        Row: {
          aluno: string
          categoria: Database["public"]["Enums"]["categoria_topico"]
          descricao_topico: string
          nivel_cefr: Database["public"]["Enums"]["nivel_cefr"]
          status: Database["public"]["Enums"]["status_topico"]
          topico_id: string
          ultima_atualizacao: string | null
        }
        Insert: {
          aluno: string
          categoria: Database["public"]["Enums"]["categoria_topico"]
          descricao_topico: string
          nivel_cefr: Database["public"]["Enums"]["nivel_cefr"]
          status?: Database["public"]["Enums"]["status_topico"]
          topico_id?: string
          ultima_atualizacao?: string | null
        }
        Update: {
          aluno?: string
          categoria?: Database["public"]["Enums"]["categoria_topico"]
          descricao_topico?: string
          nivel_cefr?: Database["public"]["Enums"]["nivel_cefr"]
          status?: Database["public"]["Enums"]["status_topico"]
          topico_id?: string
          ultima_atualizacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topicos_progresso_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      usuarios: {
        Row: {
          data_criacao: string | null
          data_inicio_aulas: string | null
          email: string
          email_confirmado: boolean | null
          foto_perfil: string | null
          frequencia_mensal: number | null
          grafico_progresso: Json | null
          historico_progresso: Json | null
          modalidade: Database["public"]["Enums"]["modalidade"] | null
          nivel_cefr: Database["public"]["Enums"]["nivel_cefr"] | null
          nome_completo: string
          nome_de_usuario: string
          objetivo_principal: string | null
          observacoes_internas: string | null
          preferencia_contato: string | null
          progresso_geral: number | null
          progresso_por_categoria: Json | null
          responsavel_por: string | null
          senha: string
          status_aluno: string | null
          telefone_responsavel: string | null
          tipo_usuario: Database["public"]["Enums"]["tipo_usuario"]
          user_id: string
        }
        Insert: {
          data_criacao?: string | null
          data_inicio_aulas?: string | null
          email: string
          email_confirmado?: boolean | null
          foto_perfil?: string | null
          frequencia_mensal?: number | null
          grafico_progresso?: Json | null
          historico_progresso?: Json | null
          modalidade?: Database["public"]["Enums"]["modalidade"] | null
          nivel_cefr?: Database["public"]["Enums"]["nivel_cefr"] | null
          nome_completo: string
          nome_de_usuario: string
          objetivo_principal?: string | null
          observacoes_internas?: string | null
          preferencia_contato?: string | null
          progresso_geral?: number | null
          progresso_por_categoria?: Json | null
          responsavel_por?: string | null
          senha: string
          status_aluno?: string | null
          telefone_responsavel?: string | null
          tipo_usuario: Database["public"]["Enums"]["tipo_usuario"]
          user_id?: string
        }
        Update: {
          data_criacao?: string | null
          data_inicio_aulas?: string | null
          email?: string
          email_confirmado?: boolean | null
          foto_perfil?: string | null
          frequencia_mensal?: number | null
          grafico_progresso?: Json | null
          historico_progresso?: Json | null
          modalidade?: Database["public"]["Enums"]["modalidade"] | null
          nivel_cefr?: Database["public"]["Enums"]["nivel_cefr"] | null
          nome_completo?: string
          nome_de_usuario?: string
          objetivo_principal?: string | null
          observacoes_internas?: string | null
          preferencia_contato?: string | null
          progresso_geral?: number | null
          progresso_por_categoria?: Json | null
          responsavel_por?: string | null
          senha?: string
          status_aluno?: string | null
          telefone_responsavel?: string | null
          tipo_usuario?: Database["public"]["Enums"]["tipo_usuario"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_responsavel_por_fkey"
            columns: ["responsavel_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gerar_relatorios_mensais: { Args: never; Returns: undefined }
      get_user_type: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["tipo_usuario"]
      }
      is_responsavel_of: {
        Args: { _aluno_id: string; _user_id: string }
        Returns: boolean
      }
      status_to_numeric: {
        Args: { status: Database["public"]["Enums"]["status_topico"] }
        Returns: number
      }
    }
    Enums: {
      categoria_topico:
        | "Grammar"
        | "Vocabulary"
        | "Communication"
        | "Pronunciation"
        | "Listening"
        | "Reading"
        | "Writing"
        | "Speaking"
      modalidade: "Online" | "Presencial" | "Híbrido"
      nivel_cefr: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
      status_atividade: "Disponível" | "Concluída"
      status_aula: "Agendada" | "Realizada" | "Cancelada" | "Remarcada"
      status_conquista: "Desbloqueada" | "Oculta"
      status_sugestao: "Sugerida" | "Em andamento" | "Concluída"
      status_topico: "A Introduzir" | "Em Desenvolvimento" | "Concluído"
      tipo_conquista:
        | "Progresso"
        | "Presença"
        | "Atividades"
        | "Nível CEFR"
        | "Extra"
      tipo_usuario: "Aluno" | "Responsável" | "Adulto" | "Admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      categoria_topico: [
        "Grammar",
        "Vocabulary",
        "Communication",
        "Pronunciation",
        "Listening",
        "Reading",
        "Writing",
        "Speaking",
      ],
      modalidade: ["Online", "Presencial", "Híbrido"],
      nivel_cefr: ["A1", "A2", "B1", "B2", "C1", "C2"],
      status_atividade: ["Disponível", "Concluída"],
      status_aula: ["Agendada", "Realizada", "Cancelada", "Remarcada"],
      status_conquista: ["Desbloqueada", "Oculta"],
      status_sugestao: ["Sugerida", "Em andamento", "Concluída"],
      status_topico: ["A Introduzir", "Em Desenvolvimento", "Concluído"],
      tipo_conquista: [
        "Progresso",
        "Presença",
        "Atividades",
        "Nível CEFR",
        "Extra",
      ],
      tipo_usuario: ["Aluno", "Responsável", "Adulto", "Admin"],
    },
  },
} as const
