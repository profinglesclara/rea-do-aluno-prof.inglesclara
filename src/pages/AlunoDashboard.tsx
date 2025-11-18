import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, BookOpen, Trophy, ListTodo } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";

export default function AlunoDashboard() {
  const navigate = useNavigate();

  // Buscar o primeiro aluno teste
  const { data: aluno, isLoading: alunoLoading } = useQuery({
    queryKey: ["alunoTeste"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("tipo_usuario", "Aluno")
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

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

  // Calcular estatísticas
  const tarefasObrigatoriasPendentes = tarefas?.filter(
    (t) => t.tipo === "Obrigatoria" && t.status === "Pendente"
  ).length || 0;

  const tarefasSugeridas = tarefas?.filter(
    (t) => t.tipo === "Sugerida"
  ).length || 0;

  const progressoGeral = aluno?.progresso_geral || 0;

  // Mock de conquistas
  const conquistasDesbloqueadas = 5;
  const conquistasBloqueadas = 8;

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

  const iniciais = aluno.nome_completo
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{iniciais}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{aluno.nome_completo}</h1>
              <p className="text-muted-foreground">Bem-vindo ao seu painel</p>
            </div>
          </div>
          <NotificationBell userId={aluno.user_id} />
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 - Calendário de aulas */}
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
                <div className="flex gap-4 text-xs">
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

          {/* Card 2 - Progressos */}
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

          {/* Card 3 - Tarefas */}
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

          {/* Card 4 - Conquistas */}
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
                  <span className="text-xl font-bold">{conquistasDesbloqueadas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Bloqueadas:</span>
                  <span className="text-xl font-bold text-muted-foreground">{conquistasBloqueadas}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Trophy key={i} className="h-6 w-6 text-yellow-500" />
                  ))}
                  {[...Array(3)].map((_, i) => (
                    <Trophy key={i} className="h-6 w-6 text-muted-foreground opacity-30" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
