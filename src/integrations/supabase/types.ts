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
            referencedRelation: "dashboard_resumo_alunos"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "aulas_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "resumo_aulas_por_aluno"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "aulas_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativa: boolean
          criada_em: string | null
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativa?: boolean
          criada_em?: string | null
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativa?: boolean
          criada_em?: string | null
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
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
            referencedRelation: "dashboard_resumo_alunos"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "conquistas_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "resumo_aulas_por_aluno"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "conquistas_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conquistas_alunos: {
        Row: {
          aluno_id: string
          conquista_id: string
          data_desbloqueio: string | null
          id: string
          observacao: string | null
          origem: string
        }
        Insert: {
          aluno_id: string
          conquista_id: string
          data_desbloqueio?: string | null
          id?: string
          observacao?: string | null
          origem?: string
        }
        Update: {
          aluno_id?: string
          conquista_id?: string
          data_desbloqueio?: string | null
          id?: string
          observacao?: string | null
          origem?: string
        }
        Relationships: [
          {
            foreignKeyName: "conquistas_alunos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "dashboard_resumo_alunos"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "conquistas_alunos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "resumo_aulas_por_aluno"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "conquistas_alunos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conquistas_alunos_conquista_id_fkey"
            columns: ["conquista_id"]
            isOneToOne: false
            referencedRelation: "conquistas_mestre"
            referencedColumns: ["id"]
          },
        ]
      }
      conquistas_mestre: {
        Row: {
          ativa: boolean
          automacao: boolean
          criada_em: string | null
          descricao: string
          icone: string
          id: string
          nivel_cefr: Database["public"]["Enums"]["nivel_cefr"] | null
          nome: string
          ordem_exibicao: number
          slug: string
          tipo: Database["public"]["Enums"]["tipo_conquista_mestre"]
        }
        Insert: {
          ativa?: boolean
          automacao?: boolean
          criada_em?: string | null
          descricao: string
          icone: string
          id?: string
          nivel_cefr?: Database["public"]["Enums"]["nivel_cefr"] | null
          nome: string
          ordem_exibicao: number
          slug: string
          tipo?: Database["public"]["Enums"]["tipo_conquista_mestre"]
        }
        Update: {
          ativa?: boolean
          automacao?: boolean
          criada_em?: string | null
          descricao?: string
          icone?: string
          id?: string
          nivel_cefr?: Database["public"]["Enums"]["nivel_cefr"] | null
          nome?: string
          ordem_exibicao?: number
          slug?: string
          tipo?: Database["public"]["Enums"]["tipo_conquista_mestre"]
        }
        Relationships: []
      }
      entregas_tarefas: {
        Row: {
          aluno_id: string
          comentario: string | null
          data_envio: string
          id: string
          tarefa_id: string
          url_pdf: string
        }
        Insert: {
          aluno_id: string
          comentario?: string | null
          data_envio?: string
          id?: string
          tarefa_id: string
          url_pdf: string
        }
        Update: {
          aluno_id?: string
          comentario?: string | null
          data_envio?: string
          id?: string
          tarefa_id?: string
          url_pdf?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_tarefas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "dashboard_resumo_alunos"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "entregas_tarefas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "resumo_aulas_por_aluno"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "entregas_tarefas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "entregas_tarefas_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          criada_em: string
          id: string
          lida: boolean
          mensagem: string
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          titulo: string
          usuario_id: string
        }
        Insert: {
          criada_em?: string
          id?: string
          lida?: boolean
          mensagem: string
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          titulo: string
          usuario_id: string
        }
        Update: {
          criada_em?: string
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: Database["public"]["Enums"]["tipo_notificacao"]
          titulo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "dashboard_resumo_alunos"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "notificacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "resumo_aulas_por_aluno"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "notificacoes_usuario_id_fkey"
            columns: ["usuario_id"]
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
          progresso_por_categoria: Json | null
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
          progresso_por_categoria?: Json | null
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
          progresso_por_categoria?: Json | null
          relatorio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_mensais_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "dashboard_resumo_alunos"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "relatorios_mensais_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "resumo_aulas_por_aluno"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "relatorios_mensais_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      responsaveis_alunos: {
        Row: {
          aluno_id: string
          criado_em: string | null
          responsavel_id: string
        }
        Insert: {
          aluno_id: string
          criado_em?: string | null
          responsavel_id: string
        }
        Update: {
          aluno_id?: string
          criado_em?: string | null
          responsavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsaveis_alunos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "dashboard_resumo_alunos"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "responsaveis_alunos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "resumo_aulas_por_aluno"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "responsaveis_alunos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "responsaveis_alunos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_resumo_alunos"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "responsaveis_alunos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "resumo_aulas_por_aluno"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "responsaveis_alunos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tarefas: {
        Row: {
          aluno_id: string
          atualizada_em: string
          criada_em: string
          data_limite: string | null
          descricao: string | null
          feedback_professor: string | null
          id: string
          status: string
          tipo: string
          titulo: string
          url_enunciado: string | null
        }
        Insert: {
          aluno_id: string
          atualizada_em?: string
          criada_em?: string
          data_limite?: string | null
          descricao?: string | null
          feedback_professor?: string | null
          id?: string
          status?: string
          tipo: string
          titulo: string
          url_enunciado?: string | null
        }
        Update: {
          aluno_id?: string
          atualizada_em?: string
          criada_em?: string
          data_limite?: string | null
          descricao?: string | null
          feedback_professor?: string | null
          id?: string
          status?: string
          tipo?: string
          titulo?: string
          url_enunciado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "dashboard_resumo_alunos"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "tarefas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "resumo_aulas_por_aluno"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "tarefas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      topicos_padrao: {
        Row: {
          categoria: string
          descricao_topico: string
          modelo_id: string
          nivel_cefr: Database["public"]["Enums"]["nivel_cefr"]
          ordem: number | null
        }
        Insert: {
          categoria: string
          descricao_topico: string
          modelo_id?: string
          nivel_cefr: Database["public"]["Enums"]["nivel_cefr"]
          ordem?: number | null
        }
        Update: {
          categoria?: string
          descricao_topico?: string
          modelo_id?: string
          nivel_cefr?: Database["public"]["Enums"]["nivel_cefr"]
          ordem?: number | null
        }
        Relationships: []
      }
      topicos_progresso: {
        Row: {
          aluno: string
          categoria: string
          descricao_topico: string
          nivel_cefr: Database["public"]["Enums"]["nivel_cefr"]
          status: Database["public"]["Enums"]["status_topico"]
          topico_id: string
          ultima_atualizacao: string | null
        }
        Insert: {
          aluno: string
          categoria: string
          descricao_topico: string
          nivel_cefr: Database["public"]["Enums"]["nivel_cefr"]
          status?: Database["public"]["Enums"]["status_topico"]
          topico_id?: string
          ultima_atualizacao?: string | null
        }
        Update: {
          aluno?: string
          categoria?: string
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
            referencedRelation: "dashboard_resumo_alunos"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "topicos_progresso_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "resumo_aulas_por_aluno"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "topicos_progresso_aluno_fkey"
            columns: ["aluno"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          data_criacao: string | null
          data_inicio_aulas: string | null
          email: string
          email_confirmado: boolean | null
          foto_perfil: string | null
          foto_perfil_url: string | null
          frequencia_mensal: number | null
          grafico_progresso: Json | null
          historico_progresso: Json | null
          modalidade: Database["public"]["Enums"]["modalidade"] | null
          nivel_cefr: Database["public"]["Enums"]["nivel_cefr"] | null
          nome_completo: string
          nome_de_usuario: string
          notas_internas: string | null
          notif_email_ativo: boolean
          objetivo_principal: string | null
          observacoes_internas: string | null
          preferencia_contato: string | null
          progresso_geral: number | null
          progresso_por_categoria: Json | null
          responsavel_por: string | null
          show_contratos: boolean | null
          show_pagamentos: boolean | null
          show_relatorios: boolean | null
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
          foto_perfil_url?: string | null
          frequencia_mensal?: number | null
          grafico_progresso?: Json | null
          historico_progresso?: Json | null
          modalidade?: Database["public"]["Enums"]["modalidade"] | null
          nivel_cefr?: Database["public"]["Enums"]["nivel_cefr"] | null
          nome_completo: string
          nome_de_usuario: string
          notas_internas?: string | null
          notif_email_ativo?: boolean
          objetivo_principal?: string | null
          observacoes_internas?: string | null
          preferencia_contato?: string | null
          progresso_geral?: number | null
          progresso_por_categoria?: Json | null
          responsavel_por?: string | null
          show_contratos?: boolean | null
          show_pagamentos?: boolean | null
          show_relatorios?: boolean | null
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
          foto_perfil_url?: string | null
          frequencia_mensal?: number | null
          grafico_progresso?: Json | null
          historico_progresso?: Json | null
          modalidade?: Database["public"]["Enums"]["modalidade"] | null
          nivel_cefr?: Database["public"]["Enums"]["nivel_cefr"] | null
          nome_completo?: string
          nome_de_usuario?: string
          notas_internas?: string | null
          notif_email_ativo?: boolean
          objetivo_principal?: string | null
          observacoes_internas?: string | null
          preferencia_contato?: string | null
          progresso_geral?: number | null
          progresso_por_categoria?: Json | null
          responsavel_por?: string | null
          show_contratos?: boolean | null
          show_pagamentos?: boolean | null
          show_relatorios?: boolean | null
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
            referencedRelation: "dashboard_resumo_alunos"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "usuarios_responsavel_por_fkey"
            columns: ["responsavel_por"]
            isOneToOne: false
            referencedRelation: "resumo_aulas_por_aluno"
            referencedColumns: ["aluno_id"]
          },
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
      dashboard_resumo_alunos: {
        Row: {
          aluno_id: string | null
          atividades_sugeridas_pendentes: number | null
          atividades_tarefas_pendentes: number | null
          data_inicio_aulas: string | null
          frequencia_mensal: number | null
          modalidade: Database["public"]["Enums"]["modalidade"] | null
          nivel_cefr: Database["public"]["Enums"]["nivel_cefr"] | null
          nome_aluno: string | null
          nome_de_usuario: string | null
          progresso_geral: number | null
          proxima_aula_data: string | null
          status_aluno: string | null
          total_agendadas: number | null
          total_aulas: number | null
          total_canceladas: number | null
          total_concluidas: number | null
          total_conquistas: number | null
          total_remarcadas: number | null
          ultimo_mes_referencia: string | null
          ultimo_relatorio_concluida: number | null
          ultimo_relatorio_data: string | null
          ultimo_relatorio_em_desenvolvimento: number | null
        }
        Relationships: []
      }
      resumo_aulas_por_aluno: {
        Row: {
          aluno_id: string | null
          nome_aluno: string | null
          proxima_aula_data: string | null
          total_agendadas: number | null
          total_aulas: number | null
          total_canceladas: number | null
          total_concluidas: number | null
          total_remarcadas: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      aluno_tem_responsavel: { Args: { p_aluno_id: string }; Returns: boolean }
      gerar_relatorios_mensais: { Args: never; Returns: undefined }
      get_dashboard_aluno: { Args: { p_aluno: string }; Returns: Json }
      get_progresso_aluno: { Args: { p_aluno: string }; Returns: Json }
      get_user_type: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["tipo_usuario"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_responsavel_of: {
        Args: { _aluno_id: string; _user_id: string }
        Returns: boolean
      }
      status_to_numeric: {
        Args: { status: Database["public"]["Enums"]["status_topico"] }
        Returns: number
      }
      sync_topicos_aluno: { Args: { p_aluno: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "aluno" | "responsavel" | "adulto"
      categoria_topico:
        | "Grammar"
        | "Vocabulary"
        | "Communication"
        | "Pronunciation"
        | "Listening"
        | "Reading"
        | "Writing"
        | "Speaking"
        | "Phonetics"
        | "Expressions"
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
        | "Comportamento"
        | "Engajamento"
      tipo_conquista_mestre: "GERAL" | "NIVEL"
      tipo_notificacao:
        | "TAREFA_NOVA"
        | "TAREFA_ENTREGUE"
        | "TAREFA_CORRIGIDA"
        | "AULA_ATUALIZADA"
        | "CONQUISTA_DESBLOQUEADA"
        | "RELATORIO_DISPONIVEL"
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
      app_role: ["admin", "aluno", "responsavel", "adulto"],
      categoria_topico: [
        "Grammar",
        "Vocabulary",
        "Communication",
        "Pronunciation",
        "Listening",
        "Reading",
        "Writing",
        "Speaking",
        "Phonetics",
        "Expressions",
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
        "Comportamento",
        "Engajamento",
      ],
      tipo_conquista_mestre: ["GERAL", "NIVEL"],
      tipo_notificacao: [
        "TAREFA_NOVA",
        "TAREFA_ENTREGUE",
        "TAREFA_CORRIGIDA",
        "AULA_ATUALIZADA",
        "CONQUISTA_DESBLOQUEADA",
        "RELATORIO_DISPONIVEL",
      ],
      tipo_usuario: ["Aluno", "Responsável", "Adulto", "Admin"],
    },
  },
} as const
