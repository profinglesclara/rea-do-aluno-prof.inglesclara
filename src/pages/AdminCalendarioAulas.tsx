import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarioAulas } from "@/components/CalendarioAulas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LogoutButton } from "@/components/LogoutButton";
import { TimePicker } from "@/components/ui/time-picker";
import { agora, paraBrasilia } from "@/lib/utils";

export default function AdminCalendarioAulas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(agora());
  const [selectedAluno, setSelectedAluno] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");

  // Edit modal state
  const [showEditarAula, setShowEditarAula] = useState(false);
  const [editAulaId, setEditAulaId] = useState("");
  const [editData, setEditData] = useState("");
  const [editHora, setEditHora] = useState("");
  const [editStatus, setEditStatus] = useState<string>("Agendada");
  const [editConteudo, setEditConteudo] = useState("");
  const [editObservacoes, setEditObservacoes] = useState("");

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

      return data.map((aula: any) => ({
        ...aula,
        aluno_nome: aula.usuarios?.nome_completo || "Aluno desconhecido",
      }));
    },
  });

  const abrirModalEditar = (aula: any) => {
    setEditAulaId(aula.aula_id);
    const dt = paraBrasilia(aula.data_aula);
    const ano = dt.getFullYear();
    const mes = String(dt.getMonth() + 1).padStart(2, '0');
    const dia = String(dt.getDate()).padStart(2, '0');
    const hora = String(dt.getHours()).padStart(2, '0');
    const minuto = String(dt.getMinutes()).padStart(2, '0');
    setEditData(`${ano}-${mes}-${dia}`);
    setEditHora(`${hora}:${minuto}`);
    setEditStatus(aula.status);
    setEditConteudo(aula.conteudo || "");
    setEditObservacoes(aula.observacoes || "");
    setShowEditarAula(true);
  };

  const salvarEdicao = async () => {
    if (!editData || !editHora) {
      alert("Preencha data e hora.");
      return;
    }

    const dataCompleta = `${editData}T${editHora}:00-03:00`;

    const { error } = await supabase
      .from("aulas")
      .update({
        data_aula: dataCompleta,
        status: editStatus as any,
        conteudo: editConteudo || null,
        observacoes: editObservacoes || null,
      })
      .eq("aula_id", editAulaId);

    if (error) {
      console.error(error);
      alert("Erro ao editar aula.");
      return;
    }

    setShowEditarAula(false);
    queryClient.invalidateQueries({ queryKey: ["aulasCalendario"] });
  };

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
                onAulaClick={abrirModalEditar}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={showEditarAula} onOpenChange={setShowEditarAula}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Aula</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={editData}
                onChange={(e) => setEditData(e.target.value)}
              />
            </div>
            <div>
              <Label>Hora</Label>
              <TimePicker value={editHora} onChange={setEditHora} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agendada">Agendada</SelectItem>
                  <SelectItem value="Realizada">Realizada</SelectItem>
                  <SelectItem value="Cancelada">Faltou</SelectItem>
                  <SelectItem value="Remarcada">Remarcada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conteúdo / Tipo</Label>
              <Textarea
                value={editConteudo}
                onChange={(e) => setEditConteudo(e.target.value)}
                placeholder="Conteúdo da aula..."
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                placeholder="Observações..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditarAula(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarEdicao}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
