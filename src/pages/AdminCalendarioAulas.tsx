import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarioAulas } from "@/components/CalendarioAulas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LogoutButton } from "@/components/LogoutButton";

export default function AdminCalendarioAulas() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedAluno, setSelectedAluno] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");

  // Buscar alunos
  const { data: alunos } = useQuery({
    queryKey: ["alunos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("user_id, nome_completo")
        .eq("tipo_usuario", "Aluno")
        .order("nome_completo");

      if (error) throw error;
      return data;
    },
  });

  // Buscar aulas com informações do aluno
  const { data: aulas, isLoading } = useQuery({
    queryKey: ["aulasCalendario", selectedAluno, selectedStatus],
    queryFn: async () => {
      let query = supabase
        .from("aulas")
        .select(`
          *,
          usuarios!aulas_aluno_fkey(nome_completo)
        `)
        .order("data_aula", { ascending: true });

      if (selectedAluno !== "todos") {
        query = query.eq("aluno", selectedAluno);
      }

      if (selectedStatus !== "todos") {
        query = query.eq("status", selectedStatus as "Agendada" | "Realizada" | "Cancelada" | "Remarcada");
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include aluno_nome
      return data.map((aula: any) => ({
        ...aula,
        aluno_nome: aula.usuarios?.nome_completo || "Aluno desconhecido",
      }));
    },
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Calendário de Aulas</h1>
              <p className="text-muted-foreground">
                Visualize e gerencie as aulas em formato de calendário
              </p>
          </div>
          <LogoutButton variant="destructive" />
        </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Aluno</label>
                <Select value={selectedAluno} onValueChange={setSelectedAluno}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os alunos</SelectItem>
                    {alunos?.map((aluno) => (
                      <SelectItem key={aluno.user_id} value={aluno.user_id}>
                        {aluno.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Agendada">Agendada</SelectItem>
                    <SelectItem value="Realizada">Realizada</SelectItem>
                    <SelectItem value="Remarcada">Remarcada</SelectItem>
                    <SelectItem value="Cancelada">Faltou</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendário
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando calendário...</div>
            ) : (
              <CalendarioAulas
                aulas={aulas || []}
                showAlunoName={true}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
