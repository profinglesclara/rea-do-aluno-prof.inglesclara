import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Filter, X, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CalendarioAulas } from "@/components/CalendarioAulas";
import { LogoutButton } from "@/components/LogoutButton";
import { TimePicker } from "@/components/ui/time-picker";
import { formatarDataHoraBR, paraBrasilia, agora } from "@/lib/utils";

type Aula = {
  aula_id: string;
  aluno: string;
  data_aula: string;
  status: "Agendada" | "Realizada" | "Cancelada" | "Remarcada";
  conteudo: string | null;
  observacoes: string | null;
  nome_aluno?: string;
};

type Aluno = {
  user_id: string;
  nome_completo: string;
};

const AdminAulas = () => {
  const navigate = useNavigate();
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filterNome, setFilterNome] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("Todos");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  
  // Modal nova aula
  const [showNovaAula, setShowNovaAula] = useState(false);
  const [novaAlunoId, setNovaAlunoId] = useState("");
  const [novaData, setNovaData] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [novaStatus, setNovaStatus] = useState<string>("Agendada");
  const [novaConteudo, setNovaConteudo] = useState("");
  const [novaObservacoes, setNovaObservacoes] = useState("");
  
  // Modal editar aula
  const [showEditarAula, setShowEditarAula] = useState(false);
  const [editAulaId, setEditAulaId] = useState("");
  const [editData, setEditData] = useState("");
  const [editHora, setEditHora] = useState("");
  const [editStatus, setEditStatus] = useState<string>("Agendada");
  const [editConteudo, setEditConteudo] = useState("");
  const [editObservacoes, setEditObservacoes] = useState("");
  
  // Confirmação de exclusão
  const [showConfirmarExclusao, setShowConfirmarExclusao] = useState(false);
  const [aulaParaExcluir, setAulaParaExcluir] = useState<string | null>(null);
  
  // Calendário
  const [currentMonth, setCurrentMonth] = useState(agora());

  const loadData = async () => {
    setLoading(true);
    
    // Carregar aulas
    const { data: aulasData, error: aulasError } = await supabase
      .from("aulas")
      .select("*")
      .order("data_aula", { ascending: false });
    
    if (aulasError) {
      console.error("Erro ao carregar aulas:", aulasError);
    }
    
    // Carregar alunos
    const { data: alunosData, error: alunosError } = await supabase
      .from("usuarios")
      .select("user_id, nome_completo")
      .eq("tipo_usuario", "Aluno")
      .order("nome_completo", { ascending: true });
    
    if (alunosError) {
      console.error("Erro ao carregar alunos:", alunosError);
    } else {
      console.log("Alunos carregados:", alunosData);
    }
    
    // Mapear nomes de alunos
    const alunosMap = new Map(
      (alunosData || []).map((a) => [a.user_id, a.nome_completo])
    );
    
    const aulasComNome = (aulasData || []).map((aula) => ({
      ...aula,
      nome_aluno: alunosMap.get(aula.aluno) || "Desconhecido",
    }));
    
    setAulas(aulasComNome);
    setAlunos(alunosData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDateTime = (dateStr: string) => {
    return formatarDataHoraBR(dateStr);
  };

  const limparFiltros = () => {
    setFilterNome("");
    setFilterStatus("Todos");
    setFilterDataInicio("");
    setFilterDataFim("");
  };

  const aulasFiltradas = aulas.filter((aula) => {
    // Filtro por nome
    if (
      filterNome &&
      !aula.nome_aluno?.toLowerCase().includes(filterNome.toLowerCase())
    ) {
      return false;
    }
    
    // Filtro por status
    if (filterStatus !== "Todos" && aula.status !== filterStatus) {
      return false;
    }
    
    // Filtro por data início
    if (filterDataInicio) {
      const dataAula = new Date(aula.data_aula);
      const dataInicio = new Date(filterDataInicio);
      if (dataAula < dataInicio) return false;
    }
    
    // Filtro por data fim
    if (filterDataFim) {
      const dataAula = new Date(aula.data_aula);
      const dataFim = new Date(filterDataFim);
      dataFim.setHours(23, 59, 59, 999);
      if (dataAula > dataFim) return false;
    }
    
    return true;
  });
  
  // Preparar aulas para o calendário com nome do aluno
  const aulasParaCalendario = aulasFiltradas.map(aula => ({
    ...aula,
    aluno_nome: aula.nome_aluno
  }));

  const abrirModalNova = () => {
    setNovaAlunoId("");
    setNovaData("");
    setNovaHora("");
    setNovaStatus("Agendada");
    setNovaConteudo("");
    setNovaObservacoes("");
    setShowNovaAula(true);
  };

  const salvarNovaAula = async () => {
    if (!novaAlunoId || !novaData || !novaHora) {
      alert("Preencha aluno, data e hora.");
      return;
    }
    
    const dataCompleta = `${novaData}T${novaHora}:00`;
    
    const { data: aulaData, error } = await supabase.from("aulas").insert({
      aluno: novaAlunoId,
      data_aula: dataCompleta,
      status: novaStatus as any,
      conteudo: novaConteudo || null,
      observacoes: novaObservacoes || null,
    }).select().single();
    
    if (error) {
      console.error(error);
      alert("Erro ao criar aula.");
      return;
    }

    // Criar notificação para o aluno sobre nova aula
    try {
      const dataFormatada = new Date(dataCompleta).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      
      await supabase.from("notificacoes").insert({
        usuario_id: novaAlunoId,
        tipo: "AULA_ATUALIZADA",
        titulo: "Nova aula agendada",
        mensagem: `Uma nova aula foi agendada para ${dataFormatada}.`,
      });
    } catch (notifError) {
      console.error("Erro ao criar notificação:", notifError);
    }
    
    setShowNovaAula(false);
    loadData();
  };

  const abrirModalEditar = (aula: Aula) => {
    setEditAulaId(aula.aula_id);
    const dt = new Date(aula.data_aula);
    const dataStr = dt.toISOString().split("T")[0];
    const horaStr = dt.toTimeString().slice(0, 5);
    setEditData(dataStr);
    setEditHora(horaStr);
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
    
    // Buscar aula anterior para verificar se houve remarcação
    const aulaAnterior = aulas.find((a) => a.aula_id === editAulaId);
    const statusAnterior = aulaAnterior?.status;
    
    const dataCompleta = `${editData}T${editHora}:00`;
    
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

    // Criar notificação se a aula foi remarcada
    if (aulaAnterior && editStatus === "Remarcada" && statusAnterior !== "Remarcada") {
      try {
        const dataFormatada = new Date(dataCompleta).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        
        await supabase.from("notificacoes").insert({
          usuario_id: aulaAnterior.aluno,
          tipo: "AULA_ATUALIZADA",
          titulo: "Aula remarcada",
          mensagem: `Sua aula foi remarcada para ${dataFormatada}.`,
        });
      } catch (notifError) {
        console.error("Erro ao criar notificação:", notifError);
      }
    }
    
    setShowEditarAula(false);
    loadData();
  };

  const abrirConfirmarExclusao = (aulaId: string) => {
    setAulaParaExcluir(aulaId);
    setShowConfirmarExclusao(true);
  };

  const excluirAula = async () => {
    if (!aulaParaExcluir) return;
    
    const { error } = await supabase
      .from("aulas")
      .delete()
      .eq("aula_id", aulaParaExcluir);
    
    if (error) {
      console.error(error);
      alert("Erro ao excluir aula.");
      return;
    }
    
    setShowConfirmarExclusao(false);
    setAulaParaExcluir(null);
    loadData();
  };

  // Mapeia o status do banco para o texto exibido na UI
  const getStatusDisplay = (status: string): string => {
    if (status === "Cancelada") return "Faltou";
    return status;
  };

  // Retorna classes de cor personalizadas para cada status
  const getStatusColorClasses = (status: string): string => {
    switch (status) {
      case "Realizada":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "Agendada":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "Cancelada":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "Remarcada":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para painel
            </Button>
            <h1 className="text-3xl font-bold">Gerenciar Aulas</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={abrirModalNova}>
              <Plus className="mr-2 h-4 w-4" />
              Nova aula
            </Button>
            <LogoutButton variant="destructive" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Nome do aluno</Label>
                <Input
                  placeholder="Buscar por nome..."
                  value={filterNome}
                  onChange={(e) => setFilterNome(e.target.value)}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Agendada">Agendada</SelectItem>
                    <SelectItem value="Realizada">Realizada</SelectItem>
                    <SelectItem value="Cancelada">Faltou</SelectItem>
                    <SelectItem value="Remarcada">Remarcada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data início</Label>
                <Input
                  type="date"
                  value={filterDataInicio}
                  onChange={(e) => setFilterDataInicio(e.target.value)}
                />
              </div>
              <div>
                <Label>Data fim</Label>
                <Input
                  type="date"
                  value={filterDataFim}
                  onChange={(e) => setFilterDataFim(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" onClick={limparFiltros}>
                <X className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Calendário e Lista */}
        <Tabs defaultValue="lista" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendario">
            <Card>
              <CardHeader>
                <CardTitle>Calendário de Aulas</CardTitle>
              </CardHeader>
              <CardContent>
                <CalendarioAulas
                  aulas={aulasParaCalendario}
                  showAlunoName={true}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="lista">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data e Hora</TableHead>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tipo/Conteúdo</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aulasFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhuma aula encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      aulasFiltradas.map((aula) => (
                        <TableRow key={aula.aula_id}>
                          <TableCell>{formatDateTime(aula.data_aula)}</TableCell>
                          <TableCell>{aula.nome_aluno}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColorClasses(aula.status)}>
                              {getStatusDisplay(aula.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {aula.conteudo || "—"}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {aula.observacoes || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => abrirModalEditar(aula)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => abrirConfirmarExclusao(aula.aula_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Nova Aula */}
      <Dialog open={showNovaAula} onOpenChange={setShowNovaAula}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Aula</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Aluno</Label>
              <Select value={novaAlunoId} onValueChange={setNovaAlunoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um aluno" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {alunos.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-muted-foreground">
                      Nenhum aluno encontrado
                    </div>
                  ) : (
                    alunos.map((aluno) => (
                      <SelectItem key={aluno.user_id} value={aluno.user_id}>
                        {aluno.nome_completo}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                />
              </div>
              <div>
                <Label>Hora</Label>
                <TimePicker
                  value={novaHora}
                  onChange={setNovaHora}
                  placeholder="Selecione a hora"
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={novaStatus} onValueChange={setNovaStatus}>
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
              <Label>Tipo/Conteúdo da aula</Label>
              <Input
                placeholder="Ex: Conversação, Gramática..."
                value={novaConteudo}
                onChange={(e) => setNovaConteudo(e.target.value)}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações adicionais..."
                value={novaObservacoes}
                onChange={(e) => setNovaObservacoes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaAula(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarNovaAula}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Aula */}
      <Dialog open={showEditarAula} onOpenChange={setShowEditarAula}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aula</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <TimePicker
                  value={editHora}
                  onChange={setEditHora}
                  placeholder="Selecione a hora"
                />
              </div>
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
              <Label>Tipo/Conteúdo da aula</Label>
              <Input
                placeholder="Ex: Conversação, Gramática..."
                value={editConteudo}
                onChange={(e) => setEditConteudo(e.target.value)}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações adicionais..."
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                rows={3}
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

      {/* Confirmação de Exclusão */}
      <AlertDialog open={showConfirmarExclusao} onOpenChange={setShowConfirmarExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A aula será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAulaParaExcluir(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={excluirAula}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAulas;
