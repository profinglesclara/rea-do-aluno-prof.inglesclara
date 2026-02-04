import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LogoutButton } from "@/components/LogoutButton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { paraBrasilia } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

const getStatusDisplay = (status: string): string => {
  if (status === "Cancelada") return "Faltou";
  return status;
};

const getStatusColorClasses = (status: string): string => {
  switch (status) {
    case "Realizada":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "Agendada":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "Cancelada":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    case "Remarcada":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

export default function AlunoAulas() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [mesFilter, setMesFilter] = useState<string>("Todos");
  const [anoFilter, setAnoFilter] = useState<string>("Todos");
  const [searchText, setSearchText] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  // Buscar o primeiro aluno teste
  const { data: aluno } = useQuery({
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
  const { data: aulas, isLoading } = useQuery({
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

  // Extrair anos únicos das aulas
  const anosDisponiveis = useMemo(() => {
    if (!aulas) return [];
    const anos = new Set(
      aulas.map((aula) => paraBrasilia(aula.data_aula).getFullYear().toString())
    );
    return Array.from(anos).sort((a, b) => parseInt(b) - parseInt(a));
  }, [aulas]);

  // Filtrar aulas
  const aulasFiltradas = useMemo(() => {
    if (!aulas) return [];
    
    return aulas.filter((aula) => {
      const dataAula = paraBrasilia(aula.data_aula);
      const mes = dataAula.getMonth() + 1;
      const ano = dataAula.getFullYear().toString();
      
      // Filtro de status
      if (statusFilter !== "Todos") {
        const displayStatus = statusFilter === "Faltou" ? "Cancelada" : statusFilter;
        if (aula.status !== displayStatus) return false;
      }
      
      // Filtro de mês
      if (mesFilter !== "Todos" && mes.toString() !== mesFilter) return false;
      
      // Filtro de ano
      if (anoFilter !== "Todos" && ano !== anoFilter) return false;
      
      // Filtro de texto
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const conteudoMatch = aula.conteudo?.toLowerCase().includes(searchLower);
        const observacoesMatch = aula.observacoes?.toLowerCase().includes(searchLower);
        if (!conteudoMatch && !observacoesMatch) return false;
      }
      
      return true;
    });
  }, [aulas, statusFilter, mesFilter, anoFilter, searchText]);

  // Paginação
  const totalPages = Math.ceil(aulasFiltradas.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const aulasPaginadas = aulasFiltradas.slice(startIndex, endIndex);

  const limparFiltros = () => {
    setStatusFilter("Todos");
    setMesFilter("Todos");
    setAnoFilter("Todos");
    setSearchText("");
    setCurrentPage(1);
  };

  const meses = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <p>Carregando aulas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/aluno/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Histórico de aulas</h1>
              <p className="text-muted-foreground mt-1">
                Visualize todas as suas aulas passadas e futuras
              </p>
            </div>
          </div>
          <LogoutButton variant="outline" />
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Agendada">Agendada</SelectItem>
                    <SelectItem value="Realizada">Realizada</SelectItem>
                    <SelectItem value="Remarcada">Remarcada</SelectItem>
                    <SelectItem value="Faltou">Faltou</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mês */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Mês</label>
                <Select value={mesFilter} onValueChange={setMesFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos os meses</SelectItem>
                    {meses.map((mes) => (
                      <SelectItem key={mes.value} value={mes.value}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ano */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Ano</label>
                <Select value={anoFilter} onValueChange={setAnoFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos os anos</SelectItem>
                    {anosDisponiveis.map((ano) => (
                      <SelectItem key={ano} value={ano}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Busca */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <Input
                  placeholder="Buscar por conteúdo / observações..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <Button variant="outline" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>
              Aulas ({aulasFiltradas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aulasPaginadas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma aula encontrada com esses filtros.
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data e Hora</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tipo/Conteúdo</TableHead>
                        <TableHead>Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aulasPaginadas.map((aula) => (
                        <TableRow key={aula.aula_id}>
                          <TableCell>
                            {format(new Date(aula.data_aula), "dd/MM/yyyy, HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColorClasses(aula.status)}>
                              {getStatusDisplay(aula.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{aula.conteudo || "-"}</TableCell>
                          <TableCell>{aula.observacoes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
