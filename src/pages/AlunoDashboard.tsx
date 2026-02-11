import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen, Trophy, ListTodo, Star, Target, Award, Zap, Heart, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { LogoutButton } from "@/components/LogoutButton";
import { FotoPerfil } from "@/components/FotoPerfil";
import { useEffect, useState } from "react";
export default function AlunoDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  

  // Buscar usuário logado
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !data) {
        console.error("Erro ao buscar usuário:", error);
        navigate("/login");
        return;
      }

      // Verificar se é Aluno
      if (data.tipo_usuario !== "Aluno") {
        if (data.tipo_usuario === "Admin") {
          navigate("/admin/dashboard");
        } else if (data.tipo_usuario === "Responsável") {
          navigate("/responsavel/dashboard");
        }
        return;
      }

      setCurrentUser(data);
      setLoading(false);
    };

    fetchCurrentUser();
  }, [navigate]);

  const aluno = currentUser;
  const alunoLoading = loading;

  // Buscar aulas do aluno
  const { data: aulas } = useQuery({
    queryKey: ["aulasAluno", aluno?.user_id],
    enabled: !!aluno?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("aluno", aluno!.user_id)
        .order("data_aula", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar tarefas do aluno
  const { data: tarefas } = useQuery({
    queryKey: ["tarefasAluno", aluno?.user_id],
    enabled: !!aluno?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .eq("aluno_id", aluno!.user_id);
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar conquistas do aluno
  const { data: conquistasData } = useQuery({
    queryKey: ["conquistasAlunoDashboard", aluno?.user_id],
    enabled: !!aluno?.user_id,
    queryFn: async () => {
      const [mestreResult, alunoResult] = await Promise.all([
        supabase.from("conquistas_mestre").select("*").eq("ativa", true),
        supabase.from("conquistas_alunos").select("*, conquistas_mestre(*)").eq("aluno_id", aluno!.user_id),
      ]);

      if (mestreResult.error) throw mestreResult.error;
      if (alunoResult.error) throw alunoResult.error;

      return {
        total: mestreResult.data?.length || 0,
        desbloqueadas: alunoResult.data?.length || 0,
        bloqueadas: (mestreResult.data?.length || 0) - (alunoResult.data?.length || 0),
        conquistas: alunoResult.data || [],
      };
    },
  });

  // Calcular estatísticas
  const tarefasObrigatoriasPendentes = tarefas?.filter(
    (t) => t.tipo === "Obrigatoria" && t.status === "Pendente"
  ).length || 0;

  const tarefasSugeridas = tarefas?.filter(
    (t) => t.tipo === "Sugerida"
  ).length || 0;

  const progressoGeral = aluno?.progresso_geral || 0;

  const iconMap: Record<string, any> = {
    Star,
    Trophy,
    Target,
    Award,
    Zap,
    Heart,
  };

  if (alunoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Nenhum aluno encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FotoPerfil
              fotoUrl={aluno.foto_perfil_url}
              nome={aluno.nome_completo}
              className="h-16 w-16"
              onClick={() => navigate("/aluno/perfil")}
            />
            <div>
              <h1 className="text-3xl font-bold">{aluno.nome_completo}</h1>
              <p className="text-muted-foreground">Bem-vindo ao seu painel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={aluno.user_id} />
            <LogoutButton variant="outline" />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 - Calendário de aulas (sempre visível) */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendário de aulas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {aulas?.length || 0} aulas registradas
                </p>
                <div className="flex gap-4 text-xs flex-wrap">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Agendada</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Realizada</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Faltou</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>Remarcada</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Button 
                    variant="link" 
                    className="p-0 h-auto justify-start"
                    onClick={() => navigate("/aluno/calendario")}
                  >
                    Ver calendário →
                  </Button>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto justify-start text-muted-foreground"
                    onClick={() => navigate("/aluno/aulas")}
                  >
                    Ver histórico completo →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2 - Progressos (sempre visível) */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/aluno/progresso")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Progressos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{progressoGeral}%</p>
                <p className="text-sm text-muted-foreground">
                  Progresso geral concluído
                </p>
                <Button variant="ghost" size="sm" className="mt-2">
                  Ver detalhes →
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 3 - Conquistas (sempre visível) */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/aluno/conquistas")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Conquistas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Desbloqueadas:</span>
                  <span className="text-xl font-bold">{conquistasData?.desbloqueadas ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Bloqueadas:</span>
                  <span className="text-xl font-bold text-muted-foreground">{conquistasData?.bloqueadas ?? 0}</span>
                </div>
                {conquistasData && conquistasData.conquistas.length > 0 && (
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {conquistasData.conquistas.slice(0, 5).map((conquista: any) => {
                      const Icon = iconMap[conquista.conquistas_mestre?.icone] || Trophy;
                      return (
                        <Icon
                          key={conquista.id}
                          className="h-6 w-6 text-yellow-500"
                        />
                      );
                    })}
                    {conquistasData.conquistas.length > 5 && (
                      <Trophy className="h-6 w-6 text-yellow-500 opacity-50" />
                    )}
                  </div>
                )}
                {(!conquistasData || conquistasData.conquistas.length === 0) && (
                  <div className="flex gap-2 mt-4">
                    {[...Array(5)].map((_, i) => (
                      <Trophy key={i} className="h-6 w-6 text-muted-foreground opacity-20" />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 4 - Tarefas (sempre visível) */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/aluno/tarefas")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                Tarefas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Obrigatórias pendentes:</span>
                  <span className="text-xl font-bold">{tarefasObrigatoriasPendentes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Sugeridas:</span>
                  <span className="text-xl font-bold">{tarefasSugeridas}</span>
                </div>
                <Button variant="ghost" size="sm" className="mt-2 w-full">
                  Ver todas →
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 5 - Relatórios (condicional) */}
          {aluno.show_relatorios && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Relatórios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Acompanhe seus relatórios mensais de progresso
                  </p>
                  <Button variant="ghost" size="sm" className="mt-2">
                    Ver relatórios →
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card 6 - Pagamentos (condicional) */}
          {aluno.show_pagamentos && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Consulte o histórico de pagamentos
                  </p>
                  <Button variant="ghost" size="sm" className="mt-2">
                    Ver pagamentos →
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card 7 - Contratos (condicional) */}
          {aluno.show_contratos && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contratos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Acesse seus documentos e contratos
                  </p>
                  <Button variant="ghost" size="sm" className="mt-2">
                    Ver contratos →
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
