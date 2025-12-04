import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationBell } from "@/components/NotificationBell";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Calendar, FileText, ClipboardList, User } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

type DashboardAluno = {
  aluno_id: string;
  nome_aluno: string;
  nome_de_usuario: string;
  nivel_cefr: string | null;
  modalidade: string | null;
  status_aluno: string | null;
  total_aulas: number;
  total_concluidas: number;
  total_agendadas: number;
  total_canceladas: number;
  total_remarcadas: number;
  proxima_aula_data: string | null;
};

const AdminDashboard = () => {
  const [alunos, setAlunos] = useState<DashboardAluno[]>([]);
  const [filteredAlunos, setFilteredAlunos] = useState<DashboardAluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [nivelFilter, setNivelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Buscar admin user
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: admin } = useQuery({
    queryKey: ["adminUser", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", session!.user.id)
        .eq("tipo_usuario", "Admin")
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    fetchAlunos();
  }, []);

  useEffect(() => {
    filterAlunos();
  }, [searchTerm, nivelFilter, statusFilter, alunos]);

  const fetchAlunos = async () => {
    try {
      const { data, error } = await supabase
        .from("dashboard_resumo_alunos")
        .select("*")
        .order("nome_aluno", { ascending: true });

      if (error) throw error;

      setAlunos(data || []);
      setFilteredAlunos(data || []);
    } catch (error) {
      console.error("Erro ao carregar alunos:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar a lista de alunos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAlunos = () => {
    let filtered = [...alunos];

    if (searchTerm) {
      filtered = filtered.filter((aluno) =>
        aluno.nome_aluno?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (nivelFilter !== "all") {
      filtered = filtered.filter((aluno) => aluno.nivel_cefr === nivelFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((aluno) => aluno.status_aluno === statusFilter);
    }

    setFilteredAlunos(filtered);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleVerDetalhes = (alunoId: string) => {
    navigate(`/admin/aluno/${alunoId}`);
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
      <div className="mx-auto max-w-7xl">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="text-3xl font-bold">
                  Painel Geral de Alunos
                </CardTitle>
                {admin && <NotificationBell userId={admin.user_id} isAdmin />}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => navigate("/admin/criar-usuario")}
                  className="gap-2"
                >
                  <User className="h-4 w-4" />
                  Criar Novo Usuário
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/aulas")}
                  className="gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Gerenciar Aulas
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/tarefas")}
                  className="gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  Gerenciar Tarefas
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/relatorios")}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Relatórios Mensais
                </Button>
                <LogoutButton variant="destructive" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do aluno..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex gap-3">
                <Select value={nivelFilter} onValueChange={setNivelFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Nível CEFR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os níveis</SelectItem>
                    <SelectItem value="A1">A1</SelectItem>
                    <SelectItem value="A2">A2</SelectItem>
                    <SelectItem value="B1">B1</SelectItem>
                    <SelectItem value="B2">B2</SelectItem>
                    <SelectItem value="C1">C1</SelectItem>
                    <SelectItem value="C2">C2</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Pausado">Pausado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Aluno</TableHead>
                    <TableHead className="text-center">Total Aulas</TableHead>
                    <TableHead className="text-center">Realizadas</TableHead>
                    <TableHead className="text-center">Agendadas</TableHead>
                    <TableHead className="text-center">Faltou</TableHead>
                    <TableHead className="text-center">Remarcadas</TableHead>
                    <TableHead>Próxima Aula</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlunos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum aluno encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlunos.map((aluno) => (
                      <TableRow key={aluno.aluno_id}>
                        <TableCell className="font-medium">
                          {aluno.nome_aluno}
                        </TableCell>
                        <TableCell className="text-center">
                          {aluno.total_aulas}
                        </TableCell>
                        <TableCell className="text-center">
                          {aluno.total_concluidas}
                        </TableCell>
                        <TableCell className="text-center">
                          {aluno.total_agendadas}
                        </TableCell>
                        <TableCell className="text-center">
                          {aluno.total_canceladas}
                        </TableCell>
                        <TableCell className="text-center">
                          {aluno.total_remarcadas}
                        </TableCell>
                        <TableCell>
                          {formatDate(aluno.proxima_aula_data)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerDetalhes(aluno.aluno_id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Mostrando {filteredAlunos.length} de {alunos.length} alunos
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
